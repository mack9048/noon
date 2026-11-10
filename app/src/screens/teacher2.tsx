// Teacher screens from the second design round: My classes, Class detail, Tests & exams,
// Quick test, New exam (4 steps), Profile and Settings.
import React, { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Card, IconButton, Row, Screen, T } from '@/components/ui';
import { demoNote, Tag } from '@/components/kit';
import { BottomActions, ChoiceChips, Input, MiniStat, Panel, Select, SettingRow, SettingsGroup, Stepper, ToggleChips } from '@/components/kit2';
import { RoleProfileScreen, RoleSettingsScreen, T_ } from './roles2';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import type { Board, SchoolClass, Subject } from '@/lib/types';
import { colors, fonts } from '@/theme/tokens';

const SUBJ: Record<string, readonly [string, string]> = { Arabic: colors.lav, Fiqh: colors.sky, Thajweed: colors.mint, Quran: colors.pink };
const CLASSES = [
  { id: '5', n: '5', batch: 'Madrasa 5 · Morning', board: 'AP board', students: 28, subjects: ['Arabic', 'Fiqh'], ct: true, next: 'Today 4:30 PM · Arabic', att: '92%', g: ['#5B43E0', '#9B7BE8'] },
  { id: '3', n: '3', batch: 'Madrasa 3 · Evening', board: 'AP board', students: 22, subjects: ['Arabic'], ct: false, next: 'Today 6:00 PM · Arabic', att: '88%', g: ['#0B5166', '#1F8AA8'] },
  { id: '7', n: '7', batch: 'Madrasa 7', board: 'EK board', students: 25, subjects: ['Thajweed', 'Quran'], ct: false, next: 'Tomorrow 5:00 PM · Thajweed', att: '95%', g: ['#14945A', '#4ED68A'] },
  { id: 'p1', n: '+1', batch: 'Plus One · Girls', board: 'General', students: 14, subjects: ['Fiqh'], ct: false, next: 'Sat 10:00 AM · Fiqh', att: '90%', g: ['#FF9A3D', '#FF5E7E'] },
] as const;
const back = (to: string) => () => (router.canGoBack() ? router.back() : router.replace(to as any));

/** Subject ids for a class on the AP board, so tests and exams save against the right subject. */
function useClassSubjects(label: string) {
  const boards = useApi<Board[]>('/boards');
  const ap = boards.data?.find((b) => b.code === 'AP') ?? boards.data?.[0];
  const classes = useApi<SchoolClass[]>(ap ? `/boards/${ap.id}/classes` : null);
  const cls = classes.data?.find((c) => c.label === label);
  const subjects = useApi<Subject[]>(cls ? `/classes/${cls.id}/subjects` : null);
  return subjects.data ?? [];
}

