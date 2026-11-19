// Super admin "Content": Courses, Games and Resources (audio books and study tools) as grids,
// each filtered by status. Deleted items wait in a bin where they can be restored or deleted for good.
import React, { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Empty, Grid, Loading, Row, Screen, T } from '@/components/ui';
import { Chips, demoNote, Tabs } from '@/components/kit';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import type { Course, StudyTool, ToolType } from '@/lib/types';
import type { HtmlGame } from '@/lib/games';
import { colors, fonts, scriptFont } from '@/theme/tokens';
import { ToolSheet, toolLabels } from './staff';

type Tab = 'courses' | 'games' | 'resources';
type SuperCourse = Omit<Course, 'status'> & { status: string; institution?: string | null; deleted_at?: string | null };
type Bin = { deleted_at?: string | null };
const GLYPH: Record<string, string> = { Arabic: 'ع', Quran: 'ق', Fiqh: 'ف', Seerah: 'س', Hifz: 'ح', Thajweed: 'ت', 'Duas & Adkar': 'د' };
const TOOL_ICON: Record<ToolType, keyof typeof Ionicons.glyphMap> = { audio: 'headset', chart: 'bar-chart', adkar: 'moon', slide: 'albums', form: 'document-text' };
const TOOL_TINT: Record<ToolType, readonly [string, string]> = { audio: colors.lav, chart: colors.butter, adkar: colors.mint, slide: colors.sky, form: colors.pink };
const err = (e: unknown) => demoNote(e instanceof ApiError ? e.message : 'Could not do that. Please try again.');
const ago = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short' }) : '');

export function SuperContentScreen() {
  const [tab, setTab] = useState<Tab>('courses');
  const [toolNew, setToolNew] = useState<ToolType | null>(null);
  const upload = () => (tab === 'courses' ? router.push('/super/courses/new' as any) : tab === 'games' ? router.push('/super/games/new' as any) : setToolNew('audio'));
  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between', marginBottom: 4 }}>
        <T v="h1">Content</T>
        <Button title={tab === 'courses' ? 'New course' : tab === 'games' ? 'Upload game' : 'Add resource'} icon={tab === 'courses' ? 'add' : 'cloud-upload-outline'} onPress={upload} style={{ height: 44 }} />
      </Row>
      <Tabs value={tab} onChange={setTab} options={[{ key: 'courses', label: 'Courses' }, { key: 'games', label: 'Games' }, { key: 'resources', label: 'Resources' }]} />
      {tab === 'courses' ? <CoursesGrid /> : tab === 'games' ? <GamesGrid /> : <ResourcesGrid newType={toolNew} onNewDone={() => setToolNew(null)} />}
    </Screen>
  );
}

/** Restore / delete-for-good buttons on a card in the bin. */
function BinActions({ onRestore, onForever }: { onRestore: () => Promise<void>; onForever: () => Promise<void> }) {
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);
  const run = (f: () => Promise<void>) => async () => { setBusy(true); try { await f(); } catch (e) { err(e); } finally { setBusy(false); setSure(false); } };
  return sure ? (
    <Row gap={6}>
      <Button title="Delete forever" kind="danger" loading={busy} style={{ height: 36, paddingHorizontal: 10, flex: 1 }} onPress={run(onForever)} />
      <Button title="Keep" kind="ghost" style={{ height: 36, paddingHorizontal: 10 }} onPress={() => setSure(false)} />
    </Row>
  ) : (
    <Row gap={6}>
      <Button title="Restore" icon="arrow-undo" loading={busy} style={{ height: 36, paddingHorizontal: 10, flex: 1 }} onPress={run(onRestore)} />
      <Button title="Delete" kind="ghost" style={{ height: 36, paddingHorizontal: 10 }} onPress={() => setSure(true)} />
    </Row>
  );
}

function StatusPill({ text, tone }: { text: string; tone: 'green' | 'amber' | 'violet' | 'red' | 'grey' }) {
  const c = { green: colors.mint, amber: colors.butter, violet: colors.lav, red: ['#FBD9DC', colors.red] as const, grey: ['#E3ECEF', colors.muted] as const }[tone];
  return <View style={{ alignSelf: 'flex-start', backgroundColor: c[0], borderRadius: 12, paddingHorizontal: 10, height: 24, justifyContent: 'center' }}><T style={{ fontSize: 11, fontFamily: fonts.semibold, color: c[1] }}>{text}</T></View>;
}

