// Passwords: change my own, and staff setting a new one for someone who forgot it.
import React, { useState } from 'react';
import { Modal, Pressable, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Empty, Header, Loading, Row, Screen, T } from '@/components/ui';
import { Avatar, Chips, ListRow, pastel, SmallButton } from '@/components/kit';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { colors, fonts } from '@/theme/tokens';

function PasswordInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <T v="small" style={{ fontFamily: fonts.medium }}>{label}</T>
      <Row style={{ height: 50, borderRadius: 16, borderWidth: 1.5, borderColor: colors.line, backgroundColor: '#FFF', paddingHorizontal: 14 }}>
        <Ionicons name="lock-closed-outline" size={18} color={colors.muted} />
        <TextInput value={value} onChangeText={onChange} secureTextEntry={!show} accessibilityLabel={label} placeholder={placeholder} placeholderTextColor={colors.faint}
          autoCapitalize="none" style={{ flex: 1, height: '100%', fontFamily: fonts.regular, fontSize: 15, color: colors.ink, outlineStyle: 'none' } as any} />
        <Pressable accessibilityRole="button" accessibilityLabel={show ? 'Hide password' : 'Show password'} onPress={() => setShow(!show)} hitSlop={10}>
          <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
        </Pressable>
      </Row>
    </View>
  );
}

/** A readable random password, e.g. "Noon-7k3QpX9a". */
function suggest(): string {
  const a = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 8; i++) s += a[Math.floor(Math.random() * a.length)];
  return `Noon-${s}`;
}

/* ---------- Change my own password (every role) ---------- */
export function ChangePasswordScreen() {
  const [cur, setCur] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const save = async () => {
    if (pw.length < 8) return setMsg({ text: 'The new password needs at least 8 characters.', ok: false });
    if (pw !== pw2) return setMsg({ text: 'The two new passwords do not match.', ok: false });
    setBusy(true); setMsg(null);
    try {
      await api.put('/me/password', { current_password: cur, password: pw });
      setCur(''); setPw(''); setPw2('');
      setMsg({ text: 'Password changed. You stay signed in here; other devices are signed out.', ok: true });
    } catch (e) { setMsg({ text: e instanceof ApiError ? e.friendly : 'Could not change the password.', ok: false }); } finally { setBusy(false); }
  };
  return (
    <Screen>
      <Header title="Change password" subtitle="Use at least 8 characters." />
      <Card style={{ gap: 14 }}>
        <PasswordInput label="Current password" value={cur} onChange={setCur} />
        <PasswordInput label="New password" value={pw} onChange={setPw} placeholder="At least 8 characters" />
        <PasswordInput label="Repeat new password" value={pw2} onChange={setPw2} />
        {msg ? <T style={{ color: msg.ok ? '#14945A' : colors.red }}>{msg.text}</T> : null}
        <Button title="Save new password" icon="checkmark-circle-outline" onPress={save} loading={busy} disabled={!cur || !pw || !pw2} />
        <Pressable accessibilityRole="link" onPress={() => router.push('/forgot' as any)} style={{ alignSelf: 'center', padding: 4 }}>
          <T style={{ color: colors.violet, fontFamily: fonts.semibold }}>Forgot your current password?</T>
        </Pressable>
      </Card>
    </Screen>
  );
}

