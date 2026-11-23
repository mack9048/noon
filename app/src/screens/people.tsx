// Institution admin: Students directory with fee totals, the student profile (tabs) and the staff profile.
import React, { useMemo, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Empty, Loading, Row, Screen, T } from '@/components/ui';
import { Select } from '@/components/kit2';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useLayout } from '@/lib/useLayout';
import { useAuth } from '@/lib/auth';
import { money } from '@/lib/money';
import { say } from '@/lib/dialog';
import { EnrollmentsPanel } from './enrollments';
import { colors, fonts } from '@/theme/tokens';

const TEAL = '#0F766E';
const INK = '#0F172A';
const mono = { fontFamily: fonts.medium, letterSpacing: 0.3 } as const;
const initials = (n: string) => n.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
const digits = (p?: string | null) => (p ?? '').replace(/\D/g, '');
const wa = (phone: string, text: string) => Linking.openURL(`https://wa.me/${digits(phone)}?text=${encodeURIComponent(text)}`);
const call = (phone: string) => Linking.openURL(`tel:+${digits(phone)}`);
const showPhone = (p?: string | null) => (p ? `+${digits(p).replace(/^(\d{2,3})(\d+)$/, '$1 $2')}` : '—');

type FeeStatus = 'paid' | 'due' | 'overdue' | 'none';
type StudentRow = {
  id: number; name: string; admission_no: string | null; cls: string | null; board: string | null; batch: string | null;
  parent: string | null; parent_phone: string | null; blocked: boolean;
  fee_total: number; fee_paid: number; fee_due: number; fee_overdue: number; fee_status: FeeStatus;
};

/* ---------- shared pieces ---------- */
function Page({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={['#DFF1FB', '#EEF4FB', '#F8EFEA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
      <Screen style={{ backgroundColor: 'transparent' }}>{children}</Screen>
    </View>
  );
}
const Box = ({ children, style }: { children: React.ReactNode; style?: any }) => (
  <View style={[{ backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 20, borderWidth: 1, borderColor: '#E6EEF3', shadowColor: '#1E3A5F', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 } }, style]}>{children}</View>
);

/** The four money cards: total, paid, due, overdue. */
export function FeeCards({ total, paid, due, overdue, sub }: { total: number; paid: number; due: number; overdue: number; sub?: [string, string, string, string] }) {
  const card = (label: string, value: string, icon: keyof typeof Ionicons.glyphMap, kind: 'plain' | 'paid' | 'due' | 'over', note?: string) => (
    <View key={label} style={{ flex: 1, minWidth: 150, borderRadius: 20, padding: 16, gap: 8, minHeight: 116, backgroundColor: kind === 'over' ? '#EF4444' : kind === 'paid' ? '#EEF7F5' : '#FFF', borderWidth: kind === 'over' ? 0 : 1, borderColor: '#E6EEF3' }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T style={{ fontSize: 11, letterSpacing: 0.8, fontFamily: fonts.semibold, color: kind === 'over' ? '#FFF' : '#334155' }}>{label}</T>
        <Ionicons name={icon} size={17} color={kind === 'over' ? '#FFF' : kind === 'paid' ? TEAL : '#334155'} />
      </Row>
      <T style={{ fontSize: 30, fontFamily: fonts.semibold, color: kind === 'over' ? '#FFF' : kind === 'paid' ? '#10B981' : INK, letterSpacing: -0.5 }} numberOfLines={1} adjustsFontSizeToFit>{value}</T>
      {kind === 'due' || kind === 'over' ? (
        <View style={{ alignSelf: 'flex-start', backgroundColor: INK, borderRadius: 6, paddingHorizontal: 8, height: 20, justifyContent: 'center' }}>
          <T style={{ ...mono, color: kind === 'over' ? '#FCA5A5' : '#FACC15', fontSize: 10 }}>[ {note} ]</T>
        </View>
      ) : note ? <T style={{ ...mono, fontSize: 11, color: '#64748B' }}>{note}</T> : null}
    </View>
  );
  return (
    <Row gap={14} style={{ flexWrap: 'wrap' }}>
      {card('TOTAL FEE', money(total), 'wallet-outline', 'plain', sub?.[0])}
      {card('TOTAL PAID', money(paid), 'checkmark-circle-outline', 'paid', sub?.[1])}
      {card('TOTAL DUE', money(due), 'warning-outline', 'due', sub?.[2] ?? 'PENDING')}
      {card('OVER DUE', money(overdue), 'warning-outline', 'over', sub?.[3] ?? 'OVERDUE')}
    </Row>
  );
}

function StatusPill({ s }: { s: FeeStatus }) {
  const map = { overdue: ['#FEE2E2', '#DC2626', 'Overdue'], due: ['#FEF3C7', '#B45309', 'Due'], paid: ['#DCFCE7', '#16A34A', 'Paid'], none: ['#F1F5F9', '#64748B', 'No fees'] } as const;
  const [bg, ink, label] = map[s];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: bg, borderRadius: 12, paddingHorizontal: 10, height: 24, alignSelf: 'flex-start' }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: ink }} /><T style={{ color: ink, fontSize: 12, fontFamily: fonts.medium }}>{label}</T>
    </View>
  );
}

