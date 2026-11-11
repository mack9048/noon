// Student admission portal for institution admins:
// students register + single admission, admissions hub (applications, leads, campaigns),
// campaign pages, and the public admission page parents open from a shared link.
import React, { useState } from 'react';
import { Linking, Modal, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Card, Empty, Header, Loading, Row, Screen, T } from '@/components/ui';
import { Avatar, ListRow, pastel, Section, SmallButton, Tag } from '@/components/kit';
import { ChoiceChips, DateInput, Input, MiniStat, Panel, Select, Status } from '@/components/kit2';
import { Logo } from '@/components/Logo';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { refreshApplications, useApplications, type AppStatus } from '@/lib/admissions';
import { colors, fonts } from '@/theme/tokens';

/* ---------- shared bits ---------- */
export type Credential = { who: 'student' | 'parent'; name: string; login: string; password: string | null };
type StudentRow = { id: number; name: string; admission_no: string | null; cls: string | null; class_id: number | null; board: string | null; parent: string | null; parent_phone: string | null; blocked: boolean };
type StudentDetail = StudentRow & { email: string | null; batches: { id: number; name: string }[]; courses: { id: number; title: string; progress: number }[]; joined: string };
export type Campaign = { id: number; code: string; title: string; year: string | null; classes: string[]; seats: number | null; opens_on: string | null; closes_on: string | null; description: string | null; fee_note: string | null; status: 'open' | 'closed'; is_open: boolean; leads: number; applications: number; admitted: number; seats_left: number | null };
type LeadStatus = 'new' | 'contacted' | 'interested' | 'visit' | 'applied' | 'admitted' | 'lost';
type Lead = { id: number; student: string; parent: string | null; phone: string; email: string | null; cls: string | null; source: string; status: LeadStatus; follow_up_on: string | null; overdue: boolean; notes: { text: string; by: string | null; at: string }[]; campaign: { id: number; title: string } | null; admission: string | null; when: string };

const BOARDS = [{ key: 'AP', label: 'AP board' }, { key: 'EK', label: 'EK board' }, { key: 'GEN', label: 'General' }];
const CLASSES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '+1', '+2'];
const LEAD_STATUS: { key: LeadStatus; label: string; tone: keyof typeof pastel }[] = [
  { key: 'new', label: 'New', tone: 'butter' }, { key: 'contacted', label: 'Contacted', tone: 'sky' }, { key: 'interested', label: 'Interested', tone: 'lav' },
  { key: 'visit', label: 'Visit / demo', tone: 'pink' }, { key: 'applied', label: 'Applied', tone: 'mint' }, { key: 'admitted', label: 'Admitted', tone: 'mint' }, { key: 'lost', label: 'Lost', tone: 'white' },
];
const SOURCES = [['portal', 'Admission page'], ['whatsapp', 'WhatsApp'], ['call', 'Phone call'], ['walk_in', 'Walk-in'], ['referral', 'Referral'], ['social', 'Social media'], ['other', 'Other']] as const;
const sourceLabel = (s: string) => SOURCES.find(([k]) => k === s)?.[1] ?? s;
const TINTS = [pastel.lav, pastel.sky, pastel.mint, pastel.pink];
const PUBLIC_BASE = 'https://noonlearn.com/admission/';

