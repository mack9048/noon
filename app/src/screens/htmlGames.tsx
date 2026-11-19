// Super admin: upload and manage HTML games (order, thumbnail, name, audience, solo/group).
// Everyone: play an uploaded game full screen inside a locked-down sandbox.
import React, { useEffect, useState } from 'react';
import { Image, Linking, Platform, Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import { Button, Card, Row, Screen, T } from '@/components/ui';
import { Tag } from '@/components/kit';
import { BottomActions, ChoiceChips, Input, MiniStat, Panel, Select, Status } from '@/components/kit2';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useBase } from '@/lib/useBase';
import { AGE_GROUPS, AUDIENCE_LABEL, fileSize, MODE_LABEL, saveGame, type GameAudience, type GameMode, type HtmlGame, type Picked } from '@/lib/games';
import { colors, fonts } from '@/theme/tokens';

const say = (m: string) => (Platform.OS === 'web' ? (globalThis as any).alert?.(m) : null);
const GRADS: [string, string][] = [['#8A6CFF', '#5B43E0'], ['#3DD9A8', '#12A6A0'], ['#FF9A3D', '#FF5E7E'], ['#4C8DF6', '#1F5FE0'], ['#FF9EC7', '#E0368C']];

export function GameThumb({ g, size = 56, radius = 16 }: { g: Pick<HtmlGame, 'id' | 'title' | 'thumbnail_url'>; size?: number; radius?: number }) {
  if (g.thumbnail_url) return <Image source={{ uri: g.thumbnail_url }} accessibilityIgnoresInvertColors style={{ width: size, height: size, borderRadius: radius, backgroundColor: '#EEF3F5' }} />;
  return (
    <LinearGradient colors={GRADS[g.id % GRADS.length]} style={{ width: size, height: size, borderRadius: radius, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name="game-controller" size={size * 0.45} color="#FFF" />
    </LinearGradient>
  );
}

/* ---------- Super admin: list, order, preview ---------- */
export function GamesAdminScreen() {
  const { data, loading, error, reload } = useApi<HtmlGame[]>('/super/games');
  const [list, setList] = useState<HtmlGame[]>([]);
  const [filter, setFilter] = useState<'all' | 'live' | 'draft' | 'solo' | 'group'>('all');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) setList(data); }, [data]);
  const shown = list.filter((g) => filter === 'all' || g.status === filter || g.mode === filter);

  const move = async (id: number, dir: -1 | 1) => {
    const i = list.findIndex((g) => g.id === id); const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    const next = [...list]; [next[i], next[j]] = [next[j], next[i]];
    setList(next); setBusy(true);
    try { setList(await api.post<HtmlGame[]>('/super/games/reorder', { ids: next.map((g) => g.id) })); }
    catch (e) { say(e instanceof ApiError ? e.friendly : 'Could not save the order.'); reload(); } finally { setBusy(false); }
  };

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}><T v="h1">Games</T><T v="small">Upload HTML games and choose who plays them</T></View>
        <Pressable accessibilityRole="button" onPress={() => router.push('/super/games/new' as any)} style={{ height: 46, paddingHorizontal: 16, borderRadius: 23, backgroundColor: colors.ink, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="cloud-upload-outline" size={18} color="#FFF" /><T style={{ color: '#FFF', fontFamily: fonts.semibold }}>Upload game</T>
        </Pressable>
      </Row>
      <Row gap={8} style={{ marginTop: 12 }}>
        <MiniStat value={list.filter((g) => g.status === 'live').length} label="Live" tint={colors.mint} />
        <MiniStat value={list.filter((g) => g.status === 'draft').length} label="Drafts" tint={colors.butter} />
        <MiniStat value={list.reduce((n, g) => n + (g.plays ?? 0), 0)} label="Plays" tint={colors.lav} />
      </Row>
      <View style={{ marginTop: 12 }}>
        <ChoiceChips value={filter} onChange={setFilter} options={[{ key: 'all', label: 'All' }, { key: 'live', label: 'Live' }, { key: 'draft', label: 'Drafts' }, { key: 'solo', label: 'Solo' }, { key: 'group', label: 'Group' }]} />
      </View>
      {loading && !list.length ? <T v="small" style={{ marginTop: 16 }}>Loading…</T> : null}
      {error ? <T style={{ marginTop: 16, color: colors.red }}>{error}</T> : null}
      {!loading && !list.length && !error ? (
        <Card style={{ marginTop: 14, alignItems: 'center', gap: 10, paddingVertical: 26 }}>
          <Ionicons name="game-controller-outline" size={34} color={colors.violet} />
          <T v="h3">No games yet</T>
          <T v="small" style={{ textAlign: 'center' }}>Upload the .html file of a game (for example one made with AI). It plays inside the app in a safe sandbox.</T>
          <Button title="Upload the first game" icon="cloud-upload-outline" onPress={() => router.push('/super/games/new' as any)} />
        </Card>
      ) : null}
      <T v="small" style={{ marginTop: 12 }}>{filter === 'all' ? 'Order: students see games in this order. Use the arrows to move a game.' : ''}</T>
      <View style={{ gap: 8, marginTop: 8 }}>
        {shown.map((g) => {
          const i = list.findIndex((x) => x.id === g.id);
          return (
            <Card key={g.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {filter === 'all' ? (
                <View style={{ alignItems: 'center' }}>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Move ${g.title} up`} disabled={busy || i === 0} onPress={() => move(g.id, -1)} style={{ padding: 4, opacity: i === 0 ? 0.25 : 1 }}><Ionicons name="chevron-up" size={20} color={colors.ink} /></Pressable>
                  <T style={{ fontFamily: fonts.semibold, fontSize: 12 }}>{i + 1}</T>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Move ${g.title} down`} disabled={busy || i === list.length - 1} onPress={() => move(g.id, 1)} style={{ padding: 4, opacity: i === list.length - 1 ? 0.25 : 1 }}><Ionicons name="chevron-down" size={20} color={colors.ink} /></Pressable>
                </View>
              ) : null}
              <GameThumb g={g} size={64} />
              <View style={{ flex: 1, gap: 5 }}>
                <T style={{ fontFamily: fonts.semibold }} numberOfLines={1}>{g.title}</T>
                <Row gap={6} style={{ flexWrap: 'wrap' }}>
                  <Tag text={MODE_LABEL[g.mode]} tone={g.mode === 'group' ? 'sky' : 'lav'} />
                  <Tag text={g.audience === 'students' && g.tenant_ids?.length ? `${g.tenant_ids.length} institution${g.tenant_ids.length > 1 ? 's' : ''}` : AUDIENCE_LABEL[g.audience ?? 'all']} tone="mint" />
                  {g.age_group ? <Tag text={`Age ${g.age_group}`} tone="butter" /> : null}
                </Row>
                <T v="small" style={{ fontSize: 11 }}>{g.plays} plays · {fileSize(g.html_size)}{g.updated ? ` · ${g.updated}` : ''}</T>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 8 }}>
                <Status text={g.status === 'live' ? 'Live' : 'Draft'} />
                <Row gap={6}>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Test play ${g.title}`} onPress={() => router.push(`/super/games/play/${g.id}` as any)} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#F1EDFF', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="play" size={16} color={colors.violet} /></Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${g.title}`} onPress={() => router.push(`/super/games/${g.id}` as any)} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#EEF3F5', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="create-outline" size={17} color={colors.ink} /></Pressable>
                </Row>
              </View>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

/* ---------- Super admin: upload / edit ---------- */
export function GameFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id && /^\d+$/.test(String(id));
  const all = useApi<HtmlGame[]>(editing ? '/super/games' : null).data;
  const existing = editing ? all?.find((g) => g.id === Number(id)) : undefined;
  const tenants = useApi<{ id: number; name: string; active?: boolean }[]>('/super/tenants').data ?? [];

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<GameMode>('solo');
  const [audience, setAudience] = useState<GameAudience>('all');
  const [tenantIds, setTenantIds] = useState<number[]>([]);
  const [age, setAge] = useState<string>('All ages');
  const [status, setStatus] = useState<'live' | 'draft'>('live');
  const [html, setHtml] = useState<Picked | null>(null);
  const [thumb, setThumb] = useState<Picked | null>(null);
  const [dropThumb, setDropThumb] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loadedId, setLoadedId] = useState<number | null>(null);

  if (existing && loadedId !== existing.id) {
    setLoadedId(existing.id);
    setTitle(existing.title); setDescription(existing.description ?? ''); setMode(existing.mode); setAudience(existing.audience ?? 'all');
    setTenantIds(existing.tenant_ids ?? []); setAge(existing.age_group || 'All ages'); setStatus(existing.status ?? 'live');
  }

  const pickHtml = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: ['text/html', '.html', '.htm'], copyToCacheDirectory: true });
    const a = r.canceled ? null : r.assets?.[0];
    if (!a) return;
    if (!/\.html?$/i.test(a.name ?? '')) return setErr('Choose the game\'s .html file.');
    if ((a.size ?? 0) > 20 * 1024 * 1024) return setErr('The file is bigger than 20 MB.');
    setErr(null); setHtml(a as Picked);
    if (!title) setTitle((a.name ?? '').replace(/\.html?$/i, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
  };
  const pickThumb = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: ['image/png', 'image/jpeg', 'image/webp'], copyToCacheDirectory: true });
    const a = r.canceled ? null : r.assets?.[0];
    if (!a) return;
    if ((a.size ?? 0) > 3 * 1024 * 1024) return setErr('The thumbnail must be under 3 MB.');
    setErr(null); setThumb(a as Picked); setDropThumb(false);
  };

  const save = async () => {
    setErr(null);
    if (title.trim().length < 2) return setErr('Give the game a name.');
    if (!editing && !html) return setErr('Choose the game\'s .html file.');
    setBusy(true);
    try {
      await saveGame(editing ? Number(id) : null, { title: title.trim(), description: description.trim(), mode, audience, tenant_ids: tenantIds, age_group: age, status }, html, thumb, dropThumb);
      router.replace('/super/games' as any);
    } catch (e) { setErr(e instanceof ApiError ? e.friendly : 'Could not save the game.'); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (Platform.OS === 'web' && !(globalThis as any).confirm?.(`Delete "${title}"? Students will no longer see it.`)) return;
    setBusy(true);
    try { await api.del(`/super/games/${id}`); router.replace('/super/games' as any); }
    catch (e) { setErr(e instanceof ApiError ? e.friendly : 'Could not delete.'); setBusy(false); }
  };

  const thumbUri = thumb?.uri ?? (!dropThumb ? existing?.thumbnail_url : null);
  const toggleTenant = (tid: number) => setTenantIds((l) => (l.includes(tid) ? l.filter((x) => x !== tid) : [...l, tid]));

  return (
    <Screen overlay={<BottomActions>
      {editing ? <Pressable accessibilityRole="button" disabled={busy} onPress={remove} style={{ height: 56, paddingHorizontal: 22, borderRadius: 28, backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#F3B7BD', justifyContent: 'center' }}><T style={{ color: colors.red, fontFamily: fonts.semibold }}>Delete</T></Pressable> : null}
      <Pressable accessibilityRole="button" disabled={busy} onPress={save} style={{ flex: 1, height: 56, borderRadius: 28, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.6 : 1 }}>
        <T style={{ color: '#FFF', fontFamily: fonts.semibold }}>{busy ? 'Saving…' : editing ? 'Save changes' : status === 'live' ? 'Upload & publish' : 'Upload as draft'}</T>
      </Pressable>
    </BottomActions>}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row gap={8}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/super/games' as any))} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="chevron-back" size={20} color={colors.ink} /></Pressable>
          <T v="h1">{editing ? 'Edit game' : 'Upload game'}</T>
        </Row>
        {editing ? <Button title="Test play" kind="ghost" icon="play" onPress={() => router.push(`/super/games/play/${id}` as any)} /> : null}
      </Row>

      <Panel title="Game file">
        <T v="small">One .html file with everything inside it (games made with AI usually are). Up to 20 MB. It runs in a safe sandbox: it cannot see logins or other app data.</T>
        <Pressable accessibilityRole="button" onPress={pickHtml} style={{ minHeight: 84, borderRadius: 20, borderWidth: 1.5, borderStyle: 'dashed', borderColor: html ? colors.teal : colors.line, alignItems: 'center', justifyContent: 'center', gap: 4, padding: 10 }}>
          <Ionicons name={html ? 'document-text' : 'cloud-upload-outline'} size={24} color={colors.teal} />
          <T style={{ color: colors.teal, fontFamily: fonts.semibold }}>{html ? `${html.name} · ${fileSize(html.size)}` : editing ? `Replace the file (now ${fileSize(existing?.html_size)})` : 'Choose .html file'}</T>
        </Pressable>
      </Panel>

      <Panel title="Thumbnail">
        <Row gap={14}>
          {thumbUri ? <Image source={{ uri: thumbUri }} style={{ width: 96, height: 96, borderRadius: 20, backgroundColor: '#EEF3F5' }} />
            : <View style={{ width: 96, height: 96, borderRadius: 20, backgroundColor: '#EEF3F5', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="image-outline" size={28} color={colors.muted} /></View>}
          <View style={{ flex: 1, gap: 8 }}>
            <T v="small">A square picture works best (PNG, JPG or WebP, under 3 MB). Without one, a coloured tile is shown.</T>
            <Row gap={8}>
              <Button title={thumbUri ? 'Change' : 'Choose image'} kind="ghost" icon="image-outline" onPress={pickThumb} />
              {thumbUri ? <Button title="Remove" kind="ghost" onPress={() => { setThumb(null); setDropThumb(true); }} /> : null}
            </Row>
          </View>
        </Row>
      </Panel>

      <Panel title="Details">
        <Input label="Game name" value={title} onChangeText={setTitle} placeholder="e.g. Harf Match" />
        <Input label="Short description (optional)" value={description} onChangeText={setDescription} placeholder="What children do in this game" multiline />
        <Select label="Age group" value={age} options={[...AGE_GROUPS]} onChange={setAge} />
      </Panel>

      <Panel title="Solo or group">
        <ChoiceChips value={mode} onChange={setMode} options={[{ key: 'solo', label: 'Solo · one child plays' }, { key: 'group', label: 'Group · play together' }]} />
        <T v="small">{mode === 'solo' ? 'Shown under Solo games. One child plays on their own device.' : 'Shown under Group games, for a class, family or friends playing together on one screen.'}</T>
      </Panel>

      <Panel title="Who can play">
        <ChoiceChips value={audience} onChange={setAudience} options={(['all', 'students', 'guests'] as GameAudience[]).map((k) => ({ key: k, label: AUDIENCE_LABEL[k] }))} />
        {audience === 'students' ? (
          <View style={{ gap: 8 }}>
            <T v="small">Institutions: leave all unselected for every institution, or pick some.</T>
            <Row gap={8} style={{ flexWrap: 'wrap' }}>
              {tenants.map((t) => {
                const on = tenantIds.includes(t.id);
                return (
                  <Pressable key={t.id} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => toggleTenant(t.id)}
                    style={{ height: 38, paddingHorizontal: 14, borderRadius: 19, borderWidth: 1.5, borderColor: on ? colors.violet : colors.line, backgroundColor: on ? '#F1EDFF' : '#FFF', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name={on ? 'checkbox' : 'square-outline'} size={16} color={on ? colors.violet : colors.muted} /><T style={{ fontSize: 13, fontFamily: fonts.medium }}>{t.name}</T>
                  </Pressable>
                );
              })}
            </Row>
          </View>
        ) : <T v="small">{audience === 'all' ? 'Every student and every guest.' : 'Only guests exploring the free app (not institution students).'}</T>}
      </Panel>

      <Panel title="Status" style={{ marginBottom: 100 }}>
        <ChoiceChips value={status} onChange={setStatus} options={[{ key: 'live', label: 'Live · players see it' }, { key: 'draft', label: 'Draft · only you' }]} />
        {err ? <T style={{ color: colors.red }}>{err}</T> : null}
      </Panel>
    </Screen>
  );
}

/* ---------- Player (all roles) ---------- */
export function GamePlayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const base = useBase();
  const { data, error } = useApi<{ game: HtmlGame; url: string }>(/^\d+$/.test(String(id)) ? `/games/${id}/play` : null);
  const back = () => (router.canGoBack() ? router.back() : router.replace(`${base}/games` as any));
  const full = () => {
    const el = (globalThis as any).document?.getElementById('noon-game-frame');
    el?.requestFullscreen?.();
  };
  useEffect(() => { if (data && Platform.OS !== 'web') Linking.openURL(data.url); }, [data]);

  return (
    <View style={{ flex: 1, backgroundColor: '#0E1B33' }}>
      <Row gap={10} style={{ height: 60, paddingHorizontal: 12, backgroundColor: '#0E1B33' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="chevron-back" size={22} color="#FFF" /></Pressable>
        <T numberOfLines={1} style={{ flex: 1, color: '#FFF', fontFamily: fonts.semibold, fontSize: 17 }}>{data?.game.title ?? 'Game'}</T>
        {data?.game ? <Tag text={MODE_LABEL[data.game.mode]} tone={data.game.mode === 'group' ? 'sky' : 'lav'} /> : null}
        {Platform.OS === 'web' ? <Pressable accessibilityRole="button" accessibilityLabel="Full screen" onPress={full} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="expand" size={20} color="#FFF" /></Pressable> : null}
      </Row>
      {error ? <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}><T style={{ color: '#FFF', textAlign: 'center' }}>This game is not available right now.</T></View>
        : !data ? <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><T style={{ color: '#C9D5E6' }}>Loading the game…</T></View>
        : Platform.OS === 'web' ? (<View style={{ flex: 1 }}>{
          React.createElement('iframe', {
            id: 'noon-game-frame', src: data.url, title: data.game.title,
            // No allow-same-origin: the game gets a blank, separate origin and can't touch the app or its login.
            sandbox: 'allow-scripts allow-pointer-lock allow-modals allow-forms',
            allow: 'autoplay; fullscreen; gamepad', allowFullScreen: true,
            style: { width: '100%', height: '100%', minHeight: 420, border: 0, background: '#FFF', display: 'block' },
          })
        }</View>) : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}><T style={{ color: '#FFF' }}>The game opened in your browser.</T><Button title="Open again" onPress={() => Linking.openURL(data.url)} /></View>}
    </View>
  );
}

/* ---------- Play Land section: uploaded games with Solo / Group tabs ---------- */
export function UploadedGames({ tint = '#1B3A8C' }: { tint?: string }) {
  const base = useBase();
  const { data } = useApi<HtmlGame[]>('/games');
  const [tab, setTab] = useState<'all' | GameMode>('all');
  if (!data?.length) return null;
  const shown = data.filter((g) => tab === 'all' || g.mode === tab);
  return (
    <View style={{ marginTop: 14, backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: 26, padding: 12, gap: 10 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T style={{ fontFamily: fonts.fun, fontSize: 20, color: tint }}>Noon Games</T>
        <Row gap={6}>
          {([['all', 'All'], ['solo', 'Solo'], ['group', 'Group']] as const).map(([k, l]) => (
            <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: tab === k }} onPress={() => setTab(k)}
              style={{ height: 34, paddingHorizontal: 12, borderRadius: 17, backgroundColor: tab === k ? tint : '#FFF', justifyContent: 'center' }}>
              <T style={{ fontFamily: fonts.semibold, fontSize: 13, color: tab === k ? '#FFF' : tint }}>{l}</T>
            </Pressable>
          ))}
        </Row>
      </Row>
      {!shown.length ? <T v="small">No {tab} games yet.</T> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {shown.map((g) => (
          <Pressable key={g.id} accessibilityRole="button" accessibilityLabel={`Play ${g.title}, ${MODE_LABEL[g.mode]}`} onPress={() => router.push(`${base}/games/play/${g.id}` as any)}
            style={{ width: 150, backgroundColor: '#FFF', borderRadius: 22, padding: 8, gap: 6, borderBottomWidth: 4, borderBottomColor: '#D6E4EE' }}>
            <View><GameThumb g={g} size={134} radius={16} />
              <View style={{ position: 'absolute', left: 6, top: 6, backgroundColor: g.mode === 'group' ? '#1F5FE0' : '#5B43E0', borderRadius: 9, paddingHorizontal: 7, height: 20, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Ionicons name={g.mode === 'group' ? 'people' : 'person'} size={10} color="#FFF" /><T style={{ color: '#FFF', fontSize: 10, fontFamily: fonts.semibold }}>{MODE_LABEL[g.mode]}</T>
              </View>
            </View>
            <T numberOfLines={1} style={{ fontFamily: fonts.semibold, fontSize: 14, paddingHorizontal: 2 }}>{g.title}</T>
            {g.age_group ? <T v="small" style={{ fontSize: 11, paddingHorizontal: 2, marginTop: -4 }}>Age {g.age_group}</T> : null}
          </Pressable>
        ))}
      </View>
    </View>
  );
}
