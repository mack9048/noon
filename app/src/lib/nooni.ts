// Nooni, the AI voice assistant: which screens it may open for each role, what the user is
// looking at right now, and the call to the server (which talks to Claude).
import { api } from './api';
import type { Role } from './types';

export type NooniLang = 'ml' | 'en' | 'ar';
export type NooniMsg = { role: 'user' | 'assistant'; content: string };
type Screen = { key: string; label: string; href: string };

const S = (key: string, label: string, href: string): Screen => ({ key, label, href });

const STUDENT: Screen[] = [
  S('home', 'Campus (home)', '/student'), S('classroom', 'Classroom', '/student/classroom'), S('courses', 'Our Courses (Madrasa Support and Noon Courses)', '/student/courses'),
  S('madrasa-support', 'Madrasa Support (board, class, subjects)', '/student/support'), S('live', 'Live classes', '/student/live'),
  S('games', 'Games', '/student/games'), S('quran', 'Quran', '/student/quran'), S('tools', 'Study tools', '/student/tools'),
  S('noon-buds', 'Noon Buds (age 4–6)', '/student/noon-buds'), S('attendance', 'Attendance', '/student/attendance'), S('fees', 'Fees', '/student/fees'),
  S('performance', 'Marks and performance', '/student/performance'), S('leave', 'Leave request', '/student/leave'), S('chat', 'Chat', '/student/chat'),
  S('profile', 'Profile', '/student/profile'), S('explore', 'Explore', '/student/explore'), S('help', 'Help', '/student/help'),
];

export const NOONI_SCREENS: Record<Role, Screen[]> = {
  student: STUDENT,
  parent: STUDENT,
  guest: [
    S('home', 'Home', '/guest'), S('madrasa-support', 'Madrasa Support', '/guest/support'),
    S('courses', 'Our Courses (Madrasa Support and Noon Courses)', '/guest/courses'), S('games', 'Games', '/guest/games'), S('quran', 'Quran', '/guest/quran'),
    S('tools', 'Study tools', '/guest/tools'), S('unlock', 'Unlock / subscribe / join an institution', '/guest/unlock'),
  ],
  teacher: [
    S('home', 'Home', '/teacher'), S('classes', 'My classes', '/teacher/classes'), S('attendance', 'Attendance', '/teacher/attendance'),
    S('tests', 'Tests and exams', '/teacher/tests'), S('live', 'Live classes', '/teacher/live'), S('leave', 'Leave', '/teacher/leave'),
    S('chat', 'Chat', '/teacher/chat'), S('profile', 'Profile', '/teacher/profile'), S('settings', 'Settings', '/teacher/settings'),
  ],
  admin: [
    S('home', 'Dashboard', '/admin'), S('students', 'Students', '/admin/students'), S('teachers', 'Teachers and classes', '/admin/teachers'),
    S('fees', 'Fees', '/admin/fees'), S('admissions', 'Admissions', '/admin/admissions'), S('campaigns', 'Admission campaigns', '/admin/campaigns'),
    S('attendance', 'Attendance', '/admin/attendance'), S('batches', 'Batches', '/admin/batches'), S('leave', 'Leave approvals', '/admin/leave'),
    S('people', 'People and passwords', '/admin/people'), S('courses', 'Courses for the institution', '/admin/courses'), S('live', 'Live classes', '/admin/live'),
    S('settings', 'Institution settings', '/admin/settings'),
  ],
  super: [
    S('home', 'Overview', '/super'), S('tenants', 'Institutions (tenants)', '/super/tenants'), S('users', 'All users', '/super/users'),
    S('content', 'Content', '/super/content'), S('courses', 'Noon Courses', '/super/courses'), S('approvals', 'Course approvals', '/super/approvals'),
    S('games', 'Games', '/super/games'), S('billing', 'Billing', '/super/billing'), S('website', 'Website', '/super/website'), S('settings', 'Settings', '/super/settings'),
  ],
};

/** What the user is studying right now (set by the course player). */
type Ctx = { course?: string; lesson?: string; item?: string };
let current: Ctx = {};
export const setNooniContext = (c: Ctx) => { current = c; };

export async function askNooni(role: Role, messages: NooniMsg[], lang: NooniLang, screen: string) {
  const screens = NOONI_SCREENS[role] ?? [];
  const r = await api.post<{ reply: string; open: string | null }>('/nooni', {
    messages: messages.slice(-12),
    lang,
    screens: screens.map(({ key, label }) => ({ key, label })),
    context: { ...current, screen },
  });
  return { reply: r.reply, href: r.open ? screens.find((s) => s.key === r.open)?.href ?? null : null };
}

export const SPEECH_LANG: Record<NooniLang, string> = { ml: 'ml-IN', en: 'en-IN', ar: 'ar-SA' };
