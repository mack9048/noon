// Institute admin screens from the design canvas.
import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Grid, Header, Row, Screen, Segmented, T } from '@/components/ui';
import { Avatar, Chips, demoNote, ListRow, pastel, Progress, Section, SmallButton, Stat, Tabs, Tag } from '@/components/kit';
import { colors, fonts } from '@/theme/tokens';

const Search = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) => (
  <Row style={{ backgroundColor: '#FFF', borderRadius: 24, borderWidth: 1.5, borderColor: colors.line, paddingHorizontal: 14, height: 48 }}>
    <Ionicons name="search" size={18} color={colors.muted} />
    <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.faint} style={{ flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink, outlineStyle: 'none' } as any} />
  </Row>
);
const RoundAdd = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <Pressable accessibilityLabel={label} onPress={onPress} style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="add" size={26} color="#FFF" /></Pressable>
);

/* ---------- Dashboard ---------- */
const WEEK = [['Tue', 86], ['Wed', 89], ['Thu', 84], ['Fri', 80], ['Sat', 90], ['Sun', 87], ['Mon', 91]] as const;

export function AdminDashboardScreen() {
  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <View><T v="small">noon Learn · Institute admin</T><T v="h1">Assalamu alaikum</T></View>
        <Pressable accessibilityLabel="Notifications, 4 new" style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="notifications-outline" size={22} color={colors.ink} /><View style={{ position: 'absolute', top: 10, right: 12, width: 9, height: 9, borderRadius: 5, backgroundColor: '#D6336C' }} />
        </Pressable>
      </Row>
      <View style={{ marginTop: 14 }}>
        <Grid cols={{ phone: 3, tablet: 3, desktop: 3 }} gap={8}>
          <Pressable onPress={() => router.push('/admin/students' as any)}><Stat label="Students" value={312} tint={pastel.lav} /></Pressable>
          <Pressable onPress={() => router.push('/admin/teachers' as any)}><Stat label="Teachers" value={18} tint={pastel.sky} /></Pressable>
          <Pressable onPress={() => router.push('/admin/teachers' as any)}><Stat label="Classes" value={24} tint={pastel.mint} /></Pressable>
        </Grid>
      </View>
      <Section title="Attendance" action="Full report →" onAction={() => router.push('/admin/attendance' as any)} />
      <View accessibilityLabel="Attendance last 7 days, today 91 percent, average 87 percent" style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 120 }}>
        {WEEK.map(([d, v], i) => (
          <View key={d} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
            {i === 6 ? <T style={{ fontSize: 11, fontFamily: fonts.semibold, color: colors.teal }}>{v}%</T> : null}
            <View style={{ width: '100%', height: (v - 60) * 2.6, borderRadius: 12, backgroundColor: i === 6 ? colors.teal : '#CBD8DC' }} />
            <T style={{ fontSize: 11, color: i === 6 ? colors.teal : colors.muted }}>{d}</T>
          </View>
        ))}
      </View>
      <T v="small" style={{ marginTop: 4 }}>Average 87% this week</T>
      <Card tint={colors.sky[0]} onPress={() => router.push('/admin/fees' as any)} style={{ marginTop: 14, gap: 8 }}>
        <Row style={{ justifyContent: 'space-between' }}><T style={{ fontFamily: fonts.medium }}>November fees</T><T v="small">77% collected</T></Row>
        <T style={{ fontSize: 26, fontFamily: fonts.semibold }}>₹1,84,800 <T v="small">of ₹2,40,000</T></T>
        <Progress value={77} color={colors.teal} track="#FFF" height={10} />
      </Card>
      <Section title="Needs attention" />
      <ListRow left={<Avatar name="!" tint={pastel.pink} />} title="2 classes without a teacher" sub="Fiqh · Madrasa 2 and 7, from Wed"
        right={<SmallButton title="Assign" filled tint={colors.ink} onPress={() => router.push('/admin/teachers' as any)} />} />
    </Screen>
  );
}

