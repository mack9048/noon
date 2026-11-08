// Super admin screens from the second design round: Games, New game, Course approvals,
// Profile and Settings.
import React, { useState, useSyncExternalStore } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { Card, Row, Screen, T } from '@/components/ui';
import { demoNote, Tag } from '@/components/kit';
import { BottomActions, ChoiceChips, Input, MiniStat, Panel, Select, Status, Swatches, TileRows } from '@/components/kit2';
import { RoleProfileScreen, RoleSettingsScreen, T_ } from './roles2';
import { ApprovalStatus, decide, useApprovals } from '@/lib/approvals';
import { colors, fonts } from '@/theme/tokens';

/* ---------- Games store (demo, in memory) ---------- */
type GameRow = { name: string; cat: 'Letters' | 'Quran puzzles' | 'Duas & manners' | 'Fun & skill'; src: string; plays: string; status: 'Live' | 'Review' | 'Draft'; icon: keyof typeof Ionicons.glyphMap; g: [string, string] };
let games: GameRow[] = [
  { name: 'Ayah Puzzle', cat: 'Quran puzzles', src: 'Built-in', plays: '3.4k', status: 'Live', icon: 'extension-puzzle-outline', g: ['#8A6CFF', '#5B43E0'] },
  { name: 'Little Driver', cat: 'Letters', src: 'Built-in', plays: '8.1k', status: 'Live', icon: 'car-sport-outline', g: ['#3DD9A8', '#12A6A0'] },
  { name: 'Surah Match', cat: 'Quran puzzles', src: 'AI', plays: '1.2k', status: 'Live', icon: 'book-outline', g: ['#3DD9A8', '#0E7A50'] },
  { name: 'Dua Builder', cat: 'Duas & manners', src: 'Uploaded', plays: '—', status: 'Review', icon: 'hand-left-outline', g: ['#9BE15D', '#3E9B2F'] },
  { name: 'Wudu Steps', cat: 'Duas & manners', src: 'AI', plays: '—', status: 'Draft', icon: 'sparkles-outline', g: ['#4C8DF6', '#1F5FE0'] },
  { name: 'Ice Cream Shop', cat: 'Fun & skill', src: 'Uploaded', plays: '640', status: 'Live', icon: 'ice-cream-outline', g: ['#FF9EC7', '#E0368C'] },
];
const gl = new Set<() => void>();
const useGames = () => useSyncExternalStore((l) => { gl.add(l); return () => { gl.delete(l); }; }, () => games, () => games);
const CAT_TONE: Record<string, 'lav' | 'sky' | 'mint' | 'butter'> = { Letters: 'sky', 'Quran puzzles': 'lav', 'Duas & manners': 'mint', 'Fun & skill': 'butter' };

