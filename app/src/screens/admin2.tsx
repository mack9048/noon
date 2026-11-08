// Institute admin screens from the second design round, plus the course editor shared
// with super admin and the public admission form.
import React, { useState, useSyncExternalStore } from 'react';
import { Linking, Platform, Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Card, IconButton, Row, Screen, T } from '@/components/ui';
import { demoNote, Tag } from '@/components/kit';
import { BottomActions, ChoiceChips, Input, MiniStat, Panel, Select, Status, Stepper, Swatches, TileRows, ToggleChips } from '@/components/kit2';
import { Logo } from '@/components/Logo';
import { CourseLogo } from '@/components/CourseLogo';
import * as DocumentPicker from 'expo-document-picker';
import { RoleProfileScreen, RoleSettingsScreen, T_ } from './roles2';
import { Application, AppStatus, setStatus, submitApplication, useApplications } from '@/lib/admissions';
import { requestApproval } from '@/lib/approvals';
import { api, ApiError } from '@/lib/api';
import { colors, fonts } from '@/theme/tokens';

const TINTS = [colors.lav, colors.sky, colors.mint, colors.pink, colors.butter];
const initials = (n: string) => n.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
const back = (to: string) => () => (router.canGoBack() ? router.back() : router.replace(to as any));
const SEATS = 60;

