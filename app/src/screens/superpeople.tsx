// Super admin: madrasas (tenants), every user, and "Log in as" any user.
import React, { useState } from 'react';
import { Alert, Platform, Pressable, Switch, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Empty, Header, Loading, Row, Screen, T } from '@/components/ui';
import { Avatar, Band, Chips, ListRow, pastel, Section, SmallButton, Tag } from '@/components/kit';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { homeFor, useAuth } from '@/lib/auth';
import { colors, fonts } from '@/theme/tokens';

export interface TenantRow {
  id: number; name: string; code: string; plan: string; active: boolean;
  students_count: number; teachers_count?: number; created_at?: string;
}
export interface UserRow {
  id: number; name: string; role: 'admin' | 'teacher' | 'parent' | 'student' | 'guest';
  login: string | null; admission_no: string | null;
  tenant_id: number | null; tenant_name: string | null; tenant_code: string | null; blocked: boolean;
}

const ROLE_TONE = { admin: 'lav', teacher: 'mint', parent: 'butter', student: 'sky', guest: 'white' } as const;
const ROLE_LABEL = { admin: 'Admin', teacher: 'Teacher', parent: 'Parent', student: 'Student', guest: 'Guest' } as const;
const TINTS = [pastel.lav, pastel.sky, pastel.mint, pastel.pink];

function say(msg: string) {
  if (Platform.OS === 'web') window.alert(msg); else Alert.alert('Noon Learn', msg);
}

/** Button that signs the super admin in as this user and opens their home screen. */
function useLogInAs() {
  const { impersonate } = useAuth();
  const [busyId, setBusyId] = useState<number | null>(null);
  const go = async (u: { id: number; name: string }) => {
    setBusyId(u.id);
    try {
      const who = await impersonate(u.id);
      router.replace(homeFor(who.role) as any);
    } catch (e) {
      say(e instanceof ApiError ? e.friendly : 'Could not log in as this user.');
    } finally { setBusyId(null); }
  };
  return { go, busyId };
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <Row style={{ backgroundColor: '#FFF', borderRadius: 24, borderWidth: 1.5, borderColor: colors.line, paddingHorizontal: 14, height: 48 }}>
      <Ionicons name="search" size={18} color={colors.muted} />
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.faint} accessibilityLabel={placeholder}
        style={{ flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink, outlineStyle: 'none' } as any} />
    </Row>
  );
}

function UserList({ rows, showTenant }: { rows: UserRow[]; showTenant: boolean }) {
  const { go, busyId } = useLogInAs();
  if (!rows.length) return <Empty text="No users found." />;
  return (
    <View style={{ gap: 8 }}>
      {rows.map((u, i) => (
        <ListRow key={u.id} left={<Avatar name={u.name} size={44} tint={TINTS[i % 4]} />}
          title={u.name}
          sub={[ROLE_LABEL[u.role], u.login, showTenant ? u.tenant_name : null, u.blocked ? 'Blocked' : null].filter(Boolean).join(' · ')}
          right={<SmallButton title={busyId === u.id ? 'Opening…' : 'Log in as'} filled tint={colors.violet} disabled={busyId !== null || u.blocked} onPress={() => go(u)} />} />
      ))}
    </View>
  );
}

/* ---------- All users ---------- */
type RoleFilter = 'all' | UserRow['role'];

export function SuperUsersScreen() {
  const { tenant } = useLocalSearchParams<{ tenant?: string }>();
  const [q, setQ] = useState('');
  const [role, setRole] = useState<RoleFilter>('all');
  const qs = new URLSearchParams();
  if (q.trim()) qs.set('q', q.trim());
  if (role !== 'all') qs.set('role', role);
  if (tenant) qs.set('tenant_id', String(tenant));
  const { data, loading, error } = useApi<UserRow[]>(`/super/users${qs.toString() ? `?${qs}` : ''}`);
  const tenantName = tenant && data?.[0]?.tenant_name;
  return (
    <Screen>
      <Header title={tenantName ? `People · ${tenantName}` : 'Users'} subtitle="Log in as anyone to see the app the way they see it. Every login is recorded." />
      <SearchBox value={q} onChange={setQ} placeholder="Search name, email, admission no. or phone" />
      <Chips value={role} onChange={setRole} options={[
        { key: 'all', label: 'All' }, { key: 'admin', label: 'Admins' }, { key: 'teacher', label: 'Teachers' },
        { key: 'parent', label: 'Parents' }, { key: 'student', label: 'Students' }, { key: 'guest', label: 'Guests' },
      ]} />
      {loading && !data ? <Loading /> : error ? <Empty text={error} /> : <UserList rows={data ?? []} showTenant={!tenant} />}
    </Screen>
  );
}

