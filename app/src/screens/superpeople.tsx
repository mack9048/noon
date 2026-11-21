// Super admin: tenants (institutions), every user, and "Log in as" any user.
import React, { useState } from 'react';
import { Alert, Image, Platform, Pressable, Switch, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Select } from '@/components/kit2';
import { COUNTRIES, money } from '@/lib/money';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Empty, Header, Loading, Row, Screen, Segmented, T } from '@/components/ui';
import { Avatar, Band, Chips, ListRow, pastel, Section, SmallButton, Tag } from '@/components/kit';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { homeFor, useAuth } from '@/lib/auth';
import { colors, fonts } from '@/theme/tokens';
import { SetPasswordModal } from '@/screens/passwords';

export interface TenantRow {
  id: number; name: string; code: string; plan: string; active: boolean; leave_quota?: number;
  students_count: number; teachers_count?: number; created_at?: string;
  logo_url?: string | null; country?: string; currency?: string;
}
export interface UserRow {
  id: number; name: string; role: 'admin' | 'teacher' | 'parent' | 'student' | 'guest';
  login: string | null; admission_no: string | null;
  tenant_id: number | null; tenant_name: string | null; tenant_code: string | null; blocked: boolean;
  parent?: { name: string; phone: string | null } | null;
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
  const [pick, setPick] = useState<UserRow | null>(null);
  if (!rows.length) return <Empty text="No users found." />;
  return (
    <View style={{ gap: 8 }}>
      <SetPasswordModal person={pick} scope="super" onClose={() => setPick(null)} />
      {rows.map((u, i) => (
        <ListRow key={u.id} left={<Avatar name={u.name} size={44} tint={TINTS[i % 4]} />}
          title={u.name}
          sub={[ROLE_LABEL[u.role], u.login, u.parent ? `Parent: ${u.parent.name}${u.parent.phone ? ` · ${u.parent.phone}` : ''}` : null, showTenant ? u.tenant_name : null, u.blocked ? 'Blocked' : null].filter(Boolean).join(' · ')}
          right={<Row gap={6}>
            <SmallButton title="🔑" onPress={() => setPick(u)} />
            <SmallButton title={busyId === u.id ? 'Opening…' : 'Log in as'} filled tint={colors.violet} disabled={busyId !== null || u.blocked} onPress={() => go(u)} />
          </Row>} />
      ))}
    </View>
  );
}

/* ---------- All users: admins, teachers, then students (guests first: a guest is a student on the free app) ---------- */
type Group = 'admins' | 'teachers' | 'students';

export function SuperUsersScreen() {
  const { tenant } = useLocalSearchParams<{ tenant?: string }>();
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<Group>('admins');
  const [allGuests, setAllGuests] = useState(false);
  const url = (role: string) => {
    const qs = new URLSearchParams({ role });
    if (q.trim()) qs.set('q', q.trim());
    if (tenant) qs.set('tenant_id', String(tenant));
    return `/super/users?${qs}`;
  };
  const main = useApi<UserRow[]>(url(group === 'admins' ? 'admin' : group === 'teachers' ? 'teacher' : 'student'));
  // Guests belong to no institution, so they are not shown inside one institution's people.
  const guests = useApi<UserRow[]>(group === 'students' && !tenant ? url('guest') : null);
  const tenantName = tenant && main.data?.[0]?.tenant_name;
  const list = (rows: UserRow[] | undefined, empty: string) => (!rows?.length ? <Empty text={empty} /> : <UserList rows={rows} showTenant={!tenant} />);
  return (
    <Screen>
      <Header title={tenantName ? `People · ${tenantName}` : 'Users'} subtitle="Log in as anyone to see the app the way they see it. Every login is recorded." />
      <Segmented value={group} onChange={setGroup} activeColor={colors.violet} options={[
        { key: 'admins', label: 'Admins' }, { key: 'teachers', label: 'Teachers' }, { key: 'students', label: 'Students' },
      ]} />
      <View style={{ height: 10 }} />
      <SearchBox value={q} onChange={setQ} placeholder={group === 'students' ? 'Search name, admission no. or parent phone' : 'Search name, email or phone'} />
      {group !== 'students' ? (
        <>
          <T v="small" style={{ marginBottom: 8 }}>{group === 'admins' ? 'Institution admins' : 'Teachers of every institution'}</T>
          {main.loading && !main.data ? <Loading /> : main.error ? <Empty text={main.error} /> : list(main.data, 'No one found.')}
        </>
      ) : (
        <>
          {!tenant ? (
            <>
              <T v="h3" style={{ marginTop: 4 }}>Guests <T v="small">· students on the free app</T></T>
              <View style={{ height: 8 }} />
              {guests.loading && !guests.data ? <Loading /> : guests.error ? <Empty text={guests.error} />
                // One guest is enough to see the free app as a guest; the rest only on request or when searching.
                : list(allGuests || q.trim() ? guests.data : guests.data?.slice(0, 1), 'No guests found.')}
              {!q.trim() && (guests.data?.length ?? 0) > 1 ? (
                <Pressable accessibilityRole="button" onPress={() => setAllGuests(!allGuests)} style={{ paddingVertical: 8 }}>
                  <T style={{ color: colors.violet, fontFamily: fonts.semibold }}>{allGuests ? 'Show one guest' : `Show all ${guests.data!.length} guest accounts`}</T>
                </Pressable>
              ) : null}
              <View style={{ height: 16 }} />
            </>
          ) : null}
          <T v="h3">Institution students</T>
          <T v="small" style={{ marginBottom: 8 }}>Parents use their child's login, so they are shown with the student.</T>
          {main.loading && !main.data ? <Loading /> : main.error ? <Empty text={main.error} /> : list(main.data, 'No students found.')}
        </>
      )}
    </Screen>
  );
}