/** A content card: coloured top with a glyph or picture, then title, details and status or bin actions. */
function ContentCard({ tint, glyph, image, icon, title, meta, status, onPress, bin }: {
  tint: readonly [string, string]; glyph?: string; image?: string | null; icon?: keyof typeof Ionicons.glyphMap; title: string; meta: string;
  status?: React.ReactNode; onPress?: () => void; bin?: React.ReactNode;
}) {
  const body = (
    <>
      <View style={{ height: 92, backgroundColor: tint[0], alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: 16 }}>
        {image ? <Image source={{ uri: image }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} resizeMode="cover" accessibilityIgnoresInvertColors />
          : glyph ? <T style={{ fontFamily: fonts.arabic, fontSize: 40, color: tint[1] }}>{glyph}</T>
          : icon ? <Ionicons name={icon} size={36} color={tint[1]} /> : null}
        {status ? <View style={{ position: 'absolute', left: 10, top: 10 }}>{status}</View> : null}
      </View>
      <View style={{ padding: 12, gap: 4 }}>
        <T style={{ fontFamily: scriptFont(title), fontSize: 15, color: colors.ink }} numberOfLines={2}>{title}</T>
        <T v="small" numberOfLines={2}>{meta}</T>
        {bin ? <View style={{ marginTop: 6 }}>{bin}</View> : null}
      </View>
    </>
  );
  const card = { borderRadius: 22, backgroundColor: '#FFF', overflow: 'hidden' as const, borderWidth: 1, borderColor: colors.line };
  // Cards in the bin are not pressable themselves, so their Restore / Delete buttons work.
  if (!onPress) return <View style={card}>{body}</View>;
  return <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({ pressed }) => [card, { opacity: pressed ? 0.9 : 1 }]}>{body}</Pressable>;
}

const GRID = { phone: 2, tablet: 3, desktop: 4 } as const;

/* ---------- Courses ---------- */
type CourseFilter = 'published' | 'pending' | 'draft' | 'deleted';
function CoursesGrid() {
  const live = useApi<SuperCourse[]>('/super/courses');
  const bin = useApi<SuperCourse[]>('/super/courses?deleted=1');
  const [f, setF] = useState<CourseFilter>('published');
  const all = live.data ?? [];
  const groups: Record<CourseFilter, SuperCourse[]> = {
    published: all.filter((c) => c.status === 'published'),
    pending: all.filter((c) => c.status === 'pending' || c.status === 'changes'),
    draft: all.filter((c) => c.status === 'draft' || c.status === 'rejected'),
    deleted: bin.data ?? [],
  };
  const rows = groups[f];
  const reload = () => { live.reload(); bin.reload(); };
  const pill = (c: SuperCourse) => c.status === 'published' ? <StatusPill text="Published" tone="green" /> : c.status === 'pending' ? <StatusPill text="Waiting for approval" tone="violet" />
    : c.status === 'changes' ? <StatusPill text="Changes asked" tone="amber" /> : c.status === 'rejected' ? <StatusPill text="Rejected" tone="red" /> : <StatusPill text="Draft" tone="amber" />;
  return (
    <>
      <Chips value={f} onChange={setF} options={[
        { key: 'published', label: `Published · ${groups.published.length}` }, { key: 'pending', label: `Pending approval · ${groups.pending.length}` },
        { key: 'draft', label: `Drafts · ${groups.draft.length}` }, { key: 'deleted', label: `Deleted · ${groups.deleted.length}` },
      ]} />
      {f === 'pending' && rows.length ? <Button title="Open approvals" icon="checkmark-done" kind="ghost" style={{ alignSelf: 'flex-start', height: 40, marginBottom: 8 }} onPress={() => router.push('/super/approvals' as any)} /> : null}
      {(live.loading && !live.data) || (f === 'deleted' && bin.loading && !bin.data) ? <Loading /> : !rows.length ? <Empty text={f === 'deleted' ? 'The bin is empty.' : 'No courses here.'} /> : (
        <Grid cols={GRID} gap={10}>
          {rows.map((c) => (
            <ContentCard key={c.id} tint={[c.cover + '33', c.cover]} glyph={GLYPH[c.category] ?? c.title[0]} image={c.logo_url} title={c.title}
              meta={[`${c.lessons_count} lesson${c.lessons_count === 1 ? '' : 's'}`, c.category, c.institution ? `by ${c.institution}` : null, f === 'deleted' && c.deleted_at ? `deleted ${ago(c.deleted_at)}` : null].filter(Boolean).join(' · ')}
              status={f === 'deleted' ? <StatusPill text="Deleted" tone="grey" /> : pill(c)}
              onPress={f === 'deleted' ? undefined : () => router.push((f === 'pending' ? '/super/approvals' : `/super/courses/${c.id}`) as any)}
              bin={f === 'deleted' ? <BinActions onRestore={async () => { await api.post(`/super/courses/${c.id}/restore`); reload(); }} onForever={async () => { await api.del(`/super/courses/${c.id}/forever`); reload(); }} /> : undefined} />
          ))}
        </Grid>
      )}
    </>
  );
}

