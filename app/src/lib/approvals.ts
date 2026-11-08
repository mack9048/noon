// Courses made by madrasa admins wait for super-admin approval.
// Admin: POST /admin/courses (+ logo). Super admin: GET/PATCH /super/approvals.
import { useEffect, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import { api, USE_MOCK } from './api';
import { colors } from '@/theme/tokens';

export type ApprovalStatus = 'waiting' | 'approved' | 'changes' | 'rejected';
type Row = { id: number; title: string; category: string; madrasa: string; when: string; tags: string[]; status: ApprovalStatus; logo_url?: string | null };
export type CourseRequest = Row & { glyph: string; tint: readonly [string, string] };

const GLYPH: Record<string, string> = { Arabic: 'ع', Quran: 'ق', Fiqh: 'ف', Seerah: 'س', Hifz: 'ح', Duas: 'د', 'Duas & Adkar': 'د', Thajweed: 'ت' };
const TINT: Record<string, readonly [string, string]> = { Arabic: colors.lav, Quran: colors.mint, Fiqh: colors.sky, Seerah: colors.pink, Hifz: colors.butter, Duas: colors.butter, 'Duas & Adkar': colors.butter };
const dress = (r: Row): CourseRequest => ({ ...r, glyph: GLYPH[r.category] ?? r.title[0], tint: TINT[r.category] ?? colors.lav });

let list: CourseRequest[] = [];
let loaded = false;
const ls = new Set<() => void>();
const emit = () => ls.forEach((l) => l());

export async function refreshApprovals() {
  try { list = (await api.get<Row[]>('/super/approvals')).map(dress); loaded = true; emit(); } catch { /* not a super admin */ }
}
export function useApprovals() {
  useEffect(() => { if (!loaded) refreshApprovals(); }, []);
  return useSyncExternalStore((l) => { ls.add(l); return () => { ls.delete(l); }; }, () => list, () => list);
}

export async function decide(id: number, status: Exclude<ApprovalStatus, 'waiting'>) {
  const row = dress(await api.patch<Row>(`/super/approvals/${id}`, { status }));
  list = list.map((c) => (c.id === id ? row : c));
  emit();
}

/** Upload a course logo picked with the document picker (uri; on web also the File). */
export async function uploadLogo(path: string, logo: { uri: string; name?: string; mimeType?: string; file?: File }) {
  if (USE_MOCK) return; // the demo keeps the logo_url sent with the course
  const fd = new FormData();
  if (Platform.OS === 'web' && logo.file) fd.append('logo', logo.file);
  else fd.append('logo', { uri: logo.uri, name: logo.name ?? 'logo.png', type: logo.mimeType ?? 'image/png' } as any);
  await api.post(path, fd);
}

/** Admin: create a course; it waits for approval. */
export async function requestApproval(c: { title: string; description?: string; category: string; level: string; cover: string; visibility: 'all' | 'madrasa'; is_free: boolean; price?: number | null; offer_price?: number | null; lessons: string[]; logo_url?: string | null }) {
  const row = await api.post<Row & { id: number }>('/admin/courses', c);
  loaded = false;
  return row;
}
