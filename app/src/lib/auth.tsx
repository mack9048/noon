import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, TOKEN_KEY } from './api';
import { storage } from './storage';
import type { Role, User } from './types';

interface GuestSignup {
  /** SMS code, needed when the parent phone already has an account (ApiError code 'otp_required'). */
  otp?: string;
  name: string; age?: number; parent_phone?: string;
  board_id?: number | null; class_id?: number | null; course_ids?: number[];
}

interface AuthState {
  user: User | null;
  loading: boolean;
  /** Throws ApiError with code 'tenant_required' (and body.tenants) when the login exists in several madrasas. */
  login: (login: string, password: string, tenantCode?: string) => Promise<User>;
  startGuest: (data: GuestSignup) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = await storage.get(TOKEN_KEY);
    if (!token) { setUser(null); return; }
    try { setUser(await api.get<User>('/auth/me')); }
    catch { await storage.remove(TOKEN_KEY); setUser(null); }
  }, []);

  useEffect(() => { refresh().finally(() => setLoading(false)); }, [refresh]);

  const save = async (res: { token: string; user: User }) => {
    await storage.set(TOKEN_KEY, res.token);
    setUser(res.user);
    return res.user;
  };

  const value = useMemo<AuthState>(() => ({
    user, loading, refresh,
    login: async (login, password, tenantCode) =>
      save(await api.post('/auth/login', { login, password, tenant_code: tenantCode, device_name: 'noon-app' })),
    startGuest: async (data) => save(await api.post('/auth/guest', { ...data, device_name: 'noon-app' })),
    logout: async () => {
      try { await api.post('/auth/logout'); } catch { /* token may already be invalid */ }
      await storage.remove(TOKEN_KEY);
      setUser(null);
    },
  }), [user, loading, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** Where each role lands after login. */
export function homeFor(role: Role): string {
  switch (role) {
    case 'guest': return '/guest';
    case 'teacher': return '/teacher';
    case 'admin': return '/admin';
    case 'super': return '/super';
    default: return '/student';
  }
}