/* ---------- Games ---------- */
type GameFilter = 'live' | 'draft' | 'deleted';
function GamesGrid() {
  const live = useApi<(HtmlGame & Bin)[]>('/super/games');
  const bin = useApi<(HtmlGame & Bin)[]>('/super/games?deleted=1');
  const [f, setF] = useState<GameFilter>('live');
  const all = live.data ?? [];
  const groups: Record<GameFilter, (HtmlGame & Bin)[]> = { live: all.filter((g) => g.status === 'live'), draft: all.filter((g) => g.status !== 'live'), deleted: bin.data ?? [] };
  const rows = groups[f];
  const reload = () => { live.reload(); bin.reload(); };
  const tints = [colors.lav, colors.butter, colors.mint, colors.pink, colors.sky];
  return (
    <>
      <Chips value={f} onChange={setF} options={[
        { key: 'live', label: `Published · ${groups.live.length}` }, { key: 'draft', label: `Not published · ${groups.draft.length}` }, { key: 'deleted', label: `Deleted · ${groups.deleted.length}` },
      ]} />
      {(live.loading && !live.data) ? <Loading /> : !rows.length ? <Empty text={f === 'deleted' ? 'The bin is empty.' : 'No games here.'} /> : (
        <Grid cols={GRID} gap={10}>
          {rows.map((g, i) => (
            <ContentCard key={g.id} tint={tints[i % tints.length]} icon="game-controller" image={g.thumbnail_url} title={g.title}
              meta={[g.mode === 'group' ? 'Group' : 'Solo', g.age_group, f === 'deleted' ? `deleted ${ago(g.deleted_at)}` : `${g.plays} plays`].filter(Boolean).join(' · ')}
              status={f === 'deleted' ? <StatusPill text="Deleted" tone="grey" /> : g.status === 'live' ? <StatusPill text="Published" tone="green" /> : <StatusPill text="Not published" tone="amber" />}
              onPress={f === 'deleted' ? undefined : () => router.push(`/super/games/${g.id}` as any)}
              bin={f === 'deleted' ? <BinActions onRestore={async () => { await api.post(`/super/games/${g.id}/restore`); reload(); }} onForever={async () => { await api.del(`/super/games/${g.id}/forever`); reload(); }} /> : undefined} />
          ))}
        </Grid>
      )}
    </>
  );
}

/* ---------- Resources: audio books and study tools ---------- */
type ResFilter = 'all' | ToolType | 'deleted';
function ResourcesGrid({ newType, onNewDone }: { newType: ToolType | null; onNewDone: () => void }) {
  const live = useApi<(StudyTool & Bin & { author?: string | null })[]>('/super/study-tools');
  const bin = useApi<(StudyTool & Bin)[]>('/super/study-tools?deleted=1');
  const [f, setF] = useState<ResFilter>('all');
  const [editing, setEditing] = useState<StudyTool | null>(null);
  const all = live.data ?? [];
  const types = Object.keys(toolLabels) as ToolType[];
  const rows = f === 'deleted' ? bin.data ?? [] : all.filter((t) => f === 'all' || t.type === f);
  const reload = () => { live.reload(); bin.reload(); };
  const sheetOpen = editing || newType;
  return (
    <>
      <Chips value={f} onChange={setF} options={[
        { key: 'all', label: `All · ${all.length}` },
        ...types.map((k) => ({ key: k as ResFilter, label: `${toolLabels[k]} · ${all.filter((t) => t.type === k).length}` })),
        { key: 'deleted', label: `Deleted · ${bin.data?.length ?? 0}` },
      ]} />
      {(live.loading && !live.data) ? <Loading /> : !rows.length ? <Empty text={f === 'deleted' ? 'The bin is empty.' : 'Nothing here yet. Tap Add resource.'} /> : (
        <Grid cols={GRID} gap={10}>
          {rows.map((t: any) => (
            <ContentCard key={t.id} tint={TOOL_TINT[t.type as ToolType] ?? colors.sky} icon={TOOL_ICON[t.type as ToolType] ?? 'document'} title={t.title}
              meta={[toolLabels[t.type as ToolType] ?? t.type, t.author, f === 'deleted' ? `deleted ${ago(t.deleted_at)}` : t.views ? `${t.views} opens` : null].filter(Boolean).join(' · ')}
              status={f === 'deleted' ? <StatusPill text="Deleted" tone="grey" /> : t.status === 'live' ? <StatusPill text="Published" tone="green" /> : <StatusPill text="Draft" tone="amber" />}
              onPress={f === 'deleted' ? undefined : () => setEditing(t)}
              bin={f === 'deleted' ? <BinActions onRestore={async () => { await api.post(`/super/study-tools/${t.id}/restore`); reload(); }} onForever={async () => { await api.del(`/super/study-tools/${t.id}/forever`); reload(); }} /> : undefined} />
          ))}
        </Grid>
      )}
      {sheetOpen ? (
        <ToolSheet tool={editing} defaultType={newType ?? (f !== 'all' && f !== 'deleted' ? f : 'audio')}
          onClose={() => { setEditing(null); onNewDone(); }} onSaved={() => { setEditing(null); onNewDone(); reload(); }}
          onDelete={editing ? async () => { try { await api.del(`/super/study-tools/${editing.id}`); setEditing(null); reload(); } catch (e) { err(e); } } : undefined} />
      ) : null}
    </>
  );
}
