// Teacher app screens from the design canvas.
import React, { useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Grid, Header, Row, Screen, T } from '@/components/ui';
import { Avatar, Chips, demoNote, Glyph, ListRow, pastel, Section, SmallButton, Stat, Tabs, Tag, Tile } from '@/components/kit';
import { useAuth } from '@/lib/auth';
import { SALAH_STEPS } from '@/lib/demo';
import { colors, fonts } from '@/theme/tokens';

const STUDENTS = ['Ayisha Abdulla', 'Fathima Rahman', 'Muhammed Shafi', 'Hiba Nasar', 'Rayan Ashraf', 'Nida Fathima'];

/* ---------- Home ---------- */
export function TeacherHomeScreen() {
  const { user } = useAuth();
  const [day, setDay] = useState(2);
  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <View><T style={{ fontSize: 24, fontFamily: fonts.light }}>Assalamu alaikum,</T><T v="h1">{user?.name ?? 'Ustad Ahmed'}</T></View>
        <Pressable accessibilityLabel="Notifications, 3 new" onPress={() => router.push('/teacher/chat' as any)} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="notifications-outline" size={22} color={colors.ink} />
          <View style={{ position: 'absolute', top: 10, right: 12, width: 9, height: 9, borderRadius: 5, backgroundColor: '#D6336C' }} />
        </Pressable>
      </Row>
      <Row style={{ justifyContent: 'space-between', marginTop: 14 }}>
        <T v="small">Monday, 2 Nov</T>
        <Pressable accessibilityLabel="Add class" onPress={() => demoNote('Demo: classes are set up by the institute admin.')} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.pink[0], alignItems: 'center', justifyContent: 'center' }}><Ionicons name="add" size={18} color={colors.pink[1]} /></Pressable>
      </Row>
      <Row gap={6} style={{ marginTop: 8 }}>
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <Pressable key={n} accessibilityLabel={n === 2 ? 'Monday 2, today' : `Day ${n}`} onPress={() => setDay(n)}
            style={{ flex: 1, height: 44, borderRadius: 22, backgroundColor: n === day ? colors.teal : '#FFF', alignItems: 'center', justifyContent: 'center' }}>
            <T style={{ color: n === day ? '#FFF' : colors.ink, fontFamily: fonts.medium }}>{n}</T>
          </Pressable>
        ))}
      </Row>
      <Section title="Today’s classes" action="All classes" onAction={() => router.push('/teacher/classes' as any)} />
      <View style={{ gap: 8 }}>
        <ListRow left={<Glyph text="ع" tint={pastel.lav} />} title="Arabic · Madrasa 5" sub="4:30 PM · 28 students"
          right={<SmallButton title="▶ Start" filled tint={colors.ink} onPress={() => router.push('/teacher/live/1' as any)} />} />
        <ListRow left={<Glyph text="أ" tint={pastel.mint} />} title="Akhlaq · Madrasa 3" sub="7:00 PM · 22 students" right={<Tag text="In 3h" tone="white" />} />
      </View>
      <Section title="Quick actions" />
      <Grid cols={{ phone: 2, tablet: 4, desktop: 4 }} gap={10}>
        <Tile label="Mark attendance" icon="calendar-outline" tint={pastel.mint} href="/teacher/attendance" />
        <Tile label="Review work" sub="8 waiting" icon="clipboard-outline" tint={pastel.lav} href="/teacher/review" />
        <Tile label="Upload material" icon="cloud-upload-outline" tint={pastel.sky} href="/teacher/course/1" />
        <Tile label="New assessment" icon="create-outline" tint={pastel.pink} href="/teacher/assess" />
      </Grid>
    </Screen>
  );
}

/* ---------- My classes ---------- */
const ASSIGNMENTS = [
  ['Arabic worksheet 7', 'Due tomorrow · 19 of 28 in', '8 to review', '/teacher/review'], ['Surah Al-Mulk recitation', 'Due Fri · 6 of 28 in', 'Open', null],
  ['Arabic worksheet 6', 'Closed 28 Oct · 27 of 28', 'Graded', null], ['Vocabulary quiz 2', 'Draft', 'Draft', null],
] as const;
const RESULTS = [
  ['Term 1 exam', 'Class average 78%', 'Published'], ['Vocabulary quiz 1', 'Class average 84%', 'Published'],
  ['Mid-term oral test', '12 of 28 marked', 'In progress'], ['Report cards', 'Term 1', 'Not sent'],
] as const;