function say(msg: string) { if (Platform.OS === 'web') window.alert(msg); }
const errText = (e: unknown, fallback: string) => (e instanceof ApiError ? e.friendly : fallback);
async function copy(text: string) {
  try { await (globalThis as any).navigator?.clipboard?.writeText(text); say('Copied.'); } catch { say(text); }
}
const wa = (phone: string, text: string) => Linking.openURL(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`);

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <Row style={{ backgroundColor: '#FFF', borderRadius: 24, borderWidth: 1.5, borderColor: colors.line, paddingHorizontal: 14, height: 48, marginBottom: 4 }}>
      <Ionicons name="search" size={18} color={colors.muted} />
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.faint} accessibilityLabel={placeholder}
        style={{ flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink, outlineStyle: 'none' } as any} />
    </Row>
  );
}

function Pill({ label, icon, onPress, filled }: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; filled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}
      style={{ height: 44, paddingHorizontal: 16, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: filled ? colors.ink : '#FFF', borderWidth: filled ? 0 : 1.5, borderColor: colors.line }}>
      <Ionicons name={icon} size={18} color={filled ? '#FFF' : colors.ink} />
      <T style={{ fontFamily: fonts.semibold, color: filled ? '#FFF' : colors.ink }}>{label}</T>
    </Pressable>
  );
}

/** Logins made on admission, shown once, with copy and WhatsApp buttons. */
export function CredentialsCard({ creds, phone }: { creds: Credential[]; phone?: string | null }) {
  const text = ['Assalamu alaikum! Your Noon Learn logins:', ...creds.map((c) => `${c.who === 'student' ? 'Student' : 'Parent'} (${c.name}): ${c.login}${c.password ? ` / ${c.password}` : ' (existing password)'}`), 'Open: https://noonlearn.com/login'].join('\n');
  return (
    <Card tint={colors.mint[0]} style={{ gap: 10 }}>
      <Row gap={8}><Ionicons name="checkmark-circle" size={22} color={colors.green} /><T v="h3">Logins created</T></Row>
      <T v="small">Passwords are shown only now. Share them with the family.</T>
      {creds.map((c) => (
        <View key={c.who + c.login} style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 12, gap: 2 }}>
          <T v="small">{c.who === 'student' ? 'Student' : 'Parent'} · {c.name}</T>
          <T style={{ fontFamily: fonts.semibold }} selectable>Login: {c.login}</T>
          <T style={{ fontFamily: fonts.semibold }} selectable>{c.password ? `Password: ${c.password}` : 'Uses their existing password'}</T>
        </View>
      ))}
      <Row gap={8}>
        <View style={{ flex: 1 }}><Button title="Copy" kind="ghost" icon="copy-outline" onPress={() => copy(text)} /></View>
        {phone ? <View style={{ flex: 1 }}><Button title="WhatsApp" icon="logo-whatsapp" onPress={() => wa(phone, text)} /></View> : null}
      </Row>
    </Card>
  );
}

/* ---------- Students register ---------- */
export function AdminStudentsScreen() {
  const [q, setQ] = useState('');
  const [cls, setCls] = useState('all');
  const { data, loading, error } = useApi<StudentRow[]>(`/admin/students${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`);
  const classes = Array.from(new Set((data ?? []).map((s) => s.cls).filter(Boolean))) as string[];
  const rows = (data ?? []).filter((s) => cls === 'all' || s.cls === cls);
  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <T v="h1">Students <T v="small">{data?.length ?? ''}</T></T>
        <Row gap={8}>
          <Pill label="Bulk add" icon="cloud-upload-outline" onPress={() => router.push('/admin/bulk' as any)} />
          <Pill label="New student" icon="person-add-outline" filled onPress={() => router.push('/admin/students/new' as any)} />
        </Row>
      </Row>
      <SearchBox value={q} onChange={setQ} placeholder="Search by name or admission no." />
      {classes.length > 1 ? <ChoiceChips value={cls} onChange={setCls} options={[{ key: 'all', label: 'All' }, ...classes.sort().map((c) => ({ key: c, label: `Class ${c}` }))]} /> : null}
      {loading && !data ? <Loading /> : error ? <Empty text={error} /> : !rows.length ? (
        <Card style={{ alignItems: 'center', gap: 10, padding: 24, marginTop: 10 }}>
          <T>No students yet.</T>
          <Button title="Add the first student" icon="person-add-outline" onPress={() => router.push('/admin/students/new' as any)} />
        </Card>
      ) : (
        <View style={{ gap: 8, marginTop: 8 }}>
          {rows.map((s, i) => (
            <ListRow key={s.id} onPress={() => router.push(`/admin/students/${s.id}` as any)} left={<Avatar name={s.name} size={44} tint={TINTS[i % 4]} />}
              title={s.name} sub={[s.cls ? `Class ${s.cls}` : null, s.board, s.admission_no, s.parent ? `Parent: ${s.parent}` : null].filter(Boolean).join(' · ')}
              right={<Ionicons name="chevron-forward" size={18} color={colors.muted} />} />
          ))}
        </View>
      )}
    </Screen>
  );
}

export function AdminStudentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: s, loading, error } = useApi<StudentDetail>(`/admin/students/${id}`);
  if (loading && !s) return <Loading />;
  if (!s) return <Screen><Header title="Student" /><Empty text={error ?? 'Student not found.'} /></Screen>;
  return (
    <Screen>
      <Header title="" />
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Avatar name={s.name} size={62} tint={pastel.lav} />
        <View style={{ flex: 1 }}>
          <T v="h2">{s.name}</T>
          <T v="small">{s.cls ? `Class ${s.cls}` : 'No class'}{s.board ? ` · ${s.board} board` : ''} · joined {s.joined}</T>
          {s.blocked ? <Tag text="Blocked" tone="pink" /> : null}
        </View>
      </Card>
      <Panel title="LOGIN">
        {[['Admission no. (login)', s.admission_no ?? '—'], ['Email', s.email ?? '—']].map(([k, v]) => <Row key={k} style={{ justifyContent: 'space-between' }}><T v="small">{k}</T><T style={{ fontFamily: fonts.medium }} selectable>{v}</T></Row>)}
        <T v="small">Forgot the password? Set a new one in More → People & passwords.</T>
      </Panel>
      <Panel title="PARENT">
        {[['Name', s.parent ?? '—'], ['Phone', s.parent_phone ?? '—']].map(([k, v]) => <Row key={k} style={{ justifyContent: 'space-between' }}><T v="small">{k}</T><T style={{ fontFamily: fonts.medium }}>{v}</T></Row>)}
        {s.parent_phone ? (
          <Row gap={10}>
            <View style={{ flex: 1 }}><Button title="WhatsApp" icon="logo-whatsapp" onPress={() => wa(s.parent_phone!, `Assalamu alaikum, this is the office about ${s.name}.`)} /></View>
            <View style={{ flex: 1 }}><Button title="Call" kind="ghost" icon="call-outline" onPress={() => Linking.openURL(`tel:+${s.parent_phone}`)} /></View>
          </Row>
        ) : null}
      </Panel>
      <Panel title="BATCHES">
        {s.batches.length ? s.batches.map((b) => <T key={b.id}>• {b.name}</T>) : <T v="small">Not in a batch yet. Add from Batches.</T>}
      </Panel>
      <Panel title="COURSES" style={{ marginBottom: 30 }}>
        {s.courses.length ? s.courses.map((c) => <Row key={c.id} style={{ justifyContent: 'space-between' }}><T>{c.title}</T><T v="small">{c.progress}%</T></Row>) : <T v="small">No courses yet.</T>}
      </Panel>
    </Screen>
  );
}

/* ---------- New student (single admission) ---------- */
export function NewStudentScreen() {
  const [f, setF] = useState({ name: '', dob: '', board: 'AP', cls: '1', admission_no: '', email: '', parent_name: '', parent_phone: '', parent_email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ student: StudentRow; credentials: Credential[] } | null>(null);
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });
  const save = async () => {
    setErr(null);
    if (f.name.trim().length < 2) return setErr('Enter the student name.');
    if (f.parent_phone && f.parent_phone.replace(/\D/g, '').length < 9) return setErr('Enter a full parent phone number with country code.');
    setBusy(true);
    try {
      const body = Object.fromEntries(Object.entries(f).filter(([, v]) => v.trim() !== '').map(([k, v]) => [k, v.trim()]));
      setDone(await api.post('/admin/students', body));
    } catch (e) { setErr(errText(e, 'Could not add the student.')); } finally { setBusy(false); }
  };
  if (done) {
    return (
      <Screen>
        <Header title="Student added" subtitle={`${done.student.name} · Class ${done.student.cls ?? '—'}`} />
        <CredentialsCard creds={done.credentials} phone={done.student.parent_phone} />
        <Row gap={10} style={{ marginTop: 14 }}>
          <View style={{ flex: 1 }}><Button title="Add another" kind="ghost" icon="person-add-outline" onPress={() => { setDone(null); setF({ ...f, name: '', dob: '', admission_no: '', email: '', parent_name: '', parent_phone: '', parent_email: '', password: '' }); }} /></View>
          <View style={{ flex: 1 }}><Button title="Open record" icon="arrow-forward" onPress={() => router.replace(`/admin/students/${done.student.id}` as any)} /></View>
        </Row>
      </Screen>
    );
  }
  return (
    <Screen>
      <Header title="New student" subtitle="Admit one student. The student's and parent's logins are created for you." />
      <Panel title="STUDENT">
        <Input label="Full name" value={f.name} onChangeText={set('name')} placeholder="eg. Rayan Ahmed" />
        <Row gap={10}><Select label="Board" value={f.board} options={BOARDS} onChange={set('board')} /><Select label="Class" value={f.cls} options={CLASSES} onChange={set('cls')} /></Row>
        <Row gap={10}><DateInput label="Date of birth (optional)" value={f.dob} onChange={set('dob')} max={new Date().toISOString().slice(0, 10)} /><Input label="Admission no. (optional)" value={f.admission_no} onChangeText={set('admission_no')} placeholder="Auto" autoCapitalize="characters" /></Row>
        <Input label="Student email (optional)" value={f.email} onChangeText={set('email')} placeholder="for password reset by email" keyboardType="email-address" autoCapitalize="none" />
      </Panel>
      <Panel title="PARENT">
        <Input label="Parent name" value={f.parent_name} onChangeText={set('parent_name')} placeholder="Father / mother / guardian" />
        <Input label="WhatsApp number" value={f.parent_phone} onChangeText={set('parent_phone')} placeholder="+971 50 123 4567" keyboardType="phone-pad" />
        <Input label="Parent email (optional)" value={f.parent_email} onChangeText={set('parent_email')} keyboardType="email-address" autoCapitalize="none" />
        <T v="small">If this phone already has a parent login here (a brother or sister studies here), the same parent account is used.</T>
      </Panel>
      <Panel title="STUDENT PASSWORD" style={{ marginBottom: 12 }}>
        <Input label="Password (optional)" value={f.password} onChangeText={set('password')} placeholder="Leave empty to create one" autoCapitalize="none" />
      </Panel>
      {err ? <T style={{ color: colors.red, marginBottom: 10 }}>{err}</T> : null}
      <Button title="Admit student" icon="checkmark-circle-outline" onPress={save} loading={busy} />
    </Screen>
  );
}

/* ---------- Admissions hub: applications, leads, campaigns ---------- */
type HubTab = 'applications' | 'leads' | 'campaigns';

export function AdmissionsHubScreen() {
  const { tab: initial } = useLocalSearchParams<{ tab?: HubTab }>();
  const [tab, setTab] = useState<HubTab>(initial === 'leads' || initial === 'campaigns' ? initial : 'applications');
  const apps = useApplications();
  const { data: leads, reload: reloadLeads } = useApi<Lead[]>('/admin/leads');
  const { data: campaigns } = useApi<Campaign[]>('/admin/campaigns');
  const openLeads = (leads ?? []).filter((l) => !['admitted', 'lost'].includes(l.status));
  const due = openLeads.filter((l) => l.follow_up_on && l.follow_up_on <= new Date().toISOString().slice(0, 10)).length;
  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <View><T v="h1">Admissions</T><T v="small">Campaigns, enquiries and applications</T></View>
        <Pill label="New student" icon="person-add-outline" filled onPress={() => router.push('/admin/students/new' as any)} />
      </Row>
      <Row gap={8} style={{ marginTop: 12 }}>
        <MiniStat value={openLeads.length} label="Open leads" tint={colors.butter} />
        <MiniStat value={due} label="Follow up today" tint={colors.pink} />
        <MiniStat value={apps.filter((a) => a.status === 'new' || a.status === 'review').length} label="To review" tint={colors.sky} />
        <MiniStat value={apps.filter((a) => a.status === 'admitted').length} label="Admitted" tint={colors.mint} />
      </Row>
      <View style={{ marginTop: 12 }}>
        <ChoiceChips value={tab} onChange={setTab} options={[
          { key: 'applications', label: `Applications · ${apps.length}` }, { key: 'leads', label: `Leads · ${leads?.length ?? 0}` }, { key: 'campaigns', label: `Campaigns · ${campaigns?.length ?? 0}` },
        ]} />
      </View>
      {tab === 'applications' ? <ApplicationsTab /> : tab === 'leads' ? <LeadsTab leads={leads} campaigns={campaigns ?? []} reload={reloadLeads} /> : <CampaignsTab campaigns={campaigns} />}
    </Screen>
  );
}

function ApplicationsTab() {
  const apps = useApplications();
  const [st, setSt] = useState<AppStatus>('new');
  const list = apps.filter((a) => a.status === st);
  const count = (s: AppStatus) => apps.filter((a) => a.status === s).length;
  return (
    <View style={{ marginTop: 6 }}>
      <ChoiceChips value={st} onChange={setSt} options={[{ key: 'new', label: `New · ${count('new')}` }, { key: 'review', label: `In review · ${count('review')}` }, { key: 'admitted', label: `Admitted · ${count('admitted')}` }, { key: 'rejected', label: `Rejected · ${count('rejected')}` }]} />
      <View style={{ gap: 8, marginTop: 10 }}>
        {list.map((a, i) => (
          <ListRow key={a.id} onPress={() => router.push(`/admin/admissions/${a.id}` as any)} left={<Avatar name={a.name} size={44} tint={TINTS[i % 4]} />}
            title={a.name} sub={`Class ${a.cls} · ${a.board} · ${a.parent} · ${a.when}`}
            right={<Status text={{ new: 'New', review: 'In review', admitted: 'Admitted', rejected: 'Rejected' }[a.status]} />} />
        ))}
        {!list.length ? <T v="small" style={{ textAlign: 'center', padding: 20 }}>No applications here. Share a campaign link so parents can apply online.</T> : null}
      </View>
    </View>
  );
}

function LeadsTab({ leads, campaigns, reload }: { leads?: Lead[]; campaigns: Campaign[]; reload: () => void }) {
  const [st, setSt] = useState<'open' | LeadStatus>('open');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Lead | null>(null);
  const [adding, setAdding] = useState(false);
  if (!leads) return <Loading />;
  const list = leads.filter((l) => (st === 'open' ? !['admitted', 'lost'].includes(l.status) : l.status === st)
    && (!q.trim() || `${l.student} ${l.parent ?? ''} ${l.phone}`.toLowerCase().includes(q.trim().toLowerCase())));
  const n = (s: LeadStatus) => leads.filter((l) => l.status === s).length;
  return (
    <View style={{ marginTop: 6 }}>
      <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
        <T v="small">Enquiries from the admission page come in here automatically.</T>
        <SmallButton title="+ Add lead" filled tint={colors.ink} onPress={() => setAdding(true)} />
      </Row>
      <SearchBox value={q} onChange={setQ} placeholder="Search student, parent or phone" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
        <ChoiceChips value={st} onChange={setSt} options={[{ key: 'open', label: 'All open' }, ...LEAD_STATUS.map((s) => ({ key: s.key, label: `${s.label} · ${n(s.key)}` }))]} />
      </ScrollView>
      <View style={{ gap: 8 }}>
        {list.map((l, i) => {
          const s = LEAD_STATUS.find((x) => x.key === l.status)!;
          return (
            <ListRow key={l.id} onPress={() => setOpen(l)} left={<Avatar name={l.student} size={44} tint={TINTS[i % 4]} />}
              title={`${l.student}${l.cls ? ` · Class ${l.cls}` : ''}`}
              sub={[l.parent, `+${l.phone}`, sourceLabel(l.source), l.follow_up_on ? `${l.overdue ? '⚠ ' : ''}follow up ${l.follow_up_on}` : null].filter(Boolean).join(' · ')}
              right={<Tag text={s.label} tone={s.tone} />} />
          );
        })}
        {!list.length ? <T v="small" style={{ textAlign: 'center', padding: 20 }}>No leads here.</T> : null}
      </View>
      <LeadSheet lead={open} onClose={() => setOpen(null)} onSaved={(l) => { setOpen(l); reload(); }} />
      <AddLeadModal visible={adding} campaigns={campaigns} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); reload(); }} />
    </View>
  );
}

function Sheet({ visible, onClose, children, title }: { visible: boolean; onClose: () => void; children: React.ReactNode; title: string }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close" onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(11,42,53,0.45)', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 520, maxHeight: '92%', backgroundColor: colors.bg, borderRadius: 26, overflow: 'hidden' }}>
          <Row style={{ justifyContent: 'space-between', padding: 16, paddingBottom: 6 }}>
            <T v="h2" style={{ flex: 1 }}>{title}</T>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="close" size={20} color={colors.ink} /></Pressable>
          </Row>
          <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 6, gap: 12 }}>{children}</ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function LeadSheet({ lead, onClose, onSaved }: { lead: Lead | null; onClose: () => void; onSaved: (l: Lead) => void }) {
  const [note, setNote] = useState('');
  const [follow, setFollow] = useState('');
  const [busy, setBusy] = useState(false);
  const [conv, setConv] = useState<{ gender: 'Boy' | 'Girl'; board: string; cls: string } | null>(null);
  if (!lead) return null;
  const patch = async (body: Record<string, unknown>) => {
    setBusy(true);
    try { onSaved(await api.patch<Lead>(`/admin/leads/${lead.id}`, body)); setNote(''); setFollow(''); } catch (e) { say(errText(e, 'Could not save.')); } finally { setBusy(false); }
  };
  const convert = async () => {
    if (!conv) return;
    setBusy(true);
    try {
      const r = await api.post<{ lead: Lead; application: { id: string } }>(`/admin/leads/${lead.id}/convert`, conv);
      await refreshApplications();
      onSaved(r.lead); setConv(null);
      router.push(`/admin/admissions/${r.application.id}` as any);
    } catch (e) { say(errText(e, 'Could not create the application.')); } finally { setBusy(false); }
  };
  return (
    <Sheet visible={!!lead} onClose={() => { setConv(null); onClose(); }} title={lead.student}>
      <Card style={{ gap: 6 }}>
        {[['Parent', lead.parent ?? '—'], ['Phone', `+${lead.phone}`], ['Email', lead.email ?? '—'], ['Class', lead.cls ?? '—'], ['Source', sourceLabel(lead.source)], ['Campaign', lead.campaign?.title ?? '—'], ['Application', lead.admission ?? '—']].map(([k, v]) => (
          <Row key={k} style={{ justifyContent: 'space-between' }}><T v="small">{k}</T><T style={{ fontFamily: fonts.medium, flexShrink: 1, textAlign: 'right' }}>{v}</T></Row>
        ))}
        <Row gap={8} style={{ marginTop: 6 }}>
          <View style={{ flex: 1 }}><Button title="WhatsApp" icon="logo-whatsapp" onPress={() => wa(lead.phone, `Assalamu alaikum ${lead.parent ?? ''}, thank you for your interest in admission for ${lead.student}.`)} /></View>
          <View style={{ flex: 1 }}><Button title="Call" kind="ghost" icon="call-outline" onPress={() => Linking.openURL(`tel:+${lead.phone}`)} /></View>
        </Row>
      </Card>
      <T v="label">STATUS</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {LEAD_STATUS.map((s) => (
          <Pressable key={s.key} accessibilityRole="button" accessibilityState={{ selected: lead.status === s.key }} disabled={busy} onPress={() => patch({ status: s.key })}
            style={{ height: 38, paddingHorizontal: 14, borderRadius: 19, justifyContent: 'center', backgroundColor: lead.status === s.key ? colors.ink : '#FFF', borderWidth: 1.5, borderColor: lead.status === s.key ? colors.ink : colors.line }}>
            <T style={{ fontFamily: fonts.semibold, fontSize: 13, color: lead.status === s.key ? '#FFF' : colors.ink }}>{s.label}</T>
          </Pressable>
        ))}
      </View>
      <Card style={{ gap: 10 }}>
        <Input label="Add a note" value={note} onChangeText={setNote} placeholder="eg. Called, visiting on Friday" />
        <DateInput label={`Next follow-up${lead.follow_up_on ? ` (now ${lead.follow_up_on})` : ''}`} value={follow} onChange={setFollow} min={new Date().toISOString().slice(0, 10)} />
        <Button title="Save" onPress={() => patch({ ...(note.trim() ? { note: note.trim() } : {}), ...(follow.trim() ? { follow_up_on: follow.trim() } : {}) })} loading={busy} disabled={!note.trim() && !follow.trim()} />
      </Card>
      {!lead.admission ? (
        conv ? (
          <Card style={{ gap: 10 }}>
            <T v="h3">Make an application</T>
            <Row gap={10}><Select label="Gender" value={conv.gender} options={['Boy', 'Girl']} onChange={(g) => setConv({ ...conv, gender: g as 'Boy' | 'Girl' })} /><Select label="Board" value={conv.board} options={BOARDS} onChange={(b) => setConv({ ...conv, board: b })} /></Row>
            <Select label="Class" value={conv.cls} options={CLASSES} onChange={(c) => setConv({ ...conv, cls: c })} />
            <Button title="Create application" icon="document-text-outline" onPress={convert} loading={busy} />
          </Card>
        ) : <Button title="Convert to application" kind="yellow" icon="arrow-forward" onPress={() => setConv({ gender: 'Boy', board: 'AP', cls: lead.cls ?? '1' })} />
      ) : <Button title={`Open application ${lead.admission}`} kind="ghost" icon="open-outline" onPress={() => router.push(`/admin/admissions/${lead.admission}` as any)} />}
      <T v="label">HISTORY</T>
      <Card style={{ gap: 8 }}>
        {[...lead.notes].reverse().map((n, i) => (
          <View key={i}><T>{n.text}</T><T v="small">{n.at}{n.by ? ` · ${n.by}` : ''}</T></View>
        ))}
        {!lead.notes.length ? <T v="small">No notes yet.</T> : null}
      </Card>
    </Sheet>
  );
}

function AddLeadModal({ visible, campaigns, onClose, onSaved }: { visible: boolean; campaigns: Campaign[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ student_name: '', parent_name: '', phone: '', cls: '1', source: 'call', campaign_id: campaigns[0] ? String(campaigns[0].id) : '', note: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });
  const save = async () => {
    setErr(null); setBusy(true);
    try {
      await api.post('/admin/leads', { ...f, campaign_id: f.campaign_id ? Number(f.campaign_id) : null, note: f.note || null });
      setF({ ...f, student_name: '', parent_name: '', phone: '', note: '' });
      onSaved();
    } catch (e) { setErr(errText(e, 'Could not add the lead.')); } finally { setBusy(false); }
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="Add a lead">
      <Card style={{ gap: 12 }}>
        <Input label="Student name" value={f.student_name} onChangeText={set('student_name')} />
        <Input label="Parent name" value={f.parent_name} onChangeText={set('parent_name')} />
        <Input label="Phone / WhatsApp" value={f.phone} onChangeText={set('phone')} placeholder="+971 50 123 4567" keyboardType="phone-pad" />
        <Row gap={10}>
          <Select label="Class" value={f.cls} options={CLASSES} onChange={set('cls')} />
          <Select label="Source" value={f.source} options={SOURCES.map(([k, l]) => ({ key: k, label: l }))} onChange={set('source')} />
        </Row>
        {campaigns.length ? <Select label="Campaign" value={f.campaign_id} options={[{ key: '', label: 'None' }, ...campaigns.map((c) => ({ key: String(c.id), label: c.title }))]} onChange={set('campaign_id')} /> : null}
        <Input label="Note (optional)" value={f.note} onChangeText={set('note')} />
        {err ? <T style={{ color: colors.red }}>{err}</T> : null}
        <Button title="Add lead" icon="add" onPress={save} loading={busy} disabled={!f.student_name.trim() || !f.phone.trim()} />
      </Card>
    </Sheet>
  );
}

function CampaignsTab({ campaigns }: { campaigns?: Campaign[] }) {
  if (!campaigns) return <Loading />;
  return (
    <View style={{ marginTop: 6, gap: 10 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="small">Each campaign has its own admission page and link.</T>
        <SmallButton title="+ New campaign" filled tint={colors.ink} onPress={() => router.push('/admin/campaigns/new' as any)} />
      </Row>
      {campaigns.map((c) => <CampaignCard key={c.id} c={c} />)}
      {!campaigns.length ? (
        <Card style={{ alignItems: 'center', gap: 10, padding: 24 }}>
          <T>No campaigns yet.</T>
          <T v="small" style={{ textAlign: 'center' }}>Create one (eg. "Admissions 2026–27"), then share its link on WhatsApp, Instagram or your website.</T>
          <Button title="Create a campaign" icon="megaphone-outline" onPress={() => router.push('/admin/campaigns/new' as any)} />
        </Card>
      ) : null}
    </View>
  );
}

function CampaignCard({ c }: { c: Campaign }) {
  const link = PUBLIC_BASE + c.code;
  return (
    <Card onPress={() => router.push(`/admin/campaigns/${c.id}` as any)} style={{ gap: 10 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}><T v="h3">{c.title}</T><T v="small">{[c.year, c.classes.length ? `Classes ${c.classes.join(', ')}` : null, c.closes_on ? `closes ${c.closes_on}` : null].filter(Boolean).join(' · ')}</T></View>
        <Tag text={c.is_open ? 'Open' : 'Closed'} tone={c.is_open ? 'mint' : 'white'} />
      </Row>
      <Row gap={8}>
        <MiniStat value={c.leads} label="Leads" tint={colors.butter} />
        <MiniStat value={c.applications} label="Applied" tint={colors.sky} />
        <MiniStat value={c.admitted} label="Admitted" tint={colors.mint} />
        <MiniStat value={c.seats_left ?? '—'} label="Seats left" tint={colors.lav} />
      </Row>
      <Row gap={8}>
        <View style={{ flex: 1 }}><Button title="Copy link" kind="ghost" icon="link-outline" onPress={() => copy(link)} /></View>
        <View style={{ flex: 1 }}><Button title="Share" icon="logo-whatsapp" onPress={() => Linking.openURL(`https://wa.me/?text=${encodeURIComponent(`Assalamu alaikum! ${c.title} is open. Enquire or apply here: ${link}`)}`)} /></View>
      </Row>
    </Card>
  );
}

