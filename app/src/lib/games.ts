// HTML games uploaded by the super admin (usually made with AI) and played in a sandbox.
import { Platform } from 'react-native';
import { api } from './api';

export type GameMode = 'solo' | 'group';
export type GameAudience = 'all' | 'students' | 'guests';
export type HtmlGame = {
  id: number; title: string; description: string | null; thumbnail_url: string | null; mode: GameMode; age_group: string | null; plays: number;
  // super admin only
  audience?: GameAudience; tenant_ids?: number[]; status?: 'live' | 'draft'; position?: number; html_size?: number; updated?: string;
};
export type Picked = { uri: string; name?: string; mimeType?: string; size?: number; file?: File };

export const MODE_LABEL: Record<GameMode, string> = { solo: 'Solo', group: 'Group' };
export const AUDIENCE_LABEL: Record<GameAudience, string> = { all: 'Everyone', students: 'Institution students', guests: 'Guests only' };
export const AGE_GROUPS = ['All ages', '4–6', '6–9', '9–12', '12+'] as const;

const append = (fd: FormData, key: string, f: Picked) => {
  if (Platform.OS === 'web' && f.file) fd.append(key, f.file);
  else fd.append(key, { uri: f.uri, name: f.name ?? key, type: f.mimeType ?? 'application/octet-stream' } as any);
};

/** Create (no id) or update a game. Files are optional when updating. */
export async function saveGame(id: number | null, fields: {
  title: string; description: string; mode: GameMode; audience: GameAudience; tenant_ids: number[]; age_group: string; status: 'live' | 'draft';
}, html?: Picked | null, thumbnail?: Picked | null, removeThumbnail = false) {
  const fd = new FormData();
  fd.append('title', fields.title);
  fd.append('description', fields.description);
  fd.append('mode', fields.mode);
  fd.append('audience', fields.audience);
  fd.append('tenant_ids', fields.audience === 'students' ? fields.tenant_ids.join(',') : '');
  fd.append('age_group', fields.age_group === 'All ages' ? '' : fields.age_group);
  fd.append('status', fields.status);
  if (html) append(fd, 'html', html);
  if (thumbnail) append(fd, 'thumbnail', thumbnail);
  if (removeThumbnail) fd.append('remove_thumbnail', '1');
  return api.post<HtmlGame>(id ? `/super/games/${id}` : '/super/games', fd);
}

export const fileSize = (n?: number) => (!n ? '' : n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
