// Super admin: Tenants (institutions) as compact cards with totals, search and filters.
import React, { useMemo, useState } from 'react';
import { Image, Pressable, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Grid, Loading, Row, Screen, T, Empty } from '@/components/ui';
import { Select } from '@/components/kit2';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { homeFor, useAuth } from '@/lib/auth';
import { confirmBox, say } from '@/lib/dialog';
import { colors, fonts } from '@/theme/tokens';

type Tenant = {
  id: number; name: string; code: string; plan: 'basic' | 'pro' | 'enterprise' | string; active: boolean; created_at?: string;
  students_count: number; teachers_count?: number; batches_count?: number; logo_url?: string | null; email?: string | null;
  admin?: { id: number; name: string; email: string | null } | null;
};
/** Plan price per month and student seats (as on Billing). */
const PLAN: Record<string, { label: string; price: number; seats: number | null; tone: [string, string] }> = {
  basic: { label: 'BASIC', price: 2500, seats: 100, tone: ['#F1F5F9', '#334155'] },
  pro: { label: 'PRO', price: 6000, seats: 500, tone: ['#DCFCE7', '#166534'] },
  enterprise: { label: 'ENTERPRISE', price: 0, seats: null, tone: ['#EDE9FE', '#5B21B6'] },
};
const plan = (p: string) => PLAN[p] ?? PLAN.basic;
const rs = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const daysOld = (iso?: string) => (iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)) : 0);
const initials = (s: string) => s.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

function Bar({ parts, height = 6 }: { parts: [number, string][]; height?: number }) {
  const total = parts.reduce((n, [v]) => n + v, 0) || 1;
  return (
    <View style={{ flexDirection: 'row', height, borderRadius: height / 2, overflow: 'hidden', backgroundColor: '#E7EDF2' }}>
      {parts.map(([v, c], i) => <View key={i} style={{ width: `${(v / total) * 100}%`, backgroundColor: c }} />)}
    </View>
  );
}

function TopCard({ label, value, sub, bar, dark, teal }: { label: string; value: string; sub: string; bar?: React.ReactNode; dark?: boolean; teal?: boolean }) {
  const ink = dark || teal ? '#FFF' : colors.ink;
  const body = (
    <View style={{ padding: 14, gap: 6, minHeight: 104 }}>
      <T style={{ fontSize: 11, letterSpacing: 0.8, fontFamily: fonts.semibold, color: dark || teal ? 'rgba(255,255,255,0.8)' : colors.muted }}>{label.toUpperCase()}</T>
      <T style={{ fontSize: 24, fontFamily: fonts.semibold, color: ink }}>{value}</T>
      {bar}
      <T style={{ fontSize: 12, color: dark || teal ? 'rgba(255,255,255,0.85)' : colors.muted }}>{sub}</T>
    </View>
  );
  const box = { flex: 1, minWidth: 150, borderRadius: 18, overflow: 'hidden' as const, borderWidth: dark || teal ? 0 : 1, borderColor: '#E3EAF0' };
  if (teal) return <LinearGradient colors={['#14776E', '#0E5E57']} style={box}>{body}</LinearGradient>;
  return <View style={[box, { backgroundColor: dark ? '#111A2E' : '#FFF' }]}>{body}</View>;
}

function Chip({ text, bg, ink, dot, mono }: { text: string; bg: string; ink: string; dot?: string; mono?: boolean }) {
  return (
    <View style={{ height: 22, paddingHorizontal: 8, borderRadius: 11, backgroundColor: bg, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      {dot ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dot }} /> : null}
      <T style={{ fontSize: 10.5, fontFamily: mono ? fonts.medium : fonts.semibold, color: ink, letterSpacing: 0.4 }}>{text}</T>
    </View>
  );
}

function RoundIcon({ icon, label, onPress, danger }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F4F6F8', borderWidth: 1, borderColor: '#E3EAF0', alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icon} size={15} color={danger ? colors.red : colors.ink} />
    </Pressable>
  );
}

