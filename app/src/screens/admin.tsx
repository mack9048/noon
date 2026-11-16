// Institute admin screens from the design canvas.
import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Grid, Header, Row, Screen, Segmented, T } from '@/components/ui';
import { useApplications } from '@/lib/admissions';
import { useApi } from '@/lib/useApi';
import { monthLabel, rupee, thisMonth, useMonthFees } from './fees';
import { useAuth } from '@/lib/auth';
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

export function AdminDashboardScreen() {
  const apps = useApplications();
  const { user } = useAuth();
  const students = useApi<unknown[]>('/admin/students').data;
  const teachers = useApi<unknown[]>('/admin/teachers').data;
  const initials = (user?.name ?? 'A').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const fees = useMonthFees();
  const feePct = fees?.summary.expected ? Math.round((fees.summary.collected / fees.summary.expected) * 100) : 0;
  const newApps = apps.filter((a) => a.status === 'new').length;
  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}><T v="small">{user?.tenant_name ?? 'Institute admin'}</T><T v="h1">Assalamu alaikum</T></View>
        <Pressable accessibilityLabel="Notifications, 4 new" onPress={() => demoNote('Demo: admin notifications show here.')} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="notifications-outline" size={22} color={colors.ink} /><View style={{ position: 'absolute', top: 10, right: 12, width: 9, height: 9, borderRadius: 5, backgroundColor: '#D6336C' }} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="My profile" onPress={() => router.push('/admin/profile' as any)}
          style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.lav[0], alignItems: 'center', justifyContent: 'center', marginLeft: 8 }}>
          <T style={{ fontFamily: fonts.semibold, color: colors.lav[1] }}>{initials}</T>
        </Pressable>
      </Row>
      <View style={{ marginTop: 14 }}>
        <Grid cols={{ phone: 3, tablet: 3, desktop: 3 }} gap={8}>
          <Pressable onPress={() => router.push('/admin/students' as any)}><Stat label="Students" value={students?.length ?? '–'} tint={pastel.lav} /></Pressable>
          <Pressable onPress={() => router.push('/admin/teachers' as any)}><Stat label="Teachers" value={teachers?.length ?? '–'} tint={pastel.sky} /></Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.push('/admin/admissions' as any)}><Stat label="Admissions" value={`${apps.filter((a) => a.status === 'new').length} new`} tint={pastel.mint} /></Pressable>
        </Grid>
      </View>
      <Card tint={colors.sky[0]} onPress={() => router.push('/admin/fees' as any)} style={{ marginTop: 14, gap: 8 }}>
        <Row style={{ justifyContent: 'space-between' }}><T style={{ fontFamily: fonts.medium }}>{monthLabel(thisMonth())} fees</T>{fees?.summary.expected ? <T v="small">{feePct}% collected</T> : null}</Row>
        {fees?.summary.expected ? (
          <>
            <T style={{ fontSize: 26, fontFamily: fonts.semibold }}>{rupee(fees.summary.collected)} <T v="small">of {rupee(fees.summary.expected)}</T></T>
            <Progress value={feePct} color={colors.teal} track="#FFF" height={10} />
          </>
        ) : <T v="small">No fees added for this month yet. Tap to add.</T>}
      </Card>
      <Section title="Needs attention" />
      <View style={{ gap: 8 }}>
        {(fees?.summary.overdue ?? 0) > 0 ? <ListRow left={<Avatar name="₹" tint={pastel.pink} />} title={`${fees!.summary.overdue} fee${fees!.summary.overdue > 1 ? 's' : ''} overdue`} sub="Remind parents on WhatsApp from Fees"
          right={<SmallButton title="Open" filled tint={colors.ink} onPress={() => router.push('/admin/fees' as any)} />} /> : null}
        {newApps > 0 ? <ListRow left={<Avatar name="+" tint={pastel.mint} />} title={`${newApps} new application${newApps > 1 ? 's' : ''}`} sub="Review and admit"
          right={<SmallButton title="Open" filled tint={colors.ink} onPress={() => router.push('/admin/admissions' as any)} />} /> : null}
        {students && students.length === 0 ? <ListRow left={<Avatar name="!" tint={pastel.butter} />} title="No students yet" sub="Add students one by one or in bulk"
          right={<SmallButton title="Add" filled tint={colors.ink} onPress={() => router.push('/admin/students/new' as any)} />} /> : null}
        {!(fees?.summary.overdue) && !newApps && students?.length !== 0 ? <T v="small">All good, alhamdulillah. Nothing needs your attention.</T> : null}
      </View>
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