export function TeacherClassesScreen() {
  const [tab, setTab] = useState<'students' | 'work' | 'results'>('students');
  const att = [96, 88, 71, 64];
  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between', minHeight: 56 }}>
        <SmallButton title="Madrasa 5 · Arabic ▾" onPress={() => demoNote('Demo: teachers with several classes switch here.')} />
        <Avatar name="Ustad Ahmed" size={48} tint={pastel.white} />
      </Row>
      <T v="h1" style={{ marginTop: 8 }}>My Classes</T>
      <Card style={{ marginTop: 12, gap: 12 }}>
        <Row gap={12}><Glyph text="ع" tint={pastel.lav} /><View style={{ flex: 1 }}><T v="h3">Arabic · Madrasa 5</T><T v="small">Mon, Wed, Thu · 4:30 PM</T></View><Ionicons name="chevron-forward" size={18} color={colors.ink} /></Row>
        <Row style={{ justifyContent: 'space-between' }}>
          {[['Students', '28'], ['Attendance', '92%'], ['Syllabus', '64%']].map(([k, v]) => <View key={k}><T v="small">{k}</T><T v="h3">{v}</T></View>)}
        </Row>
      </Card>
      <Tabs value={tab} onChange={setTab} options={[{ key: 'students', label: 'Students' }, { key: 'work', label: 'Assignments' }, { key: 'results', label: 'Results' }]} />
      <View style={{ gap: 8 }}>
        {tab === 'students' ? STUDENTS.slice(0, 4).map((n, i) => (
          <ListRow key={n} left={<Avatar name={n} size={40} tint={[pastel.pink, pastel.lav, pastel.mint, pastel.sky][i]} />} title={n} sub={`Roll ${i + 1} · Attendance ${att[i]}%`}
            right={<Tag text={att[i] > 85 ? 'On track' : att[i] > 70 ? 'Low attendance' : 'Needs help'} tone={att[i] > 85 ? 'mint' : att[i] > 70 ? 'butter' : 'pink'} />}
            onPress={() => router.push('/teacher/assess' as any)} />
        )) : tab === 'work' ? ASSIGNMENTS.map(([t, s, tag, href]) => (
          <ListRow key={t} left={<Glyph text="✎" size={40} tint={pastel.butter} />} title={t} sub={s} right={<Tag text={tag} tone={tag === 'Graded' ? 'mint' : tag === 'Draft' ? 'white' : 'butter'} />}
            onPress={href ? () => router.push(href as any) : undefined} />
        )) : RESULTS.map(([t, s, tag]) => (
          <ListRow key={t} left={<Glyph text="%" size={40} tint={pastel.sky} />} title={t} sub={s} right={<Tag text={tag} tone={tag === 'Published' ? 'mint' : tag === 'Not sent' ? 'pink' : 'butter'} />}
            onPress={() => demoNote('Demo: results and report cards come in step 3.')} />
        ))}
      </View>
    </Screen>
  );
}