/* ---------- Students ---------- */
const STUDENTS = [
  ['Ayisha Abdulla', 'Madrasa 5', 1, 'paid'], ['Fathima Rahman', 'Madrasa 5', 2, 'paid'], ['Muhammed Shafi', 'Madrasa 5', 3, 'due'], ['Rayan Ashraf', 'Madrasa 3', 7, 'over'],
  ['Nida Fathima', 'Madrasa 3', 9, 'paid'], ['Hiba Nasar', 'Madrasa 7', 4, 'due'], ['Adil Musthafa', 'Madrasa 7', 11, 'paid'],
] as const;
const FEE_TAG = { paid: ['Fee paid', 'mint'], due: ['Fee due', 'butter'], over: ['Overdue', 'pink'] } as const;

export function AdminStudentsScreen() {
  const [q, setQ] = useState('');
  const [cls, setCls] = useState('all');
  const rows = STUDENTS.filter(([n, c]) => (cls === 'all' || c === cls) && n.toLowerCase().includes(q.toLowerCase()));
  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <T v="h1">Students <T v="small">312</T></T>
        <RoundAdd label="Bulk add" onPress={() => router.push('/admin/bulk' as any)} />
      </Row>
      <Search value={q} onChange={setQ} placeholder="Search by name or roll" />
      <Chips value={cls} onChange={setCls} options={[{ key: 'all', label: 'All' }, { key: 'Madrasa 3', label: 'Madrasa 3' }, { key: 'Madrasa 5', label: 'Madrasa 5' }, { key: 'Madrasa 7', label: 'Madrasa 7' }]} />
      <View style={{ gap: 8 }}>
        {rows.map(([n, c, roll, fee], i) => (
          <ListRow key={n} left={<Avatar name={n} size={40} tint={[pastel.pink, pastel.lav, pastel.mint, pastel.sky][i % 4]} />} title={n} sub={`${c} · Roll ${roll}`}
            right={<Tag text={FEE_TAG[fee][0]} tone={FEE_TAG[fee][1]} />} onPress={() => demoNote(`Demo: ${n}'s full record opens here (step 2).`)} />
        ))}
        {!rows.length ? <T v="small" style={{ textAlign: 'center', padding: 20 }}>No students match.</T> : null}
      </View>
    </Screen>
  );
}

/* ---------- Fees ---------- */
const MONTHS = [
  ['September 2026', '₹2,36,400', 296, 12, 4], ['October 2026', '₹2,31,000', 288, 18, 6], ['November 2026', '₹1,84,800', 240, 58, 14],
] as const;
const DUES = [['Rayan Ashraf', 'Madrasa 3', '₹1,600', '32d', 'pink'], ['Sana Kareem', 'Madrasa 1', '₹800', '18d', 'pink'], ['Muhammed Shafi', 'Madrasa 5', '₹800', '6d', 'butter'], ['Hiba Nasar', 'Madrasa 7', '₹800', '2d', 'butter']] as const;

