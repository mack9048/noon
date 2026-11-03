import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth, homeFor } from '@/lib/auth';
import type { Role } from '@/lib/types';
import { Loading } from './ui';

/** Only render children for the allowed roles; otherwise send the user home. */
export function RoleGate({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Redirect href="/welcome" />;
  if (!roles.includes(user.role)) return <Redirect href={homeFor(user.role) as any} />;
  return <>{children}</>;
}
