// Student screens from the design canvas: My Classroom, AI tutor, Salah report, profile,
// fees, attendance, audio books, settings and help.
import { NooniChat } from '@/components/Nooni';
import { money } from '@/lib/money';
import React, { useState } from 'react';
import { Linking, Platform, Pressable, Switch, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Grid, Header, Loading, Row, Screen, Segmented, T } from '@/components/ui';
import { Avatar, Band, Chips, demoNote, Glyph, ListRow, pastel, Progress, Section, SmallButton, Stat, Tabs, Tag, Tile } from '@/components/kit';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useMyAttendancePercent } from './attendance';
import { profileLine, profileRows, splitName } from '@/lib/profile';
import { useLearnSpaces } from '@/lib/learnSpace';
import { LearnTiles, SpacePicker } from './learnspace';
import { useBase } from '@/lib/useBase';
import { useLayout } from '@/lib/useLayout';
import { AUDIO_BOOKS, CLASSROOM, HELP_FAQ, PROFILE, SALAH_SCORES } from '@/lib/demo';
import { colors, fonts } from '@/theme/tokens';
import type { StudyTool } from '@/lib/types';

const rupee = (n: number) => money(n);

/* ---------- My Classroom ---------- */
export function ClassroomScreen() {
  const base = useBase();
  const [tab, setTab] = useState<'up' | 'pend' | 'done'>('up');
  const rows = { up: CLASSROOM.upcoming, pend: CLASSROOM.pending, done: CLASSROOM.done }[tab];
  const learn = useLearnSpaces();
  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between', minHeight: 56 }}>
        <SpacePicker spaces={learn.spaces} selected={learn.selected} onSelect={(sp) => learn.select(sp.key)} />
        <Pressable accessibilityLabel="Profile" onPress={() => router.push(`${base}/profile` as any)}><Avatar name="Ayisha" size={52} tint={pastel.white} /></Pressable>
      </Row>
      <T v="h1" style={{ marginTop: 12 }}>My Classroom</T>

      <Card tint={colors.sky[0]} style={{ marginTop: 14, minHeight: 128, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', right: 18, top: 16 }}><Glyph text={CLASSROOM.live.glyph} size={92} tint={['#7FBFD9', '#0B3F50']} /></View>
        <Row gap={6}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#D6336C' }} /><T v="small" style={{ color: '#0B3F50' }}>Live now</T></Row>
        <T style={{ fontFamily: fonts.semibold, fontSize: 24, color: '#0B2A35' }}>{CLASSROOM.live.title}</T>
        <T v="small" style={{ color: '#1F4A58' }}>{CLASSROOM.live.teacher} · {CLASSROOM.live.time}</T>
        <View style={{ alignSelf: 'flex-end', marginTop: 8 }}>
          <Button title="Join now" icon="videocam" onPress={() => router.push(`${base}/live` as any)} style={{ height: 42 }} />
        </View>
      </Card>

      <Tabs value={tab} onChange={setTab} options={[
        { key: 'up', label: `Upcoming · ${CLASSROOM.counts.up}` },
        { key: 'pend', label: `Pending · ${CLASSROOM.counts.pend}` },
        { key: 'done', label: `Done · ${CLASSROOM.counts.done}` },
      ]} />
      <View style={{ gap: 8 }}>
        {rows.map((r) => (
          <ListRow key={r.title + r.meta} left={<Glyph text={r.glyph} size={52} tint={pastel[r.tint]} />} title={r.title} sub={`${r.sub} · ${r.meta}`}
            right={<SmallButton title={r.action} onPress={() => demoNote(`Demo: "${r.action}" will work when classes are connected to the backend.`)} />} />
        ))}
      </View>

      <View style={{ marginTop: 14 }}>
        {learn.selected ? <T v="small" style={{ marginBottom: 8 }}>Showing {learn.selected.title} · {learn.selected.subtitle}</T> : null}
        <LearnTiles space={learn.selected} />
      </View>
    </Screen>
  );
}

/* ---------- Noon AI tutor ---------- */
type Msg = { me: boolean; text: string; example?: string };
const TUTOR_ANSWERS: Record<string, Msg> = {
  'What is sukoon?': { me: false, text: 'Sukoon is a small circle on a letter. It means the letter has no vowel — you stop on it softly.', example: 'مِنْ' },
  'Explain harakath': { me: false, text: 'Harakath are the short vowel marks: fatha (a) on top, kasra (i) below and damma (u) like a small waw on top.', example: 'بَ بِ بُ' },
  'Quiz me on Surah Al-Mulk': { me: false, text: 'Question 1: How many ayahs are in Surah Al-Mulk? Tap to answer: 20, 30 or 40?' },
};

/** "Ask AI" page: Nooni, the voice assistant, full screen. */
export function AiTutorScreen() {
  const { isPhone } = useLayout();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingBottom: isPhone ? 96 : 0 }}>
      <View style={{ flex: 1, width: '100%', maxWidth: 760, alignSelf: 'center' }}><NooniChat onClose={() => (router.canGoBack() ? router.back() : router.replace('/' as any))} /></View>
    </View>
  );
}