/* ---------- Campaign create / edit ---------- */
export function CampaignFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id && id !== 'new';
  const { data: existing } = useApi<Campaign>(editing ? `/admin/campaigns/${id}` : null);
  const [f, setF] = useState<{ title: string; academic_year: string; classes: string[]; seats: string; opens_on: string; closes_on: string; description: string; fee_note: string; status: 'open' | 'closed' } | null>(
    editing ? null : { title: '', academic_year: '2026–27', classes: [], seats: '', opens_on: '', closes_on: '', description: '', fee_note: '', status: 'open' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (editing && existing && !f) {
    setF({ title: existing.title, academic_year: existing.year ?? '', classes: existing.classes, seats: existing.seats ? String(existing.seats) : '', opens_on: existing.opens_on ?? '', closes_on: existing.closes_on ?? '', description: existing.description ?? '', fee_note: existing.fee_note ?? '', status: existing.status });
  }
  if (!f) return <Loading />;
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });
  const toggle = (c: string) => setF({ ...f, classes: f.classes.includes(c) ? f.classes.filter((x) => x !== c) : [...f.classes, c] });
  const save = async () => {
    setErr(null); setBusy(true);
    const body = { ...f, seats: f.seats ? Number(f.seats) : null, opens_on: f.opens_on || null, closes_on: f.closes_on || null, description: f.description || null, fee_note: f.fee_note || null, academic_year: f.academic_year || null };
    try {
      const c = editing ? await api.put<Campaign>(`/admin/campaigns/${id}`, body) : await api.post<Campaign>('/admin/campaigns', body);
      router.replace(`/admin/campaigns/${c.id}` as any);
    } catch (e) { setErr(errText(e, 'Could not save.')); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (Platform.OS === 'web' && !window.confirm('Delete this campaign? Its leads and applications are kept.')) return;
    try { await api.del(`/admin/campaigns/${id}`); router.replace('/admin/admissions?tab=campaigns' as any); } catch (e) { setErr(errText(e, 'Could not delete.')); }
  };
  return (
    <Screen>
      <Header title={editing ? 'Edit campaign' : 'New campaign'} subtitle="An intake with its own public admission page" />
      <Panel title="CAMPAIGN">
        <Input label="Title" value={f.title} onChangeText={set('title')} placeholder="eg. Admissions 2026–27" />
        <Row gap={10}><Input label="Academic year" value={f.academic_year} onChangeText={set('academic_year')} placeholder="2026–27" /><Input label="Seats (optional)" value={f.seats} onChangeText={set('seats')} keyboardType="number-pad" /></Row>
        <Row gap={10}><DateInput label="Opens on" value={f.opens_on} onChange={set('opens_on')} /><DateInput label="Closes on" value={f.closes_on} onChange={set('closes_on')} min={f.opens_on || undefined} /></Row>
        <T v="small" style={{ fontFamily: fonts.medium }}>Classes open for admission</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {CLASSES.map((c) => (
            <Pressable key={c} accessibilityRole="checkbox" accessibilityState={{ checked: f.classes.includes(c) }} onPress={() => toggle(c)}
              style={{ minWidth: 48, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, backgroundColor: f.classes.includes(c) ? colors.violet : '#FFF', borderWidth: 1.5, borderColor: f.classes.includes(c) ? colors.violet : colors.line }}>
              <T style={{ fontFamily: fonts.semibold, color: f.classes.includes(c) ? '#FFF' : colors.ink }}>{c}</T>
            </Pressable>
          ))}
        </View>
      </Panel>
      <Panel title="SHOWN ON THE ADMISSION PAGE">
        <Input label="About (optional)" value={f.description} onChangeText={set('description')} multiline placeholder="What makes your institution special" />
        <Input label="Fee note (optional)" value={f.fee_note} onChangeText={set('fee_note')} placeholder="eg. ₹299 / month · first week free" />
        <Select label="Status" value={f.status} options={[{ key: 'open', label: 'Open — accepting' }, { key: 'closed', label: 'Closed' }]} onChange={(v) => setF({ ...f, status: v as 'open' | 'closed' })} />
      </Panel>
      {err ? <T style={{ color: colors.red, marginTop: 10 }}>{err}</T> : null}
      <View style={{ gap: 10, marginTop: 14 }}>
        <Button title={editing ? 'Save changes' : 'Create campaign'} icon="checkmark-circle-outline" onPress={save} loading={busy} disabled={f.title.trim().length < 3} />
        {editing ? <Button title="Delete campaign" kind="danger" onPress={remove} /> : null}
      </View>
    </Screen>
  );
}

