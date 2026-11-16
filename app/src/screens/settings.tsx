// Institution admin settings: real institution details (saved to the server) and working shortcuts.
import React, { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Loading, Row, Screen, T } from '@/components/ui';
import { Input, SettingRow, SettingsGroup } from '@/components/kit2';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/lib/auth';
import { colors, fonts } from '@/theme/tokens';

export type Institution = {
  id: number; name: string; code: string; plan: string; active: boolean; phone: string | null; address: string | null;
  academic_year: string | null; default_fee: number | null; counts: { students: number; teachers: number; admins: number };
};
const PLAN: Record<string, string> = { basic: 'Basic', pro: 'Pro', enterprise: 'Enterprise' };

export function AdminSettingsScreen() {
  const { user, logout, refresh } = useAuth();
  const { data: inst, setData } = useApi<Institution>('/admin/institution');
  const [f, setF] = useState<{ name: string; phone: string; address: string; academic_year: string; default_fee: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  if (inst && !f) setF({ name: inst.name, phone: inst.phone ?? '', address: inst.address ?? '', academic_year: inst.academic_year ?? '', default_fee: inst.default_fee != null ? String(inst.default_fee) : '' });
  if (!inst || !f) return <Loading />;
  const set = (k: keyof typeof f) => (v: string) => { setF({ ...f, [k]: v }); setMsg(null); };
  const save = async () => {
    if (f.name.trim().length < 2) return setMsg({ ok: false, text: 'Enter the institution name.' });
    setBusy(true); setMsg(null);
    try {
      const r = await api.put<Institution>('/admin/institution', { name: f.name.trim(), phone: f.phone.trim() || null, address: f.address.trim() || null,
        academic_year: f.academic_year.trim() || null, default_fee: f.default_fee ? Number(f.default_fee) : null });
      setData(r); setMsg({ ok: true, text: 'Saved.' }); refresh();
    } catch (e) { setMsg({ ok: false, text: e instanceof ApiError ? e.friendly : 'Could not save.' }); } finally { setBusy(false); }
  };
  const copyCode = () => {
    try { (globalThis as any).navigator?.clipboard?.writeText(inst.code); } catch { /* ignore */ }
    if (Platform.OS === 'web') (globalThis as any).alert?.(`Institution code ${inst.code} copied.`);
  };
  const go = (href: string) => () => router.push(href as any);
  return (
    <Screen>
      <T v="h1">Settings</T>
      <T v="small">{user?.name} · Institution admin</T>

      <SettingsGroup title="Institution">
        <View style={{ padding: 14, gap: 12 }}>
          <Input label="Institution name" value={f.name} onChangeText={set('name')} />
          <Row gap={10}>
            <Input label="Office phone / WhatsApp" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" placeholder="+91 …" />
            <Input label="Academic year" value={f.academic_year} onChangeText={set('academic_year')} placeholder="2026–27" />
          </Row>
          <Input label="Address" value={f.address} onChangeText={set('address')} placeholder="Shown on fee receipts" />
          <Input label="Default monthly fee (₹)" value={f.default_fee} onChangeText={(v) => set('default_fee')(v.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" placeholder="Fills in Add fees" />
          {msg ? <T style={{ color: msg.ok ? colors.green : colors.red }}>{msg.text}</T> : null}
          <Button title="Save" icon="checkmark-circle-outline" onPress={save} loading={busy} />
        </View>
      </SettingsGroup>

      <SettingsGroup title="About this institution">
        <SettingRow icon="key-outline" tint={colors.lav} label="Institution code" sub="Students and staff use it to join" value={inst.code} onPress={copyCode} />
        <SettingRow icon="ribbon-outline" tint={colors.butter} label="Plan" value={PLAN[inst.plan] ?? inst.plan} onPress={() => {}} />
        <SettingRow icon="people-outline" tint={colors.sky} label="Students" value={String(inst.counts.students)} onPress={go('/admin/students')} />
        <SettingRow icon="school-outline" tint={colors.mint} label="Teachers" value={String(inst.counts.teachers)} onPress={go('/admin/teachers')} />
        <SettingRow icon="shield-outline" tint={colors.lav} label="Admins" value={String(inst.counts.admins)} onPress={go('/admin/people')} />
      </SettingsGroup>

      <SettingsGroup title="Manage">
        <SettingRow icon="key-outline" tint={colors.pink} label="People & passwords" sub="Set a new password for anyone" onPress={go('/admin/people')} />
        <SettingRow icon="albums-outline" tint={colors.sky} label="Batches" onPress={go('/admin/batches')} />
        <SettingRow icon="person-add-outline" tint={colors.mint} label="Admissions & campaigns" onPress={go('/admin/admissions')} />
        <SettingRow icon="wallet-outline" tint={colors.butter} label="Fees" onPress={go('/admin/fees')} />
        <SettingRow icon="checkbox-outline" tint={colors.lav} label="Attendance" onPress={go('/admin/attendance')} />
        <SettingRow icon="videocam-outline" tint={colors.sky} label="Live classes" onPress={go('/admin/live')} />
      </SettingsGroup>

      <SettingsGroup title="My account">
        <SettingRow icon="lock-closed-outline" tint={colors.butter} label="Change my password" onPress={go('/account/password')} />
      </SettingsGroup>
      <Pressable accessibilityRole="button" onPress={() => logout().then(() => router.replace('/login' as any))}
        style={{ marginTop: 18, height: 54, borderRadius: 27, backgroundColor: '#FBD9DC', alignItems: 'center', justifyContent: 'center' }}>
        <T style={{ color: colors.red, fontFamily: fonts.semibold }}>Log out</T>
      </Pressable>
      <T v="small" style={{ textAlign: 'center', marginTop: 10, marginBottom: 20 }}>Noon Learn for institutions</T>
    </Screen>
  );
}