/* ---------- Salah report + PDF ---------- */
function ScoreRows() {
  return (
    <Card style={{ gap: 10 }}>
      {SALAH_SCORES.map((s) => (
        <Row key={s.name} gap={10}>
          <T style={{ flex: 1.3, fontSize: 13 }}>{s.name}</T>
          <View style={{ flex: 1 }}><Progress value={s.pct} color={s.pct < 80 ? '#D9A92A' : colors.teal} /></View>
          <T style={{ width: 44, textAlign: 'right', fontFamily: fonts.semibold, fontSize: 13, color: s.pct < 80 ? '#8A5A0F' : colors.teal }}>{s.pct}%</T>
        </Row>
      ))}
    </Card>
  );
}

export function SalahReportScreen() {
  const base = useBase();
  return (
    <Screen>
      <Band tint={colors.sky[0]} height={220} />
      <Header title="Salah Assessment" subtitle="October 2026" right={<Text style={{ fontFamily: fonts.arabic, fontSize: 30, color: colors.teal }}>الصلاة</Text>} />
      <Tag text="Ayisha Abdulla · Checked by Abdul Vahid · 24 Oct" tone="white" />
      <Card style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 7, borderColor: colors.teal, alignItems: 'center', justifyContent: 'center' }}><T style={{ fontFamily: fonts.semibold }}>94%</T></View>
        <View style={{ flex: 1 }}><T v="h3">Excellent</T><T v="small">18 steps checked · 2 to practise</T></View>
        <Tag text="+3% vs Sep" tone="mint" />
      </Card>
      <Section title="Step by step" />
      <ScoreRows />
      <Card tint={colors.butter[0]} style={{ marginTop: 12 }}><T style={{ color: colors.butter[1] }}><T style={{ fontFamily: fonts.semibold, color: colors.butter[1] }}>Remarks: </T>Very good. Practise Surah Al-Fatihah tajweed and Qunoot at home.</T></Card>
      <Row gap={10} style={{ marginTop: 16 }}>
        <View style={{ flex: 1 }}><Button title="Share" kind="ghost" icon="share-outline" onPress={() => demoNote('Demo: sharing opens your phone share sheet in the app.')} /></View>
        <View style={{ flex: 1 }}><Button title="PDF report" icon="download-outline" onPress={() => router.push(`${base}/report-pdf` as any)} /></View>
      </Row>
    </Screen>
  );
}