/* ---------- Madrasas ---------- */
export function SuperTenantsScreen() {
  const [q, setQ] = useState('');
  const [f, setF] = useState<'all' | 'active' | 'off'>('all');
  const { data, loading, error } = useApi<TenantRow[]>('/super/tenants');
  const rows = (data ?? []).filter((t) => (f === 'all' || (f === 'active') === t.active) && `${t.name} ${t.code}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <T v="h1">Madrasas <T v="small">{data?.length ?? ''}</T></T>
        <Pressable accessibilityLabel="All users" onPress={() => router.push('/super/users' as any)} style={{ height: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: colors.ink, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="people-outline" size={18} color="#FFF" /><T style={{ color: '#FFF', fontFamily: fonts.semibold }}>All users</T>
        </Pressable>
      </Row>
      <SearchBox value={q} onChange={setQ} placeholder="Search madrasa or code" />
      <Chips value={f} onChange={setF} options={[{ key: 'all', label: 'All' }, { key: 'active', label: 'Active' }, { key: 'off', label: 'Suspended' }]} />
      {loading && !data ? <Loading /> : error ? <Empty text={error} /> : rows.length === 0 ? <Empty text="No madrasas yet." /> : (
        <View style={{ gap: 8 }}>
          {rows.map((t, i) => (
            <ListRow key={t.id} onPress={() => router.push(`/super/tenants/${t.id}` as any)} left={<Avatar name={t.name} size={44} tint={TINTS[i % 4]} />}
              title={t.name} sub={`Code ${t.code} · ${t.students_count} students · ${t.teachers_count ?? 0} teachers · ${t.plan}`}
              right={<Tag text={t.active ? 'Active' : 'Suspended'} tone={t.active ? 'mint' : 'pink'} />} />
          ))}
        </View>
      )}
    </Screen>
  );
}

/* ---------- One madrasa: details, suspend, people with "Log in as" ---------- */
export function SuperTenantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: tenants, setData, loading } = useApi<TenantRow[]>('/super/tenants');
  const { data: people } = useApi<UserRow[]>(`/super/users?tenant_id=${id}`);
  const { go, busyId } = useLogInAs();
  const t = tenants?.find((x) => String(x.id) === String(id));
  if (loading && !tenants) return <Loading />;
  if (!t) return <Screen><Header title="Madrasa" /><Empty text="Madrasa not found." /></Screen>;
  const admin = people?.find((p) => p.role === 'admin');
  const count = (r: UserRow['role']) => people?.filter((p) => p.role === r).length ?? 0;
  const setActive = async (active: boolean) => {
    try {
      const saved = await api.put<TenantRow>(`/super/tenants/${t.id}`, { active });
      setData((tenants ?? []).map((x) => (x.id === t.id ? { ...x, ...saved, active } : x)));
    } catch (e) { say(e instanceof ApiError ? e.friendly : 'Could not save.'); }
  };
  return (
    <Screen>
      <Band tint={colors.butter[0]} height={200} />
      <Header title="" right={admin ? <SmallButton title={busyId === admin.id ? 'Opening…' : '↗ Open as admin'} filled tint={colors.violet} disabled={busyId !== null} onPress={() => go(admin)} /> : undefined} />
      <T v="h1">{t.name}</T>
      <Tag text={`Code ${t.code} · ${t.plan} plan`} tone="white" />
      <Card style={{ marginTop: 14, gap: 4 }}>
        <Row style={{ justifyContent: 'space-around' }}>
          {([['Admins', count('admin')], ['Teachers', count('teacher')], ['Parents', count('parent')], ['Students', count('student')]] as const).map(([k, v]) => (
            <View key={k} style={{ alignItems: 'center', padding: 8 }}><T style={{ fontSize: 22, fontFamily: fonts.semibold }}>{v}</T><T v="small">{k}</T></View>
          ))}
        </Row>
        <Row style={{ minHeight: 56, borderTopWidth: 1, borderTopColor: colors.line }}>
          <View style={{ flex: 1 }}><T style={{ fontFamily: fonts.medium }}>Active</T><T v="small">Suspended madrasas cannot sign in</T></View>
          <Switch accessibilityLabel="Madrasa active" value={t.active} onValueChange={setActive} />
        </Row>
      </Card>
      <Section title="People" action="See all" onAction={() => router.push(`/super/users?tenant=${t.id}` as any)} />
      {people ? <UserList rows={people.slice(0, 12)} showTenant={false} /> : <Loading />}
    </Screen>
  );
}
