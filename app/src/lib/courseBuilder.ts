// Super admin course builder: Course → (optional) Subjects → Lessons → content.
// Every change is sent to the server straight away.
import { Platform } from 'react-native';
import { api } from './api';
import type { ContentKind } from '@/theme/tokens';

export type BItem = {
  review_state?: 'new' | 'delete' | null; replaces_id?: number | null;
  id: number; course_id: number; lesson_id: number | null; kind: ContentKind; title: string; meta?: string | null;
  url?: string | null; body?: string | null; has_file?: boolean; file_size?: number | null; starts_at?: string | null; done?: boolean;
};
export type ReviewState = 'new' | 'delete' | null;
export type BLesson = { id: number; subject_id: number | null; title: string; description?: string | null; duration?: string | null; free_preview: boolean; items: BItem[]; review_state?: ReviewState; pending?: Record<string, any> | null };
export type BSubject = { id: number; title: string; thumbnail_url?: string | null };
export type BCourse = {
  id: number; title: string; description?: string | null; category: string; level: string; cover: string; logo_url?: string | null;
  status: string; is_free: boolean; price?: number | null; offer_price?: number | null; price_period?: 'once' | 'monthly'; trial_days?: number; free_for_subscribers?: boolean;
  audience: 'all' | 'selected' | 'guests'; tenant_ids: number[];
  thumbnail_url?: string | null; board_id?: number | null; syllabus?: 'general' | 'english' | null; class_id?: number | null; trial_lessons?: number; madrasa_label?: string | null;
  subjects: BSubject[]; lessons: BLesson[]; loose_items: BItem[]; lessons_count: number;
  format?: 'recorded' | 'live'; live_provider?: 'meet' | 'livekit'; meet_url?: string | null; live_timezone?: string; live_summary?: string | null;
  live_slots?: LiveSlot[]; live_upcoming?: LiveClass[];
  live_classes?: LiveClassRow[]; manage_mode?: 'full' | 'review'; pending_count?: number; tenant_id?: number | null;
};
/** One class of a live course: created first, dated later. */
export type LiveClassRow = { id: number; position: number; title: string; notes: string | null; starts_at: string | null; duration_min: number; state: 'unscheduled' | 'upcoming' | 'live' | 'done' };
/** A repeating live class time: days 0 = Sunday … 6 = Saturday, start "19:00" (course time zone). */
export type LiveSlot = { id: number; days: number[]; start_time: string; duration_min: number; title?: string | null };
export type LiveClass = { starts_at: string; ends_at: string; title?: string | null; state: 'live' | 'upcoming' };
export type LessonDetail = BLesson & { course: { id: number; title: string; status: string }; subject: BSubject | null; number: number };
export type Category = { id: number; name: string };
export type Picked = { uri: string; name?: string; mimeType?: string; size?: number; file?: File };

/** What each kind of content is, and which files it takes. */
export const KINDS: { kind: ContentKind; label: string; hint: string; accept?: string[]; file?: boolean; link?: boolean }[] = [
  { kind: 'video', label: 'Video', hint: 'Upload a video (MP4) or paste a YouTube / video link.', accept: ['video/*'], file: true, link: true },
  { kind: 'audio', label: 'Audio', hint: 'Add as many audios as you need. Put them in order with the arrows.', accept: ['audio/*'], file: true, link: true },
  { kind: 'pdf', label: 'PDF', hint: 'A book, worksheet or note as a PDF.', accept: ['application/pdf'], file: true, link: true },
  { kind: 'html', label: 'HTML', hint: 'A game or activity as one .html file (for example made with AI), or paste the HTML code. It runs in a safe sandbox.', accept: ['text/html'], file: true },
  { kind: 'note', label: 'Note', hint: 'Write a short class note students read in the app.' },
  { kind: 'image', label: 'Image', hint: 'A chart, poster or picture.', accept: ['image/*'], file: true, link: true },
  { kind: 'link', label: 'Link', hint: 'Any web page.', link: true },
  { kind: 'live', label: 'Live class', hint: 'Date, time and the meeting link (Google Meet, Zoom…).', link: true },
];
export const kindLabel = (k: ContentKind) => KINDS.find((x) => x.kind === k)?.label ?? (k === 'test' ? 'Quiz' : k);

export const fileSize = (n?: number | null) => (!n ? '' : n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** Add a content item to a lesson (id null) or update one; the file is optional. */
export async function saveItem(lessonId: number, itemId: number | null, fields: { kind: ContentKind; title: string; url?: string; body?: string; starts_at?: string | null; meta?: string }, file?: Picked | null, apiBase = '/super/manage') {
  const fd = new FormData();
  if (!itemId) fd.append('kind', fields.kind);
  fd.append('title', fields.title);
  if (fields.url !== undefined && fields.url !== '') fd.append('url', fields.url);
  if (fields.body !== undefined && fields.body !== '') fd.append('body', fields.body);
  if (fields.starts_at) fd.append('starts_at', fields.starts_at);
  if (fields.meta) fd.append('meta', fields.meta);
  if (file) {
    if (Platform.OS === 'web' && file.file) fd.append('file', file.file);
    else fd.append('file', { uri: file.uri, name: file.name ?? 'file', type: file.mimeType ?? 'application/octet-stream' } as any);
  }
  return api.post<BItem>(itemId ? `${apiBase}/course-items/${itemId}` : `${apiBase}/course-lessons/${lessonId}/items`, fd);
}

/** Swap an element with its neighbour; returns null if it can't move. */
export function moved<T>(list: T[], i: number, d: -1 | 1): T[] | null {
  const j = i + d;
  if (j < 0 || j >= list.length) return null;
  const l = [...list];
  [l[i], l[j]] = [l[j], l[i]];
  return l;
}