function CircleBtn({ icon, label, onPress, filled = TEAL, light }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; filled?: string; light?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: light ? '#FFF' : filled, borderWidth: light ? 1 : 0, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icon} size={16} color={light ? INK : '#FFF'} />
    </Pressable>
  );
}

function ToolBtn({ icon, label, onPress, primary, badge }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; primary?: boolean; badge?: number }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}
      style={{ height: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: primary ? TEAL : '#FFF', borderWidth: primary ? 0 : 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Ionicons name={icon} size={16} color={primary ? '#FFF' : INK} />
      <T style={{ fontFamily: fonts.semibold, fontSize: 13.5, color: primary ? '#FFF' : INK }}>{label}</T>
      {badge ? <View style={{ minWidth: 20, height: 20, borderRadius: 10, backgroundColor: INK, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }}><T style={{ color: '#FFF', fontSize: 11, fontFamily: fonts.semibold }}>{badge}</T></View> : null}
    </Pressable>
  );
}

/* ================= Students directory ================= */
export function StudentsDirectoryScreen() {
  const { data, loading } = useApi<StudentRow[]>('/admin/students');
  const { device } = useLayout();
  const [q, setQ] = useState('');
  const [cls, setCls] = useState('all');
  const [fee, setFee] = useState<'all' | FeeStatus>('all');
  const list = data ?? [];
  const classes = useMemo(() => Array.from(new Set(list.map((s) => s.batch ?? (s.cls ? `Class ${s.cls}` : null)).filter(Boolean) as string[])).sort(), [list]);
  const t = useMemo(() => list.reduce((a, s) => ({ total: a.total + s.fee_total, paid: a.paid + s.fee_paid, due: a.due + s.fee_due, over: a.over + s.fee_overdue,
    paidN: a.paidN + (s.fee_status === 'paid' ? 1 : 0), overN: a.overN + (s.fee_status === 'overdue' ? 1 : 0), dueN: a.dueN + (s.fee_due > 0 ? 1 : 0) }), { total: 0, paid: 0, due: 0, over: 0, paidN: 0, overN: 0, dueN: 0 }), [list]);
  const rows = list.filter((s) => (cls === 'all' || (s.batch ?? (s.cls ? `Class ${s.cls}` : '')) === cls) && (fee === 'all' || s.fee_status === fee)
    && `${s.name} ${s.admission_no ?? ''} ${s.parent ?? ''} ${s.parent_phone ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()));
  const wide = device !== 'phone';
  return (
    <Page>
      <FeeCards total={t.total} paid={t.paid} due={t.due} overdue={t.over}
        sub={[`${list.length} students`, `${t.paidN} paid students`, `${t.dueN} PENDING`, `${t.overN} OVERDUE`]} />
      <Row style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: 22, flexWrap: 'wrap', gap: 10 }}>
        <T style={{ fontSize: 28, fontFamily: fonts.semibold, color: INK }}>Students Directory</T>
        <Row gap={8} style={{ flexWrap: 'wrap', flexShrink: 1 }}>
          <ToolBtn icon="add" label="Admit" primary onPress={() => router.push('/admin/students/new' as any)} />
          <ToolBtn icon="cloud-upload-outline" label="Bulk add" onPress={() => router.push('/admin/bulk' as any)} />
          <ToolBtn icon="people-outline" label="Batches" onPress={() => router.push('/admin/batches' as any)} />
          <ToolBtn icon="wallet-outline" label="Fees" onPress={() => router.push('/admin/fees' as any)} />
        </Row>
      </Row>
      <Box style={{ marginTop: 14, padding: 16 }}>
        <Row gap={12} style={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <View style={{ width: wide ? 190 : '47%' }}><T style={{ fontSize: 11, letterSpacing: 0.8, color: '#64748B', fontFamily: fonts.semibold, marginBottom: 6 }}>CLASS / BATCH</T>
            <Select compact value={cls} onChange={setCls} options={[{ key: 'all', label: 'All classes' }, ...classes.map((c) => ({ key: c, label: c }))]} /></View>
          <View style={{ width: wide ? 170 : '47%' }}><T style={{ fontSize: 11, letterSpacing: 0.8, color: '#64748B', fontFamily: fonts.semibold, marginBottom: 6 }}>FEES</T>
            <Select compact value={fee} onChange={setFee} options={[{ key: 'all', label: 'All' }, { key: 'overdue', label: 'Overdue' }, { key: 'due', label: 'Due' }, { key: 'paid', label: 'Paid' }, { key: 'none', label: 'No fees' }]} /></View>
          <View style={{ flex: 1, minWidth: 220 }}>
            <T style={{ fontSize: 11, letterSpacing: 0.8, color: '#64748B', fontFamily: fonts.semibold, marginBottom: 6 }}>SEARCH</T>
            <Row style={{ height: 42, borderRadius: 21, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFF', paddingHorizontal: 14 }}>
              <Ionicons name="search" size={16} color="#64748B" />
              <TextInput value={q} onChangeText={setQ} placeholder="Search name, ID, guardian, phone…" placeholderTextColor="#94A3B8" accessibilityLabel="Search students"
                style={{ flex: 1, marginLeft: 8, fontFamily: fonts.regular, fontSize: 14.5, color: INK, outlineStyle: 'none' } as any} />
            </Row>
          </View>
          <T style={{ ...mono, fontSize: 12, color: '#64748B' }}>{rows.length} of {list.length}</T>
        </Row>
      </Box>
      <Box style={{ marginTop: 14, paddingVertical: 6, marginBottom: 100 }}>
        {wide ? (
          <Row style={{ paddingHorizontal: 18, height: 44, borderBottomWidth: 1, borderBottomColor: '#EEF2F6' }}>
            {[['STUDENT', 3], ['CLASS', 1.4], ['GUARDIAN & CONTACT', 2.4], ['', 1.8], ['FEES STATUS', 1]].map(([h, f]) => (
              <T key={String(h) || 'act'} style={{ flex: Number(f), fontSize: 11, letterSpacing: 0.8, color: '#64748B', fontFamily: fonts.semibold, textAlign: h === 'FEES STATUS' ? 'right' : 'left' }}>{h}</T>
            ))}
          </Row>
        ) : null}
        {loading && !data ? <Loading /> : !rows.length ? <Empty text={list.length ? 'No student matches.' : 'No students yet. Tap Admit.'} /> : rows.map((s) => {
          const klass = s.batch ?? (s.cls ? `${s.board ?? ''} ${s.cls}`.trim() : '—');
          const actions = (
            <Row gap={6}>
              {s.parent_phone ? <CircleBtn icon="logo-whatsapp" label={`WhatsApp ${s.parent ?? s.name}`} filled="#22C55E" onPress={() => wa(s.parent_phone!, `Assalamu alaikum, this is the office about ${s.name}.`)} /> : null}
              {s.parent_phone ? <CircleBtn icon="call" label={`Call ${s.parent ?? s.name}`} onPress={() => call(s.parent_phone!)} /> : null}
              <CircleBtn icon="create-outline" label={`Edit ${s.name}`} light onPress={() => router.push(`/admin/students/${s.id}/edit` as any)} />
              <CircleBtn icon="wallet-outline" label={`Fees of ${s.name}`} onPress={() => router.push(`/admin/students/${s.id}?tab=payments` as any)} />
            </Row>
          );
          return (
            <Pressable key={s.id} accessibilityRole="button" accessibilityLabel={`Open ${s.name}`} onPress={() => router.push(`/admin/students/${s.id}` as any)}
              style={({ hovered }: any) => ({ flexDirection: wide ? 'row' : 'column', alignItems: wide ? 'center' : 'stretch', gap: wide ? 0 : 10, paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: hovered ? '#F8FBFC' : 'transparent' })}>
              <Row gap={12} style={{ flex: wide ? 3 : undefined }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' }}><T style={{ color: '#FFF', fontFamily: fonts.semibold, fontSize: 13 }}>{initials(s.name)}</T></View>
                <View style={{ flex: 1 }}>
                  <T style={{ fontFamily: fonts.semibold, color: INK, textTransform: 'uppercase' }} numberOfLines={1}>{s.name}</T>
                  <T style={{ ...mono, fontSize: 11.5, color: '#64748B' }}>{s.admission_no ?? '—'}{s.blocked ? ' · BLOCKED' : ''}</T>
                </View>
                {!wide ? <StatusPill s={s.fee_status} /> : null}
              </Row>
              <View style={{ flex: wide ? 1.4 : undefined, flexDirection: 'row' }}>
                <View style={{ backgroundColor: '#E2F2EF', borderRadius: 12, paddingHorizontal: 10, height: 24, justifyContent: 'center' }}><T style={{ ...mono, fontSize: 11.5, color: '#134E4A' }} numberOfLines={1}>{klass}</T></View>
              </View>
              <View style={{ flex: wide ? 2.4 : undefined }}>
                <T style={{ color: INK, textTransform: 'uppercase' }} numberOfLines={1}>{s.parent ?? '—'}</T>
                <T style={{ ...mono, fontSize: 12, color: '#64748B' }}>{showPhone(s.parent_phone)}</T>
              </View>
              <View style={{ flex: wide ? 1.8 : undefined, alignItems: wide ? 'flex-end' : 'flex-start', paddingRight: wide ? 16 : 0 }}>{actions}</View>
              {wide ? <View style={{ flex: 1, alignItems: 'flex-end' }}><StatusPill s={s.fee_status} /></View> : null}
            </Pressable>
          );
        })}
      </Box>
    </Page>
  );
}

/* ================= Student profile ================= */
type Fee = { id: number; title: string; month: string; amount: number; due_date: string; status: 'due' | 'paid' | 'waived'; paid_amount: number | null; paid_at: string | null; method: string | null; receipt_no: string | null; overdue_days?: number };
type StudentDetail = StudentRow & { email: string | null; batches: { id: number; name: string }[]; courses: { id: number; title: string; progress: number }[]; joined: string; age: number | null; fees: Fee[]; fee_totals: Pick<StudentRow, 'fee_total' | 'fee_paid' | 'fee_due' | 'fee_overdue' | 'fee_status'> };
type Tab = 'profile' | 'academic' | 'payments' | 'parents';

function ProfileHeader({ label, name, sub, chips, actions }: { label: string; name: string; sub: string; chips: React.ReactNode; actions: React.ReactNode }) {
  return (
    <Box style={{ padding: 22, borderTopWidth: 3, borderTopColor: TEAL }}>
      <Row gap={18} style={{ flexWrap: 'wrap', alignItems: 'center' }}>
        <View style={{ width: 92, height: 92, borderRadius: 22, backgroundColor: '#13203A', alignItems: 'center', justifyContent: 'center' }}>
          <T style={{ color: '#FFF', fontSize: 30, fontFamily: fonts.semibold }}>{initials(name)}</T>
        </View>
        <View style={{ flex: 1, minWidth: 200, gap: 4 }}>
          <T style={{ fontSize: 11, letterSpacing: 1.5, color: '#64748B', fontFamily: fonts.semibold }}>{label}</T>
          <T style={{ fontSize: 28, fontFamily: fonts.semibold, color: INK, textTransform: 'uppercase' }} numberOfLines={2}>{name}</T>
          <T style={{ color: '#64748B' }}>{sub}</T>
          <Row gap={6} style={{ flexWrap: 'wrap', marginTop: 4 }}>{chips}</Row>
        </View>
        <Row gap={8} style={{ flexWrap: 'wrap' }}>{actions}</Row>
      </Row>
    </Box>
  );
}
const Chip = ({ text, tone = 'plain' }: { text: string; tone?: 'plain' | 'green' | 'red' }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 12, paddingHorizontal: 10, height: 24, backgroundColor: tone === 'green' ? '#DCF2EC' : tone === 'red' ? '#FEE2E2' : '#F8FAFC', borderWidth: tone === 'plain' ? 1 : 0, borderColor: '#E2E8F0' }}>
    {tone !== 'plain' ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: tone === 'green' ? TEAL : '#DC2626' }} /> : null}
    <T style={{ ...(tone === 'plain' ? mono : { fontFamily: fonts.medium }), fontSize: 12, color: tone === 'red' ? '#B91C1C' : '#134E4A' }}>{text}</T>
  </View>
);

function Tabs<K extends string>({ value, onChange, tabs }: { value: K; onChange: (k: K) => void; tabs: { key: K; label: string; icon: keyof typeof Ionicons.glyphMap }[] }) {
  return (
    <Box style={{ marginTop: 16, padding: 6 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
        {tabs.map((t) => {
          const on = t.key === value;
          return (
            <Pressable key={t.key} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(t.key)}
              style={{ flex: 1, minWidth: 120, height: 44, borderRadius: 14, backgroundColor: on ? '#F1F7F6' : 'transparent', borderBottomWidth: 2, borderBottomColor: on ? TEAL : 'transparent', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Ionicons name={t.icon} size={15} color={on ? INK : '#64748B'} />
              <T style={{ color: on ? INK : '#64748B', fontFamily: on ? fonts.semibold : fonts.regular }}>{t.label}</T>
            </Pressable>
          );
        })}
      </ScrollView>
    </Box>
  );
}

function InfoRows({ title, sub, rows }: { title: string; sub: string; rows: [string, React.ReactNode][] }) {
  return (
    <Box style={{ marginTop: 16, padding: 22 }}>
      <T style={{ fontSize: 17, fontFamily: fonts.semibold, color: INK }}>{title}</T>
      <T v="small" style={{ marginBottom: 10 }}>{sub}</T>
      {rows.map(([k, v]) => (
        <Row key={k} style={{ paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#EEF2F6', flexWrap: 'wrap', gap: 8 }}>
          <T style={{ width: 260, fontSize: 11.5, letterSpacing: 0.8, color: '#475569', fontFamily: fonts.semibold }}>{k.toUpperCase()}</T>
          <View style={{ flex: 1, minWidth: 180 }}>{typeof v === 'string' ? <T style={{ color: INK }}>{v || '—'}</T> : v}</View>
        </Row>
      ))}
    </Box>
  );
}

function CollectSheet({ fees, onClose, onDone }: { fees: Fee[]; onClose: () => void; onDone: () => void }) {
  const [method, setMethod] = useState('cash');
  const [busy, setBusy] = useState(false);
  const total = fees.reduce((n, f) => n + f.amount, 0);
  const go = async () => {
    setBusy(true);
    try { for (const f of fees) await api.post(`/admin/fees/${f.id}/pay`, { method }); onDone(); }
    catch (e) { say(e instanceof ApiError ? e.friendly : 'Could not save the payment.'); } finally { setBusy(false); }
  };
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 440, backgroundColor: '#FFF', borderRadius: 22, padding: 20, gap: 12 }}>
          <T style={{ fontSize: 18, fontFamily: fonts.semibold }}>Collect {money(total)}</T>
          {fees.map((f) => <Row key={f.id} style={{ justifyContent: 'space-between' }}><T>{f.title}</T><T style={mono}>{money(f.amount)}</T></Row>)}
          <Select label="Paid by" value={method} onChange={setMethod} options={[{ key: 'cash', label: 'Cash' }, { key: 'upi', label: 'UPI' }, { key: 'bank', label: 'Bank transfer' }, { key: 'card', label: 'Card' }]} />
          <Row gap={8}><Button title="Mark as paid" icon="checkmark-circle-outline" loading={busy} onPress={go} /><Button title="Cancel" kind="ghost" onPress={onClose} /></Row>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Payments({ s, reload }: { s: StudentDetail; reload: () => void }) {
  const [filter, setFilter] = useState<'open' | 'overdue' | 'due' | 'paid'>('open');
  const [collect, setCollect] = useState<Fee[] | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const isOver = (f: Fee) => f.status === 'due' && f.due_date < today;
  const open = s.fees.filter((f) => f.status === 'due');
  const shown = s.fees.filter((f) => (filter === 'open' ? f.status === 'due' : filter === 'overdue' ? isOver(f) : filter === 'due' ? f.status === 'due' && !isOver(f) : f.status === 'paid'));
  const remind = (list: Fee[]) => s.parent_phone ? wa(s.parent_phone, `Assalamu alaikum. Fee reminder for ${s.name}: ${list.map((f) => `${f.title} ${money(f.amount)} (due ${f.due_date})`).join(', ')}. JazakAllah khair.`) : say('No parent phone number for this student.');
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  return (
    <>
      <Box style={{ marginTop: 16, padding: 22, gap: 14 }}>
        <T style={{ fontSize: 17, fontFamily: fonts.semibold, color: INK }}>Fees Overview</T>
        <Row gap={10} style={{ flexWrap: 'wrap' }}>
          <View style={{ flex: 1, minWidth: 180 }}><Button title="All fees" icon="list-outline" kind="ghost" onPress={() => router.push('/admin/fees' as any)} /></View>
          <View style={{ flex: 1, minWidth: 180 }}><Button title={`WhatsApp all due · ${open.length}`} icon="logo-whatsapp" kind="ghost" disabled={!open.length} onPress={() => remind(open)} /></View>
          <View style={{ flex: 1, minWidth: 180 }}><Button title="Collect now" icon="wallet-outline" disabled={!open.length} onPress={() => setCollect(open)} /></View>
        </Row>
        <FeeCards total={s.fee_totals.fee_total} paid={s.fee_totals.fee_paid} due={s.fee_totals.fee_due} overdue={s.fee_totals.fee_overdue} />
      </Box>
      <Box style={{ marginTop: 16, padding: 22, gap: 12, marginBottom: 100 }}>
        <T style={{ fontSize: 17, fontFamily: fonts.semibold, color: INK }}>Fees</T>
        <Row gap={8} style={{ flexWrap: 'wrap' }}>
          {([['open', `All open · ${open.length}`], ['overdue', `Overdue · ${s.fees.filter(isOver).length}`], ['due', 'Due'], ['paid', `Paid · ${s.fees.filter((f) => f.status === 'paid').length}`]] as const).map(([k, l]) => (
            <Pressable key={k} onPress={() => setFilter(k)} style={{ height: 30, paddingHorizontal: 12, borderRadius: 15, borderWidth: 1, borderColor: filter === k ? TEAL : '#E2E8F0', backgroundColor: filter === k ? '#E2F2EF' : '#FFF', justifyContent: 'center' }}>
              <T style={{ fontSize: 12.5, color: INK, fontFamily: filter === k ? fonts.semibold : fonts.regular }}>{l}</T>
            </Pressable>
          ))}
        </Row>
        {!shown.length ? <Empty text="No fees here." /> : shown.map((f) => {
          const over = isOver(f);
          return (
            <Row key={f.id} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEF2F6', flexWrap: 'wrap', gap: 10 }}>
              <View style={{ flex: 2, minWidth: 160 }}><T style={{ fontFamily: fonts.medium, color: INK }}>{f.title}</T><T style={{ ...mono, fontSize: 12, color: '#64748B' }}>Due {fmt(f.due_date)}</T></View>
              <View style={{ flex: 1, minWidth: 90 }}><T v="small">Charge</T><T style={mono}>{money(f.amount)}</T></View>
              <View style={{ flex: 1, minWidth: 90 }}><T v="small">Paid</T><T style={mono}>{money(f.status === 'paid' ? f.paid_amount ?? f.amount : 0)}</T></View>
              <View style={{ flex: 1, minWidth: 90 }}><T v="small">Balance</T><T style={mono}>{money(f.status === 'due' ? f.amount : 0)}</T></View>
              <View style={{ flex: 2, minWidth: 180, gap: 6 }}>
                <StatusPill s={f.status === 'paid' ? 'paid' : over ? 'overdue' : f.status === 'due' ? 'due' : 'none'} />
                {f.status === 'due' ? (
                  <Row gap={6}>
                    <Pressable onPress={() => remind([f])} style={{ height: 26, paddingHorizontal: 10, borderRadius: 13, borderWidth: 1, borderColor: '#A7F3D0', backgroundColor: '#ECFDF5', flexDirection: 'row', alignItems: 'center', gap: 4 }}><Ionicons name="logo-whatsapp" size={12} color="#047857" /><T style={{ fontSize: 12, color: '#047857' }}>Remind</T></Pressable>
                    <Pressable onPress={() => setCollect([f])} style={{ height: 26, paddingHorizontal: 10, borderRadius: 13, backgroundColor: TEAL, flexDirection: 'row', alignItems: 'center', gap: 4 }}><Ionicons name="wallet-outline" size={12} color="#FFF" /><T style={{ fontSize: 12, color: '#FFF' }}>Collect</T></Pressable>
                  </Row>
                ) : f.receipt_no ? <T style={{ ...mono, fontSize: 11.5, color: '#64748B' }}>{f.receipt_no}{f.method ? ` · ${f.method.toUpperCase()}` : ''}</T> : null}
              </View>
            </Row>
          );
        })}
      </Box>
      {collect ? <CollectSheet fees={collect} onClose={() => setCollect(null)} onDone={() => { setCollect(null); reload(); }} /> : null}
    </>
  );
}

export function StudentProfileScreen() {
  const { id, tab: t0 } = useLocalSearchParams<{ id: string; tab?: Tab }>();
  const { data: s, reload } = useApi<StudentDetail>(`/admin/students/${id}`);
  const [tab, setTab] = useState<Tab>(t0 === 'payments' || t0 === 'academic' || t0 === 'parents' ? t0 : 'profile');
  if (!s) return <Page><Loading /></Page>;
  const klass = s.batches.map((b) => b.name).join(', ') || (s.cls ? `${s.board ?? ''} Class ${s.cls}`.trim() : 'No class yet');
  return (
    <Page>
      <ProfileHeader label="STUDENT PROFILE" name={s.name} sub={klass}
        chips={<><Chip text={s.admission_no ?? '—'} />{s.blocked ? <Chip text="Blocked" tone="red" /> : <Chip text="Active" tone="green" />}</>}
        actions={<>
          <ToolBtn icon="wallet-outline" label="Collect" onPress={() => setTab('payments')} />
          {s.parent_phone ? <ToolBtn icon="logo-whatsapp" label="WhatsApp" onPress={() => wa(s.parent_phone!, `Assalamu alaikum, this is the office about ${s.name}.`)} /> : null}
          <ToolBtn icon="create-outline" label="Edit Profile" primary onPress={() => router.push(`/admin/students/${s.id}/edit` as any)} />
        </>} />
      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'profile', label: 'Profile', icon: 'person-outline' }, { key: 'academic', label: 'Academic', icon: 'school-outline' }, { key: 'payments', label: 'Payments', icon: 'wallet-outline' }, { key: 'parents', label: 'Parents app', icon: 'phone-portrait-outline' }]} />
      {tab === 'profile' ? (
        <InfoRows title="Personal Information" sub={`Identity and contact details for ${s.name}.`} rows={[
          ['Guardian', s.parent ?? '—'],
          ['Contact phone', s.parent_phone ? (
            <Row gap={8} style={{ flexWrap: 'wrap' }}>
              <T style={{ ...mono, color: INK }}>{showPhone(s.parent_phone)}</T>
              <Pressable onPress={() => call(s.parent_phone!)} style={{ height: 26, paddingHorizontal: 10, borderRadius: 13, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center', gap: 4 }}><Ionicons name="call-outline" size={12} color={INK} /><T style={{ fontSize: 12 }}>Call</T></Pressable>
              <Pressable onPress={() => wa(s.parent_phone!, `Assalamu alaikum, this is the office about ${s.name}.`)} style={{ height: 26, paddingHorizontal: 10, borderRadius: 13, backgroundColor: '#22C55E', flexDirection: 'row', alignItems: 'center', gap: 4 }}><Ionicons name="logo-whatsapp" size={12} color="#FFF" /><T style={{ fontSize: 12, color: '#FFF' }}>WhatsApp</T></Pressable>
            </Row>
          ) : '—'],
          ['Admission no. (login)', s.admission_no ?? '—'],
          ['Email address', s.email ?? '—'],
          ['Age', s.age ? String(s.age) : '—'],
          ['Class / batch', klass],
          ['Joined', s.joined],
        ]} />
      ) : tab === 'academic' ? (
        <View style={{ marginTop: 16, marginBottom: 100 }}>
          <Box style={{ padding: 22, gap: 8, marginBottom: 12 }}>
            <T style={{ fontSize: 17, fontFamily: fonts.semibold, color: INK }}>Batches</T>
            {s.batches.length ? s.batches.map((b) => <Row key={b.id} gap={8}><Ionicons name="people-outline" size={16} color={TEAL} /><T>{b.name}</T></Row>) : <T v="small">Not in a batch yet. Add from Batches.</T>}
          </Box>
          <EnrollmentsPanel studentId={s.id} />
        </View>
      ) : tab === 'payments' ? <Payments s={s} reload={reload} /> : (
        <InfoRows title="Parents app" sub="Parents use the student's login on their phone." rows={[
          ['Login (admission no.)', <T key="l" style={{ ...mono, color: INK }}>{s.admission_no ?? '—'}</T>],
          ['Password', <Pressable key="p" onPress={() => router.push('/admin/people' as any)}><T style={{ color: TEAL, fontFamily: fonts.semibold }}>Set a new password in People & passwords →</T></Pressable>],
          ['Send login on WhatsApp', s.parent_phone ? <Pressable key="w" onPress={() => wa(s.parent_phone!, `Assalamu alaikum. ${s.name}'s Noon app login: ${s.admission_no}. Open https://www.noonlearn.com/login`)}><T style={{ color: '#16A34A', fontFamily: fonts.semibold }}>Send to {showPhone(s.parent_phone)}</T></Pressable> : '—'],
          ['Account', s.blocked ? 'Blocked (cannot sign in)' : 'Active'],
        ]} />
      )}
    </Page>
  );
}