export function CampaignDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: c, loading } = useApi<Campaign>(`/admin/campaigns/${id}`);
  const { data: leads, reload } = useApi<Lead[]>(`/admin/leads?campaign_id=${id}`);
  const [open, setOpen] = useState<Lead | null>(null);
  if (loading && !c) return <Loading />;
  if (!c) return <Screen><Header title="Campaign" /><Empty text="Campaign not found." /></Screen>;
  const link = PUBLIC_BASE + c.code;
  return (
    <Screen>
      <Header title={c.title} subtitle={[c.year, c.closes_on ? `closes ${c.closes_on}` : null].filter(Boolean).join(' · ')} right={<SmallButton title="✎ Edit" onPress={() => router.push(`/admin/campaigns/${c.id}/edit` as any)} />} />
      <LinearGradient colors={['#14945A', '#22C17A']} style={{ borderRadius: 24, padding: 16, gap: 10 }}>
        <T style={{ color: '#FFF', fontFamily: fonts.semibold, fontSize: 16 }}>Admission page</T>
        <T style={{ color: '#D7F5E6', fontSize: 13 }}>Parents enquire or apply here — no app needed. Enquiries arrive as leads.</T>
        <Row style={{ backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 18, paddingLeft: 12, paddingRight: 4, height: 40 }}>
          <T style={{ color: '#FFF', flex: 1, fontSize: 13 }} numberOfLines={1} selectable>{link}</T>
          <Pressable accessibilityRole="button" onPress={() => copy(link)} style={{ backgroundColor: '#FFF', borderRadius: 16, height: 32, paddingHorizontal: 14, justifyContent: 'center' }}><T style={{ color: '#14945A', fontFamily: fonts.semibold, fontSize: 13 }}>Copy</T></Pressable>
        </Row>
        <Row gap={8}>
          <Pressable accessibilityRole="button" onPress={() => Linking.openURL(`https://wa.me/?text=${encodeURIComponent(`Assalamu alaikum! ${c.title} is open. Enquire or apply here: ${link}`)}`)} style={{ flex: 1, height: 44, borderRadius: 22, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' }}><T style={{ color: '#14945A', fontFamily: fonts.semibold }}>Send on WhatsApp</T></Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.push(`/admission/${c.code}` as any)} style={{ height: 44, paddingHorizontal: 18, borderRadius: 22, borderWidth: 1.5, borderColor: '#FFF', alignItems: 'center', justifyContent: 'center' }}><T style={{ color: '#FFF', fontFamily: fonts.semibold }}>Preview</T></Pressable>
        </Row>
      </LinearGradient>
      <Row gap={8} style={{ marginTop: 12 }}>
        <MiniStat value={c.leads} label="Leads" tint={colors.butter} />
        <MiniStat value={c.applications} label="Applied" tint={colors.sky} />
        <MiniStat value={c.admitted} label="Admitted" tint={colors.mint} />
        <MiniStat value={c.seats_left ?? '—'} label="Seats left" tint={colors.lav} />
      </Row>
      <Section title="Leads from this campaign" />
      <View style={{ gap: 8 }}>
        {(leads ?? []).map((l, i) => {
          const s = LEAD_STATUS.find((x) => x.key === l.status)!;
          return <ListRow key={l.id} onPress={() => setOpen(l)} left={<Avatar name={l.student} size={44} tint={TINTS[i % 4]} />} title={l.student} sub={[l.parent, `+${l.phone}`, l.cls ? `Class ${l.cls}` : null].filter(Boolean).join(' · ')} right={<Tag text={s.label} tone={s.tone} />} />;
        })}
        {leads && !leads.length ? <T v="small" style={{ textAlign: 'center', padding: 20 }}>No leads yet. Share the link to get enquiries.</T> : null}
      </View>
      <LeadSheet lead={open} onClose={() => setOpen(null)} onSaved={(l) => { setOpen(l); reload(); }} />
    </Screen>
  );
}

/* ---------- Public admission page (no login) ---------- */
type Portal = { institution: { name: string; code: string }; campaign: Omit<Campaign, 'id' | 'leads' | 'applications' | 'admitted' | 'status' | 'seats' | 'opens_on'> | null; campaigns: Portal['campaign'][] };

export function PublicAdmissionScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { data, loading, error } = useApi<Portal>(`/portal/${encodeURIComponent(String(code))}`);
  const [f, setF] = useState({ student_name: '', parent_name: '', phone: '', email: '', cls: '', message: '' });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (loading && !data) return <Loading />;
  if (!data) return <Screen bar={false}><Empty text={error ?? 'This admission link is not valid.'} /></Screen>;
  const c = data.campaign ?? data.campaigns[0] ?? null;
  const applyCode = c?.code ?? data.institution.code;
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });
  const enquire = async () => {
    setErr(null);
    if (f.student_name.trim().length < 2 || f.parent_name.trim().length < 2 || f.phone.replace(/\D/g, '').length < 9) return setErr('Please fill the student name, your name and WhatsApp number.');
    setBusy(true);
    try { await api.post(`/portal/${encodeURIComponent(applyCode)}/enquire`, { ...f, email: f.email || null, cls: f.cls || null, message: f.message || null }); setSent(true); }
    catch (e) { setErr(errText(e, 'Could not send. Please try again.')); } finally { setBusy(false); }
  };
  return (
    <Screen bar={false}>
      <LinearGradient colors={['#5B43E0', '#7A4BE6', '#2F6FE4']} style={{ marginHorizontal: -20, marginTop: -12, padding: 22, paddingBottom: 48, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, gap: 6 }}>
        <View style={{ alignSelf: 'flex-start', backgroundColor: '#FFF', borderRadius: 12, padding: 6 }}><Logo height={24} /></View>
        <T style={{ color: '#E4DDFF', marginTop: 14 }}>{data.institution.name}</T>
        <T style={{ fontFamily: fonts.fun, fontSize: 30, lineHeight: 36, color: '#FFF' }}>{c?.title ?? 'Admissions'}</T>
        {c ? <T style={{ color: '#E4DDFF', fontSize: 13 }}>{[c.year, c.classes.length ? `Classes ${c.classes.join(', ')}` : null, c.closes_on ? `Last date ${c.closes_on}` : null, c.seats_left != null ? `${c.seats_left} seats left` : null].filter(Boolean).join(' · ')}</T> : null}
      </LinearGradient>
      <View style={{ marginTop: -30, gap: 12, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
        {c && !c.is_open ? <Card tint={colors.butter[0]}><T>Admissions for this campaign are closed. You can still send an enquiry.</T></Card> : null}
        {c?.description || c?.fee_note ? (
          <Card style={{ gap: 6 }}>
            {c.description ? <T>{c.description}</T> : null}
            {c.fee_note ? <Row gap={6}><Ionicons name="pricetag-outline" size={16} color={colors.violet} /><T style={{ fontFamily: fonts.semibold, color: colors.violet }}>{c.fee_note}</T></Row> : null}
          </Card>
        ) : null}
        <Card style={{ gap: 10 }}>
          <T v="h3">Ready to apply?</T>
          <T v="small">Fill the full admission form (about 3 minutes).</T>
          <Button title="Apply now" kind="yellow" icon="document-text-outline" onPress={() => router.push(`/apply/${applyCode}` as any)} />
        </Card>
        <Card style={{ gap: 12 }}>
          <T v="h3">Have a question first?</T>
          {sent ? (
            <Row gap={8}><Ionicons name="checkmark-circle" size={22} color={colors.green} /><T style={{ flex: 1 }}>Thank you! The office will contact you on WhatsApp soon.</T></Row>
          ) : (
            <>
              <T v="small">Leave your details and the office will call or message you.</T>
              <Input label="Student name" value={f.student_name} onChangeText={set('student_name')} />
              <Input label="Your name" value={f.parent_name} onChangeText={set('parent_name')} />
              <Input label="WhatsApp number" value={f.phone} onChangeText={set('phone')} placeholder="+971 50 123 4567" keyboardType="phone-pad" />
              <Row gap={10}><Input label="Email (optional)" value={f.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" /><Select label="Class" value={f.cls} options={[{ key: '', label: '—' }, ...(c?.classes.length ? c.classes : CLASSES).map((x) => ({ key: x, label: x }))]} onChange={set('cls')} /></Row>
              <Input label="Message (optional)" value={f.message} onChangeText={set('message')} multiline />
              {err ? <T style={{ color: colors.red }}>{err}</T> : null}
              <Button title="Send enquiry" icon="paper-plane-outline" onPress={enquire} loading={busy} />
            </>
          )}
        </Card>
        <T v="small" style={{ textAlign: 'center', marginBottom: 30 }}>Powered by Noon Learn</T>
      </View>
    </Screen>
  );
}

/* ---------- Teachers ---------- */
type TeacherRow = { id: number; name: string; login: string | null; phone: string | null; email: string | null; blocked: boolean; batches: string[]; subjects: string[] };

export function AdminTeachersRealScreen() {
  const { data, loading, error, reload } = useApi<TeacherRow[]>('/admin/teachers');
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [creds, setCreds] = useState<Credential[] | null>(null);
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });
  const save = async () => {
    setErr(null); setBusy(true);
    try {
      const body = Object.fromEntries(Object.entries(f).filter(([, v]) => v.trim()).map(([k, v]) => [k, v.trim()]));
      const r = await api.post<{ credentials: Credential[] }>('/admin/teachers', body);
      setCreds(r.credentials); setF({ name: '', email: '', phone: '', password: '' }); reload();
    } catch (e) { setErr(errText(e, 'Could not add the teacher.')); } finally { setBusy(false); }
  };
  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <T v="h1">Teachers <T v="small">{data?.length ?? ''}</T></T>
        <Row gap={8}>
          <Pill label="Batches" icon="people-outline" onPress={() => router.push('/admin/batches' as any)} />
          <Pill label="Add teacher" icon="person-add-outline" filled onPress={() => { setCreds(null); setAdding(true); }} />
        </Row>
      </Row>
      {loading && !data ? <Loading /> : error ? <Empty text={error} /> : !data?.length ? (
        <Card style={{ alignItems: 'center', gap: 10, padding: 24 }}><T>No teachers yet.</T><Button title="Add the first teacher" icon="person-add-outline" onPress={() => setAdding(true)} /></Card>
      ) : (
        <View style={{ gap: 8 }}>
          {data.map((t, i) => (
            <ListRow key={t.id} left={<Avatar name={t.name} size={44} tint={TINTS[i % 4]} />} title={t.name}
              sub={[t.subjects.length ? t.subjects.join(', ') : null, t.batches.length ? `${t.batches.length} batch${t.batches.length > 1 ? 'es' : ''}` : 'No batch yet', t.login].filter(Boolean).join(' · ')}
              right={t.blocked ? <Tag text="Blocked" tone="pink" /> : t.phone ? <SmallButton title="WhatsApp" onPress={() => wa(t.phone!, `Assalamu alaikum ${t.name},`)} /> : undefined} />
          ))}
        </View>
      )}
      <T v="small" style={{ marginTop: 14 }}>Assign teachers to classes and subjects in Batches. Reset a teacher's password in More → People & passwords.</T>
      <Sheet visible={adding} onClose={() => setAdding(false)} title="Add a teacher">
        {creds ? (
          <>
            <CredentialsCard creds={creds} />
            <Button title="Add another" kind="ghost" onPress={() => setCreds(null)} />
          </>
        ) : (
          <Card style={{ gap: 12 }}>
            <Input label="Full name" value={f.name} onChangeText={set('name')} placeholder="eg. Ustad Ahmed" />
            <Input label="Email (login)" value={f.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" />
            <Input label="Phone / WhatsApp" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" placeholder="+971 50 123 4567" />
            <Input label="Password (optional)" value={f.password} onChangeText={set('password')} autoCapitalize="none" placeholder="Leave empty to create one" />
            <T v="small">Give an email or a phone number; the teacher logs in with it.</T>
            {err ? <T style={{ color: colors.red }}>{err}</T> : null}
            <Button title="Add teacher" icon="checkmark-circle-outline" onPress={save} loading={busy} disabled={f.name.trim().length < 2 || (!f.email.trim() && !f.phone.trim())} />
          </Card>
        )}
      </Sheet>
    </Screen>
  );
}