/* ---------- My classes ---------- */
export function TeacherClassesScreen() {
  const [f, setF] = useState('All');
  const list = CLASSES.filter((c) => f === 'All' || (c.subjects as readonly string[]).includes(f));
  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <View><T v="h1">My classes</T><T v="small">Ustad Ahmed · 4 classes · 3 subjects</T></View>
        <Pressable accessibilityRole="button" accessibilityLabel="My profile" onPress={() => router.push('/teacher/profile' as any)}
          style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.lav[0], alignItems: 'center', justifyContent: 'center' }}>
          <T style={{ fontFamily: fonts.semibold, color: colors.lav[1] }}>UA</T>
        </Pressable>
      </Row>
      <View style={{ marginTop: 12 }}>
        <ChoiceChips value={f} onChange={setF} options={['All', 'Arabic', 'Fiqh', 'Thajweed', 'Quran'].map((k) => ({ key: k, label: k === 'All' ? 'All classes · 4' : k }))} />
      </View>
      <View style={{ gap: 12, marginTop: 12 }}>
        {list.map((c) => (
          <Pressable key={c.id} accessibilityRole="button" accessibilityLabel={c.batch} onPress={() => router.push(`/teacher/classes/${c.id}` as any)}
            style={{ backgroundColor: '#FFF', borderRadius: 26, padding: 14, gap: 10 }}>
            <Row gap={12}>
              <LinearGradient colors={c.g as unknown as [string, string]} style={{ width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#FFF', fontSize: 9, fontFamily: fonts.semibold }}>CLASS</Text>
                <Text style={{ color: '#FFF', fontSize: 22, fontFamily: fonts.fun, lineHeight: 24 }}>{c.n}</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}><T v="h3">{c.batch}</T><T v="small">{c.board} · {c.students} students</T></View>
              {c.ct ? <Tag text="★ CLASS TEACHER" tone="butter" /> : null}
            </Row>
            <Row gap={6}>
              <T v="small">You teach:</T>
              {c.subjects.map((s) => <View key={s} style={{ backgroundColor: SUBJ[s][0], borderRadius: 12, paddingHorizontal: 10, height: 24, justifyContent: 'center' }}><T style={{ color: SUBJ[s][1], fontSize: 12, fontFamily: fonts.semibold }}>{s}</T></View>)}
            </Row>
            <Row style={{ justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#EEF3F5', paddingTop: 10 }}>
              <Row gap={6}><Ionicons name="time-outline" size={14} color={colors.muted} /><T v="small">{c.next}</T></Row>
              <T style={{ color: colors.green, fontFamily: fonts.semibold, fontSize: 13 }}>{c.att} present</T>
            </Row>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

/* ---------- Class detail ---------- */
const STUDENTS = ['Ayisha Rahman', 'Fathima Nasrin', 'Hamdan P', 'Muhammed Adil', 'Nihal T', 'Rayan Ahmed', 'Shifa K', 'Zayan M', 'Amna Sherin', 'Bilal K'];
const ATT = [98, 95, 72, 90, 64, 93, 88, 97, 85, 91];
const TINTS = [colors.lav, colors.sky, colors.mint, colors.pink, colors.butter];

export function ClassDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = CLASSES.find((x) => x.id === id) ?? CLASSES[0];
  const [tab, setTab] = useState<'students' | 'subjects'>('students');
  const [q, setQ] = useState('');
  const students = STUDENTS.map((n, i) => ({ n, a: ATT[i], roll: i + 1 })).filter((s) => s.n.toLowerCase().includes(q.trim().toLowerCase()));
  const subjects = [['Arabic', 'لغة', 'Ustad Ahmed', true], ['Fiqh', 'فقه', 'Ustad Ahmed', true], ['Quran', 'قرآن', 'Safwan Usthad', false], ['Thajweed', 'تجويد', 'Safwan Usthad', false], ['Thareekh', 'تاريخ', 'Ayisha Miss', false], ['Akhlaq', 'أخلاق', 'Ayisha Miss', false]] as const;
  return (
    <Screen bar={false}>
      <LinearGradient colors={['#5B43E0', '#9B7BE8']} style={{ marginHorizontal: -20, marginTop: -12, padding: 20, paddingBottom: 30, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <IconButton name="chevron-back" label="Back" size={44} tint="rgba(255,255,255,0.18)" color="#FFF" onPress={back('/teacher/classes')} />
          {c.ct ? <View style={{ backgroundColor: '#F7C948', borderRadius: 14, paddingHorizontal: 12, height: 28, justifyContent: 'center' }}><T style={{ fontSize: 11, fontFamily: fonts.semibold, color: '#3F2E00' }}>★ YOU ARE CLASS TEACHER</T></View> : null}
        </Row>
        <Text style={{ fontFamily: fonts.fun, fontSize: 32, color: '#FFF', marginTop: 10 }}>Class {c.n}</Text>
        <T style={{ color: '#EDE7FF' }}>{c.batch} · {c.board} · {c.students} students</T>
        <Row gap={8} style={{ marginTop: 12 }}>
          {[[c.att, 'Attendance'], [c.next.split(' · ')[0].replace('Today ', ''), 'Next class'], ['6', 'To review']].map(([v, l]) => (
            <View key={l} style={{ flex: 1, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.16)', paddingVertical: 10, alignItems: 'center' }}>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 18, color: '#FFF' }}>{v}</Text><Text style={{ fontSize: 11, color: '#EDE7FF' }}>{l}</Text>
            </View>
          ))}
        </Row>
      </LinearGradient>
      <Row gap={6} style={{ marginTop: 12, backgroundColor: '#FFF', borderRadius: 26, padding: 4 }}>
        {([['students', `Students · ${c.students}`], ['subjects', 'Subjects & teachers']] as const).map(([k, l]) => (
          <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: tab === k }} onPress={() => setTab(k)}
            style={{ flex: 1, height: 44, borderRadius: 22, backgroundColor: tab === k ? colors.violet : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
            <T style={{ color: tab === k ? '#FFF' : colors.muted, fontFamily: fonts.semibold }}>{l}</T>
          </Pressable>
        ))}
      </Row>
      {tab === 'students' ? (
        <>
          <View style={{ marginTop: 10, height: 48, borderRadius: 24, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 8 }}>
            <Ionicons name="search" size={18} color={colors.muted} />
            <TextInput accessibilityLabel="Search students" value={q} onChangeText={setQ} placeholder={`Search ${c.students} students`} placeholderTextColor={colors.faint} style={{ flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.ink }} />
          </View>
          <Card style={{ marginTop: 10, padding: 6 }}>
            {students.map((s, i) => {
              const low = s.a < 75; const t = TINTS[i % 5];
              return (
                <Pressable key={s.n} accessibilityRole="button" onPress={() => router.push('/teacher/chat' as any)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8 }}>
                  <T v="small" style={{ width: 18 }}>{s.roll}</T>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t[0], alignItems: 'center', justifyContent: 'center' }}><T style={{ color: t[1], fontFamily: fonts.semibold, fontSize: 13 }}>{s.n.split(' ').map((w) => w[0]).join('')}</T></View>
                  <View style={{ flex: 1 }}><T style={{ fontFamily: fonts.semibold }}>{s.n}</T><T v="small">{low ? 'Missed 3 classes this month' : `Parent: +971 5${s.roll} ••• ••${10 + i}`}</T></View>
                  <View style={{ backgroundColor: low ? '#FBD9DC' : colors.mint[0], borderRadius: 10, paddingHorizontal: 8, height: 22, justifyContent: 'center' }}><T style={{ fontSize: 11, fontFamily: fonts.semibold, color: low ? colors.red : colors.mint[1] }}>{s.a}%</T></View>
                </Pressable>
              );
            })}
          </Card>
        </>
      ) : (
        <View style={{ gap: 8, marginTop: 10 }}>
          {subjects.map(([n, ar, t, mine], i) => (
            <Card key={n} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: mine ? '#FFF' : '#F7FBFC' }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: TINTS[i % 5][0], alignItems: 'center', justifyContent: 'center' }}><T style={{ fontFamily: fonts.arabic, fontSize: 16, color: TINTS[i % 5][1] }}>{ar}</T></View>
              <View style={{ flex: 1 }}><T style={{ fontFamily: fonts.semibold }}>{n}</T><T v="small">{t}</T></View>
              {mine ? <Tag text="YOU" tone="lav" /> : null}
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

/* ---------- Tests & exams (tab) ---------- */
const STATUS: Record<string, [string, 'pink' | 'mint' | 'sky' | 'butter' | 'lav']> = { live: ['LIVE', 'pink'], done: ['RESULTS', 'mint'], sched: ['SCHEDULED', 'sky'], draft: ['DRAFT', 'butter'], mark: ['TO MARK', 'lav'] };
const CLS_TINT: Record<string, readonly [string, string]> = { '5': colors.lav, '3': colors.sky, '7': colors.mint, '+1': colors.pink };
const TESTS = [['5', 'Harakath quick check', 'Arabic · 5 questions · 5 min', 'live', '19/28 done'], ['3', 'Letters ب ت ث', 'Arabic · 4 questions · 3 min', 'done', 'Avg 82%'], ['7', 'Noon sakin rules', 'Thajweed · 6 questions · 5 min', 'done', 'Avg 74%'], ['5', 'Wudu steps', 'Fiqh · 5 questions', 'draft', 'Edited 2h ago']];
const EXAMS = [['5', 'Half-yearly exam 2026', 'Arabic · 4 sections · 50 marks · 1h 30m', 'sched', 'Mon 15 Dec'], ['+1', 'Fiqh term 2 exam', 'Fiqh · 3 sections · 40 marks · 1h', 'mark', '6 written left'], ['7', 'Thajweed oral + written', 'Thajweed · 5 sections · 60 marks', 'draft', 'Section C empty'], ['3', 'Term 1 exam', 'Arabic · 3 sections · 40 marks', 'done', 'Avg 71% · published']];

export function TestsScreen() {
  const [tab, setTab] = useState<'tests' | 'exams'>('tests');
  const rows = tab === 'tests' ? TESTS : EXAMS;
  return (
    <Screen>
      <T v="h1">Tests & exams</T>
      <T v="small">Quick tests in a minute · full exams with sections</T>
      <Row gap={10} style={{ marginTop: 12 }}>
        <BigAction g={['#FFD25A', '#F08A24']} kicker="SIMPLE · 1 MIN" title={'Quick\ntest'} sub="MCQ · auto-marked" icon="flash-outline" dark onPress={() => router.push('/teacher/tests/quick' as any)} />
        <BigAction g={['#8A6CFF', '#B05CF0']} kicker="FULL · SECTIONS" title={'New\nexam'} sub="Term · half-yearly · annual" icon="document-text-outline" onPress={() => router.push('/teacher/tests/exam' as any)} />
      </Row>
      <Row gap={6} style={{ marginTop: 14, backgroundColor: '#FFF', borderRadius: 26, padding: 4 }}>
        {([['tests', `Quick tests · ${TESTS.length}`], ['exams', `Exams · ${EXAMS.length}`]] as const).map(([k, l]) => (
          <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: tab === k }} onPress={() => setTab(k)}
            style={{ flex: 1, height: 44, borderRadius: 22, backgroundColor: tab === k ? colors.ink : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
            <T style={{ color: tab === k ? '#FFF' : colors.muted, fontFamily: fonts.semibold }}>{l}</T>
          </Pressable>
        ))}
      </Row>
      <View style={{ gap: 8, marginTop: 10 }}>
        {rows.map(([cls, title, meta, st, extra]) => (
          <Card key={title} onPress={() => (st === 'draft' ? router.push(`/teacher/tests/${tab === 'tests' ? 'quick' : 'exam'}` as any) : router.push('/teacher/review' as any))}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: CLS_TINT[cls][0], alignItems: 'center', justifyContent: 'center' }}><T style={{ fontFamily: fonts.semibold, color: CLS_TINT[cls][1] }}>{cls}</T></View>
            <View style={{ flex: 1 }}><T style={{ fontFamily: fonts.semibold }}>{title}</T><T v="small">Class {cls} · {meta}</T></View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}><Tag text={STATUS[st][0]} tone={STATUS[st][1]} /><T v="small" style={{ fontSize: 11 }}>{extra}</T></View>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

function BigAction({ g, kicker, title, sub, icon, dark, onPress }: { g: [string, string]; kicker: string; title: string; sub: string; icon: keyof typeof Ionicons.glyphMap; dark?: boolean; onPress: () => void }) {
  const ink = dark ? '#3F2E00' : '#FFF';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title.replace('\n', ' ')} onPress={onPress} style={{ flex: 1 }}>
      <LinearGradient colors={g} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 130, borderRadius: 26, padding: 14 }}>
        <Text style={{ fontSize: 10, fontFamily: fonts.semibold, color: ink }}>{kicker}</Text>
        <Text style={{ fontSize: 22, lineHeight: 24, fontFamily: fonts.fun, color: ink }}>{title}</Text>
        <Text style={{ marginTop: 'auto', fontSize: 11, color: ink }}>{sub}</Text>
        <Ionicons name={icon} size={40} color={ink} style={{ position: 'absolute', right: 12, bottom: 12 }} />
      </LinearGradient>
    </Pressable>
  );
}

/* ---------- Quick test ---------- */
type Q = { q: string; opts: string[]; correct: number };
const START_QS: Q[] = [
  { q: 'Which mark is fatha?', opts: ['بَ', 'بِ', 'بُ', 'بْ'], correct: 0 },
  { q: 'How do you read بِ ?', opts: ['ba', 'bi', 'bu', 'b'], correct: 1 },
  { q: 'Sukoon means the letter...', opts: ['has no vowel', 'is long', 'is doubled', 'is heavy'], correct: 0 },
];

export function QuickTestScreen() {
  const [cls, setCls] = useState('5');
  const [name, setName] = useState('Harakath quick check');
  const [time, setTime] = useState('5');
  const [qs, setQs] = useState<Q[]>(START_QS);
  const [busy, setBusy] = useState(false);
  const subjects = useClassSubjects(cls === '+1' ? '+1' : cls);
  const arabic = subjects.find((s) => s.name === 'Arabic') ?? subjects[0];

  const update = (i: number, q: Partial<Q>) => setQs(qs.map((x, k) => (k === i ? { ...x, ...q } : x)));
  const send = async () => {
    if (!name.trim() || qs.some((q) => !q.q.trim() || q.opts.some((o) => !o.trim()))) return demoNote('Fill in the test name, every question and every answer.');
    setBusy(true);
    try {
      await api.post('/staff/assessments', { type: 'assessment', title: name.trim(), subject_id: arabic?.id, max_marks: qs.length, due_at: new Date().toISOString().slice(0, 10), description: `Quick test · ${qs.length} questions · ${time === 'none' ? 'no time limit' : `${time} min`}` });
      demoNote(`"${name.trim()}" sent to Class ${cls}. Students see it under Assessment.`);
      router.replace('/teacher/tests' as any);
    } catch (e: any) { demoNote(e instanceof ApiError ? e.friendly : e?.message ?? 'Could not send the test.'); } finally { setBusy(false); }
  };

  return (
    <Screen overlay={<BottomActions><Pressable accessibilityRole="button" disabled={busy} onPress={send} style={{ flex: 1, height: 56, borderRadius: 28, backgroundColor: colors.yellow, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 5, borderBottomColor: colors.yellowDeep, opacity: busy ? 0.7 : 1 }}>
      <T style={{ fontFamily: fonts.semibold, fontSize: 16, color: '#2A1E00' }}>{busy ? 'Sending…' : 'Send test now'}</T></Pressable></BottomActions>}>
      <Row gap={8}><Ionicons name="flash-outline" size={24} color={colors.ink} /><T v="h1">Quick test</T></Row>
      <T v="small">Auto-marked · students answer in the app</T>
      <Panel>
        <ChoiceChips value={cls} onChange={setCls} options={['5', '3', '7', '+1'].map((c) => ({ key: c, label: c === '+1' ? '+1' : `Class ${c}` }))} />
        <Input label="Test name" value={name} onChangeText={setName} />
        <Row gap={8}><T v="small" style={{ width: 40 }}>Time</T><ChoiceChips value={time} onChange={setTime} options={[{ key: '3', label: '3 min' }, { key: '5', label: '5 min' }, { key: '10', label: '10 min' }, { key: 'none', label: 'No limit' }]} /></Row>
      </Panel>
      {qs.map((q, i) => (
        <Panel key={i}>
          <Row gap={8}>
            <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: colors.butter[0], alignItems: 'center', justifyContent: 'center' }}><T style={{ fontFamily: fonts.semibold, fontSize: 12, color: colors.butter[1] }}>{i + 1}</T></View>
            <TextInput accessibilityLabel={`Question ${i + 1}`} value={q.q} onChangeText={(v) => update(i, { q: v })} placeholder="Type the question" placeholderTextColor={colors.faint}
              style={{ flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: colors.ink }} />
            {qs.length > 1 ? <IconButton name="trash-outline" label={`Delete question ${i + 1}`} size={32} color={colors.red} onPress={() => setQs(qs.filter((_, k) => k !== i))} /> : null}
          </Row>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {q.opts.map((o, k) => {
              const ok = q.correct === k;
              return (
                <View key={k} style={{ width: '48%', height: 46, overflow: 'hidden', borderRadius: 14, borderWidth: 1.5, borderColor: ok ? colors.green : colors.line, backgroundColor: ok ? '#EAF8EE' : '#F7FBFC', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10 }}>
                  <TextInput accessibilityLabel={`Answer ${k + 1}`} value={o} onChangeText={(v) => update(i, { opts: q.opts.map((x, j) => (j === k ? v : x)) })} placeholder={`Answer ${k + 1}`} placeholderTextColor={colors.faint}
                    style={{ flex: 1, minWidth: 0, height: 42, paddingVertical: 0, textAlign: 'center', fontFamily: /[؀-ۿ]/.test(o) ? fonts.arabic : fonts.regular, fontSize: /[؀-ۿ]/.test(o) ? 19 : 14, color: colors.ink }} />
                  <Pressable accessibilityRole="radio" accessibilityLabel={`Mark answer ${k + 1} correct`} accessibilityState={{ checked: ok }} onPress={() => update(i, { correct: k })} hitSlop={8}>
                    <Ionicons name={ok ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={ok ? colors.green : colors.line} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        </Panel>
      ))}
      <Pressable accessibilityRole="button" onPress={() => setQs([...qs, { q: '', opts: ['', '', '', ''], correct: 0 }])}
        style={{ marginTop: 12, height: 52, borderRadius: 20, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}>
        <T style={{ color: colors.teal, fontFamily: fonts.semibold }}>+ Add question</T>
      </Pressable>
      <T v="small" style={{ textAlign: 'center', marginTop: 8, marginBottom: 80 }}>Tap the circle next to an answer to mark it correct ✓</T>
    </Screen>
  );
}

/* ---------- New exam (4 steps) ---------- */
type Section = { type: string; count: number; each: number };
const SECTION_TYPES = ['Multiple choice', 'Short answer', 'Long answer', 'Oral · reading', 'Match the following', 'Fill in the blanks', 'True / False'];

export function ExamNewScreen() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('Half-yearly exam 2026');
  const [type, setType] = useState('Half-yearly');
  const [subject, setSubject] = useState('Arabic');
  const [batches, setBatches] = useState(['Madrasa 5 · Morning']);
  const [date, setDate] = useState('2026-12-15');
  const [start, setStart] = useState('04:30 PM');
  const [duration, setDuration] = useState('1 h 30 min');
  const [pass, setPass] = useState('18');
  const [notes, setNotes] = useState('Answer all questions. Section D is oral — keep your microphone on.');
  const [secs, setSecs] = useState<Section[]>([{ type: 'Multiple choice', count: 10, each: 1 }, { type: 'Short answer', count: 5, each: 2 }, { type: 'Long answer', count: 3, each: 5 }, { type: 'Oral · reading', count: 1, each: 5 }]);
  const [rules, setRules] = useState({ shuffle: true, timer: true, late: false, cam: false, result: false });
  const [busy, setBusy] = useState(false);
  const subjects = useClassSubjects('5');
  const marks = useMemo(() => secs.reduce((a, s) => a + s.count * s.each, 0), [secs]);
  const setSec = (i: number, p: Partial<Section>) => setSecs(secs.map((s, k) => (k === i ? { ...s, ...p } : s)));

  const publish = async (draft: boolean) => {
    if (draft) return demoNote('Draft saved on this device.');
    if (!name.trim() || !batches.length) return demoNote('Give the exam a name and pick at least one batch.');
    setBusy(true);
    try {
      const subj = subjects.find((s) => s.name === subject) ?? subjects[0];
      await api.post('/staff/assessments', { type: 'exam', title: name.trim(), subject_id: subj?.id, max_marks: marks, due_at: date, description: `${type} · ${secs.length} sections · ${duration} · pass ${pass}. ${notes}`.slice(0, 1000) });
      demoNote(`"${name.trim()}" is scheduled for ${batches.join(', ')}. Students see it under Exam.`);
      router.replace('/teacher/tests' as any);
    } catch (e: any) { demoNote(e instanceof ApiError ? e.friendly : e?.message ?? 'Could not save the exam.'); } finally { setBusy(false); }
  };

  return (
    <Screen overlay={(
      <BottomActions>
        <Pressable accessibilityRole="button" onPress={() => (step === 0 ? publish(true) : setStep(step - 1))} style={{ height: 56, paddingHorizontal: 26, borderRadius: 28, backgroundColor: '#FFF', borderWidth: 1.5, borderColor: colors.line, justifyContent: 'center' }}>
          <T style={{ fontFamily: fonts.semibold }}>{step === 0 ? 'Save draft' : '‹ Back'}</T>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => (step < 3 ? setStep(step + 1) : publish(false))} style={{ flex: 1, height: 56, borderRadius: 28, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.7 : 1 }}>
          <T style={{ color: '#FFF', fontFamily: fonts.semibold }}>{step < 3 ? 'Next →' : busy ? 'Publishing…' : 'Publish exam'}</T>
        </Pressable>
      </BottomActions>
    )}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}><T v="h1">New exam</T><T v="small">{name || 'Untitled'} · Class 5</T></View>
        <Tag text={`${marks} marks`} tone="lav" />
      </Row>
      <View style={{ marginTop: 12 }}><Stepper steps={['Setup', 'Sections', 'Questions', 'Review']} step={step} onStep={setStep} /></View>

      {step === 0 ? (
        <Panel>
          <Input label="Exam name" value={name} onChangeText={setName} />
          <Row gap={10}><Select label="Type" value={type} options={['Term', 'Half-yearly', 'Annual', 'Unit test']} onChange={setType} /><Select label="Subject" value={subject} options={['Arabic', 'Fiqh', 'Quran', 'Thajweed', 'Akhlaq']} onChange={setSubject} /></Row>
          <T v="small" style={{ fontFamily: fonts.medium }}>Classes / batches</T>
          <ToggleChips options={['Madrasa 5 · Morning', 'Madrasa 5 · Evening', 'Madrasa 3']} value={batches} onChange={setBatches} />
          <Row gap={10}><Input label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" /><Input label="Start" value={start} onChangeText={setStart} /></Row>
          <Row gap={10}><Select label="Duration" value={duration} options={['30 min', '45 min', '1 h', '1 h 30 min', '2 h']} onChange={setDuration} /><Input label="Pass mark" value={pass} onChangeText={setPass} keyboardType="number-pad" /></Row>
          <Input label="Instructions for students" value={notes} onChangeText={setNotes} multiline />
        </Panel>
      ) : step === 1 ? (
        <View>
          {secs.map((s, i) => (
            <Panel key={i}>
              <Row gap={8}>
                <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: TINTS[i % 5][0], alignItems: 'center', justifyContent: 'center' }}><T style={{ fontFamily: fonts.semibold, color: TINTS[i % 5][1] }}>{String.fromCharCode(65 + i)}</T></View>
                <View style={{ flex: 1 }}><Select value={s.type} options={SECTION_TYPES} onChange={(v) => setSec(i, { type: v })} /></View>
                <IconButton name="trash-outline" label={`Delete section ${String.fromCharCode(65 + i)}`} size={36} color={colors.red} onPress={() => setSecs(secs.filter((_, k) => k !== i))} />
              </Row>
              <Row gap={10}>
                <Counter label="Questions" value={s.count} onChange={(v) => setSec(i, { count: v })} />
                <Counter label="Marks each" value={s.each} onChange={(v) => setSec(i, { each: v })} />
                <View style={{ alignItems: 'flex-end' }}><T v="small">Total</T><T v="h3">{s.count * s.each}</T></View>
              </Row>
            </Panel>
          ))}
          <Pressable accessibilityRole="button" onPress={() => setSecs([...secs, { type: 'Fill in the blanks', count: 5, each: 1 }])}
            style={{ marginTop: 12, height: 52, borderRadius: 20, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}>
            <T style={{ color: colors.teal, fontFamily: fonts.semibold }}>+ Add section</T>
          </Pressable>
        </View>
      ) : step === 2 ? (
        <View>
          {secs.map((s, i) => (
            <Panel key={i} title={`Section ${String.fromCharCode(65 + i)} · ${s.type}`} right={<Tag text={`${s.count} Qs`} tone="sky" />}>
              <T v="small">{s.type.startsWith('Oral') ? 'Student reads a passage · you mark it live.' : `Add ${s.count} questions. Students answer in the app; written answers come to you to mark.`}</T>
              <Button title="Add questions" icon="add" kind="ghost" onPress={() => demoNote('Demo: the question editor for this section opens here.')} />
            </Panel>
          ))}
        </View>
      ) : (
        <View>
          <Row gap={8} style={{ marginTop: 4 }}>
            <MiniStat value={marks} label="Total marks" tint={colors.lav} />
            <MiniStat value={secs.reduce((a, s) => a + s.count, 0)} label="Questions" tint={colors.sky} />
            <MiniStat value={duration} label="Duration" tint={colors.butter} />
          </Row>
          <Panel title="Summary">
            {[['Exam', name], ['Type', type], ['Subject', subject], ['Batches', batches.join(', ') || '—'], ['Date', `${date} · ${start}`], ['Pass mark', `${pass} / ${marks}`]].map(([k, v]) => (
              <Row key={k} style={{ justifyContent: 'space-between' }}><T v="small">{k}</T><T style={{ fontFamily: fonts.medium, flexShrink: 1, textAlign: 'right' }}>{v}</T></Row>
            ))}
          </Panel>
          <SettingsGroup title="Exam rules">
            <SettingRow icon="shuffle" tint={colors.sky} label="Shuffle questions" sub="Each student gets a different order" toggle={rules.shuffle} onToggle={(v) => setRules({ ...rules, shuffle: v })} />
            <SettingRow icon="timer-outline" tint={colors.butter} label="Auto-submit when time ends" toggle={rules.timer} onToggle={(v) => setRules({ ...rules, timer: v })} />
            <SettingRow icon="time-outline" tint={colors.mint} label="Allow late start" sub="Up to 10 minutes" toggle={rules.late} onToggle={(v) => setRules({ ...rules, late: v })} />
            <SettingRow icon="camera-outline" tint={colors.pink} label="Camera on during exam" sub="Front camera snapshot every 5 min" toggle={rules.cam} onToggle={(v) => setRules({ ...rules, cam: v })} />
            <SettingRow icon="eye-outline" tint={colors.lav} label="Show result to students immediately" sub="Off = you publish results later" toggle={rules.result} onToggle={(v) => setRules({ ...rules, result: v })} />
          </SettingsGroup>
        </View>
      )}
      <View style={{ height: 80 }} />
    </Screen>
  );
}

function Counter({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <T v="small">{label}</T>
      <Row gap={6}>
        <IconButton name="remove" label={`Fewer ${label}`} size={34} tint="#EEF3F5" onPress={() => onChange(Math.max(1, value - 1))} />
        <T style={{ fontFamily: fonts.semibold, minWidth: 22, textAlign: 'center' }}>{value}</T>
        <IconButton name="add" label={`More ${label}`} size={34} tint="#EEF3F5" onPress={() => onChange(Math.min(99, value + 1))} />
      </Row>
    </View>
  );
}

/* ---------- Profile & Settings ---------- */
export function TeacherProfileScreen() {
  return (
    <RoleProfileScreen g={['#0B5166', '#5CC7C9']} sub="Arabic & Fiqh teacher · Noon Madrasa" pill="★ Class teacher · Class 5"
      stats={[['4', 'Classes'], ['89', 'Students'], ['4.9★', 'Parent rating']]} chipsTitle="Subjects I teach"
      chips={[{ text: 'Arabic · Class 5, 3', tint: colors.lav }, { text: 'Fiqh · Class 5, +1', tint: colors.sky }]}
      rows={[['Employee ID', 'NM-T-007'], ['Phone', '+971 55 •••• 21'], ['Email', 'ahmed@noonmadrasa.app'], ['Qualification', 'Faizy, MA Arabic'], ['Joined', 'June 2021'], ['Working days', 'Mon – Thu · evenings']]}
      tiles={[
        { label: 'My timetable', icon: 'calendar-outline', tint: colors.sky, note: 'Coming soon: your weekly timetable shows here.' },
        { label: 'My leave', icon: 'airplane-outline', tint: colors.pink, href: '/teacher/leave' },
        { label: 'Salary slips', icon: 'cash-outline', tint: colors.butter, note: 'Coming soon: monthly salary slips show here.' },
        { label: 'Settings', icon: 'settings-outline', tint: colors.lav, href: '/teacher/settings' },
      ]} settingsHref="/teacher/settings" />
  );
}

export function TeacherSettingsScreen() {
  return (
    <RoleSettingsScreen roleLine="Teacher · Noon Madrasa" profileHref="/teacher/profile" footer="Noon Learn for teachers · v1.0" groups={[
      { title: 'Classes', rows: [
        { icon: 'alarm-outline', tint: T_.sky, label: 'Class reminders', sub: '15 min before each class', toggle: true },
        { icon: 'videocam-outline', tint: T_.pink, label: 'Auto-record live classes', sub: 'Recordings go to Done lessons', toggle: false },
        { icon: 'flash-outline', tint: T_.butter, label: 'Default test time', value: '5 min' },
      ] },
      { title: 'Messages', rows: [
        { icon: 'people-outline', tint: T_.mint, label: 'Parent messages', sub: 'Allow parents to message me', toggle: true },
        { icon: 'chatbubbles-outline', tint: T_.lav, label: 'Class group chat', sub: 'Students can post in class groups', toggle: true },
        { icon: 'moon-outline', tint: T_.sky, label: 'Quiet hours', value: '9 PM – 7 AM' },
      ] },
      { title: 'Account', rows: [
        { icon: 'globe-outline', tint: T_.butter, label: 'Language', value: 'English' },
        { icon: 'contrast-outline', tint: T_.lav, label: 'Dark mode', toggle: false },
        { icon: 'key-outline', tint: T_.pink, label: 'Change password' },
        { icon: 'shield-checkmark-outline', tint: T_.mint, label: 'Privacy policy' },
      ] },
    ]} />
  );
}