/* ================= Staff profile ================= */
type Staff = { id: number; name: string; phone: string | null; email: string | null; blocked: boolean; joined: string | null; students: number; live_classes: number; attendance_marked: number;
  classes: { id: number; name: string; students: number; class_teacher: boolean; subjects: string[] }[]; courses: { id: number; title: string; status: string }[] };

export function StaffProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: t } = useApi<Staff>(`/admin/teachers/${id}`);
  const { device } = useLayout();
  const [tab, setTab] = useState<'profile' | 'classes' | 'courses'>('profile');
  if (!t) return <Page><Loading /></Page>;
  const joined = t.joined ? new Date(t.joined).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
  return (
    <Page>
      <ProfileHeader label="STAFF PROFILE" name={t.name} sub={t.classes.map((c) => c.name).join(', ') || 'Teacher'}
        chips={<><Chip text={`STF-${String(t.id).padStart(3, '0')}`} />{t.blocked ? <Chip text="Blocked" tone="red" /> : <Chip text="Active" tone="green" />}</>}
        actions={<>
          {t.phone ? <ToolBtn icon="logo-whatsapp" label="WhatsApp" onPress={() => wa(t.phone!, `Assalamu alaikum ${t.name},`)} /> : null}
          {t.phone ? <ToolBtn icon="call-outline" label="Call" onPress={() => call(t.phone!)} /> : null}
          <ToolBtn icon="key-outline" label="Password" primary onPress={() => router.push('/admin/people' as any)} />
        </>} />
      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'profile', label: 'Profile', icon: 'person-outline' }, { key: 'classes', label: 'Classes', icon: 'people-outline' }, { key: 'courses', label: 'Courses', icon: 'school-outline' }]} />
      {tab === 'profile' ? (
        <Row gap={16} style={{ flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: 100 }}>
          <View style={{ flex: 3, minWidth: device === 'phone' ? '100%' : 360 }}>
            <InfoRows title="Personal Information" sub={`Contact and identity details for ${t.name}.`} rows={[
              ['Employee ID', `STF-${String(t.id).padStart(3, '0')}`], ['Phone', showPhone(t.phone)], ['Email', t.email ?? '—'],
              ['Students taught', String(t.students)], ['Live classes held', String(t.live_classes)], ['Attendance marked', `${t.attendance_marked} times`],
            ]} />
          </View>
          <View style={{ flex: 2, minWidth: device === 'phone' ? '100%' : 280 }}>
            <Box style={{ marginTop: 16, padding: 22, gap: 12 }}>
              <Row style={{ justifyContent: 'space-between' }}><T style={{ fontSize: 17, fontFamily: fonts.semibold, color: INK }}>Account History</T><Chip text={t.blocked ? '2 events' : '1 event'} /></Row>
              <T v="small">Joined and blocked events.</T>
              <Row gap={10} style={{ borderRadius: 14, borderWidth: 1, borderColor: '#EEF2F6', padding: 12 }}><Chip text="JOINED" tone="green" /><T style={{ ...mono, fontSize: 12.5 }}>{joined}</T></Row>
              {t.blocked ? <Row gap={10} style={{ borderRadius: 14, borderWidth: 1, borderColor: '#EEF2F6', padding: 12 }}><Chip text="BLOCKED" tone="red" /><T style={{ fontSize: 12.5 }}>Cannot sign in now</T></Row> : null}
            </Box>
          </View>
        </Row>
      ) : tab === 'classes' ? (
        <Box style={{ marginTop: 16, padding: 22, gap: 10, marginBottom: 100 }}>
          <T style={{ fontSize: 17, fontFamily: fonts.semibold, color: INK }}>Classes and subjects</T>
          {t.classes.length ? t.classes.map((c) => (
            <Row key={c.id} gap={12} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EEF2F6' }}>
              <Ionicons name="people-outline" size={18} color={TEAL} />
              <View style={{ flex: 1 }}><T style={{ fontFamily: fonts.semibold }}>{c.name}</T><T v="small">{c.students} students{c.subjects.length ? ` · ${c.subjects.join(', ')}` : ''}</T></View>
              {c.class_teacher ? <Chip text="Class teacher" tone="green" /> : null}
            </Row>
          )) : <T v="small">Not in a batch yet. Add from Batches.</T>}
        </Box>
      ) : (
        <Box style={{ marginTop: 16, padding: 22, gap: 10, marginBottom: 100 }}>
          <T style={{ fontSize: 17, fontFamily: fonts.semibold, color: INK }}>Courses taught</T>
          {t.courses.length ? t.courses.map((c) => (
            <Pressable key={c.id} onPress={() => router.push(`/admin/manage/${c.id}` as any)}><Row gap={10} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EEF2F6' }}><Ionicons name="school-outline" size={18} color={TEAL} /><T style={{ flex: 1 }}>{c.title}</T><Chip text={c.status} /></Row></Pressable>
          )) : <T v="small">No courses yet. Choose the teacher of a course in Course management.</T>}
        </Box>
      )}
    </Page>
  );
}
