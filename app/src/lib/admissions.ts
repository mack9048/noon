// Admissions: applications from the public form (POST /apply/{code}) and the admin's
// list (GET/PATCH /admin/admissions). Kept in a small shared cache so every screen
// (dashboard count, list, detail) shows the same data.
import { useEffect, useSyncExternalStore } from 'react';
import { api } from './api';

export type AppStatus = 'new' | 'review' | 'admitted' | 'rejected';
export type Application = {
  id: string; name: string; gender: 'Boy' | 'Girl'; dob: string; age: number; board: string; cls: string;
  parent: string; relation: string; phone: string; city: string; prevMadrasa?: string | null; time?: string | null;
  docs: { birth: boolean; tc: boolean; photo: boolean }; status: AppStatus; when: string; timeline: [string, string][];
};

let apps: Application[] = [];
let loaded = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

export async function refreshApplications() {
  try { apps = await api.get<Application[]>('/admin/admissions'); loaded = true; emit(); } catch { /* shown as empty */ }
}

/** All applications of this madrasa (loads once, then stays in sync). */
export function useApplications() {
  useEffect(() => { if (!loaded) refreshApplications(); }, []);
  return useSyncExternalStore(subscribe, () => apps, () => apps);
}

/** Admit, book an interview or reject. */
export async function setStatus(id: string, status: AppStatus) {
  const row = await api.patch<Application>(`/admin/admissions/${encodeURIComponent(id)}`, { status });
  apps = apps.map((a) => (a.id === id ? row : a));
  emit();
  return row;
}

/** Public form: returns the application number. */
export async function submitApplication(code: string, a: { name: string; gender: 'Boy' | 'Girl'; dob?: string; board: string; cls: string; parent: string; phone: string; docs: Application['docs'] }) {
  const r = await api.post<{ id: string }>(`/apply/${encodeURIComponent(code)}`, { ...a, dob: a.dob || null });
  loaded = false; // the admin list reloads next time it opens
  return r.id;
}