export function ReportPdfScreen() {
  return (
    <Screen>
      <Header title="Report card" subtitle="salah-report-oct-2026.pdf" />
      <Card style={{ gap: 10 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T style={{ fontFamily: fonts.semibold, fontSize: 20, color: colors.teal }}>noon <T style={{ color: colors.violet }}>Learn</T></T>
          <View style={{ backgroundColor: colors.ink, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}><Text style={{ color: '#FFF', fontFamily: fonts.semibold }}>SALAH  <Text style={{ fontFamily: fonts.arabic }}>الصلاة</Text></Text></View>
        </Row>
        <T v="label">STUDENT ASSESSMENT REPORT</T>
        <View style={{ backgroundColor: colors.bg, borderRadius: 12, padding: 10, flexDirection: 'row', flexWrap: 'wrap', rowGap: 4 }}>
          {[['Name', 'Ayisha Abdulla'], ['Class', 'Class 5'], ['Month', 'October 2026'], ['Overall', '94% · Excellent']].map(([k, v]) => (
            <T key={k} style={{ width: '50%', fontSize: 12 }}>{k} <T style={{ fontFamily: fonts.semibold, fontSize: 12 }}>{v}</T></T>
          ))}
        </View>
        <ScoreRows />
        <T style={{ fontSize: 12 }}>Remarks: Practise Al-Fatihah tajweed and Qunoot at home.</T>
        <T v="small">Checked by Abdul Vahid · 24 Oct</T>
      </Card>
      <Row gap={10} style={{ marginTop: 16 }}>
        <View style={{ flex: 1 }}><Button title="Share" kind="ghost" icon="share-outline" onPress={() => demoNote()} /></View>
        <View style={{ flex: 1 }}><Button title="Download PDF" icon="download-outline" onPress={() => demoNote('Demo: the PDF is created by the backend (step 3).')} /></View>
      </Row>
    </Screen>
  );
}

/* ---------- Profile ---------- */
export function ProfileScreen() {
  const { user } = useAuth();
  const nm = splitName(user?.name);
  return (
    <Screen>
      <Band tint={colors.pink[0]} height={230} />
      <Header title="" right={<SmallButton title="Edit" onPress={() => demoNote('To change these details, please ask your institution office.')} />} />
      <Row gap={14}>
        <Avatar name={nm.first} size={84} tint={pastel.white} />
        <View style={{ flex: 1 }}>
          <T style={{ fontSize: 26, fontFamily: fonts.light }}>{nm.first}</T>
          {nm.last ? <T style={{ fontSize: 28, fontFamily: fonts.semibold }}>{nm.last}</T> : null}
          <T v="small">{profileLine(user)}</T>
        </View>
      </Row>
      <View style={{ marginTop: 22 }}>
        <Grid cols={{ phone: 3, tablet: 3, desktop: 3 }} gap={8}>
          <Stat label="Attendance" value={useMyAttendancePercent()} tint={pastel.mint} />
          <Stat label="Stars" value={PROFILE.stats.stars} tint={pastel.butter} />
          <Stat label="Avg score" value={PROFILE.stats.avg} tint={pastel.sky} />
        </Grid>
      </View>
      <Section title="Details" />
      <Card style={{ paddingVertical: 6 }}>
        {profileRows(user).map(([k, v], i) => (
          <Row key={k} style={{ justifyContent: 'space-between', minHeight: 50, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
            <T v="small" style={{ fontSize: 14 }}>{k}</T><T style={{ fontFamily: fonts.medium }}>{v}</T>
          </Row>
        ))}
      </Card>
    </Screen>
  );
}

/* ---------- Audio books ---------- */
export function AudioBooksScreen() {
  // Audio books uploaded by Noon Learn (Content › Resources); the sample library shows until there are some.
  const real = useApi<StudyTool[]>('/study-tools?type=audio');
  if (real.loading && !real.data) return <Screen><Header title="Audio Books" /><Loading /></Screen>;
  if (real.data?.length) return <RealAudioBooks books={real.data} />;
  return <SampleAudioBooks />;
}

function RealAudioBooks({ books }: { books: StudyTool[] }) {
  const [now, setNow] = useState<StudyTool>(books[0]);
  const tints = [pastel.sky, pastel.mint, pastel.lav, pastel.pink, pastel.butter];
  const play = (b: StudyTool) => { setNow(b); api.post(`/study-tools/${b.id}/open`).catch(() => {}); if (Platform.OS !== 'web' && b.file_url) Linking.openURL(b.file_url); };
  return (
    <Screen>
      <Header title="Audio Books" />
      <Card tint={colors.sky[0]} style={{ gap: 10 }}>
        <Row gap={12}><Glyph text="♪" size={52} tint={pastel.white} /><View style={{ flex: 1 }}><T v="small">Now playing</T><T v="h3" auto>{now.title}</T>{now.author ? <T v="small">{now.author}</T> : null}</View></Row>
        {Platform.OS === 'web' && now.file_url
          ? React.createElement('audio', { key: now.id, src: now.file_url, controls: true, autoPlay: true, controlsList: 'nodownload', style: { width: '100%' } })
          : <Button title="Play" icon="play" onPress={() => now.file_url && Linking.openURL(now.file_url)} />}
      </Card>
      <Section title="Library" />
      <View style={{ gap: 8 }}>
        {books.map((b, i) => (
          <ListRow key={b.id} left={<Glyph text="♪" size={44} tint={tints[i % tints.length]} />} title={b.title} sub={[b.author, b.is_new ? 'New' : null].filter(Boolean).join(' · ') || 'Audio book'}
            right={<Pressable accessibilityLabel={`Play ${b.title}`} onPress={() => play(b)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: b.id === now.id ? colors.violet : colors.ink, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={b.id === now.id ? 'volume-high' : 'play'} size={18} color="#FFF" /></Pressable>} />
        ))}
      </View>
    </Screen>
  );
}

function SampleAudioBooks() {
  const [cat, setCat] = useState<'all' | 'stories' | 'duas' | 'quran'>('all');
  const [now, setNow] = useState<(typeof AUDIO_BOOKS)[number]>(AUDIO_BOOKS[0]);
  const [playing, setPlaying] = useState(true);
  const list = AUDIO_BOOKS.filter((b) => cat === 'all' || b.cat === cat);
  return (
    <Screen>
      <Header title="Audio Books" subtitle="Sample library" />
      <Chips value={cat} onChange={setCat} options={[{ key: 'all', label: 'All' }, { key: 'stories', label: 'Stories' }, { key: 'duas', label: 'Duas' }, { key: 'quran', label: 'Quran' }]} />
      <Card tint={colors.sky[0]} style={{ gap: 10 }}>
        <Row gap={12}><Glyph text={now.glyph} size={52} tint={pastel.white} /><View style={{ flex: 1 }}><T v="small">Now playing</T><T v="h3">{now.title}</T><T v="small">{now.part}</T></View></Row>
        <Progress value={38} color={colors.ink} track="#FFFFFF" />
        <Row style={{ justifyContent: 'space-between' }}><T v="small">3:24</T><T v="small">{now.len}</T></Row>
        <Row gap={24} style={{ justifyContent: 'center' }}>
          <Pressable accessibilityLabel="Back 15 seconds"><T style={{ fontFamily: fonts.semibold }}>−15</T></Pressable>
          <Pressable accessibilityLabel={playing ? 'Pause' : 'Play'} onPress={() => setPlaying(!playing)} style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={playing ? 'pause' : 'play'} size={24} color="#FFF" /></Pressable>
          <Pressable accessibilityLabel="Forward 15 seconds"><T style={{ fontFamily: fonts.semibold }}>+15</T></Pressable>
        </Row>
      </Card>
      <Section title="Library" />
      <View style={{ gap: 8 }}>
        {list.map((b) => (
          <ListRow key={b.title} left={<Glyph text={b.glyph} size={44} tint={pastel[b.tint]} />} title={b.title} sub={b.meta}
            right={<Pressable accessibilityLabel={`Play ${b.title}`} onPress={() => { setNow(b); setPlaying(true); }} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="play" size={18} color="#FFF" /></Pressable>} />
        ))}
      </View>
    </Screen>
  );
}

/* ---------- Settings ---------- */
export function SettingsScreen() {
  const { user, logout } = useAuth();
  const [dark, setDark] = useState(false);
  const [year, setYear] = useState('2026–27');
  const row = (icon: keyof typeof Ionicons.glyphMap, tint: readonly [string, string], label: string, right: React.ReactNode, onPress?: () => void, first = false) => (
    <Pressable accessibilityRole={onPress ? 'button' : undefined} onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, borderTopWidth: first ? 0 : 1, borderTopColor: colors.line }}>
      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: tint[0], alignItems: 'center', justifyContent: 'center' }}><Ionicons name={icon} size={18} color={tint[1]} /></View>
      <T style={{ flex: 1 }}>{label}</T>{right}
    </Pressable>
  );
  const chev = <Ionicons name="chevron-forward" size={18} color={colors.muted} />;
  return (
    <Screen>
      <ListRow left={<Avatar name={user?.name ?? 'A'} tint={pastel.lav} />} title={user?.name ?? 'Me'} sub={profileLine(user)}
        right={<Ionicons name="chevron-down" size={20} color={colors.ink} />} onPress={() => demoNote('Demo: parents with more than one child switch here.')} />
      <T v="h1" style={{ marginTop: 16 }}>Settings</T>
      <Card tint={colors.sky[0]} style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar name="Muhammed" tint={pastel.white} /><View style={{ flex: 1 }}><T v="h3">Muhammed</T><T v="small">Parent account</T></View><Tag text="Valid" tone="mint" />
      </Card>
      <Section title="Account" />
      <Card style={{ paddingVertical: 4 }}>
        {row('calendar-outline', colors.lav, 'Academic year', <SmallButton title={year} onPress={() => setYear(year === '2026–27' ? '2025–26' : '2026–27')} />, undefined, true)}
        {row('swap-horizontal', colors.mint, 'Switch student', chev, () => demoNote('Demo: parents with more than one child switch here.'))}
        {row('key-outline', colors.butter, 'Change password', chev, () => router.push('/account/password' as any))}
      </Card>
      <Section title="More" />
      <Card style={{ paddingVertical: 4 }}>
        {row('moon-outline', colors.sky, 'Dark mode', <Switch value={dark} onValueChange={setDark} accessibilityLabel="Dark mode" />, undefined, true)}
        {row('shield-checkmark-outline', colors.mint, 'Privacy policy', chev, () => demoNote('Demo: links to your privacy policy page.'))}
        {row('information-circle-outline', colors.lav, 'App details', <T v="small">v1.0</T>)}
      </Card>
      <Pressable accessibilityRole="button" onPress={() => logout().then(() => router.replace('/login' as any))}
        style={{ marginTop: 16, height: 52, borderRadius: 26, backgroundColor: colors.pink[0], flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Ionicons name="log-out-outline" size={20} color={colors.red} /><T style={{ color: colors.red, fontFamily: fonts.semibold }}>Log out</T>
      </Pressable>
    </Screen>
  );
}

/* ---------- Help ---------- */
export function HelpScreen() {
  const base = useBase();
  const [open, setOpen] = useState(0);
  const [q, setQ] = useState('');
  const faq = HELP_FAQ.filter(([question]) => question.toLowerCase().includes(q.toLowerCase()));
  return (
    <Screen>
      <Header title="Help" />
      <Row style={{ backgroundColor: '#FFF', borderRadius: 24, borderWidth: 1.5, borderColor: colors.line, paddingHorizontal: 14, height: 48 }}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput value={q} onChangeText={setQ} placeholder="How can we help?" placeholderTextColor={colors.faint} style={{ flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink, outlineStyle: 'none' } as any} />
      </Row>
      <Section title="Common questions" />
      <View style={{ gap: 8 }}>
        {faq.map(([question, answer], i) => (
          <Pressable key={question} accessibilityRole="button" accessibilityState={{ expanded: open === i }} onPress={() => setOpen(open === i ? -1 : i)}
            style={{ backgroundColor: '#FFF', borderRadius: 20, borderWidth: 1.5, borderColor: colors.line, padding: 14, gap: 8 }}>
            <Row style={{ justifyContent: 'space-between' }}><T style={{ flex: 1, fontFamily: fonts.medium }}>{question}</T><Ionicons name={open === i ? 'chevron-up' : 'chevron-down'} size={18} color={colors.ink} /></Row>
            {open === i ? <T v="small" style={{ fontSize: 13 }}>{answer}</T> : null}
          </Pressable>
        ))}
      </View>
      <Section title="Contact the institution" />
      <Grid cols={{ phone: 2, tablet: 2, desktop: 2 }} gap={10}>
        <Tile label="Call office" sub="1726 4002" icon="call-outline" tint={pastel.mint} onPress={() => demoNote('Demo: opens the phone dialler.')} />
        <Tile label="Chat with admin" sub="Replies in a few hours" icon="chatbubble-outline" tint={pastel.sky} href={`${base}/chat`} />
      </Grid>
    </Screen>
  );
}
