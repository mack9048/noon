// Admissions for the demo: applications live in memory on this device until the
// admissions API is added (step 2). The public form adds to it; the admin moves them along.
import { useSyncExternalStore } from 'react';

export type AppStatus = 'new' | 'review' | 'admitted' | 'rejected';
export type Application = {
  id: string; name: string; gender: 'Boy' | 'Girl'; dob: string; age: number; board: string; cls: string;
  parent: string; relation: string; phone: string; city: string; prevMadrasa?: string; time?: string;
  docs: { birth: boolean; tc: boolean; photo: boolean }; status: AppStatus; when: string; timeline: [string, string][];
};

let apps: Application[] = [
  { id: 'APL-2026-0142', name: 'Rayan Ahmed', gender: 'Boy', dob: '14 Mar 2016', age: 10, board: 'AP', cls: '5', parent: 'Abdul Rahman K', relation: 'Father', phone: '+971 50 123 4567', city: 'Sharjah, UAE', prevMadrasa: 'Darul Huda, Kozhikode', time: 'Evening · 4:30 PM', docs: { birth: true, tc: true, photo: false }, status: 'new', when: '2h ago', timeline: [['Form submitted via WhatsApp link', 'Today, 9:42 AM'], ['Fee receipt uploaded', 'Today, 9:44 AM']] },
  { id: 'APL-2026-0141', name: 'Fathima Nasrin', gender: 'Girl', dob: '2 Jan 2018', age: 8, board: 'AP', cls: '3', parent: 'Nasrin P', relation: 'Mother', phone: '+971 52 765 1100', city: 'Dubai, UAE', docs: { birth: true, tc: false, photo: true }, status: 'new', when: '5h ago', timeline: [['Form submitted via WhatsApp link', 'Today, 6:10 AM']] },
  { id: 'APL-2026-0139', name: 'Muhammed Adil', gender: 'Boy', dob: '9 Jul 2014', age: 12, board: 'EK', cls: '7', parent: 'Adil K', relation: 'Father', phone: '+971 54 300 2211', city: 'Ajman, UAE', docs: { birth: true, tc: true, photo: true }, status: 'new', when: 'Yesterday', timeline: [['Form submitted at the office', 'Yesterday, 5:20 PM']] },
  { id: 'APL-2026-0131', name: 'Shifa K', gender: 'Girl', dob: '1 May 2017', age: 9, board: 'AP', cls: '4', parent: 'Kareem', relation: 'Father', phone: '+971 50 222 1188', city: 'Sharjah, UAE', docs: { birth: true, tc: true, photo: true }, status: 'review', when: '2 days ago', timeline: [['Form submitted', 'Mon'], ['Interview booked', 'Tue']] },
  { id: 'APL-2026-0128', name: 'Bilal K', gender: 'Boy', dob: '3 Feb 2015', age: 11, board: 'AP', cls: '6', parent: 'Khalid', relation: 'Father', phone: '+971 56 110 9090', city: 'Sharjah, UAE', docs: { birth: true, tc: false, photo: true }, status: 'review', when: '3 days ago', timeline: [['Form submitted', 'Sun']] },
  { id: 'APL-2026-0120', name: 'Amna Sherin', gender: 'Girl', dob: '20 Aug 2016', age: 10, board: 'AP', cls: '5', parent: 'Sherin', relation: 'Mother', phone: '+971 55 404 7788', city: 'Dubai, UAE', docs: { birth: true, tc: true, photo: true }, status: 'admitted', when: 'Last week', timeline: [['Admitted', 'Last week']] },
  { id: 'APL-2026-0117', name: 'Zayan M', gender: 'Boy', dob: '11 Nov 2018', age: 8, board: 'GEN', cls: '2', parent: 'Muneer', relation: 'Father', phone: '+971 50 909 1212', city: 'Sharjah, UAE', docs: { birth: true, tc: true, photo: true }, status: 'admitted', when: 'Last week', timeline: [['Admitted', 'Last week']] },
];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

export function useApplications() {
  return useSyncExternalStore(subscribe, () => apps, () => apps);
}

export function setStatus(id: string, status: AppStatus, note: string) {
  const now = new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  apps = apps.map((a) => (a.id === id ? { ...a, status, timeline: [...a.timeline, [note, `Today, ${now}`]] } : a));
  emit();
}

export function submitApplication(a: Omit<Application, 'id' | 'status' | 'when' | 'timeline'>) {
  const id = `APL-2026-${String(143 + apps.filter((x) => x.when === 'Just now').length).padStart(4, '0')}`;
  apps = [{ ...a, id, status: 'new', when: 'Just now', timeline: [['Form submitted via the online form', 'Just now']] }, ...apps];
  emit();
  return id;
}