function TenantCard({ t, onToggle, onLogIn, busy }: { t: Tenant; onToggle: () => void; onLogIn: () => void; busy: boolean }) {
  const p = plan(t.plan);
  const used = p.seats ? Math.min(100, Math.round((t.students_count / p.seats) * 100)) : null;
  return (
    <View style={{ backgroundColor: '#FFF', borderRadius: 18, borderWidth: 1, borderColor: '#E3EAF0', padding: 14, gap: 10 }}>
      <Pressable onPress={() => router.push(`/super/tenants/${t.id}` as any)} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        {t.logo_url ? <Image source={{ uri: t.logo_url }} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF' }} resizeMode="contain" />
          : <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#14776E', alignItems: 'center', justifyContent: 'center' }}><T style={{ color: '#FFF', fontFamily: fonts.semibold, fontSize: 13 }}>{initials(t.name)}</T></View>}
        <View style={{ flex: 1 }}>
          <T style={{ fontFamily: fonts.semibold, fontSize: 15 }} numberOfLines={1}>{t.name}</T>
          <T v="small" numberOfLines={1}>{t.code} · {daysOld(t.created_at)}d old{t.admin?.email ? ` · ${t.admin.email}` : ''}</T>
        </View>
      </Pressable>
      <Row gap={6} style={{ flexWrap: 'wrap' }}>
        <Chip text={p.label} bg={p.tone[0]} ink={p.tone[1]} />
        <Chip text={t.active ? 'ACTIVE' : 'SUSPENDED'} bg={t.active ? '#DCFCE7' : '#FFE4E6'} ink={t.active ? '#166534' : '#BE123C'} dot={t.active ? '#16A34A' : '#E11D48'} />
        <Chip text={p.price ? `${rs(p.price)}/mo` : 'Custom'} bg="#ECFDF5" ink="#047857" mono />
      </Row>
      <Row gap={8}>
        {([['Students', t.students_count], ['Staff', t.teachers_count ?? 0], ['Batches', t.batches_count ?? 0]] as const).map(([l, v]) => (
          <View key={l} style={{ flex: 1, borderRadius: 12, borderWidth: 1, borderColor: '#E3EAF0', paddingVertical: 6, paddingHorizontal: 10 }}>
            <T style={{ fontSize: 9.5, letterSpacing: 0.6, color: colors.muted, fontFamily: fonts.semibold }}>{l.toUpperCase()}</T>
            <T style={{ fontFamily: fonts.semibold, fontSize: 16 }}>{v}</T>
          </View>
        ))}
      </Row>
      <View style={{ gap: 5 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="small">Seats · {t.students_count} of {p.seats ?? '∞'}</T>
          <T v="small" style={{ fontFamily: fonts.semibold }}>{used == null ? 'Unlimited' : `${used}%`}</T>
        </Row>
        <View style={{ height: 5, borderRadius: 3, backgroundColor: '#E7EDF2', overflow: 'hidden' }}>
          <View style={{ width: `${used ?? 5}%`, height: 5, backgroundColor: used != null && used >= 90 ? '#E11D48' : '#14776E' }} />
        </View>
      </View>
      <Row gap={6} style={{ borderTopWidth: 1, borderTopColor: '#EEF2F5', paddingTop: 10 }}>
        <RoundIcon icon="create-outline" label={`Edit ${t.name}`} onPress={() => router.push(`/super/tenants/${t.id}/edit` as any)} />
        <RoundIcon icon="document-text-outline" label={`Details of ${t.name}`} onPress={() => router.push(`/super/tenants/${t.id}` as any)} />
        <RoundIcon icon="people-outline" label={`People of ${t.name}`} onPress={() => router.push(`/super/users?tenant=${t.id}` as any)} />
        <RoundIcon icon={t.active ? 'pause-circle-outline' : 'play-circle-outline'} label={t.active ? `Suspend ${t.name}` : `Activate ${t.name}`} onPress={onToggle} danger={t.active} />
        <View style={{ flex: 1 }} />
        {t.admin ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`Log in as the admin of ${t.name}`} disabled={busy} onPress={onLogIn}
            style={{ height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#14776E', flexDirection: 'row', alignItems: 'center', gap: 5, opacity: busy ? 0.6 : 1 }}>
            <Ionicons name="key-outline" size={14} color="#FFF" /><T style={{ color: '#FFF', fontFamily: fonts.semibold, fontSize: 12.5 }}>{busy ? 'Opening…' : 'Log in as'}</T>
          </Pressable>
        ) : null}
      </Row>
    </View>
  );
}

export function SuperTenantsScreen() {
  const { impersonate } = useAuth();
  const { data, loading, error, setData } = useApi<Tenant[]>('/super/tenants');
  const [q, setQ] = useState('');
  const [planF, setPlanF] = useState('all');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('new');
  const [busy, setBusy] = useState<number | null>(null);
  const list = data ?? [];
  const totals = useMemo(() => {
    const active = list.filter((t) => t.active);
    const mrr = active.reduce((n, t) => n + plan(t.plan).price, 0);
    const seats = list.reduce((n, t) => n + (plan(t.plan).seats ?? 0), 0);
    const students = list.reduce((n, t) => n + t.students_count, 0);
    const by = (p: string) => active.filter((t) => t.plan === p).length;
    return { active: active.length, mrr, seats, students, staff: list.reduce((n, t) => n + (t.teachers_count ?? 0), 0), basic: by('basic'), pro: by('pro'), ent: by('enterprise') };
  }, [list]);
  const rows = list
    .filter((t) => (planF === 'all' || t.plan === planF) && (status === 'all' || (status === 'active') === t.active))
    .filter((t) => `${t.name} ${t.code} ${t.admin?.email ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name) : sort === 'students' ? b.students_count - a.students_count : (b.created_at ?? '').localeCompare(a.created_at ?? '')));
  const toggle = async (t: Tenant) => {
    if (t.active && !(await confirmBox(`Suspend ${t.name}? Its people cannot log in until you switch it on again.`))) return;
    try { await api.put(`/super/tenants/${t.id}`, { active: !t.active }); setData(list.map((x) => (x.id === t.id ? { ...x, active: !t.active } : x))); }
    catch (e) { say(e instanceof ApiError ? e.friendly : 'Could not save.'); }
  };
  const logIn = async (t: Tenant) => {
    if (!t.admin) return;
    setBusy(t.id);
    try { const who = await impersonate(t.admin.id); router.replace(homeFor(who.role) as any); }
    catch (e) { say(e instanceof ApiError ? e.friendly : 'Could not log in as this admin.'); } finally { setBusy(null); }
  };
  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <View><T v="small">Super admin</T><T v="h1">Tenants</T></View>
        <Row gap={8}>
          <Pressable accessibilityLabel="All users" onPress={() => router.push('/super/users' as any)} style={{ height: 42, paddingHorizontal: 14, borderRadius: 21, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E3EAF0', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="people-outline" size={17} color={colors.ink} /><T style={{ fontFamily: fonts.semibold }}>Users</T>
          </Pressable>
          <Pressable accessibilityLabel="Add tenant" onPress={() => router.push('/super/tenants/new' as any)} style={{ height: 42, paddingHorizontal: 16, borderRadius: 21, backgroundColor: '#111A2E', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="add" size={19} color="#FFF" /><T style={{ color: '#FFF', fontFamily: fonts.semibold }}>New tenant</T>
          </Pressable>
        </Row>
      </Row>

      <Row gap={12} style={{ flexWrap: 'wrap' }}>
        <TopCard label="Portfolio" value={String(list.length)} sub={`${totals.active} active · ${list.length - totals.active} suspended`}
          bar={<Bar parts={[[totals.basic, '#94A3B8'], [totals.pro, '#10B981'], [totals.ent, '#6366F1'], [list.length - totals.active, '#F43F5E']]} />} />
        <TopCard teal label="Est. monthly revenue" value={rs(totals.mrr)} sub={`${totals.basic} Basic · ${totals.pro} Pro · ${totals.ent} Enterprise`}
          bar={<Bar parts={[[totals.basic * 2500, 'rgba(255,255,255,0.55)'], [totals.pro * 6000, '#FFF']]} />} />
        <TopCard label="Students / seats" value={totals.seats ? `${Math.round((totals.students / totals.seats) * 100)}%` : '—'} sub={`${totals.students.toLocaleString('en-IN')} / ${totals.seats.toLocaleString('en-IN')} seats`}
          bar={<Bar parts={[[totals.students, '#14776E'], [Math.max(0, totals.seats - totals.students), '#E7EDF2']]} />} />
        <TopCard dark label="Staff on platform" value={String(totals.staff)} sub={`Across ${list.length} institutions`} />
      </Row>

      <View style={{ marginTop: 14, backgroundColor: '#FFF', borderRadius: 18, borderWidth: 1, borderColor: '#E3EAF0', padding: 12, gap: 10 }}>
        <Row gap={10} style={{ flexWrap: 'wrap', alignItems: 'center' }}>
          <Row style={{ flex: 1, minWidth: 240, backgroundColor: '#F4F6F8', borderRadius: 22, paddingHorizontal: 14, height: 44 }}>
            <Ionicons name="search" size={17} color={colors.muted} />
            <TextInput value={q} onChangeText={setQ} placeholder="Search by name, code or admin email…" placeholderTextColor={colors.faint} accessibilityLabel="Search tenants"
              style={{ flex: 1, marginLeft: 8, fontFamily: fonts.regular, fontSize: 14.5, color: colors.ink, outlineStyle: 'none' } as any} />
          </Row>
          <View style={{ width: 170 }}><Select compact value={planF} onChange={setPlanF} options={[{ key: 'all', label: 'All plans' }, { key: 'basic', label: 'Basic' }, { key: 'pro', label: 'Pro' }, { key: 'enterprise', label: 'Enterprise' }]} /></View>
          <View style={{ width: 170 }}><Select compact value={status} onChange={setStatus} options={[{ key: 'all', label: 'All statuses' }, { key: 'active', label: 'Active' }, { key: 'off', label: 'Suspended' }]} /></View>
          <View style={{ width: 170 }}><Select compact value={sort} onChange={setSort} options={[{ key: 'new', label: 'Newest first' }, { key: 'name', label: 'Name A–Z' }, { key: 'students', label: 'Most students' }]} /></View>
          {q || planF !== 'all' || status !== 'all' ? (
            <Pressable onPress={() => { setQ(''); setPlanF('all'); setStatus('all'); }} style={{ height: 40, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#E3EAF0', flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Ionicons name="refresh" size={15} color={colors.muted} /><T v="small">Reset</T>
            </Pressable>
          ) : null}
        </Row>
        <T v="small">{rows.length} of {list.length} institutions</T>
      </View>

      <View style={{ marginTop: 14 }}>
        {loading && !data ? <Loading /> : error ? <Empty text={error} /> : !rows.length ? <Empty text={list.length ? 'No institution matches.' : 'No tenants yet. Tap New tenant to add one.'} /> : (
          <Grid cols={{ phone: 1, tablet: 2, desktop: 3 }} gap={12}>
            {rows.map((t) => <TenantCard key={t.id} t={t} busy={busy === t.id} onToggle={() => toggle(t)} onLogIn={() => logIn(t)} />)}
          </Grid>
        )}
      </View>
    </Screen>
  );
}