export function AdminFeesScreen() {
  const [m, setM] = useState(2);
  const [sent, setSent] = useState<string[]>([]);
  const [label, collected, paid, due, over] = MONTHS[m];
  return (
    <Screen>
      <Header title="Fees" back={false} right={<Pressable accessibilityLabel="Download report" onPress={() => demoNote('Demo: the fee report downloads as Excel/PDF (step 3).')} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="download-outline" size={22} color={colors.ink} /></Pressable>} />
      <Row gap={8}>
        <Pressable accessibilityLabel="Previous month" disabled={m === 0} onPress={() => setM(m - 1)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', opacity: m === 0 ? 0.4 : 1 }}><Ionicons name="chevron-back" size={20} color={colors.ink} /></Pressable>
        <View style={{ flex: 1, height: 44, borderRadius: 22, backgroundColor: colors.pink[0], alignItems: 'center', justifyContent: 'center' }}><T style={{ fontFamily: fonts.medium }}>{label}</T></View>
        <Pressable accessibilityLabel="Next month" disabled={m === 2} onPress={() => setM(m + 1)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', opacity: m === 2 ? 0.4 : 1 }}><Ionicons name="chevron-forward" size={20} color={colors.ink} /></Pressable>
      </Row>
      <Card style={{ marginTop: 12, gap: 10 }}>
        <T v="small">Collected</T>
        <T style={{ fontSize: 28, fontFamily: fonts.semibold }}>{collected} <T v="small">of ₹2,40,000</T></T>
        <Row style={{ justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10 }}>
          {[['Paid', paid, colors.green], ['Due', due, '#D9A92A'], ['Overdue', over, '#D6336C']].map(([k, v, c]) => (
            <View key={k as string}><Row gap={6}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c as string }} /><T v="small">{k}</T></Row><T v="h3">{v}</T></View>
          ))}
        </Row>
      </Card>
      <Section title="Pending dues" action="Remind all" onAction={() => setSent(DUES.map((d) => d[0]))} />
      <View style={{ gap: 8 }}>
        {DUES.map(([n, c, amt, days, tone]) => (
          <ListRow key={n} left={<View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: pastel[tone][0], alignItems: 'center', justifyContent: 'center' }}><T style={{ fontSize: 12, fontFamily: fonts.semibold, color: pastel[tone][1] }}>{days}</T></View>}
            title={n} sub={`${c} · ${amt}`} right={sent.includes(n) ? <Tag text="Sent" tone="mint" /> : <SmallButton title="Remind" filled tint={colors.ink} onPress={() => setSent([...sent, n])} />} />
        ))}
      </View>
    </Screen>
  );
}

/* ---------- Teachers & classes ---------- */
const TEACHERS = [['Ustad Ahmed', 'Arabic, Akhlaq · 4 classes', 'Active'], ['Ayisha Miss', 'Fiqh, Quran · 5 classes', 'Active'], ['Safwan Usthad', 'Thajweed · 6 classes', 'Active'], ['Noushad K', 'Fiqh · 2 classes', 'On leave']] as const;
const CLASSES = [['Madrasa 5', 'Arabic · 28 students · Ustad Ahmed', 'Full'], ['Madrasa 3', 'Akhlaq · 22 students · Ayisha Miss', 'Full'], ['Madrasa 2', 'Fiqh · 19 students · no teacher from Wed', 'Assign'], ['Madrasa 7', 'Fiqh · 25 students · no teacher from Wed', 'Assign']] as const;

export function AdminTeachersScreen() {
  const [tab, setTab] = useState<'teachers' | 'classes'>('teachers');
  const [assigned, setAssigned] = useState<string[]>([]);
  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between', marginBottom: 4 }}><T v="h1">Teachers & Classes</T><RoundAdd label="Bulk add" onPress={() => router.push('/admin/bulk' as any)} /></Row>
      <Tabs value={tab} onChange={setTab} options={[{ key: 'teachers', label: 'Teachers · 18' }, { key: 'classes', label: 'Classes · 24' }]} />
      {tab === 'teachers' ? (
        <Card style={{ gap: 12, marginBottom: 6 }}>
          <Row gap={10}><Tag text="1" tone="butter" /><Avatar name="Safwan Usthad" size={40} tint={pastel.pink} /><View style={{ flex: 1 }}><T v="h3">Safwan Usthad</T><T v="small">Top teacher · October</T></View></Row>
          <Row style={{ justifyContent: 'space-between' }}>{[['Classes', '6'], ['Students', '142'], ['On time', '98%']].map(([k, v]) => <View key={k}><T v="small">{k}</T><T v="h3">{v}</T></View>)}</Row>
        </Card>
      ) : null}
      <Section title={tab === 'teachers' ? 'All teachers' : 'All classes'} />
      <View style={{ gap: 8 }}>
        {tab === 'teachers' ? TEACHERS.map(([n, s, tag], i) => (
          <ListRow key={n} left={<Avatar name={n} size={40} tint={[pastel.lav, pastel.sky, pastel.pink, pastel.mint][i]} />} title={n} sub={s} right={<Tag text={tag} tone={tag === 'Active' ? 'mint' : 'butter'} />} />
        )) : CLASSES.map(([n, s, tag]) => (
          <ListRow key={n} left={<Avatar name={n.replace('Madrasa ', 'M ')} size={40} tint={pastel.sky} />} title={n} sub={assigned.includes(n) ? s.replace('no teacher from Wed', 'Ayisha Miss (cover)') : s}
            right={tag === 'Assign' && !assigned.includes(n) ? <SmallButton title="Assign" filled tint={colors.ink} onPress={() => setAssigned([...assigned, n])} /> : <Tag text="Full" tone="mint" />} />
        ))}
      </View>
    </Screen>
  );
}

