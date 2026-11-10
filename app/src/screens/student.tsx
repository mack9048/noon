// Student screens from the design canvas: My Classroom, AI tutor, Salah report, profile,
// fees, attendance, audio books, settings and help.
import React, { useState } from 'react';
import { Pressable, Switch, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Grid, Header, Row, Screen, Segmented, T } from '@/components/ui';
import { Avatar, Band, Chips, demoNote, Glyph, ListRow, pastel, Progress, Section, SmallButton, Stat, Tabs, Tag, Tile } from '@/components/kit';
import { useAuth } from '@/lib/auth';
import { useLearnSpaces } from '@/lib/learnSpace';
import { LearnTiles, SpacePicker } from './learnspace';
import { useBase } from '@/lib/useBase';
import { ATTENDANCE, AUDIO_BOOKS, CLASSROOM, FEES, HELP_FAQ, PROFILE, SALAH_SCORES } from '@/lib/demo';
import { colors, fonts } from '@/theme/tokens';

const rupee = (n: number) => '₹' + n.toLocaleString('en-IN');

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
          <Button title="Join now" icon="videocam" onPress={() => router.push(`${base}/live/1` as any)} style={{ height: 42 }} />
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

export function AiTutorScreen() {
  const { user } = useAuth();
  const [msgs, setMsgs] = useState<Msg[]>([{ me: false, text: `Assalamu alaikum, ${user?.name ?? 'friend'}! What shall we study today?` }]);
  const [draft, setDraft] = useState('');
  const ask = (q: string) => {
    if (!q.trim()) return;
    const reply = TUTOR_ANSWERS[q] ?? { me: false, text: 'The AI tutor is coming soon and will answer any lesson question. Try one of the suggestions above.' };
    setMsgs((m) => [...m, { me: true, text: q }, reply]);
    setDraft('');
  };
  return (
    <Screen>
      <Band tint={colors.pink[0]} height={210} />
      <Header title="Study Assistant" subtitle="Noon AI" right={<Tag text="Ask anything" tone="sky" />} />
      <View style={{ gap: 10 }}>
        {msgs.map((m, i) => (
          <View key={i} style={{ alignSelf: m.me ? 'flex-end' : 'flex-start', maxWidth: '85%', backgroundColor: m.me ? colors.teal : '#FFF', borderRadius: 20, padding: 12, borderWidth: m.me ? 0 : 1.5, borderColor: colors.line }}>
            <T style={{ color: m.me ? '#FFF' : colors.ink }}>{m.text}</T>
            {m.example ? <View style={{ marginTop: 8, backgroundColor: colors.lav[0], borderRadius: 14, padding: 10 }}><Text style={{ fontFamily: fonts.arabic, fontSize: 28, color: colors.lav[1] }}>{m.example}</Text></View> : null}
          </View>
        ))}
        {msgs.length === 1 ? (
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            {Object.keys(TUTOR_ANSWERS).map((q) => <SmallButton key={q} title={q} onPress={() => ask(q)} />)}
          </Row>
        ) : null}
      </View>
      <Row style={{ marginTop: 16, backgroundColor: '#FFF', borderRadius: 28, borderWidth: 1.5, borderColor: colors.line, paddingLeft: 16, paddingRight: 6, height: 56 }}>
        <TextInput value={draft} onChangeText={setDraft} onSubmitEditing={() => ask(draft)} placeholder="Write a message" placeholderTextColor={colors.faint}
          style={{ flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink, outlineStyle: 'none' } as any} />
        <Pressable accessibilityLabel="Speak" onPress={() => demoNote('Demo: voice questions come with the AI tutor backend.')} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="mic-outline" size={22} color={colors.muted} /></Pressable>
        <Pressable accessibilityLabel="Send" onPress={() => ask(draft)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="send" size={18} color="#FFF" /></Pressable>
      </Row>
    </Screen>
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
          {[['Name', 'Ayisha Abdulla'], ['Class', 'Madrasa 5'], ['Month', 'October 2026'], ['Overall', '94% · Excellent']].map(([k, v]) => (
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
  return (
    <Screen>
      <Band tint={colors.pink[0]} height={230} />
      <Header title="" right={<SmallButton title="Edit" onPress={() => demoNote('Demo: profile changes are done by the madrasa office for now.')} />} />
      <Row gap={14}>
        <Avatar name={PROFILE.first} size={84} tint={pastel.white} />
        <View>
          <T style={{ fontSize: 26, fontFamily: fonts.light }}>{PROFILE.first}</T>
          <T style={{ fontSize: 28, fontFamily: fonts.semibold }}>{PROFILE.last}</T>
          <T v="small">{PROFILE.line}</T>
        </View>
      </Row>
      <View style={{ marginTop: 22 }}>
        <Grid cols={{ phone: 3, tablet: 3, desktop: 3 }} gap={8}>
          <Stat label="Attendance" value={PROFILE.stats.attendance} tint={pastel.mint} />
          <Stat label="Stars" value={PROFILE.stats.stars} tint={pastel.butter} />
          <Stat label="Avg score" value={PROFILE.stats.avg} tint={pastel.sky} />
        </Grid>
      </View>
      <Section title="Details" />
      <Card style={{ paddingVertical: 6 }}>
        {PROFILE.details.map(([k, v], i) => (
          <Row key={k} style={{ justifyContent: 'space-between', minHeight: 50, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
            <T v="small" style={{ fontSize: 14 }}>{k}</T><T style={{ fontFamily: fonts.medium }}>{v}</T>
          </Row>
        ))}
      </Card>
    </Screen>
  );
}

/* ---------- Fees ---------- */
export function FeesScreen() {
  const [view, setView] = useState<'due' | 'paid' | 'rcpt'>('due');
  const [paidNow, setPaidNow] = useState<string[]>([]);
  const due = FEES.due.filter((d) => !paidNow.includes(d.id));
  const total = due.reduce((s, d) => s + d.amount, 0);
  const pay = (ids: string[]) => { demoNote('Demo: payment opens Razorpay (UPI, card, net banking) once fees are connected.'); setPaidNow((p) => [...p, ...ids]); };
  return (
    <Screen>
      <Header title="Fees" />
      <Segmented value={view} onChange={setView} options={[
        { key: 'due', label: `Due fees ${due.length ? `· ${due.length}` : ''}` }, { key: 'paid', label: 'Paid' }, { key: 'rcpt', label: 'Receipts' },
      ]} />
      {view === 'due' ? (
        <>
          <Card tint={colors.butter[0]} style={{ marginTop: 14, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <View><T v="small" style={{ color: colors.butter[1] }}>Total due</T><T style={{ fontSize: 34, fontFamily: fonts.semibold, color: colors.ink }}>{rupee(total)}</T></View>
            {due.length ? <SmallButton title="Pay all" filled tint={colors.ink} onPress={() => pay(due.map((d) => d.id))} /> : null}
          </Card>
          <Section title="To pay" />
          {due.length ? due.map((d) => (
            <ListRow key={d.id} style={{ marginBottom: 8 }} left={<Glyph text="⏱" size={44} tint={pastel.butter} />} title={d.title} sub={`${rupee(d.amount)} · ${d.due}`}
              right={<SmallButton title="Pay" filled tint={colors.ink} onPress={() => pay([d.id])} />} />
          )) : <Card tint={colors.mint[0]}><T v="h3" style={{ color: colors.mint[1] }}>No fees due</T><T style={{ color: colors.mint[1] }}>Jazakallah khair! Receipts are ready.</T></Card>}
        </>
      ) : (
        <View style={{ marginTop: 14, gap: 8 }}>
          {FEES.paid.map((p) => view === 'paid' ? (
            <ListRow key={p.receipt} left={<Glyph text="✓" size={44} tint={pastel.mint} />} title={p.title} sub={`Paid ${p.date} · ${p.method}`} right={<T style={{ fontFamily: fonts.semibold }}>{rupee(p.amount)}</T>} />
          ) : (
            <ListRow key={p.receipt} left={<Glyph text="₹" size={44} tint={pastel.sky} />} title={p.receipt} sub={`${p.title} · ${rupee(p.amount)}`}
              right={<Row gap={4}>
                <Pressable accessibilityLabel={`Share receipt ${p.receipt}`} onPress={() => demoNote()} style={{ padding: 8 }}><Ionicons name="share-outline" size={20} color={colors.teal} /></Pressable>
                <Pressable accessibilityLabel={`Download receipt ${p.receipt}`} onPress={() => demoNote('Demo: receipts are created as PDF by the backend (step 3).')} style={{ padding: 8 }}><Ionicons name="download-outline" size={20} color={colors.teal} /></Pressable>
              </Row>} />
          ))}
        </View>
      )}
    </Screen>
  );
}

/* ---------- Attendance ---------- */
export function AttendanceScreen() {
  const base = useBase();
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('week');
  const c = ATTENDANCE[period];
  return (
    <Screen>
      <Header title="Attendance" subtitle={`Today · ${ATTENDANCE.today}`} right={<Pressable accessibilityLabel="Open calendar" onPress={() => demoNote('Demo: the monthly calendar comes in step 2.')} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="calendar-outline" size={22} color={colors.ink} /></Pressable>} />
      <Card tint={colors.mint[0]} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#2E8B47', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="checkmark" size={24} color="#FFF" /></View>
        <View style={{ flex: 1 }}><T style={{ color: colors.mint[1] }}>You joined today’s class on time.</T><T style={{ fontFamily: fonts.semibold, color: colors.mint[1] }}>MashaAllah, keep it up!</T></View>
      </Card>
      <Card style={{ marginTop: 12, gap: 12 }}>
        <T v="h3">My presence</T>
        <Segmented value={period} onChange={setPeriod} activeColor={colors.yellow} options={[{ key: 'week', label: 'This week' }, { key: 'month', label: 'This month' }, { key: 'year', label: 'This year' }]} />
        <Grid cols={{ phone: 4, tablet: 4, desktop: 4 }} gap={6}>
          <Stat label="Present" value={c.present} tint={pastel.mint} />
          <Stat label="Absent" value={c.absent} tint={pastel.pink} />
          <Stat label="Halfday" value={c.half} tint={pastel.butter} />
          <Stat label="Leave" value={c.leave} tint={pastel.lav} />
        </Grid>
      </Card>
      <View style={{ marginTop: 12 }}>
        <Grid cols={{ phone: 2, tablet: 2, desktop: 2 }} gap={10}>
          <Stat label="On time" value={c.ontime} tint={pastel.white} />
          <Stat label="Joined late" value={c.late} tint={pastel.white} />
        </Grid>
      </View>
      <View style={{ alignItems: 'flex-end', marginTop: 16 }}>
        <Button title="Request leave" kind="yellow" icon="paper-plane-outline" onPress={() => router.push(`${base}/leave` as any)} />
      </View>
    </Screen>
  );
}

/* ---------- Audio books ---------- */
export function AudioBooksScreen() {
  const [cat, setCat] = useState<'all' | 'stories' | 'duas' | 'quran'>('all');
  const [now, setNow] = useState<(typeof AUDIO_BOOKS)[number]>(AUDIO_BOOKS[0]);
  const [playing, setPlaying] = useState(true);
  const list = AUDIO_BOOKS.filter((b) => cat === 'all' || b.cat === cat);
  return (
    <Screen>
      <Header title="Audio Books" />
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
      <ListRow left={<Avatar name={user?.name ?? 'A'} tint={pastel.lav} />} title={user?.role === 'parent' ? 'Ayisha Abdulla' : user?.name ?? 'Ayisha Abdulla'} sub="Madrasa 5 · Roll 1"
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
      <Section title="Contact the madrasa" />
      <Grid cols={{ phone: 2, tablet: 2, desktop: 2 }} gap={10}>
        <Tile label="Call office" sub="1726 4002" icon="call-outline" tint={pastel.mint} onPress={() => demoNote('Demo: opens the phone dialler.')} />
        <Tile label="Chat with admin" sub="Replies in a few hours" icon="chatbubble-outline" tint={pastel.sky} href={`${base}/chat`} />
      </Grid>
    </Screen>
  );
}
