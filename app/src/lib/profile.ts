// Real profile details for the signed-in person (from /auth/me), used by every profile page.
import type { User } from './types';

/** "Ayisha Abdulla" → { first: 'Ayisha', last: 'Abdulla' } (last may be empty). */
export function splitName(name?: string | null) {
  const parts = (name ?? 'Me').trim().split(/\s+/);
  return { first: parts[0] ?? 'Me', last: parts.slice(1).join(' ') };
}

/** One line under the name, e.g. "Class 5 · Noon Demo Institution · Student". */
export function profileLine(u: User | null) {
  const role = u?.role ? u.role[0].toUpperCase() + u.role.slice(1) : '';
  return [u?.class_label ? `Class ${u.class_label}` : null, u?.tenant_name, role].filter(Boolean).join(' · ');
}

/** Label/value rows; rows without a value are left out. */
export function profileRows(u: User | null, extra: [string, string | null | undefined][] = []): [string, string][] {
  const rows: [string, string | null | undefined][] = [
    ['Institution', u?.tenant_name],
    ['Institution code', u?.tenant_code],
    ['Admission no.', u?.admission_no],
    ['Board', u?.board_name],
    ['Class', u?.class_label],
    ['Email', u?.email],
    ['Phone', u?.phone],
    ['Parent', u?.parent?.name],
    ['Parent phone', u?.parent?.phone],
    ['Joined', u?.joined],
    ...extra,
  ];
  return rows.filter((r): r is [string, string] => !!r[1]);
}