/* ---------- Admissions ---------- */
export function AdmissionsScreen() {
  const apps = useApplications();
  const [tab, setTab] = useState<AppStatus>('new');
  const count = (s: AppStatus) => apps.filter((a) => a.status === s).length;
  const link = 'noonlearn.app/apply/NOON01';
  const copy = async () => {
    try { await (globalThis as any).navigator?.clipboard?.writeText(`https://${link}`); demoNote('Link copied.'); } catch { demoNote(`Copy this link: https://${link}`); }
  };
  const share = () => Linking.openURL(`https://wa.me/?text=${encodeURIComponent(`Assalamu alaikum! Apply for Noon Madrasa 2026–27 here: https://${link}`)}`);
  const list = apps.filter((a) => a.status === tab);
  return (
    <Screen>
      <T v="h1">Admissions</T>
      <T v="small">Academic year 2026–27 · open</T>
      <Row gap={8} style={{ marginTop: 12 }}>
        <MiniStat value={count('new')} label="New" tint={colors.butter} />
        <MiniStat value={count('review')} label="In review" tint={colors.sky} />
        <MiniStat value={36 + count('admitted')} label="Admitted" tint={colors.mint} />
        <MiniStat value={Math.max(0, SEATS - 36 - count('admitted'))} label="Seats left" tint={colors.lav} />
      </Row>
      <LinearGradient colors={['#14945A', '#22C17A']} style={{ marginTop: 12, borderRadius: 26, padding: 16, gap: 10 }}>
        <Row gap={10}>
          <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="logo-whatsapp" size={22} color="#FFF" /></View>
          <View style={{ flex: 1 }}><T style={{ color: '#FFF', fontFamily: fonts.semibold, fontSize: 16 }}>Share admission form</T><T style={{ color: '#D7F5E6', fontSize: 12 }}>Parents fill it on their phone · no app needed</T></View>
        </Row>
        <Row style={{ backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 18, paddingLeft: 12, paddingRight: 4, height: 40 }}>
          <T style={{ color: '#FFF', flex: 1, fontSize: 13 }} numberOfLines={1}>{link}</T>
          <Pressable accessibilityRole="button" onPress={copy} style={{ backgroundColor: '#FFF', borderRadius: 16, height: 32, paddingHorizontal: 14, justifyContent: 'center' }}><T style={{ color: '#14945A', fontFamily: fonts.semibold, fontSize: 13 }}>Copy</T></Pressable>
        </Row>
        <Row gap={8}>
          <Pressable accessibilityRole="button" onPress={share} style={{ flex: 1, height: 44, borderRadius: 22, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' }}><T style={{ color: '#14945A', fontFamily: fonts.semibold }}>Send on WhatsApp</T></Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.push('/apply/NOON01' as any)} style={{ height: 44, paddingHorizontal: 18, borderRadius: 22, borderWidth: 1.5, borderColor: '#FFF', alignItems: 'center', justifyContent: 'center' }}><T style={{ color: '#FFF', fontFamily: fonts.semibold }}>Preview</T></Pressable>
        </Row>
      </LinearGradient>
      <View style={{ marginTop: 12 }}>
        <ChoiceChips value={tab} onChange={setTab} options={[{ key: 'new', label: `New · ${count('new')}` }, { key: 'review', label: `In review · ${count('review')}` }, { key: 'admitted', label: `Admitted · ${count('admitted')}` }, { key: 'rejected', label: `Rejected · ${count('rejected')}` }]} />
      </View>
      <View style={{ gap: 8, marginTop: 10 }}>
        {list.map((a, i) => (
          <Card key={a.id} onPress={() => router.push(`/admin/admissions/${a.id}` as any)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: TINTS[i % 5][0], alignItems: 'center', justifyContent: 'center' }}><T style={{ fontFamily: fonts.semibold, color: TINTS[i % 5][1] }}>{initials(a.name)}</T></View>
            <View style={{ flex: 1 }}><T style={{ fontFamily: fonts.semibold }}>{a.name}</T><T v="small">Class {a.cls} · {a.board} · {a.when}</T></View>
            <Status text={{ new: 'New', review: 'In review', admitted: 'Admitted', rejected: 'Rejected' }[a.status]} />
          </Card>
        ))}
        {!list.length ? <T v="small" style={{ textAlign: 'center', padding: 20 }}>No applications here.</T> : null}
      </View>
    </Screen>
  );
}

export function AdmissionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const a = useApplications().find((x) => x.id === id);
  if (!a) return <Screen><T>Application not found.</T></Screen>;
  const phone = a.phone.replace(/[^\d+]/g, '');
  const act = (s: AppStatus, note: string, msg: string) => { setStatus(a.id, s, note); demoNote(msg); };
  return (
    <Screen overlay={a.status === 'admitted' || a.status === 'rejected' ? undefined : (
      <BottomActions>
        <Pressable accessibilityRole="button" onPress={() => act('rejected', 'Application rejected', `${a.name}'s application was rejected. The parent gets a message.`)} style={{ height: 54, paddingHorizontal: 22, borderRadius: 27, backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#F3B7BD', justifyContent: 'center' }}><T style={{ color: colors.red, fontFamily: fonts.semibold }}>Reject</T></Pressable>
        <Pressable accessibilityRole="button" onPress={() => act('review', 'Interview booked', `Interview booked. ${a.parent} gets the time on WhatsApp.`)} style={{ height: 54, paddingHorizontal: 18, borderRadius: 27, backgroundColor: '#FFF', borderWidth: 1.5, borderColor: colors.line, justifyContent: 'center' }}><T style={{ fontFamily: fonts.semibold }}>Interview</T></Pressable>
        <Pressable accessibilityRole="button" onPress={() => act('admitted', 'Admitted', `${a.name} is admitted to Class ${a.cls}. Login details go to the parent by SMS.`)} style={{ flex: 1, height: 54, borderRadius: 27, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}><T style={{ color: '#FFF', fontFamily: fonts.semibold }}>Admit ✓</T></Pressable>
      </BottomActions>
    )}>
      <Row style={{ justifyContent: 'space-between' }}><T v="small">Application #{a.id}</T><Status text={{ new: 'New', review: 'In review', admitted: 'Admitted', rejected: 'Rejected' }[a.status]} /></Row>
      <Card style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 62, height: 62, borderRadius: 20, backgroundColor: colors.lav[0], alignItems: 'center', justifyContent: 'center' }}><T style={{ fontSize: 22, fontFamily: fonts.semibold, color: colors.lav[1] }}>{initials(a.name)}</T></View>
        <View style={{ flex: 1 }}><T v="h2">{a.name}</T><T v="small">{a.gender} · {a.age} years · born {a.dob}</T><T style={{ color: colors.violet, fontFamily: fonts.semibold, fontSize: 13 }}>Applying for Class {a.cls} · {a.board} board</T></View>
      </Card>
      <Panel title="PARENT / GUARDIAN">
        {[['Name', a.parent], ['Relation', a.relation], ['Phone', a.phone], ['Lives in', a.city]].map(([k, v]) => <Row key={k} style={{ justifyContent: 'space-between' }}><T v="small">{k}</T><T style={{ fontFamily: fonts.medium }}>{v}</T></Row>)}
        <Row gap={10}>
          <Pressable accessibilityRole="button" onPress={() => Linking.openURL(`https://wa.me/${phone.replace('+', '')}`)} style={{ flex: 1, height: 46, borderRadius: 23, backgroundColor: '#22C17A', alignItems: 'center', justifyContent: 'center' }}><T style={{ color: '#FFF', fontFamily: fonts.semibold }}>WhatsApp</T></Pressable>
          <Pressable accessibilityRole="button" onPress={() => Linking.openURL(`tel:${phone}`)} style={{ flex: 1, height: 46, borderRadius: 23, borderWidth: 1.5, borderColor: colors.violet, alignItems: 'center', justifyContent: 'center' }}><T style={{ fontFamily: fonts.semibold }}>Call</T></Pressable>
        </Row>
      </Panel>
      <Panel title="STUDY DETAILS">
        {[['Board', a.board === 'AP' ? 'Sunni Vidyabhyasa Board (AP)' : a.board === 'EK' ? 'Sunni Board (EK)' : 'General'], ['Class', a.cls], ['Previous madrasa', a.prevMadrasa ?? '—'], ['Preferred time', a.time ?? '—']].map(([k, v]) => <Row key={k} style={{ justifyContent: 'space-between' }}><T v="small">{k}</T><T style={{ fontFamily: fonts.medium, flexShrink: 1, textAlign: 'right' }}>{v}</T></Row>)}
      </Panel>
      <Panel title="DOCUMENTS">
        {([['Birth certificate', a.docs.birth], ['Previous class TC', a.docs.tc], ['Student photo', a.docs.photo]] as const).map(([k, ok]) => (
          <Row key={k} gap={10}><Ionicons name="document-text-outline" size={20} color={colors.butter[1]} /><T style={{ flex: 1 }}>{k}</T><T style={{ fontFamily: fonts.semibold, fontSize: 12, color: ok ? colors.green : colors.red }}>{ok ? 'Uploaded' : 'Missing'}</T></Row>
        ))}
      </Panel>
      <Panel title="TIMELINE" style={{ marginBottom: 90 }}>
        {a.timeline.map(([t, w], i) => (
          <Row key={i} gap={10} style={{ alignItems: 'flex-start' }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, marginTop: 5, backgroundColor: i === 0 ? colors.green : colors.violet }} />
            <View><T style={{ fontFamily: fonts.medium }}>{t}</T><T v="small">{w}</T></View>
          </Row>
        ))}
      </Panel>
    </Screen>
  );
}

/** Public admission form (opened from the shared link, no login needed). */
export function AdmissionFormScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'Boy' | 'Girl'>('Boy');
  const [board, setBoard] = useState('AP board');
  const [cls, setCls] = useState('5');
  const [parent, setParent] = useState('');
  const [phone, setPhone] = useState('+971 ');
  const [docs, setDocs] = useState({ birth: false, tc: false, photo: false });
  const [done, setDone] = useState<string | null>(null);
  const submit = () => {
    if (name.trim().length < 3 || parent.trim().length < 3 || phone.replace(/\D/g, '').length < 9) return demoNote('Please fill the student name, parent name and WhatsApp number.');
    const age = dob ? Math.max(3, new Date().getFullYear() - new Date(dob).getFullYear()) : 0;
    const id = submitApplication({ name: name.trim(), gender, dob: dob || '—', age, board: board.split(' ')[0], cls, parent: parent.trim(), relation: 'Parent', phone: phone.trim(), city: '—', docs });
    setDone(id);
  };
  if (done) {
    return (
      <Screen bar={false}>
        <View style={{ alignItems: 'center', marginTop: 60, gap: 12, padding: 20 }}>
          <View style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: colors.mint[0], alignItems: 'center', justifyContent: 'center' }}><Ionicons name="checkmark" size={48} color={colors.green} /></View>
          <T v="h1" style={{ textAlign: 'center' }}>Application sent</T>
          <T style={{ textAlign: 'center' }}>Your application number is <T style={{ fontFamily: fonts.semibold }}>{done}</T>. The madrasa office will message you on WhatsApp.</T>
        </View>
      </Screen>
    );
  }
  return (
    <Screen bar={false} overlay={<BottomActions><Pressable accessibilityRole="button" onPress={submit} style={{ flex: 1, height: 56, borderRadius: 28, backgroundColor: colors.yellow, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 5, borderBottomColor: colors.yellowDeep }}><T style={{ fontFamily: fonts.semibold, fontSize: 16, color: '#2A1E00' }}>Submit application</T></Pressable></BottomActions>}>
      <LinearGradient colors={['#0B5166', '#5B43E0']} style={{ marginHorizontal: -20, marginTop: -12, padding: 20, paddingBottom: 46, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}>
        <View style={{ alignSelf: 'flex-start', backgroundColor: '#FFF', borderRadius: 12, padding: 6 }}><Logo height={24} /></View>
        <T style={{ color: '#D9F2F5', marginTop: 16 }}>Noon Madrasa · 2026–27{code ? ` · ${String(code).toUpperCase()}` : ''}</T>
        <Text style={{ fontFamily: fonts.fun, fontSize: 30, color: '#FFF' }}>Admission form</Text>
        <T style={{ color: '#D9F2F5', fontSize: 12 }}>Takes about 3 minutes · last date 30 Nov</T>
      </LinearGradient>
      <Panel style={{ marginTop: -28 }}>
        <T style={{ color: colors.violet, fontFamily: fonts.semibold, fontSize: 12 }}>1 · STUDENT</T>
        <Input label="Student full name" value={name} onChangeText={setName} placeholder="eg. Rayan Ahmed" />
        <Row gap={10}><Input label="Date of birth" value={dob} onChangeText={setDob} placeholder="YYYY-MM-DD" /><Select label="Gender" value={gender} options={['Boy', 'Girl']} onChange={setGender} /></Row>
        <Row gap={10}><Select label="Board" value={board} options={['AP board', 'EK board', 'General']} onChange={setBoard} /><Select label="Class" value={cls} options={['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '+1', '+2']} onChange={setCls} /></Row>
      </Panel>
      <Panel>
        <T style={{ color: colors.violet, fontFamily: fonts.semibold, fontSize: 12 }}>2 · PARENT</T>
        <Input label="Parent name" value={parent} onChangeText={setParent} placeholder="Father / mother / guardian" />
        <Input label="WhatsApp number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      </Panel>
      <Panel style={{ marginBottom: 90 }}>
        <T style={{ color: colors.violet, fontFamily: fonts.semibold, fontSize: 12 }}>3 · DOCUMENTS</T>
        {([['birth', 'Birth certificate'], ['tc', 'Previous TC (if any)'], ['photo', 'Student photo']] as const).map(([k, l]) => (
          <Pressable key={k} accessibilityRole="button" onPress={() => setDocs({ ...docs, [k]: !docs[k] })}
            style={{ height: 52, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: docs[k] ? colors.green : colors.line, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10 }}>
            <Ionicons name={k === 'photo' ? 'image-outline' : 'document-text-outline'} size={18} color={colors.ink} />
            <T style={{ flex: 1 }}>{l}</T>
            <T style={{ color: docs[k] ? colors.green : colors.violet, fontFamily: fonts.semibold, fontSize: 13 }}>{docs[k] ? 'Added ✓' : 'Upload'}</T>
          </Pressable>
        ))}
      </Panel>
    </Screen>
  );
}

/* ---------- Batches ---------- */
type Batch = { id: number; cls: string; name: string; board: string; when: string; students: number; teachers: number; subjects: number; ct: string; g: [string, string] };
let batches: Batch[] = [
  { id: 1, cls: '5', name: 'Madrasa 5 · Morning', board: 'AP board', when: 'Mon–Thu 4:30 PM', students: 28, teachers: 3, subjects: 8, ct: 'Ustad Ahmed', g: ['#5B43E0', '#9B7BE8'] },
  { id: 2, cls: '3', name: 'Madrasa 3 · Evening', board: 'AP board', when: 'Mon–Thu 6:00 PM', students: 22, teachers: 3, subjects: 7, ct: 'Ayisha Miss', g: ['#0B5166', '#1F8AA8'] },
  { id: 3, cls: '7', name: 'Madrasa 7', board: 'EK board', when: 'Tue–Fri 5:00 PM', students: 25, teachers: 4, subjects: 8, ct: 'Safwan Usthad', g: ['#14945A', '#4ED68A'] },
  { id: 4, cls: '+1', name: 'Plus One · Girls', board: 'General', when: 'Sat–Sun 10:00 AM', students: 14, teachers: 2, subjects: 6, ct: 'Ayisha Miss', g: ['#FF9A3D', '#FF5E7E'] },
];
const bListeners = new Set<() => void>();
const useBatches = () => useSyncExternalStore((l) => { bListeners.add(l); return () => { bListeners.delete(l); }; }, () => batches, () => batches);

export function BatchesScreen() {
  const list = useBatches();
  const total = list.reduce((n, b) => n + b.students, 0);
  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <View><T v="h1">Batches</T><T v="small">{list.length} batches · {total} students</T></View>
        <Pressable accessibilityRole="button" onPress={() => router.push('/admin/batches/new' as any)} style={{ height: 46, paddingHorizontal: 16, borderRadius: 23, backgroundColor: colors.ink, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="add" size={18} color="#FFF" /><T style={{ color: '#FFF', fontFamily: fonts.semibold }}>New batch</T>
        </Pressable>
      </Row>
      <View style={{ gap: 12, marginTop: 12 }}>
        {list.map((b) => (
          <Card key={b.id} style={{ gap: 10 }}>
            <Row gap={12}>
              <LinearGradient colors={b.g} style={{ width: 54, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#FFF', fontSize: 9, fontFamily: fonts.semibold }}>CLASS</Text><Text style={{ color: '#FFF', fontSize: 20, fontFamily: fonts.fun, lineHeight: 22 }}>{b.cls}</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}><T v="h3">{b.name}</T><T v="small">{b.board} · {b.when}</T></View>
              <IconButton name="pencil-outline" label={`Edit ${b.name}`} size={40} tint="#F1F4F5" onPress={() => router.push('/admin/batches/new' as any)} />
            </Row>
            <Row gap={8}>
              {[[b.students, 'Students'], [b.teachers, 'Teachers'], [b.subjects, 'Subjects']].map(([v, l]) => (
                <View key={l} style={{ flex: 1, borderRadius: 14, backgroundColor: '#F4F7F8', padding: 8 }}><T style={{ fontFamily: fonts.semibold, fontSize: 16 }}>{v}</T><T v="small" style={{ fontSize: 11 }}>{l}</T></View>
              ))}
            </Row>
            <Row gap={8}><Tag text="★ CLASS TEACHER" tone="butter" /><T style={{ fontFamily: fonts.semibold, fontSize: 13 }}>{b.ct}</T></Row>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

const ALL_STUDENTS = ['Ayisha Rahman', 'Fathima Nasrin', 'Hamdan P', 'Muhammed Adil', 'Nihal T', 'Rayan Ahmed', 'Shifa K', 'Zayan M', 'Amna Sherin', 'Bilal K'];
const TEACHERS = ['Ustad Ahmed', 'Ayisha Miss', 'Safwan Usthad', 'Noushad K'];

export function BatchNewScreen() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('Madrasa 5 · Evening');
  const [board, setBoard] = useState('AP board');
  const [cls, setCls] = useState('5');
  const [days, setDays] = useState(['Mo', 'Tu', 'We', 'Th']);
  const [time, setTime] = useState('06:00 PM');
  const [seats, setSeats] = useState('30');
  const [students, setStudents] = useState<string[]>([]);
  const [ct, setCt] = useState('Ustad Ahmed');
  const [subjTeachers, setSubjTeachers] = useState<Record<string, string>>({ Arabic: 'Ustad Ahmed', Fiqh: 'Ayisha Miss', Quran: 'Safwan Usthad', Thajweed: 'Safwan Usthad' });
  const create = () => {
    if (!name.trim() || !days.length) return demoNote('Give the batch a name and pick its class days.');
    const g = (['#5B43E0', '#9B7BE8'] as [string, string]);
    const order = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
    const sorted = [...days].sort((a, b) => order.indexOf(a) - order.indexOf(b));
    batches = [...batches, { id: Date.now(), cls, name: name.trim(), board, when: `${sorted[0]}–${sorted[sorted.length - 1]} ${time}`, students: students.length, teachers: new Set(Object.values(subjTeachers)).size, subjects: Object.keys(subjTeachers).length, ct, g }];
    bListeners.forEach((l) => l());
    demoNote(`Batch "${name.trim()}" created with ${students.length} students.`);
    router.replace('/admin/batches' as any);
  };
  return (
    <Screen overlay={<BottomActions>
      {step > 0 ? <Pressable accessibilityRole="button" onPress={() => setStep(step - 1)} style={{ height: 56, paddingHorizontal: 24, borderRadius: 28, backgroundColor: '#FFF', borderWidth: 1.5, borderColor: colors.line, justifyContent: 'center' }}><T style={{ fontFamily: fonts.semibold }}>‹ Back</T></Pressable> : null}
      <Pressable accessibilityRole="button" onPress={() => (step < 2 ? setStep(step + 1) : create())} style={{ flex: 1, height: 56, borderRadius: 28, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}><T style={{ color: '#FFF', fontFamily: fonts.semibold }}>{step < 2 ? 'Next →' : 'Create batch'}</T></Pressable>
    </BottomActions>}>
      <T v="h1">Create batch</T>
      <View style={{ marginTop: 12 }}><Stepper steps={['Details', 'Students', 'Teachers']} step={step} onStep={setStep} /></View>
      {step === 0 ? (
        <Panel>
          <Input label="Batch name" value={name} onChangeText={setName} />
          <Row gap={10}><Select label="Board" value={board} options={['AP board', 'EK board', 'General']} onChange={setBoard} /><Select label="Class" value={cls} options={['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '+1', '+2']} onChange={setCls} /></Row>
          <T v="small" style={{ fontFamily: fonts.medium }}>Class days</T>
          <ToggleChips options={['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']} value={days} onChange={setDays} />
          <Row gap={10}><Input label="Start time" value={time} onChangeText={setTime} /><Input label="Seats" value={seats} onChangeText={setSeats} keyboardType="number-pad" /></Row>
        </Panel>
      ) : step === 1 ? (
        <Panel title={`Students · ${students.length} of ${seats}`} right={<Pressable accessibilityRole="button" onPress={() => setStudents(students.length ? [] : ALL_STUDENTS.slice(0, Number(seats) || 30))}><T style={{ color: colors.teal, fontFamily: fonts.semibold }}>{students.length ? 'Clear' : 'Select all'}</T></Pressable>}>
          {ALL_STUDENTS.map((s, i) => {
            const on = students.includes(s);
            return (
              <Pressable key={s} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => setStudents(on ? students.filter((x) => x !== s) : [...students, s])} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: TINTS[i % 5][0], alignItems: 'center', justifyContent: 'center' }}><T style={{ color: TINTS[i % 5][1], fontFamily: fonts.semibold, fontSize: 12 }}>{initials(s)}</T></View>
                <T style={{ flex: 1 }}>{s}</T>
                <Ionicons name={on ? 'checkbox' : 'square-outline'} size={22} color={on ? colors.violet : colors.line} />
              </Pressable>
            );
          })}
        </Panel>
      ) : (
        <Panel title="Teachers">
          <Select label="Class teacher" value={ct} options={TEACHERS} onChange={setCt} />
          {Object.keys(subjTeachers).map((s) => <Select key={s} label={s} value={subjTeachers[s]} options={TEACHERS} onChange={(v) => setSubjTeachers({ ...subjTeachers, [s]: v })} />)}
        </Panel>
      )}
      <View style={{ height: 80 }} />
    </Screen>
  );
}

/* ---------- Teachers & Classes ---------- */
const STAFF = [['Ustad Ahmed', 'Arabic, Akhlaq · 4 classes', 'Active'], ['Ayisha Miss', 'Fiqh, Quran · 5 classes', 'Active'], ['Safwan Usthad', 'Thajweed · 6 classes', 'Active'], ['Noushad K', 'Fiqh · 2 classes', 'On leave']] as const;
export function TeachersClassesScreen() {
  const [tab, setTab] = useState<'teachers' | 'classes'>('teachers');
  const list = useBatches();
  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="h1">Teachers & Classes</T>
        <IconButton name="add" label="Add teacher" size={52} tint={colors.ink} color="#FFF" onPress={() => demoNote('Demo: add a teacher with their phone number; they get a login by SMS.')} />
      </Row>
      <Pressable accessibilityRole="button" onPress={() => router.push('/admin/batches' as any)} style={{ marginTop: 12 }}>
        <LinearGradient colors={['#5B43E0', '#9B7BE8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 22, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Ionicons name="people-outline" size={24} color="#FFF" />
          <View style={{ flex: 1 }}><T style={{ color: '#FFF', fontFamily: fonts.semibold }}>Batches · {list.length}</T><T style={{ color: '#EDE7FF', fontSize: 12 }}>Group students, assign teachers & class teacher</T></View>
          <View style={{ backgroundColor: '#FFF', borderRadius: 16, height: 32, paddingHorizontal: 14, justifyContent: 'center' }}><T style={{ color: colors.violet, fontFamily: fonts.semibold }}>Open</T></View>
        </LinearGradient>
      </Pressable>
      <Row style={{ marginTop: 12, borderBottomWidth: 1.5, borderBottomColor: colors.line }}>
        {([['teachers', 'Teachers · 18'], ['classes', `Classes · ${list.length}`]] as const).map(([k, l]) => (
          <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: tab === k }} onPress={() => setTab(k)} style={{ flex: 1, height: 46, alignItems: 'center', justifyContent: 'center', borderBottomWidth: tab === k ? 2.5 : 0, borderBottomColor: colors.teal, marginBottom: -1.5 }}>
            <T style={{ color: tab === k ? colors.teal : colors.muted, fontFamily: tab === k ? fonts.semibold : fonts.regular }}>{l}</T>
          </Pressable>
        ))}
      </Row>
      {tab === 'teachers' ? (
        <>
          <Card style={{ marginTop: 12, gap: 10 }}>
            <Row gap={10}>
              <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: colors.butter[0], alignItems: 'center', justifyContent: 'center' }}><T style={{ fontFamily: fonts.semibold, color: colors.butter[1] }}>1</T></View>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.pink[0], alignItems: 'center', justifyContent: 'center' }}><T style={{ fontFamily: fonts.semibold, color: colors.pink[1] }}>SU</T></View>
              <View style={{ flex: 1 }}><T v="h3">Safwan Usthad</T><T v="small">Top teacher · October</T></View>
              <IconButton name="chevron-forward" label="Open Safwan Usthad" size={40} tint="#F1F4F5" onPress={() => demoNote('Demo: teacher details and timetable open here.')} />
            </Row>
            <Row style={{ borderTopWidth: 1, borderTopColor: '#EEF3F5', paddingTop: 8 }}>
              {[['Classes', '6'], ['Students', '142'], ['On time', '98%']].map(([k, v]) => <View key={k} style={{ flex: 1 }}><T v="small">{k}</T><T v="h3">{v}</T></View>)}
            </Row>
          </Card>
          <T v="h2" style={{ marginTop: 16, marginBottom: 8 }}>All teachers</T>
          <View style={{ gap: 8 }}>
            {STAFF.map(([n, sub, st], i) => (
              <Card key={n} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: TINTS[(i + 1) % 5][0], alignItems: 'center', justifyContent: 'center' }}><T style={{ fontFamily: fonts.semibold, color: TINTS[(i + 1) % 5][1] }}>{initials(n)}</T></View>
                <View style={{ flex: 1 }}><T style={{ fontFamily: fonts.semibold }}>{n}</T><T v="small">{sub}</T></View>
                <Status text={st} />
              </Card>
            ))}
          </View>
        </>
      ) : (
        <View style={{ gap: 8, marginTop: 12 }}>
          {list.map((b) => (
            <Card key={b.id} onPress={() => router.push('/admin/batches' as any)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <LinearGradient colors={b.g} style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFF', fontFamily: fonts.fun, fontSize: 17 }}>{b.cls}</Text></LinearGradient>
              <View style={{ flex: 1 }}><T style={{ fontFamily: fonts.semibold }}>{b.name}</T><T v="small">{b.students} students · class teacher {b.ct}</T></View>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

/* ---------- Course editor (admin: send for approval · super: publish) ---------- */
type Kind = 'live' | 'video' | 'audio' | 'pdf' | 'note' | 'image' | 'quiz' | 'link';
type Lesson = { title: string; live?: boolean; items: Kind[] };
const KIND_ICON: Record<Kind, [keyof typeof Ionicons.glyphMap, readonly [string, string]]> = {
  live: ['radio-outline', ['#FBD9DC', colors.red]], video: ['videocam-outline', colors.sky], audio: ['headset-outline', colors.mint], pdf: ['book-outline', colors.butter],
  note: ['document-text-outline', colors.pink], image: ['image-outline', colors.lav], quiz: ['checkmark-circle-outline', colors.lav], link: ['link-outline', colors.sky],
};
const COURSE_COLOURS = ['#7B5CF0', '#22A86B', '#1F8AA8', '#E0368C', '#F08A24', '#3B2FA8'];
const LETTER: Record<string, string> = { Arabic: 'ع', Quran: 'ق', Fiqh: 'ف', Seerah: 'س', Hifz: 'ح', 'Duas & Adkar': 'د' };

export function CourseEditorScreen({ mode }: { mode: 'admin' | 'super' }) {
  const [title, setTitle] = useState('Arabic for Beginners');
  const [desc, setDesc] = useState('Read and write the Arabic letters with harakath.');
  const [cat, setCat] = useState('Arabic');
  const [visible, setVisible] = useState(mode === 'admin' ? 'My madrasa only' : 'All madrasas');
  const [level, setLevel] = useState('Beginner');
  const [colour, setColour] = useState(COURSE_COLOURS[0]);
  const [logo, setLogo] = useState<string | null>(null);
  const pickLogo = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'], copyToCacheDirectory: true });
    const f = r.canceled ? null : r.assets?.[0];
    if (!f) return;
    if (f.size && f.size > 2 * 1024 * 1024) return demoNote('That image is over 2 MB. Please pick a smaller one.');
    setLogo(f.uri);
  };
  const [pricing, setPricing] = useState<'free' | 'once' | 'monthly'>('once');
  const [price, setPrice] = useState('1499');
  const [offer, setOffer] = useState('999');
  const [trial, setTrial] = useState('7 days');
  const [freeLessons, setFreeLessons] = useState('2');
  const [freeForSubs, setFreeForSubs] = useState(true);
  const [lessons, setLessons] = useState<Lesson[]>([
    { title: 'Welcome & the alphabet', live: true, items: ['live', 'video', 'pdf'] },
    { title: 'Letters ا to ح', items: ['video', 'audio', 'note', 'quiz'] },
    { title: 'Harakath: fatha, kasra, damma', items: ['video', 'pdf', 'image'] },
    { title: 'Joining letters', items: [] },
  ]);
  const [busy, setBusy] = useState(false);
  const base = mode === 'admin' ? '/admin' : '/super';
  const move = (i: number, d: -1 | 1) => { const j = i + d; if (j < 0 || j >= lessons.length) return; const l = [...lessons]; [l[i], l[j]] = [l[j], l[i]]; setLessons(l); };
  const count = lessons.reduce((n, l) => n + l.items.length, 0);

  const submit = async () => {
    if (!title.trim()) return demoNote('Give the course a name.');
    if (mode === 'admin') {
      requestApproval({ title: title.trim(), glyph: LETTER[cat] ?? title[0], tint: [colors.lav[0], colors.lav[1]], madrasa: 'Noon Madrasa', tags: [cat, `${count} items`, level, visible] });
      demoNote('Sent to Noon Learn for approval. Students see it once it is approved.');
      router.replace('/admin/courses' as any);
      return;
    }
    setBusy(true);
    try {
      const c = await api.post<{ id: number }>('/super/courses', { title: title.trim(), category: cat, level, cover: colour, status: 'published', is_free: pricing === 'free', logo_url: logo });
      for (const l of lessons) await api.post(`/super/courses/${c.id}/items`, { kind: l.live ? 'live' : 'video', title: l.title, meta: `${l.items.length} items` });
      demoNote('Course published.');
      router.replace('/super/courses' as any);
    } catch (e: any) { demoNote(e instanceof ApiError ? e.friendly : e?.message ?? 'Could not publish.'); } finally { setBusy(false); }
  };

  return (
    <Screen overlay={<BottomActions>
      <Pressable accessibilityRole="button" onPress={() => demoNote('Draft saved.')} style={{ height: 56, paddingHorizontal: 24, borderRadius: 28, backgroundColor: '#FFF', borderWidth: 1.5, borderColor: colors.line, justifyContent: 'center' }}><T style={{ fontFamily: fonts.semibold }}>Save draft</T></Pressable>
      <Pressable accessibilityRole="button" disabled={busy} onPress={submit} style={{ flex: 1, height: 56, borderRadius: 28, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.7 : 1 }}><T style={{ color: '#FFF', fontFamily: fonts.semibold }}>{mode === 'admin' ? 'Send for approval' : busy ? 'Publishing…' : 'Publish course'}</T></Pressable>
    </BottomActions>}>
      <Row style={{ justifyContent: 'space-between' }}><T v="h1">Create course</T><Tag text="Draft" tone="butter" /></Row>
      {mode === 'admin' ? (
        <View style={{ marginTop: 10, backgroundColor: '#FFF4CC', borderRadius: 18, padding: 12, flexDirection: 'row', gap: 10 }}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#6A4D00" />
          <T style={{ flex: 1, fontSize: 13, color: '#6A4D00' }}>New courses go to <T style={{ fontFamily: fonts.semibold, color: '#6A4D00' }}>Noon Learn (super admin)</T> for approval before students can see them.</T>
        </View>
      ) : null}
      <LinearGradient colors={[colour, '#B49CFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ marginTop: 12, height: 150, borderRadius: 26, padding: 16, overflow: 'hidden' }}>
        <View style={{ alignSelf: 'flex-start', backgroundColor: '#FFF', borderRadius: 10, paddingHorizontal: 8, height: 22, justifyContent: 'center' }}><T style={{ fontSize: 10, fontFamily: fonts.semibold, color: colour }}>{cat}·{level}</T></View>
        <T style={{ position: 'absolute', right: 24, top: 6, fontFamily: fonts.arabic, fontSize: 70, color: 'rgba(255,255,255,0.9)' }}>{LETTER[cat] ?? (title[0] || 'N')}</T>
        <Text style={{ marginTop: 'auto', fontFamily: fonts.fun, fontSize: 22, color: '#FFF' }} numberOfLines={1}>{title || 'Course name'}</Text>
        <Row style={{ justifyContent: 'space-between' }}>
          <T style={{ color: '#EDE7FF', fontSize: 12 }}>{lessons.length} lessons · student card preview</T>
          <View style={{ backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 10, height: 26, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {pricing === 'free' ? <T style={{ fontFamily: fonts.semibold, fontSize: 13 }}>Free</T> : <>{offer ? <T style={{ textDecorationLine: 'line-through', color: colors.muted, fontSize: 11 }}>₹{price}</T> : null}<T style={{ fontFamily: fonts.semibold, fontSize: 13 }}>₹{offer || price}{pricing === 'monthly' ? '/mo' : ''}</T></>}
          </View>
        </Row>
      </LinearGradient>
      <Panel title="Course details">
        <Input label="Course name" value={title} onChangeText={setTitle} />
        <Input label="Short description" value={desc} onChangeText={setDesc} multiline />
        <Row gap={10}><Select label="Category" value={cat} options={['Arabic', 'Quran', 'Fiqh', 'Seerah', 'Hifz', 'Duas & Adkar']} onChange={setCat} /><Select label="Visible to" value={visible} options={mode === 'admin' ? ['My madrasa only', 'All Noon Learn'] : ['All madrasas', 'Pro madrasas', 'Guests only']} onChange={setVisible} /></Row>
        <T v="small" style={{ fontFamily: fonts.medium }}>Level</T>
        <ChoiceChips value={level} onChange={setLevel} options={['Beginner', 'Middle', 'Advanced'].map((k) => ({ key: k, label: k }))} />
      </Panel>
      <Panel title="Course logo" right={<T v="small">shown on the student's Classroom card</T>}>
        <Row gap={14}>
          <View style={{ width: 110, height: 110, borderRadius: 24, backgroundColor: '#FFF', borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', padding: 6 }}>
            <CourseLogo title={title || 'Course'} logo={logo} category={cat} size={100} />
          </View>
          <View style={{ flex: 1, gap: 8 }}>
            <Pressable accessibilityRole="button" onPress={pickLogo} style={{ height: 46, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.teal, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Ionicons name="cloud-upload-outline" size={18} color={colors.teal} /><T style={{ color: colors.teal, fontFamily: fonts.semibold, fontSize: 13 }}>{logo ? 'Change logo' : 'Upload logo'}</T>
            </Pressable>
            {logo ? <Pressable accessibilityRole="button" onPress={() => setLogo(null)}><T v="small" style={{ color: colors.red }}>Remove logo</T></Pressable> : null}
            <T v="small">Square PNG or JPG, at least 512 × 512, max 2 MB. A transparent background looks best.</T>
          </View>
        </Row>
        {/* Live preview of the Classroom card */}
        <LinearGradient colors={['#5B43E0', '#9B7BE8', '#D59BE0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 22, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <T style={{ color: '#EDE7FF', fontFamily: fonts.semibold, fontSize: 10 }}>CURRENT LESSON</T>
            <T style={{ color: '#EDE7FF', fontSize: 12 }}>{cat} · Lesson 01</T>
            <T style={{ color: '#FFF', fontFamily: fonts.fun, fontSize: 20 }} numberOfLines={1}>{(lessons[0]?.title ?? 'First lesson')}</T>
            <View style={{ marginTop: 6, alignSelf: 'flex-start', backgroundColor: '#FFF', borderRadius: 14, height: 28, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}><Ionicons name="videocam" size={12} color="#46308A" /><T style={{ fontFamily: fonts.fun, fontSize: 12, color: '#46308A' }}>Join Class</T></View>
          </View>
          <View style={{ width: 84, height: 84, borderRadius: 18, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' }}><CourseLogo title={title || 'Course'} logo={logo} category={cat} size={76} /></View>
        </LinearGradient>
      </Panel>
      <Panel title="Colour & thumbnail">
        <Swatches colorsList={COURSE_COLOURS} value={colour} onChange={setColour} />
        <T v="small">The colour is used on the course banner in the course list.</T>
      </Panel>
      <Panel title="Pricing" right={<T v="small">shown on the course card</T>}>
        <ChoiceChips value={pricing} onChange={setPricing} options={[{ key: 'free', label: 'Free' }, { key: 'once', label: 'One-time' }, { key: 'monthly', label: 'Monthly' }]} />
        {pricing !== 'free' ? <Row gap={10}><Input label="Course price (₹)" value={price} onChangeText={setPrice} keyboardType="number-pad" /><Input label="Offer price (optional)" value={offer} onChangeText={setOffer} keyboardType="number-pad" /></Row> : null}
        <Row gap={10}><Select label="Free trial" value={trial} options={['None', '3 days', '7 days', '14 days']} onChange={setTrial} /><Select label="Free lessons" value={freeLessons} options={['0', '1', '2', '3', '5']} onChange={setFreeLessons} /></Row>
        <Row style={{ justifyContent: 'space-between' }}><T style={{ flex: 1, fontSize: 14 }}>Free for students of subscribed madrasas</T>
          <Pressable accessibilityRole="switch" accessibilityState={{ checked: freeForSubs }} onPress={() => setFreeForSubs(!freeForSubs)} style={{ width: 50, height: 30, borderRadius: 15, backgroundColor: freeForSubs ? colors.green : '#D2E1E5', padding: 3, alignItems: freeForSubs ? 'flex-end' : 'flex-start' }}><View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFF' }} /></Pressable>
        </Row>
        <T v="small">Students pay in the app (UPI / card). {mode === 'admin' ? 'Revenue share: 70% madrasa · 30% Noon Learn.' : 'Payments go to Noon Learn.'}</T>
      </Panel>
      <Panel title="Lessons" right={<T v="small">{lessons.length} lessons · {count} items</T>} style={{ marginBottom: 90 }}>
        {lessons.map((l, i) => (
          <Pressable key={`${l.title}${i}`} accessibilityRole="button" onPress={() => router.push(`${base}/courses/lesson?n=${i + 1}&t=${encodeURIComponent(l.title)}&c=${encodeURIComponent(title)}` as any)}
            style={{ borderRadius: 18, borderWidth: 1.5, borderColor: '#D9CCF7', padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: colors.violet, alignItems: 'center', justifyContent: 'center' }}><T style={{ color: '#FFF', fontFamily: fonts.semibold }}>{i + 1}</T></View>
            <View style={{ flex: 1, gap: 4 }}>
              <Row gap={6}><T style={{ fontFamily: fonts.semibold }} numberOfLines={1}>{l.title}</T>{l.live ? <Tag text="LIVE" tone="pink" /> : null}</Row>
              {l.items.length ? <Row gap={4}>{l.items.map((k, j) => <View key={j} style={{ width: 24, height: 24, borderRadius: 7, backgroundColor: KIND_ICON[k][1][0], alignItems: 'center', justifyContent: 'center' }}><Ionicons name={KIND_ICON[k][0]} size={13} color={KIND_ICON[k][1][1]} /></View>)}</Row>
                : <T v="small" style={{ color: colors.red }}>No content yet · tap to add</T>}
            </View>
            <View>
              <IconButton name="chevron-up" label={`Move ${l.title} up`} size={28} tint="transparent" onPress={() => move(i, -1)} />
              <IconButton name="chevron-down" label={`Move ${l.title} down`} size={28} tint="transparent" onPress={() => move(i, 1)} />
            </View>
          </Pressable>
        ))}
        <Pressable accessibilityRole="button" onPress={() => setLessons([...lessons, { title: `Lesson ${lessons.length + 1}`, items: [] }])}
          style={{ height: 50, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#B49CFF', alignItems: 'center', justifyContent: 'center' }}>
          <T style={{ color: colors.violet, fontFamily: fonts.semibold }}>+ Add lesson</T>
        </Pressable>
      </Panel>
    </Screen>
  );
}

/* ---------- Lesson editor ---------- */
const ADD: [Kind | 'live', string][] = [['video', 'Video'], ['audio', 'Audio'], ['pdf', 'PDF book'], ['note', 'Class note'], ['image', 'Image'], ['quiz', 'Quiz'], ['link', 'Link'], ['live', 'Live class']];
export function LessonEditScreen() {
  const { n, t, c } = useLocalSearchParams<{ n?: string; t?: string; c?: string }>();
  const [title, setTitle] = useState(t ?? 'Letters ا to ح');
  const [learn, setLearn] = useState('Say and write the first 7 letters.');
  const [dur, setDur] = useState('45 min');
  const [preview, setPreview] = useState('No');
  const [items, setItems] = useState<{ kind: Kind; title: string; meta: string }[]>([
    { kind: 'video', title: title, meta: 'Video · 12:40 · uploaded' }, { kind: 'audio', title: 'Listen and repeat', meta: 'Audio · 3:05 · uploaded' },
    { kind: 'note', title: 'Class note: letter shapes', meta: '2 pages · written' }, { kind: 'quiz', title: 'Quiz: 7 letters', meta: '5 questions' },
  ]);
  const add = (k: Kind) => setItems([...items, { kind: k, title: `New ${ADD.find((a) => a[0] === k)?.[1].toLowerCase()}`, meta: 'Tap to upload or write' }]);
  return (
    <Screen overlay={<BottomActions>
      <Pressable accessibilityRole="button" onPress={() => demoNote('Demo: this is how students will see the lesson.')} style={{ height: 56, paddingHorizontal: 20, borderRadius: 28, backgroundColor: '#FFF', borderWidth: 1.5, borderColor: colors.line, justifyContent: 'center' }}><T style={{ fontFamily: fonts.semibold }}>Student preview</T></Pressable>
      <Pressable accessibilityRole="button" onPress={() => { demoNote('Lesson saved.'); router.back(); }} style={{ flex: 1, height: 56, borderRadius: 28, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}><T style={{ color: '#FFF', fontFamily: fonts.semibold }}>Save lesson</T></Pressable>
    </BottomActions>}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}><T v="small">{c ?? 'Arabic for Beginners'}</T><T v="h1">Lesson {n ?? 2}</T></View>
        <Tag text={`${items.length} items`} tone="mint" />
      </Row>
      <Panel>
        <Input label="Lesson title" value={title} onChangeText={setTitle} />
        <Input label="What students will learn" value={learn} onChangeText={setLearn} multiline />
        <Row gap={10}><Select label="Duration" value={dur} options={['15 min', '30 min', '45 min', '1 h']} onChange={setDur} /><Select label="Free preview" value={preview} options={['No', 'Yes']} onChange={setPreview} /></Row>
      </Panel>
      <Panel title="Lesson content" right={<T v="small">shown to students in this order</T>} style={{ marginBottom: 90 }}>
        {items.map((it, i) => (
          <Row key={i} gap={10} style={{ borderRadius: 16, borderWidth: 1.5, borderColor: '#D9CCF7', padding: 10 }}>
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: KIND_ICON[it.kind][1][0], alignItems: 'center', justifyContent: 'center' }}><Ionicons name={KIND_ICON[it.kind][0]} size={18} color={KIND_ICON[it.kind][1][1]} /></View>
            <View style={{ flex: 1 }}><T style={{ fontFamily: fonts.semibold }} numberOfLines={1}>{it.title}</T><T v="small">{it.meta}</T></View>
            <IconButton name="trash-outline" label={`Delete ${it.title}`} size={36} tint="transparent" color={colors.red} onPress={() => setItems(items.filter((_, k) => k !== i))} />
          </Row>
        ))}
        <T v="small" style={{ fontFamily: fonts.medium }}>Add content</T>
        <TileRows cols={4} gap={8}>
          {ADD.map(([k, l]) => (
            <Pressable key={k} accessibilityRole="button" accessibilityLabel={`Add ${l}`} onPress={() => add(k)} style={{ height: 64, borderRadius: 16, backgroundColor: KIND_ICON[k][1][0], alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <Ionicons name={KIND_ICON[k][0]} size={18} color={KIND_ICON[k][1][1]} /><T style={{ fontSize: 11, fontFamily: fonts.semibold, color: KIND_ICON[k][1][1] }}>{l}</T>
            </Pressable>
          ))}
        </TileRows>
      </Panel>
    </Screen>
  );
}

/* ---------- Admin profile & settings ---------- */
export function AdminProfileScreen() {
  return (
    <RoleProfileScreen g={['#5B43E0', '#9B7BE8']} sub="Institute admin · Noon Madrasa, Sharjah" pill="Owner · Full access"
      stats={[['412', 'Students'], ['18', 'Teachers'], ['94%', 'Fees collected']]} chipsTitle="My madrasa"
      chips={[{ text: 'Sunni Vidyabhyasa Board (AP)', tint: colors.lav }, { text: 'Class 1 – 10, +1, +2', tint: colors.sky }, { text: 'Plan: Madrasa Pro', tint: colors.mint }]}
      rows={[['Madrasa', 'Noon Madrasa, Sharjah'], ['Madrasa code', 'NM-SHJ-014'], ['Phone', '+971 50 •••• 44'], ['Email', 'admin@noonmadrasa.app'], ['Academic year', '2026 – 27'], ['Plan renews', '12 Jun 2027']]}
      tiles={[
        { label: 'Madrasa info', icon: 'business-outline', tint: colors.lav, href: '/admin/settings' },
        { label: 'Batches', icon: 'people-outline', tint: colors.sky, href: '/admin/batches' },
        { label: 'Subscription', icon: 'card-outline', tint: colors.butter, note: 'Demo: your Madrasa Pro plan and invoices show here.' },
        { label: 'Settings', icon: 'settings-outline', tint: colors.mint, href: '/admin/settings' },
      ]} settingsHref="/admin/settings" />
  );
}

export function AdminSettingsScreen() {
  return (
    <RoleSettingsScreen roleLine="Institute admin · Noon Madrasa" profileHref="/admin/profile" footer="Noon Learn for madrasas · v1.0" groups={[
      { title: 'Madrasa', rows: [
        { icon: 'business-outline', tint: T_.lav, label: 'Madrasa name & logo', value: 'Noon Madrasa' },
        { icon: 'book-outline', tint: T_.sky, label: 'Board & classes', value: 'SVB (AP)' },
        { icon: 'calendar-outline', tint: T_.butter, label: 'Academic year', value: '2026 – 27' },
        { icon: 'time-outline', tint: T_.mint, label: 'Class timings', value: 'Evenings' },
      ] },
      { title: 'Admissions & fees', rows: [
        { icon: 'chatbubble-outline', tint: T_.mint, label: 'Accept online admissions', sub: 'WhatsApp form link is active', toggle: true },
        { icon: 'wallet-outline', tint: T_.butter, label: 'Monthly fee', sub: 'Default for new students', value: '₹600' },
        { icon: 'notifications-outline', tint: T_.pink, label: 'Fee reminders to parents', sub: '3 days before due date', toggle: true },
        { icon: 'card-outline', tint: T_.sky, label: 'Payment methods', value: 'UPI, card' },
      ] },
      { title: 'Staff & access', rows: [
        { icon: 'shield-outline', tint: T_.lav, label: 'Admins', value: '2 people' },
        { icon: 'create-outline', tint: T_.sky, label: 'Teachers can create courses', sub: 'Still needs super admin approval', toggle: false },
        { icon: 'chatbubbles-outline', tint: T_.mint, label: 'Auto-message absent students', sub: 'Parents get a WhatsApp note', toggle: true },
      ] },
      { title: 'Account', rows: [
        { icon: 'card-outline', tint: T_.butter, label: 'Subscription', value: 'Madrasa Pro' },
        { icon: 'globe-outline', tint: T_.sky, label: 'Language', value: 'English' },
        { icon: 'contrast-outline', tint: T_.lav, label: 'Dark mode', toggle: false },
        { icon: 'key-outline', tint: T_.pink, label: 'Change password' },
      ] },
    ]} />
  );
}

export const AdminCourseNewScreen = () => <CourseEditorScreen mode="admin" />;
export const SuperCourseNewScreen = () => <CourseEditorScreen mode="super" />;