/* ---------- Staff: set a new password for someone ---------- */
export function SetPasswordModal({ person, scope, onClose }: { person: { id: number; name: string; login?: string | null } | null; scope: 'admin' | 'super'; onClose: () => void }) {
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const close = () => { setPw(''); setMsg(null); onClose(); };
  const save = async () => {
    if (!person) return;
    if (pw.length < 8) return setMsg({ text: 'Use at least 8 characters.', ok: false });
    setBusy(true); setMsg(null);
    try {
      await api.put(`/${scope}/users/${person.id}/password`, { password: pw });
      setMsg({ text: `Saved. Give ${person.name} the new password: ${pw}`, ok: true });
    } catch (e) { setMsg({ text: e instanceof ApiError ? e.friendly : 'Could not save.', ok: false }); } finally { setBusy(false); }
  };
  return (
    <Modal visible={!!person} transparent animationType="fade" onRequestClose={close}>
      <Pressable accessibilityLabel="Close" onPress={close} style={{ flex: 1, backgroundColor: 'rgba(11,42,53,0.45)', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 420, backgroundColor: '#FFF', borderRadius: 24, padding: 20, gap: 14 }}>
          <T v="h2">Set a new password</T>
          <T v="small">{person?.name}{person?.login ? ` · ${person.login}` : ''}. They will be signed out on all devices.</T>
          <PasswordInput label="New password" value={pw} onChange={setPw} placeholder="At least 8 characters" />
          <Pressable accessibilityRole="button" onPress={() => setPw(suggest())} style={{ alignSelf: 'flex-start' }}>
            <T style={{ color: colors.violet, fontFamily: fonts.semibold }}>✨ Suggest a password</T>
          </Pressable>
          {msg ? <T style={{ color: msg.ok ? '#14945A' : colors.red }} selectable>{msg.text}</T> : null}
          <Row gap={10}>
            <View style={{ flex: 1 }}><Button title={msg?.ok ? 'Done' : 'Cancel'} kind="ghost" onPress={close} /></View>
            {msg?.ok ? null : <View style={{ flex: 1 }}><Button title="Save" onPress={save} loading={busy} disabled={!pw} /></View>}
          </Row>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ---------- Admin: everyone in my madrasa, with "Set password" ---------- */
interface PersonRow { id: number; name: string; role: 'admin' | 'teacher' | 'parent' | 'student'; login: string | null; blocked: boolean }
const ROLE_LABEL = { admin: 'Admin', teacher: 'Teacher', parent: 'Parent', student: 'Student' } as const;

export function AdminPeopleScreen() {
  const [q, setQ] = useState('');
  const [role, setRole] = useState<'all' | PersonRow['role']>('all');
  const [pick, setPick] = useState<PersonRow | null>(null);
  const qs = new URLSearchParams();
  if (q.trim()) qs.set('q', q.trim());
  if (role !== 'all') qs.set('role', role);
  const { data, loading, error } = useApi<PersonRow[]>(`/admin/people${qs.toString() ? `?${qs}` : ''}`);
  const tints = [pastel.lav, pastel.sky, pastel.mint, pastel.pink];
  return (
    <Screen>
      <Header title="People" subtitle="Everyone in your madrasa. Set a new password for anyone who forgot theirs." />
      <Row style={{ backgroundColor: '#FFF', borderRadius: 24, borderWidth: 1.5, borderColor: colors.line, paddingHorizontal: 14, height: 48 }}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput value={q} onChangeText={setQ} placeholder="Search name, email, admission no. or phone" placeholderTextColor={colors.faint} accessibilityLabel="Search people"
          style={{ flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink, outlineStyle: 'none' } as any} />
      </Row>
      <Chips value={role} onChange={setRole} options={[{ key: 'all', label: 'All' }, { key: 'teacher', label: 'Teachers' }, { key: 'student', label: 'Students' }, { key: 'parent', label: 'Parents' }, { key: 'admin', label: 'Admins' }]} />
      {loading && !data ? <Loading /> : error ? <Empty text={error} /> : !data?.length ? <Empty text="No one found." /> : (
        <View style={{ gap: 8 }}>
          {data.map((p, i) => (
            <ListRow key={p.id} left={<Avatar name={p.name} size={44} tint={tints[i % 4]} />} title={p.name}
              sub={[ROLE_LABEL[p.role], p.login, p.blocked ? 'Blocked' : null].filter(Boolean).join(' · ')}
              right={<SmallButton title="🔑 Password" onPress={() => setPick(p)} />} />
          ))}
        </View>
      )}
      <SetPasswordModal person={pick} scope="admin" onClose={() => setPick(null)} />
    </Screen>
  );
}