export function GamesAdminScreen() {
  const list = useGames();
  const [cat, setCat] = useState('All');
  const shown = list.filter((g) => cat === 'All' || g.cat === cat);
  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="h1">Games</T>
        <Pressable accessibilityRole="button" onPress={() => router.push('/super/games/new' as any)} style={{ height: 46, paddingHorizontal: 16, borderRadius: 23, backgroundColor: colors.ink, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="add" size={18} color="#FFF" /><T style={{ color: '#FFF', fontFamily: fonts.semibold }}>New game</T>
        </Pressable>
      </Row>
      <Row gap={8} style={{ marginTop: 12 }}>
        <MiniStat value={list.filter((g) => g.status === 'Live').length + 20} label="Live games" tint={colors.lav} />
        <MiniStat value="48k" label="Plays this month" tint={colors.mint} />
        <MiniStat value={list.filter((g) => g.status === 'Review').length + 2} label="Waiting review" tint={colors.butter} />
      </Row>
      <View style={{ marginTop: 12 }}>
        <ChoiceChips value={cat} onChange={setCat} options={['All', 'Letters', 'Quran puzzles', 'Duas & manners', 'Fun & skill'].map((k) => ({ key: k, label: k }))} />
      </View>
      <View style={{ gap: 8, marginTop: 12 }}>
        {shown.map((g) => (
          <Card key={g.name} onPress={() => demoNote(`${g.name}: open, edit or turn off this game.`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <LinearGradient colors={g.g} style={{ width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={g.icon} size={26} color="#FFF" /></LinearGradient>
            <View style={{ flex: 1, gap: 4 }}>
              <T style={{ fontFamily: fonts.semibold }}>{g.name}</T>
              <Row gap={6}><Tag text={g.cat} tone={CAT_TONE[g.cat]} /><T v="small" style={{ fontSize: 11 }}>{g.src} · {g.plays} plays</T></Row>
            </View>
            <Status text={g.status} />
          </Card>
        ))}
      </View>
    </Screen>
  );
}

const TYPES = [['ayah', 'Ayah order', 'extension-puzzle-outline'], ['pairs', 'Match pairs', 'git-compare-outline'], ['maze', 'Letter maze', 'git-network-outline'], ['picture', 'Picture quiz', 'image-outline'], ['drag', 'Drag & drop', 'hand-left-outline'], ['memory', 'Memory cards', 'grid-outline']] as const;
const TILE_COLOURS = ['#7B5CF0', '#12A6A0', '#3D8BFD', '#E0368C', '#FF7A45', '#56A22A'];

export function GameNewScreen() {
  const [mode, setMode] = useState<'ai' | 'html'>('ai');
  const [type, setType] = useState<(typeof TYPES)[number][0]>('ayah');
  const [prompt, setPrompt] = useState('Ayah order puzzle for Surah Al-Ikhlas. 4 ayahs, children aged 6–9, big Arabic word tiles, 10 stars for a perfect round.');
  const [busy, setBusy] = useState(false);
  const [made, setMade] = useState(true);
  const [file, setFile] = useState<string | null>(null);
  const [name, setName] = useState('Ayah Puzzle · Al-Ikhlas');
  const [cat, setCat] = useState<GameRow['cat']>('Quran puzzles');
  const [age, setAge] = useState('6 – 9');
  const [stars, setStars] = useState('10');
  const [cost, setCost] = useState('Free');
  const [colour, setColour] = useState(TILE_COLOURS[0]);
  const [showTo, setShowTo] = useState('All madrasas');

  const generate = () => { setBusy(true); setMade(false); setTimeout(() => { setBusy(false); setMade(true); }, 1200); };
  const pick = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: ['text/html', 'application/zip'], copyToCacheDirectory: false });
    if (!r.canceled && r.assets?.[0]) { setFile(r.assets[0].name); setMade(true); }
  };
  const publish = (draft: boolean) => {
    if (!name.trim()) return demoNote('Give the game a name.');
    games = [{ name: name.trim(), cat, src: mode === 'ai' ? 'AI' : 'Uploaded', plays: '—', status: draft ? 'Draft' : 'Live', icon: TYPES.find((t) => t[0] === type)?.[2] ?? 'game-controller-outline', g: [colour, colour] }, ...games];
    gl.forEach((l) => l());
    demoNote(draft ? 'Saved as a draft.' : `"${name.trim()}" is live for ${showTo.toLowerCase()}.`);
    router.replace('/super/games' as any);
  };

  return (
    <Screen overlay={<BottomActions>
      <Pressable accessibilityRole="button" onPress={() => publish(true)} style={{ height: 56, paddingHorizontal: 24, borderRadius: 28, backgroundColor: '#FFF', borderWidth: 1.5, borderColor: colors.line, justifyContent: 'center' }}><T style={{ fontFamily: fonts.semibold }}>Save draft</T></Pressable>
      <Pressable accessibilityRole="button" disabled={!made} onPress={() => publish(false)} style={{ flex: 1, height: 56, borderRadius: 28, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', opacity: made ? 1 : 0.5 }}><T style={{ color: '#FFF', fontFamily: fonts.semibold }}>Publish game</T></Pressable>
    </BottomActions>}>
      <Row style={{ justifyContent: 'space-between' }}><T v="h1">New game</T><Tag text="Draft" tone="butter" /></Row>
      <Row gap={6} style={{ marginTop: 12, backgroundColor: '#FFF', borderRadius: 26, padding: 4 }}>
        {([['ai', 'Create with AI', 'sparkles-outline'], ['html', 'Upload HTML', 'cloud-upload-outline']] as const).map(([k, l, i]) => (
          <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: mode === k }} onPress={() => setMode(k)} style={{ flex: 1, height: 46, borderRadius: 23, backgroundColor: mode === k ? colors.ink : 'transparent', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Ionicons name={i} size={16} color={mode === k ? '#FFF' : colors.ink} /><T style={{ color: mode === k ? '#FFF' : colors.ink, fontFamily: fonts.semibold }}>{l}</T>
          </Pressable>
        ))}
      </Row>
      {mode === 'ai' ? (
        <Panel title="Describe the game">
          <T v="small">Start from a game type</T>
          <TileRows cols={3} gap={8}>
            {TYPES.map(([k, l, i]) => (
              <Pressable key={k} accessibilityRole="radio" accessibilityState={{ selected: type === k }} onPress={() => setType(k)}
                style={{ height: 64, borderRadius: 16, borderWidth: 1.5, borderColor: type === k ? colors.violet : colors.line, backgroundColor: type === k ? '#F1EDFF' : '#FFF', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <Ionicons name={i} size={18} color={type === k ? colors.violet : colors.ink} /><T style={{ fontSize: 11, fontFamily: fonts.medium, color: type === k ? colors.violet : colors.ink }}>{l}</T>
              </Pressable>
            ))}
          </TileRows>
          <Input label="Prompt for Noon AI" value={prompt} onChangeText={setPrompt} multiline />
          <Pressable accessibilityRole="button" disabled={busy} onPress={generate}>
            <LinearGradient colors={['#5B43E0', '#C2307E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 52, borderRadius: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: busy ? 0.7 : 1 }}>
              <Ionicons name="sparkles" size={16} color="#FFF" /><T style={{ color: '#FFF', fontFamily: fonts.semibold }}>{busy ? 'Making your game…' : made ? 'Generate again' : 'Generate'}</T>
            </LinearGradient>
          </Pressable>
        </Panel>
      ) : (
        <Panel title="Upload a game">
          <T v="small">An HTML file (or a .zip with index.html). It runs in a safe sandbox inside the app.</T>
          <Pressable accessibilityRole="button" onPress={pick} style={{ height: 90, borderRadius: 20, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.line, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Ionicons name="cloud-upload-outline" size={24} color={colors.teal} /><T style={{ color: colors.teal, fontFamily: fonts.semibold }}>{file ?? 'Choose HTML or ZIP'}</T>
          </Pressable>
        </Panel>
      )}
      {made ? (
        <Panel title="Preview" right={<T v="small">{mode === 'ai' ? 'AI made · ayah-puzzle.html · 24 KB' : file ?? ''}</T>}>
          <LinearGradient colors={[colour, '#3B2FA8']} style={{ borderRadius: 22, padding: 16, gap: 12 }}>
            <Text style={{ fontFamily: fonts.fun, fontSize: 20, color: '#FFF' }}>{name || 'Game'}</Text>
            <Row gap={8} style={{ justifyContent: 'center' }}>{[0, 1, 2].map((i) => <View key={i} style={{ width: 66, height: 40, borderRadius: 10, borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.6)' }} />)}</Row>
            <Row gap={8} style={{ justifyContent: 'center', flexDirection: 'row-reverse' }}>{['هُوَ', 'قُلْ', 'أَحَدٌ', 'اللَّهُ'].map((w) => <View key={w} style={{ minWidth: 52, height: 44, borderRadius: 12, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}><Text style={{ fontFamily: fonts.arabic, fontSize: 18 }}>{w}</Text></View>)}</Row>
          </LinearGradient>
          <Row gap={10}>
            <Pressable accessibilityRole="button" onPress={() => demoNote('Demo: the game opens full screen for a test play.')} style={{ flex: 1, height: 46, borderRadius: 23, backgroundColor: '#F1EDFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Ionicons name="play" size={14} color={colors.violet} /><T style={{ color: colors.violet, fontFamily: fonts.semibold }}>Test play</T></Pressable>
            <Pressable accessibilityRole="button" onPress={() => demoNote('Demo: the game code opens here for a check before publishing.')} style={{ flex: 1, height: 46, borderRadius: 23, borderWidth: 1.5, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Ionicons name="code-slash" size={14} color={colors.ink} /><T style={{ fontFamily: fonts.semibold }}>View HTML</T></Pressable>
          </Row>
        </Panel>
      ) : null}
      <Panel title="Game details" style={{ marginBottom: 90 }}>
        <Input label="Game name" value={name} onChangeText={setName} />
        <Row gap={10}><Select label="Category" value={cat} options={['Letters', 'Quran puzzles', 'Duas & manners', 'Fun & skill'] as GameRow['cat'][]} onChange={setCat} /><Select label="Age" value={age} options={['4 – 6', '6 – 9', '9 – 12', 'All ages']} onChange={setAge} /></Row>
        <Row gap={10}><Select label="Stars to win" value={stars} options={['5', '10', '15', '20']} onChange={setStars} /><Select label="Unlock cost" value={cost} options={['Free', '50 stars', '80 stars', '120 stars', '150 stars']} onChange={setCost} /></Row>
        <T v="small" style={{ fontFamily: fonts.medium }}>Tile colour</T>
        <Swatches colorsList={TILE_COLOURS} value={colour} onChange={setColour} />
        <Select label="Show to" value={showTo} options={['All madrasas', 'Pro madrasas', 'Guests only']} onChange={setShowTo} />
      </Panel>
    </Screen>
  );
}

/* ---------- Course approvals ---------- */
export function ApprovalsScreen() {
  const list = useApprovals();
  const [tab, setTab] = useState<'waiting' | 'approved' | 'other'>('waiting');
  const shown = list.filter((c) => (tab === 'other' ? c.status === 'changes' || c.status === 'rejected' : c.status === tab));
  const act = async (id: number, s: Exclude<ApprovalStatus, 'waiting'>, title: string) => {
    try {
      await decide(id, s);
      demoNote(s === 'approved' ? `"${title}" is approved and visible to students.` : s === 'changes' ? `Asked the madrasa to change "${title}".` : `"${title}" was rejected.`);
    } catch (e: any) { demoNote(e?.message ?? 'Could not save.'); }
  };
  return (
    <Screen>
      <T v="h1">Course approvals</T>
      <T v="small">Courses created by madrasa admins</T>
      <Row gap={6} style={{ marginTop: 12, backgroundColor: '#FFF', borderRadius: 26, padding: 4 }}>
        {([['waiting', `Waiting · ${list.filter((c) => c.status === 'waiting').length}`], ['approved', 'Approved'], ['other', 'Changes / rejected']] as const).map(([k, l]) => (
          <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: tab === k }} onPress={() => setTab(k)} style={{ flex: 1, height: 44, borderRadius: 22, backgroundColor: tab === k ? colors.violet : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
            <T numberOfLines={1} style={{ color: tab === k ? '#FFF' : colors.muted, fontFamily: fonts.semibold, fontSize: 13 }}>{l}</T>
          </Pressable>
        ))}
      </Row>
      <View style={{ gap: 10, marginTop: 12 }}>
        {shown.map((c) => (
          <Card key={c.id} style={{ gap: 10 }}>
            <Row gap={12}>
              <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: c.tint[0], alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: fonts.arabic, fontSize: 22, color: c.tint[1] }}>{c.glyph}</Text></View>
              <View style={{ flex: 1 }}><T v="h3">{c.title}</T><T v="small">{c.madrasa} · {c.when}</T></View>
              {c.status !== 'waiting' ? <Status text={{ approved: 'Approved', changes: 'Review', rejected: 'Rejected', waiting: '' }[c.status]} /> : null}
            </Row>
            <Row gap={6} style={{ flexWrap: 'wrap' }}>{c.tags.map((t) => <View key={t} style={{ backgroundColor: '#EEF3F5', borderRadius: 10, paddingHorizontal: 8, height: 24, justifyContent: 'center' }}><T style={{ fontSize: 11, fontFamily: fonts.medium }}>{t}</T></View>)}</Row>
            {c.status === 'waiting' ? (
              <Row gap={8}>
                <Pressable accessibilityRole="button" onPress={() => act(c.id, 'rejected', c.title)} style={{ flex: 1, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: '#F3B7BD', alignItems: 'center', justifyContent: 'center' }}><T style={{ color: colors.red, fontFamily: fonts.semibold }}>Reject</T></Pressable>
                <Pressable accessibilityRole="button" onPress={() => act(c.id, 'changes', c.title)} style={{ flex: 1.2, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}><T style={{ fontFamily: fonts.semibold }}>Ask changes</T></Pressable>
                <Pressable accessibilityRole="button" onPress={() => act(c.id, 'approved', c.title)} style={{ flex: 1.1, height: 44, borderRadius: 22, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}><T style={{ color: '#FFF', fontFamily: fonts.semibold }}>Approve</T></Pressable>
              </Row>
            ) : null}
          </Card>
        ))}
        {!shown.length ? <T v="small" style={{ textAlign: 'center', padding: 20 }}>Nothing here.</T> : null}
      </View>
    </Screen>
  );
}

/* ---------- Super admin profile & settings ---------- */
export function SuperProfileScreen() {
  return (
    <RoleProfileScreen g={['#0B5166', '#1F8AA8']} sub="Super admin · Noon Learn HQ" pill="Platform owner · All tenants"
      stats={[['46', 'Madrasas'], ['12.4k', 'Students'], ['₹8.2L', 'This month']]} chipsTitle="My role & access"
      chips={[{ text: 'All tenants', tint: colors.sky }, { text: 'Billing', tint: colors.butter }, { text: 'Content & courses', tint: colors.lav }, { text: 'Approvals', tint: colors.mint }]}
      rows={[['Role', 'Owner (full access)'], ['Email', 'shameer@noonlearn.app'], ['Phone', '+91 98 •••• 210'], ['2-step login', 'On · authenticator app'], ['Last login', 'Today · Kochi'], ['Team members', '5 admins']]}
      tiles={[
        { label: 'Team & roles', icon: 'people-outline', tint: colors.sky, note: 'Demo: add admins and choose what each can do.' },
        { label: 'Billing', icon: 'wallet-outline', tint: colors.butter, href: '/super/billing' },
        { label: 'Activity log', icon: 'time-outline', tint: colors.lav, note: 'Demo: every admin action is listed here.' },
        { label: 'Settings', icon: 'settings-outline', tint: colors.mint, href: '/super/settings' },
      ]} settingsHref="/super/settings" />
  );
}

export function SuperSettingsScreen() {
  return (
    <RoleSettingsScreen roleLine="Super admin · Noon Learn HQ" profileHref="/super/profile" footer="Noon Learn super admin · v1.0" groups={[
      { title: 'Platform', rows: [
        { icon: 'color-palette-outline', tint: T_.lav, label: 'App name & branding', value: 'Noon Learn' },
        { icon: 'globe-outline', tint: T_.sky, label: 'Default language', value: 'English · മലയാളം' },
        { icon: 'business-outline', tint: T_.mint, label: 'New madrasa sign-ups', sub: 'Madrasas can register themselves', toggle: true },
        { icon: 'person-outline', tint: T_.butter, label: 'Guest mode', sub: '2 free lessons per subject', toggle: true },
      ] },
      { title: 'Courses & content', rows: [
        { icon: 'checkmark-circle-outline', tint: T_.mint, label: 'Approve madrasa courses', sub: 'Admins need approval to publish', toggle: true, href: '/super/approvals' },
        { icon: 'pie-chart-outline', tint: T_.butter, label: 'Revenue share', sub: 'Madrasa / Noon Learn', value: '70 / 30' },
        { icon: 'sparkles-outline', tint: T_.pink, label: 'Noon AI tutor', sub: 'On for all students', toggle: true },
      ] },
      { title: 'Billing', rows: [
        { icon: 'pricetags-outline', tint: T_.butter, label: 'Plans & prices', value: '3 plans', href: '/super/billing' },
        { icon: 'card-outline', tint: T_.sky, label: 'Payment gateway', value: 'Razorpay' },
        { icon: 'receipt-outline', tint: T_.lav, label: 'GST / tax', value: '18%' },
      ] },
      { title: 'Security', rows: [
        { icon: 'people-outline', tint: T_.sky, label: 'Team & roles', value: '5 admins' },
        { icon: 'shield-checkmark-outline', tint: T_.mint, label: '2-step login for admins', sub: 'Required for all admin accounts', toggle: true },
        { icon: 'server-outline', tint: T_.lav, label: 'Backups', value: 'Daily · 2 AM' },
        { icon: 'construct-outline', tint: T_.pink, label: 'Maintenance mode', sub: 'Shows a notice to every user', toggle: false },
      ] },
    ]} />
  );
}
