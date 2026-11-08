// Courses made by madrasa admins wait for super-admin approval. Kept in memory for the
// demo until the approvals API is added; the admin's "Send for approval" adds here.
import { useSyncExternalStore } from 'react';

export type ApprovalStatus = 'waiting' | 'approved' | 'changes' | 'rejected';
export type CourseRequest = { id: number; title: string; glyph: string; tint: readonly [string, string]; madrasa: string; when: string; tags: string[]; status: ApprovalStatus };

let list: CourseRequest[] = [
  { id: 1, title: 'Malayalam Duas for Kids', glyph: 'د', tint: ['#F7E9BC', '#6A4D00'], madrasa: 'Noon Madrasa', when: 'Just now', tags: ['Duas & Adkar', '3 items', 'Ayisha Miss', 'My madrasa only'], status: 'waiting' },
  { id: 2, title: 'Thajweed for Girls', glyph: 'ت', tint: ['#D2F0D4', '#1E5A2C'], madrasa: 'Al Noor Madrasa', when: '3h ago', tags: ['Quran', '12 items', 'Live weekly', 'All Noon Learn'], status: 'waiting' },
  { id: 3, title: 'Fiqh Q&A Live', glyph: 'ف', tint: ['#CDE6F1', '#0B5166'], madrasa: 'Darul Huda Online', when: 'Yesterday', tags: ['Fiqh', '6 items', 'Live monthly', 'My madrasa only'], status: 'waiting' },
];
let nextId = 10;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

export const useApprovals = () => useSyncExternalStore(subscribe, () => list, () => list);

export function decide(id: number, status: ApprovalStatus) {
  list = list.map((c) => (c.id === id ? { ...c, status } : c));
  emit();
}

export function requestApproval(c: Omit<CourseRequest, 'id' | 'status' | 'when'>) {
  list = [{ ...c, id: nextId++, status: 'waiting', when: 'Just now' }, ...list];
  emit();
}