/* ---------- Mark attendance ---------- */
type Mark = 'P' | 'A' | 'L';
export function TeacherAttendanceScreen() {
  const [marks, setMarks] = useState<Mark[]>(['P', 'P', 'A', 'L', 'P', 'P']);
  const [sent, setSent] = useState(false);
  const count = (m: Mark) => marks.filter((x) => x === m).length;
  const opt: [Mark, string, string][] = [['P', 'Present', '#2E6B3A'], ['A', 'Absent', '#A8233A'], ['L', 'Late', '#8A5A0F']];
  return (
    <Screen>
      <Header title="Mark attendance" subtitle="Arabic · Madrasa 5 · Mon, 2 Nov" right={<SmallButton title="All present" onPress={() => { setMarks(marks.map(() => 'P')); setSent(false); }} />} />
      <Grid cols={{ phone: 3, tablet: 3, desktop: 3 }} gap={8}>
        <Stat label="Present" value={26 - 4 + count('P')} tint={pastel.mint} />
        <Stat label="Absent" value={count('A')} tint={pastel.pink} />
        <Stat label="Late" value={count('L')} tint={pastel.butter} />
      </Grid>
      <View style={{ gap: 8, marginTop: 4 }}>
        {STUDENTS.map((n, i) => (
          <ListRow key={n} title={n} sub={`Roll ${i + 1}`} right={
            <View accessibilityRole="radiogroup" accessibilityLabel={n} style={{ flexDirection: 'row', backgroundColor: colors.bg, borderRadius: 22, padding: 3, gap: 2 }}>
              {opt.map(([m, name, c]) => (
                <Pressable key={m} accessibilityRole="radio" accessibilityLabel={name} accessibilityState={{ checked: marks[i] === m }}
                  onPress={() => { setMarks(marks.map((x, k) => (k === i ? m : x))); setSent(false); }}
                  style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: marks[i] === m ? c : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                  <T style={{ color: marks[i] === m ? '#FFF' : colors.muted, fontFamily: fonts.semibold }}>{m}</T>
                </Pressable>
              ))}
            </View>
          } />
        ))}
      </View>
      <View style={{ marginTop: 16 }}>
        <Button title={sent ? 'Attendance submitted ✓' : 'Submit attendance'} icon={sent ? undefined : 'paper-plane-outline'} kind={sent ? 'ghost' : 'primary'}
          onPress={() => { setSent(true); demoNote('Demo: attendance is saved and parents of absent students are told (backend step 2).'); }} />
      </View>
    </Screen>
  );
}

/* ---------- Review work ---------- */
export function TeacherReviewScreen() {
  const [n, setN] = useState(1);
  const [score, setScore] = useState(8);
  const [picked, setPicked] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const names = ['Fathima Rahman', 'Ayisha Abdulla', 'Hiba Nasar', 'Rayan Ashraf', 'Nida Fathima', 'Muhammed Shafi', 'Adil Musthafa', 'Sana Kareem'];
  const [first, ...rest] = names[n - 1].split(' ');
  const chips = ['MashaAllah, excellent', 'Neat writing', 'Check #3 tanween', 'Redo'];
  return (
    <Screen>
      <Header title="" right={<Row gap={8}><Tag text={`${n} of 8`} tone="white" /><Pressable accessibilityLabel="Next submission" onPress={() => { setN(n % 8 + 1); setPicked([]); setNote(''); }} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="chevron-forward" size={20} color={colors.ink} /></Pressable></Row>} />
      <T style={{ fontSize: 24, fontFamily: fonts.light }}>{first}</T>
      <T v="h1">{rest.join(' ')}</T>
      <T v="small">Arabic worksheet 7 · Sent today, 2:14 PM</T>
      <Card style={{ marginTop: 12, gap: 8 }}>
        <View style={{ borderRadius: 16, borderWidth: 1.5, borderColor: colors.line, padding: 14, gap: 6 }}>
          {['١. كِتَابٌ — كُتُبٌ', '٢. قَلَمٌ — أَقْلَامٌ', '٣. بَيْتٌ — بُيُوت'].map((l) => <T key={l} style={{ fontFamily: fonts.arabic, fontSize: 24, textAlign: 'right' }}>{l}</T>)}
        </View>
        <Row style={{ justifyContent: 'space-between' }}><T v="small">2 pages · photo upload</T><Pressable onPress={() => demoNote('Demo: opens the photo full size.')}><T style={{ color: colors.teal }}>Open full size</T></Pressable></Row>
      </Card>
      <Section title="Score" />
      <Row gap={10}>
        <Pressable accessibilityLabel="Lower score" onPress={() => setScore(Math.max(0, score - 1))} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="remove" size={22} color={colors.ink} /></Pressable>
        <View style={{ flex: 1, height: 48, borderRadius: 24, backgroundColor: colors.pink[0], alignItems: 'center', justifyContent: 'center' }}><T v="h3">{score} / 10</T></View>
        <Pressable accessibilityLabel="Raise score" onPress={() => setScore(Math.min(10, score + 1))} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="add" size={22} color={colors.ink} /></Pressable>
      </Row>
      <Section title="Quick feedback" />
      <Row gap={8} style={{ flexWrap: 'wrap' }}>
        {chips.map((c) => <SmallButton key={c} title={c} filled={picked.includes(c)} onPress={() => setPicked(picked.includes(c) ? picked.filter((x) => x !== c) : [...picked, c])} />)}
      </Row>
      <Row style={{ marginTop: 16, backgroundColor: '#FFF', borderRadius: 28, borderWidth: 1.5, borderColor: colors.line, paddingLeft: 16, paddingRight: 6, height: 56 }}>
        <TextInput value={note} onChangeText={setNote} placeholder="Write feedback" placeholderTextColor={colors.faint} style={{ flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink, outlineStyle: 'none' } as any} />
        <SmallButton title="Send" filled tint={colors.ink} onPress={() => { demoNote(`Demo: ${score}/10 and your feedback are sent to ${names[n - 1]}.`); setN(n % 8 + 1); setPicked([]); setNote(''); }} />
      </Row>
    </Screen>
  );
}