/* ---------- Attendance report ---------- */
const PERIODS = { today: ['Mon, 2 Nov · 312 students', 91, 284, 21, 7], week: ['27 Oct – 2 Nov · 5 class days', 87, 271, 33, 8], month: ['October 2026 · 19 class days', 89, 278, 27, 7] } as const;
const BY_CLASS = [['Madrasa 5', 'Ustad Ahmed', 96], ['Madrasa 3', 'Ayisha Miss', 93], ['Madrasa 1', 'Safwan Usthad', 88], ['Madrasa 7', 'Noushad K', 84], ['Madrasa 2', 'No teacher this week', 79]] as const;
const ABSENT = [['Rayan Ashraf', 'Madrasa 3', 'Absent 3 days in a row'], ['Hiba Nasar', 'Madrasa 7', 'Absent 2 days'], ['Sana Kareem', 'Madrasa 1', 'Absent today'], ['Muhammed Shafi', 'Madrasa 5', 'Joined late 3 times']] as const;

export function AdminAttendanceScreen() {
  const [p, setP] = useState<keyof typeof PERIODS>('today');
  const [view, setView] = useState<'class' | 'absent'>('class');
  const [told, setTold] = useState<string[]>([]);
  const [note, pct, present, absent, late] = PERIODS[p];
  return (
    <Screen>
      <Header title="Attendance report" right={<Pressable accessibilityLabel="Download report" onPress={() => demoNote('Demo: downloads the attendance report (step 2).')} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="download-outline" size={22} color="#FFF" /></Pressable>} />
      <Segmented value={p} onChange={setP} activeColor={colors.pink[1]} options={[{ key: 'today', label: 'Today' }, { key: 'week', label: 'This week' }, { key: 'month', label: 'This month' }]} />
      <Card style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View accessibilityLabel={`${pct} percent attendance`} style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 8, borderColor: '#2E8B47', alignItems: 'center', justifyContent: 'center' }}><T style={{ fontFamily: fonts.semibold }}>{pct}%</T></View>
        <View style={{ flex: 1, gap: 4 }}>
          <Row style={{ justifyContent: 'space-between' }}>{[['Present', present, colors.green], ['Absent', absent, '#D6336C'], ['Late', late, '#D9A92A']].map(([k, v, c]) => <View key={k as string}><T v="small" style={{ color: c as string }}>{k}</T><T v="h3">{v}</T></View>)}</Row>
          <T v="small">{note}</T>
        </View>
      </Card>
      <Tabs value={view} onChange={setView} options={[{ key: 'class', label: 'By class' }, { key: 'absent', label: `Absent students · ${absent}` }]} />
      <View style={{ gap: 8 }}>
        {view === 'class' ? BY_CLASS.map(([c, t, v]) => (
          <ListRow key={c} title={c} sub={t} right={<View style={{ width: 120, gap: 4 }}><Progress value={v} color={v >= 85 ? colors.green : '#D9A92A'} /><T style={{ textAlign: 'right', fontSize: 13, fontFamily: fonts.semibold }}>{v}%</T></View>} />
        )) : ABSENT.map(([n, c, s]) => (
          <ListRow key={n} left={<Avatar name={n} size={40} tint={pastel.pink} />} title={n} sub={`${c} · ${s}`}
            right={told.includes(n) ? <Tag text="Sent" tone="mint" /> : <SmallButton title="Notify parent" onPress={() => setTold([...told, n])} />} />
        ))}
      </View>
    </Screen>
  );
}