/* ---------- Tenants ---------- */
export function SuperTenantsScreen() {
  const [q, setQ] = useState('');
  const [f, setF] = useState<'all' | 'active' | 'off'>('all');
  const { data, loading, error } = useApi<TenantRow[]>('/super/tenants');
  const rows = (data ?? []).filter((t) => (f === 'all' || (f === 'active') === t.active) && `${t.name} ${t.code}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <T v="h1">Tenants <T v="small">{data?.length ?? ''}</T></T>
        <Row gap={8}>
          <Pressable accessibilityLabel="All users" onPress={() => router.push('/super/users' as any)} style={{ height: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: '#FFF', borderWidth: 1.5, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="people-outline" size={18} color={colors.ink} /><T style={{ fontFamily: fonts.semibold }}>Users</T>
          </Pressable>
          <Pressable accessibilityLabel="Add tenant" onPress={() => router.push('/super/tenants/new' as any)} style={{ height: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: colors.ink, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="add" size={20} color="#FFF" /><T style={{ color: '#FFF', fontFamily: fonts.semibold }}>New tenant</T>
          </Pressable>
        </Row>
      </Row>
      <SearchBox value={q} onChange={setQ} placeholder="Search tenant or code" />
      <Chips value={f} onChange={setF} options={[{ key: 'all', label: 'All' }, { key: 'active', label: 'Active' }, { key: 'off', label: 'Suspended' }]} />
      {loading && !data ? <Loading /> : error ? <Empty text={error} /> : rows.length === 0 ? <Empty text="No tenants yet. Tap New tenant to add one." /> : (
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

/* ---------- One tenant: details, suspend, edit, people with "Log in as" ---------- */
export function SuperTenantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: tenants, setData, loading } = useApi<TenantRow[]>('/super/tenants');
  const { data: people } = useApi<UserRow[]>(`/super/users?tenant_id=${id}`);
  const { go, busyId } = useLogInAs();
  const t = tenants?.find((x) => String(x.id) === String(id));
  if (loading && !tenants) return <Loading />;
  if (!t) return <Screen><Header title="Tenant" /><Empty text="Tenant not found." /></Screen>;
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
      <Header title="" right={<Row gap={8}>
        <SmallButton title="✎ Edit" onPress={() => router.push(`/super/tenants/${t.id}/edit` as any)} />
        {admin ? <SmallButton title={busyId === admin.id ? 'Opening…' : '↗ Open as admin'} filled tint={colors.violet} disabled={busyId !== null} onPress={() => go(admin)} /> : null}
      </Row>} />
      <T v="h1">{t.name}</T>
      <Tag text={`Code ${t.code} · ${t.plan} plan`} tone="white" />
      <Card style={{ marginTop: 14, gap: 4 }}>
        <Row style={{ justifyContent: 'space-around' }}>
          {([['Admins', count('admin')], ['Teachers', count('teacher')], ['Students', count('student')]] as const).map(([k, v]) => (
            <View key={k} style={{ alignItems: 'center', padding: 8 }}><T style={{ fontSize: 22, fontFamily: fonts.semibold }}>{v}</T><T v="small">{k}</T></View>
          ))}
        </Row>
        <Row style={{ minHeight: 56, borderTopWidth: 1, borderTopColor: colors.line }}>
          <View style={{ flex: 1 }}><T style={{ fontFamily: fonts.medium }}>Active</T><T v="small">People of a suspended tenant cannot sign in</T></View>
          <Switch accessibilityLabel="Tenant active" value={t.active} onValueChange={setActive} />
        </Row>
      </Card>
      <Section title="Staff" action="See all" onAction={() => router.push(`/super/users?tenant=${t.id}` as any)} />
      {people ? <UserList rows={people.filter((p) => p.role === 'admin' || p.role === 'teacher')} showTenant={false} /> : <Loading />}
      <Section title="Students" action="See all" onAction={() => router.push(`/super/users?tenant=${t.id}` as any)} />
      {people ? <UserList rows={people.filter((p) => p.role === 'student').slice(0, 12)} showTenant={false} /> : <Loading />}
    </Screen>
  );
}

/* ---------- Create / edit / delete a tenant ---------- */
type Plan = 'basic' | 'pro' | 'enterprise';
const PLANS: { key: Plan; label: string }[] = [{ key: 'basic', label: 'Basic' }, { key: 'pro', label: 'Pro' }, { key: 'enterprise', label: 'Enterprise' }];

function confirmBox(msg: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(msg));
  return new Promise((ok) => Alert.alert('Noon Learn', msg, [{ text: 'Cancel', style: 'cancel', onPress: () => ok(false) }, { text: 'Yes', style: 'destructive', onPress: () => ok(true) }]));
}

export function SuperTenantFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;
  const { data: tenants } = useApi<TenantRow[]>(editing ? '/super/tenants' : null);
  const t = tenants?.find((x) => String(x.id) === String(id));
  const [f, setF] = useState({ name: '', plan: 'basic' as Plan, leave_quota: '15', admin_name: '', admin_email: '', admin_password: '', country: 'IN' });
  const [logo, setLogo] = useState<string | null | undefined>(undefined);
  const [logoBusy, setLogoBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  if (editing && t && !loaded) {
    setF({ ...f, name: t.name, plan: (t.plan as Plan) ?? 'basic', leave_quota: String(t.leave_quota ?? 15), country: t.country ?? 'IN' });
    setLogo(t.logo_url ?? null);
    setLoaded(true);
  }
  if (editing && !t) return tenants ? <Screen><Header title="Edit tenant" /><Empty text="Tenant not found." /></Screen> : <Loading />;
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });

  const save = async () => {
    setErr(null);
    if (!f.name.trim()) return setErr('Enter the tenant name.');
    if (!editing && (!f.admin_name.trim() || !f.admin_email.trim() || f.admin_password.length < 8)) return setErr('Enter the admin name, email and a password of at least 8 characters.');
    if (editing && f.admin_password && f.admin_password.length < 8) return setErr('The new admin password needs at least 8 characters.');
    setBusy(true);
    try {
      if (editing) {
        await api.put(`/super/tenants/${id}`, { name: f.name.trim(), plan: f.plan, leave_quota: Number(f.leave_quota) || 0, ...(f.country !== t?.country ? { country: f.country } : {}), ...(f.admin_password ? { admin_password: f.admin_password } : {}) });
        say(f.admin_password ? 'Saved. The admin password was changed.' : 'Saved.');
        router.replace(`/super/tenants/${id}` as any);
      } else {
        const made = await api.post<TenantRow>('/super/tenants', { name: f.name.trim(), plan: f.plan, admin_name: f.admin_name.trim(), admin_email: f.admin_email.trim(), admin_password: f.admin_password });
        if (f.country !== 'IN') await api.put(`/super/tenants/${made.id}`, { country: f.country });
        say(`${made.name} created. Tenant code: ${made.code}\nAdmin login: ${f.admin_email.trim()}`);
        router.replace(`/super/tenants/${made.id}` as any);
      }
    } catch (e) { setErr(e instanceof ApiError ? e.friendly : 'Could not save.'); } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!t) return;
    if (!(await confirmBox(`Delete ${t.name} permanently?\n\nAll its admins, teachers, parents, students, batches, marks and chats are deleted. This cannot be undone.`))) return;
    setBusy(true);
    try { await api.del(`/super/tenants/${t.id}?permanent=1`); router.replace('/super/tenants' as any); }
    catch (e) { setErr(e instanceof ApiError ? e.friendly : 'Could not delete.'); setBusy(false); }
  };

  const uploadLogo = async (remove = false) => {
    let file: DocumentPicker.DocumentPickerAsset | null = null;
    if (!remove) {
      const r = await DocumentPicker.getDocumentAsync({ type: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'], copyToCacheDirectory: true });
      file = r.canceled ? null : r.assets[0];
      if (!file) return;
      if (file.size && file.size > 2 * 1024 * 1024) return setErr('The logo is over 2 MB. Please choose a smaller picture.');
    }
    setLogoBusy(true); setErr(null);
    try {
      const fd = new FormData();
      if (file) { if (Platform.OS === 'web' && (file as any).file) fd.append('logo', (file as any).file); else fd.append('logo', { uri: file.uri, name: file.name, type: file.mimeType ?? 'image/png' } as any); }
      else fd.append('remove', '1');
      const r = await api.post<{ logo_url: string | null }>(`/super/tenants/${id}/logo`, fd);
      setLogo(r.logo_url);
    } catch (e) { setErr(e instanceof ApiError ? e.friendly : 'Could not upload the logo.'); } finally { setLogoBusy(false); }
  };
  const country = COUNTRIES.find((c) => c.code === f.country) ?? COUNTRIES[0];

  const field = (label: string, k: keyof typeof f, props: Partial<React.ComponentProps<typeof TextInput>> = {}) => {
    const secret = !!props.secureTextEntry;
    return (
      <View style={{ gap: 6 }}>
        <T v="small" style={{ fontFamily: fonts.medium }}>{label}</T>
        <View>
          <TextInput value={f[k]} onChangeText={set(k)} accessibilityLabel={label} placeholderTextColor={colors.faint} {...props} secureTextEntry={secret && !showPw}
            style={{ height: 48, borderRadius: 16, borderWidth: 1.5, borderColor: colors.line, backgroundColor: '#FFF', paddingHorizontal: 14, paddingRight: secret ? 50 : 14, fontFamily: fonts.regular, fontSize: 15, color: colors.ink, outlineStyle: 'none' } as any} />
          {secret ? (
            <Pressable accessibilityRole="button" accessibilityLabel={showPw ? 'Hide password' : 'Show password'} onPress={() => setShowPw(!showPw)}
              style={{ position: 'absolute', right: 4, top: 0, bottom: 0, width: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <Screen>
      <Header title={editing ? 'Edit tenant' : 'New tenant'} subtitle={editing ? `Code ${t?.code}` : 'Creates the institution and its first admin login'} />
      <Card style={{ gap: 14 }}>
        {field('Tenant name', 'name', { placeholder: 'e.g. Al Noor Institution' })}
        <View style={{ gap: 6 }}>
          <T v="small" style={{ fontFamily: fonts.medium }}>Plan</T>
          <Chips value={f.plan} onChange={(p) => setF({ ...f, plan: p })} options={PLANS} />
        </View>
        {editing ? field('Leave days per year (students)', 'leave_quota', { keyboardType: 'number-pad' }) : null}
        <Select label="Country" value={f.country} options={COUNTRIES.map((c) => ({ key: c.code, label: c.name }))} onChange={(v) => setF({ ...f, country: v })} />
        <T v="small">Fees in {country.currency} ({money(1500, country.currency)}), phone code {country.dial_code}, time zone {country.timezone.replace('_', ' ')}. The institution can fine-tune these in its settings.</T>
        {editing ? (
          <Row gap={12} style={{ alignItems: 'center' }}>
            <View style={{ width: 64, height: 64, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line }}>
              {logo ? <Image source={{ uri: logo }} style={{ width: 64, height: 64, backgroundColor: '#FFF' }} resizeMode="contain" accessibilityLabel="Institution logo" />
                : <T style={{ color: '#FFF', fontFamily: fonts.semibold, fontSize: 20 }}>{f.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}</T>}
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <T style={{ fontFamily: fonts.semibold }}>Logo</T>
              <Row gap={8}>
                <Button title={logo ? 'Change' : 'Upload'} icon="cloud-upload-outline" kind="ghost" loading={logoBusy} style={{ height: 38 }} onPress={() => uploadLogo()} />
                {logo ? <Button title="Remove" kind="ghost" style={{ height: 38 }} onPress={() => uploadLogo(true)} /> : null}
              </Row>
            </View>
          </Row>
        ) : <T v="small">You can upload the logo after creating the tenant.</T>}
      </Card>
      <Section title={editing ? 'Admin login' : 'First admin'} />
      <Card style={{ gap: 14 }}>
        {!editing ? field('Admin name', 'admin_name', { placeholder: 'e.g. Office Admin' }) : null}
        {!editing ? field('Admin email (login)', 'admin_email', { placeholder: 'admin@example.com', keyboardType: 'email-address', autoCapitalize: 'none' }) : null}
        {field(editing ? 'New admin password (leave empty to keep)' : 'Admin password', 'admin_password', { secureTextEntry: true, placeholder: 'At least 8 characters', autoCapitalize: 'none' })}
      </Card>
      {err ? <T style={{ color: '#C0392B', marginTop: 12 }}>{err}</T> : null}
      <View style={{ marginTop: 16, gap: 10 }}>
        <Button title={busy ? 'Saving…' : editing ? 'Save changes' : 'Create tenant'} onPress={save} disabled={busy} />
        {editing ? <Button title="Delete tenant permanently" kind="danger" onPress={remove} disabled={busy} /> : null}
      </View>
    </Screen>
  );
}