/* ---------- Assess Salah ---------- */
const LEVELS = [50, 75, 95, 100];
export function TeacherAssessScreen() {
  const [student, setStudent] = useState(0);
  const [scores, setScores] = useState<(number | null)[]>(SALAH_STEPS.map((_, i) => (i < 5 ? [95, 95, 75, 95, 100][i] : null)));
  const [remarks, setRemarks] = useState('');
  const scored = scores.filter((s) => s != null) as number[];
  const overall = useMemo(() => (scored.length ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length) : 0), [scored]);
  return (
    <Screen>
      <Header title="Assess Salah" right={<Tag text={`Scored ${scored.length} of ${SALAH_STEPS.length}`} tone="white" />} />
      <Chips value={String(student)} onChange={(k) => setStudent(+k)} options={STUDENTS.slice(0, 4).map((s, i) => ({ key: String(i), label: s }))} />
      <Card tint={colors.sky[0]} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <T>Overall score</T><T style={{ fontSize: 26, fontFamily: fonts.semibold }}>{overall}%</T>
      </Card>
      <Card style={{ marginTop: 10, gap: 14 }}>
        {SALAH_STEPS.map((name, i) => (
          <View key={name} style={{ gap: 6 }}>
            <T style={{ fontSize: 14 }}>{i + 1}. {name}</T>
            <View accessibilityRole="radiogroup" accessibilityLabel={name} style={{ flexDirection: 'row', gap: 6 }}>
              {LEVELS.map((v) => (
                <Pressable key={v} accessibilityRole="radio" accessibilityState={{ checked: scores[i] === v }} onPress={() => setScores(scores.map((s, k) => (k === i ? v : s)))}
                  style={{ flex: 1, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: scores[i] === v ? colors.teal : colors.line, backgroundColor: scores[i] === v ? colors.teal : '#FFF', alignItems: 'center', justifyContent: 'center' }}>
                  <T style={{ color: scores[i] === v ? '#FFF' : colors.ink, fontSize: 13 }}>{v}%</T>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </Card>
      <TextInput value={remarks} onChangeText={setRemarks} placeholder="Remarks for parents" placeholderTextColor={colors.faint} multiline
        style={{ marginTop: 12, minHeight: 80, backgroundColor: '#FFF', borderRadius: 20, borderWidth: 1.5, borderColor: colors.line, padding: 14, fontFamily: fonts.regular, fontSize: 15, color: colors.ink, textAlignVertical: 'top' }} />
      <Row gap={10} style={{ marginTop: 14 }}>
        <View style={{ flex: 1 }}><Button title="Save draft" kind="ghost" onPress={() => demoNote('Draft saved (demo).')} /></View>
        <View style={{ flex: 1 }}><Button title="Send to parent" icon="paper-plane-outline" disabled={scored.length < SALAH_STEPS.length}
          onPress={() => demoNote(`Demo: the Salah report (${overall}%) is sent to ${STUDENTS[student]}'s parents.`)} /></View>
      </Row>
      {scored.length < SALAH_STEPS.length ? <T v="small" style={{ textAlign: 'center', marginTop: 6 }}>Score every step to send the report.</T> : null}
    </Screen>
  );
}