/* ---------- Bulk add ---------- */
const BULK = {
  students: ['students_madrasa5.xlsx', ['Name', 'Class', 'Roll no', 'Date of birth', 'Parent name', 'Parent phone'], [['12', 'Class “Madrasa 9” does not exist'], ['30', 'Parent phone is missing']], 'Send login details to parents by SMS', 'students', 48],
  teachers: ['teachers_2026.xlsx', ['Name', 'Phone', 'Email', 'Subjects', 'Classes'], [['4', 'Email is already used']], 'Send login details to teachers by SMS', 'teachers', 12],
  parents: ['parents_list.csv', ['Name', 'Phone', 'Student roll no', 'Relation'], [['7', 'Student roll no not found'], ['19', 'Phone number is not valid']], 'Send app invite to parents by SMS', 'parents', 60],
  classes: ['classes_timetable.xlsx', ['Class name', 'Subject', 'Teacher', 'Days', 'Time'], [] as string[][], 'Tell teachers about their new classes', 'classes', 24],
} as const;

export function AdminBulkScreen() {
  const [kind, setKind] = useState<keyof typeof BULK>('students');
  const [stage, setStage] = useState<'start' | 'uploaded' | 'done'>('uploaded');
  const [invite, setInvite] = useState(true);
  const [file, cols, errors, inviteText, noun, rows] = BULK[kind];
  const ok = rows - errors.length;
  return (
    <Screen>
      <Header title="Bulk add" subtitle="Add many at once from Excel or CSV" />
      <Chips value={kind} onChange={(k) => { setKind(k); setStage('uploaded'); }} options={[{ key: 'students', label: 'Students' }, { key: 'teachers', label: 'Teachers' }, { key: 'parents', label: 'Parents' }, { key: 'classes', label: 'Classes' }]} />
      <Card style={{ gap: 10 }}>
        <Row style={{ justifyContent: 'space-between' }}><T v="h3">1 · Download the template</T><SmallButton title="Template" onPress={() => demoNote(`Demo: downloads ${file.replace(/_.*\./, '_template.')}.`)} /></Row>
        <Row gap={6} style={{ flexWrap: 'wrap' }}>{cols.map((c) => <Tag key={c} text={c} tone="white" />)}</Row>
      </Card>
      <Card style={{ marginTop: 10, gap: 10 }}>
        <T v="h3">2 · Upload your filled file</T>
        {stage === 'start' ? (
          <Pressable onPress={() => setStage('uploaded')} style={{ height: 70, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}><T v="small">Tap to choose .xlsx or .csv</T></Pressable>
        ) : (
          <ListRow left={<Tag text="XLS" tone="mint" />} title={file} sub={`${rows} rows found`} right={<SmallButton title="Replace" onPress={() => setStage('start')} />} />
        )}
      </Card>
      {stage !== 'start' ? (
        <Card style={{ marginTop: 10, gap: 10 }}>
          <T v="h3">3 · Check & import</T>
          <Grid cols={{ phone: 2, tablet: 2, desktop: 2 }} gap={8}>
            <Stat label="Ready to add" value={ok} tint={pastel.mint} />
            <Stat label="Need fixing (skipped)" value={errors.length} tint={pastel.butter} />
          </Grid>
          {errors.map(([r, msg]) => <T key={r} style={{ color: '#8A5A0F', fontSize: 13 }}>Row {r}  {msg}</T>)}
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: invite }} onPress={() => setInvite(!invite)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name={invite ? 'checkbox' : 'square-outline'} size={22} color={colors.teal} /><T style={{ fontSize: 14 }}>{inviteText}</T>
          </Pressable>
          {stage === 'done' ? (
            <>
              <Card tint={colors.mint[0]}><T style={{ color: colors.mint[1], fontFamily: fonts.semibold }}>{ok} {noun} added ✓</T></Card>
              <Button title="Add another file" kind="ghost" onPress={() => setStage('start')} />
            </>
          ) : <Button title={`Import ${ok} ${noun}`} onPress={() => setStage('done')} />}
        </Card>
      ) : null}
      <T v="small" style={{ textAlign: 'center', marginTop: 8 }}>Demo data. The real import is built in step 2.</T>
    </Screen>
  );
}
