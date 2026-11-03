// Which subject or course the student is looking at in My Classroom.
// Remembered on this device, so the choice stays after the app is reopened.
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import { useApi } from './useApi';
import type { LearnSpace } from './types';

const STORE_KEY = 'noon.learnSpace';
let current: string | null = null;
const listeners = new Set<() => void>();

try {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') current = localStorage.getItem(STORE_KEY);
} catch { /* private mode: just don't remember */ }

export function setLearnSpace(key: string | null) {
  current = key;
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      if (key) localStorage.setItem(STORE_KEY, key); else localStorage.removeItem(STORE_KEY);
    }
  } catch { /* ignore */ }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

/** The student's spaces (class subjects + enrolled courses) and the selected one. */
export function useLearnSpaces() {
  const list = useApi<LearnSpace[]>('/learn');
  const key = useSyncExternalStore(subscribe, () => current, () => current);
  const spaces = list.data ?? [];
  // Fall back to the first space if nothing is picked yet, or the old pick is gone.
  const selected = spaces.find((s) => s.key === key) ?? spaces[0] ?? null;
  useEffect(() => { if (selected && selected.key !== key) setLearnSpace(selected.key); }, [selected, key]);
  const select = useCallback((k: string) => setLearnSpace(k), []);
  return { spaces, selected, select, loading: list.loading, error: list.error, reload: list.reload };
}

export const LEARN_SECTIONS = [
  { key: 'materials', label: 'Materials', icon: 'folder', tint: 'lav' },
  { key: 'syllabus', label: 'Syllabus', icon: 'list', tint: 'mint' },
  { key: 'assessment', label: 'Assessment', icon: 'clipboard-outline', tint: 'butter' },
  { key: 'exam', label: 'Exam', icon: 'create-outline', tint: 'pink' },
  { key: 'result', label: 'Result', icon: 'bar-chart-outline', tint: 'sky' },
  { key: 'report', label: 'Report card', icon: 'ribbon-outline', tint: 'white' },
] as const;
export type LearnSection = (typeof LEARN_SECTIONS)[number]['key'];
