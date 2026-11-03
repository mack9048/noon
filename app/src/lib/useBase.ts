import { usePathname } from 'expo-router';

/** Shared screens live under several role trees (/student, /guest, /teacher…). Returns the current one. */
export function useBase(): string {
  const path = usePathname();
  const first = path.split('/')[1];
  return ['student', 'guest', 'teacher', 'admin', 'super'].includes(first) ? `/${first}` : '/student';
}