/* ---------- Bulk import from CSV (students or teachers) ---------- */
const BULK_COLS = {
  students: ['Name', 'Board', 'Class', 'Admission no', 'Date of birth', 'Parent name', 'Parent phone', 'Parent email'],
  teachers: ['Name', 'Email', 'Phone'],
} as const;
const BULK_EXAMPLE = {
  students: ['Rayan Ahmed', 'AP', '5', '', '2016-03-14', 'Abdul Rahman', '+971501234567', ''],
  teachers: ['Ustad Ali', 'ali@example.com', '+971501112233'],
} as const;

/** Small CSV reader: commas, quotes and new lines inside quotes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let q = false;
  const s = text.replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === '"' && s[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',' || c === ';' || c === '\t') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && s[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}
const csvLine = (cells: (string | null | undefined)[]) => cells.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',');
function download(name: string, text: string) {
  if (Platform.OS !== 'web') return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' }));
  a.download = name; a.click();
}

export function BulkImportScreen() {
  const [kind, setKind] = useState<'students' | 'teachers'>('students');
  const [rows, setRows] = useState<string[][] | null>(null);
  const [file, setFile] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [results, setResults] = useState<{ row: number; name: string; ok: boolean; msg: string; creds?: Credential[] }[]>([]);
  const cols = BULK_COLS[kind];
  const pick = () => {
    if (Platform.OS !== 'web') return;
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.csv,text/csv';
    input.onchange = async () => {
      const f = input.files?.[0]; if (!f) return;
      if (!/\.csv$/i.test(f.name)) { say('Please save the Excel file as CSV (File → Save as → CSV) and upload that.'); return; }
      const all = parseCsv(await f.text());
      const head = (all[0] ?? []).map((h) => h.trim().toLowerCase());
      const body = head[0] === 'name' ? all.slice(1) : all;
      setFile(f.name); setRows(body); setResults([]); setDone(0);
    };
    input.click();
  };
  const run = async () => {
    if (!rows) return;
    setBusy(true); setResults([]); setDone(0);
    const out: typeof results = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i].map((x) => (x ?? '').trim());
      const body = kind === 'students'
        ? { name: r[0], board: r[1] || 'AP', cls: r[2], admission_no: r[3] || undefined, dob: r[4] || undefined, parent_name: r[5] || undefined, parent_phone: r[6] || undefined, parent_email: r[7] || undefined }
        : { name: r[0], email: r[1] || undefined, phone: r[2] || undefined };
      try {
        const res = await api.post<{ credentials: Credential[] }>(kind === 'students' ? '/admin/students' : '/admin/teachers', body);
        out.push({ row: i + 2, name: r[0], ok: true, msg: 'Added', creds: res.credentials });
      } catch (e) { out.push({ row: i + 2, name: r[0] || '(no name)', ok: false, msg: errText(e, 'Could not add') }); }
      setDone(i + 1); setResults([...out]);
    }
    setBusy(false);
  };
  const okRows = results.filter((r) => r.ok);
  const loginsCsv = () => [csvLine(['Row', 'Who', 'Name', 'Login', 'Password']), ...okRows.flatMap((r) => (r.creds ?? []).map((c) => csvLine([String(r.row), c.who, c.name, c.login, c.password ?? '(existing password)'])))].join('\n');
  return (
    <Screen>
      <Header title="Bulk add" subtitle="Add many at once from a CSV file (Excel → Save as CSV)" />
      <ChoiceChips value={kind} onChange={(k) => { setKind(k); setRows(null); setResults([]); }} options={[{ key: 'students', label: 'Students (with parents)' }, { key: 'teachers', label: 'Teachers' }]} />
      <Card style={{ gap: 10, marginTop: 10 }}>
        <Row style={{ justifyContent: 'space-between' }}><T v="h3">1 · Download the template</T>
          <SmallButton title="Template" onPress={() => download(`noon_${kind}_template.csv`, [csvLine([...cols]), csvLine([...BULK_EXAMPLE[kind]])].join('\n'))} /></Row>
        <Row gap={6} style={{ flexWrap: 'wrap' }}>{cols.map((c) => <Tag key={c} text={c} tone="white" />)}</Row>
        {kind === 'students' ? <T v="small">Board: AP, EK or GEN. Class: 1–10, +1, +2. Admission no. is made for you if empty. Phone with country code.</T> : <T v="small">Each teacher needs an email or a phone number to log in.</T>}
      </Card>
      <Card style={{ marginTop: 10, gap: 10 }}>
        <T v="h3">2 · Upload your filled file</T>
        {rows ? (
          <ListRow left={<Tag text="CSV" tone="mint" />} title={file} sub={`${rows.length} rows found`} right={<SmallButton title="Replace" onPress={pick} />} />
        ) : (
          <Pressable accessibilityRole="button" onPress={pick} style={{ height: 70, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}><T v="small">Tap to choose a .csv file</T></Pressable>
        )}
      </Card>
      {rows ? (
        <Card style={{ marginTop: 10, gap: 10, marginBottom: 30 }}>
          <T v="h3">3 · Import</T>
          {results.length ? (
            <Row gap={8}>
              <MiniStat value={okRows.length} label="Added" tint={colors.mint} />
              <MiniStat value={results.length - okRows.length} label="Need fixing" tint={colors.butter} />
              <MiniStat value={`${done}/${rows.length}`} label="Done" tint={colors.sky} />
            </Row>
          ) : null}
          {results.filter((r) => !r.ok).map((r) => <T key={r.row} style={{ color: '#8A5A0F', fontSize: 13 }}>Row {r.row} · {r.name}: {r.msg}</T>)}
          {!busy && results.length === rows.length && okRows.length ? (
            <Button title="Download logins (CSV)" icon="download-outline" onPress={() => download(`noon_${kind}_logins.csv`, loginsCsv())} />
          ) : null}
          <Button title={busy ? `Adding… ${done}/${rows.length}` : results.length ? 'Import again' : `Import ${rows.length} ${kind}`} onPress={run} loading={busy} disabled={busy} />
          <T v="small">Rows that need fixing are skipped. Fix them in the file and upload just those rows again.</T>
        </Card>
      ) : null}
    </Screen>
  );
}
