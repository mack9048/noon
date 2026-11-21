// Institution admin settings: real institution details (saved to the server) and working shortcuts.
import React, { useState } from 'react';
import { Image, Platform, Pressable, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { Button, Loading, Row, Screen, Segmented, T } from '@/components/ui';
import { Input, Select, SettingRow, SettingsGroup } from '@/components/kit2';
import { money } from '@/lib/money';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/lib/auth';
import { colors, fonts } from '@/theme/tokens';

export type Institution = {
  id: number; name: string; code: string; plan: string; active: boolean; phone: string | null; address: string | null;
  academic_year: string | null; default_fee: number | null; counts: { students: number; teachers: number; admins: number };
  logo_url: string | null; tagline: string | null; website: string | null; email: string | null; registration_no: string | null; affiliation_no: string | null;
  principal: string | null; established: string | null; country: string; currency: string; dial_code: string; timezone: string;
  countries: { code: string; name: string; currency: string; dial_code: string; timezone: string }[];
};
const PLAN: Record<string, string> = { basic: 'Basic', pro: 'Pro', enterprise: 'Enterprise' };
const CURRENCIES = ['INR', 'AED', 'SAR', 'QAR', 'KWD', 'OMR', 'BHD', 'GBP', 'USD'];
type Form = Record<'name' | 'tagline' | 'website' | 'phone' | 'email' | 'address' | 'registration_no' | 'affiliation_no' | 'principal' | 'established' | 'academic_year' | 'default_fee' | 'country' | 'currency' | 'dial_code' | 'timezone', string>;
const toForm = (i: Institution): Form => ({
  name: i.name, tagline: i.tagline ?? '', website: i.website ?? '', phone: (i.phone ?? '').replace(/^\+\d{1,4}\s*/, ''), email: i.email ?? '', address: i.address ?? '',
  registration_no: i.registration_no ?? '', affiliation_no: i.affiliation_no ?? '', principal: i.principal ?? '', established: i.established ?? '',
  academic_year: i.academic_year ?? '', default_fee: i.default_fee != null ? String(i.default_fee) : '', country: i.country, currency: i.currency, dial_code: i.dial_code, timezone: i.timezone,
});

export function AdminSettingsScreen() {
  const { user, logout, refresh } = useAuth();
  const { data: inst, setData } = useApi<Institution>('/admin/institution');
  const [f, setF] = useState<Form | null>(null);
  const [tab, setTab] = useState<'school' | 'system'>('school');
  const [busy, setBusy] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  if (inst && !f) setF(toForm(inst));
  if (!inst || !f) return <Loading />;
  const set = (k: keyof Form) => (v: string) => { setF({ ...f, [k]: v }); setMsg(null); };
  const pickCountry = (code: string) => {
    const c = inst.countries.find((x) => x.code === code);
    if (c) { setF({ ...f, country: c.code, currency: c.currency, dial_code: c.dial_code, timezone: c.timezone }); setMsg(null); }
  };
  const save = async () => {
    if (f.name.trim().length < 2) return setMsg({ ok: false, text: 'Enter the institution name.' });
    setBusy(true); setMsg(null);
    try {
      const n = (v: string) => v.trim() || null;
      const r = await api.put<Institution>('/admin/institution', {
        name: f.name.trim(), tagline: n(f.tagline), website: n(f.website), phone: f.phone.trim() ? `${f.dial_code} ${f.phone.trim()}` : null, email: n(f.email), address: n(f.address),
        registration_no: n(f.registration_no), affiliation_no: n(f.affiliation_no), principal: n(f.principal), established: n(f.established),
        academic_year: n(f.academic_year), default_fee: f.default_fee ? Number(f.default_fee) : null, currency: f.currency, dial_code: f.dial_code, timezone: f.timezone,
        ...(f.country !== inst.country ? { country: f.country } : {}),
      });
      setData(r); setF(toForm(r)); setMsg({ ok: true, text: 'Saved.' }); refresh();
    } catch (e) { setMsg({ ok: false, text: e instanceof ApiError ? e.friendly : 'Could not save.' }); } finally { setBusy(false); }
  };
  const uploadLogo = async (remove = false) => {
    let file: DocumentPicker.DocumentPickerAsset | null = null;
    if (!remove) {
      const r = await DocumentPicker.getDocumentAsync({ type: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'], copyToCacheDirectory: true });
      file = r.canceled ? null : r.assets[0];
      if (!file) return;
      if (file.size && file.size > 2 * 1024 * 1024) return setMsg({ ok: false, text: 'The logo is over 2 MB. Please choose a smaller picture.' });
    }
    setLogoBusy(true);
    try {
      const fd = new FormData();
      if (file) { if (Platform.OS === 'web' && (file as any).file) fd.append('logo', (file as any).file); else fd.append('logo', { uri: file.uri, name: file.name, type: file.mimeType ?? 'image/png' } as any); }
      else fd.append('remove', '1');
      const r = await api.post<Institution>('/admin/institution/logo', fd);
      setData(r); refresh();
    } catch (e) { setMsg({ ok: false, text: e instanceof ApiError ? e.friendly : 'Could not upload the logo.' }); } finally { setLogoBusy(false); }
  };
  const zones = Array.from(new Set(inst.countries.map((c) => c.timezone)));
  const copyCode = () => {
    try { (globalThis as any).navigator?.clipboard?.writeText(inst.code); } catch { /* ignore */ }
    if (Platform.OS === 'web') (globalThis as any).alert?.(`Institution code ${inst.code} copied.`);
  };
  const go = (href: string) => () => router.push(href as any);
  return (
    <Screen>
      <T v="h1">Settings</T>
      <T v="small">{user?.name} · Institution admin</T>

      <View style={{ marginTop: 10 }}><Segmented value={tab} onChange={setTab} options={[{ key: 'school', label: 'School details' }, { key: 'system', label: 'System' }]} /></View>
      {tab === 'school' ? (
        <SettingsGroup title="School details">
          <View style={{ padding: 14, gap: 12 }}>
            <Row gap={14} style={{ alignItems: 'center' }}>
              <View style={{ width: 84, height: 84, borderRadius: 20, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: colors.line }}>
                {inst.logo_url ? <Image source={{ uri: inst.logo_url }} style={{ width: 84, height: 84, backgroundColor: '#FFF' }} resizeMode="contain" accessibilityLabel="Institution logo" />
                  : <T style={{ color: '#FFF', fontFamily: fonts.semibold, fontSize: 24 }}>{inst.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}</T>}
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <T style={{ fontFamily: fonts.semibold }}>Logo</T>
                <T v="small">Shown in the app, on receipts and to your students. Square PNG, JPG or WEBP, up to 2 MB.</T>
                <Row gap={8}>
                  <Button title={inst.logo_url ? 'Change' : 'Upload'} icon="cloud-upload-outline" kind="ghost" loading={logoBusy} style={{ height: 38 }} onPress={() => uploadLogo()} />
                  {inst.logo_url ? <Button title="Remove" kind="ghost" style={{ height: 38 }} onPress={() => uploadLogo(true)} /> : null}
                </Row>
              </View>
            </Row>
            <Input label="School name" value={f.name} onChangeText={set('name')} />
            <Row gap={10} style={{ flexWrap: 'wrap' }}>
              <View style={{ flex: 1, minWidth: 200 }}><Input label="Tagline" value={f.tagline} onChangeText={set('tagline')} placeholder="Short motto or subtitle" /></View>
              <View style={{ flex: 1, minWidth: 200 }}><Input label="Website" value={f.website} onChangeText={set('website')} placeholder="www…" autoCapitalize="none" /></View>
            </Row>
            <Input label="Address" value={f.address} onChangeText={set('address')} placeholder="Campus address" multiline />
            <Row gap={10} style={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <View style={{ width: 150 }}><Select label="Phone" value={f.dial_code} options={Array.from(new Set([f.dial_code, ...inst.countries.map((c) => c.dial_code)])).map((d) => ({ key: d, label: `${inst.countries.find((c) => c.dial_code === d)?.code ?? ''} ${d}`.trim() }))} onChange={set('dial_code')} /></View>
              <View style={{ flex: 1, minWidth: 160 }}><Input value={f.phone} onChangeText={(v) => set('phone')(v.replace(/[^\d ]/g, ''))} keyboardType="phone-pad" placeholder="Office / WhatsApp number" accessibilityLabel="Phone number" /></View>
              <View style={{ flex: 1, minWidth: 200 }}><Input label="Email" value={f.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" /></View>
            </Row>
            <Row gap={10} style={{ flexWrap: 'wrap' }}>
              <View style={{ flex: 1, minWidth: 160 }}><Input label="Registration no." value={f.registration_no} onChangeText={set('registration_no')} /></View>
              <View style={{ flex: 1, minWidth: 160 }}><Input label="Affiliation no." value={f.affiliation_no} onChangeText={set('affiliation_no')} /></View>
            </Row>
            <Row gap={10} style={{ flexWrap: 'wrap' }}>
              <View style={{ flex: 2, minWidth: 200 }}><Input label="Principal" value={f.principal} onChangeText={set('principal')} /></View>
              <View style={{ flex: 1, minWidth: 120 }}><Input label="Established" value={f.established} onChangeText={(v) => set('established')(v.replace(/[^\d]/g, '').slice(0, 4))} keyboardType="number-pad" placeholder="2026" /></View>
            </Row>
            {msg ? <T style={{ color: msg.ok ? colors.green : colors.red }}>{msg.text}</T> : null}
            <Button title="Save changes" icon="checkmark-circle-outline" onPress={save} loading={busy} />
          </View>
        </SettingsGroup>
      ) : (
        <SettingsGroup title="System">
          <View style={{ padding: 14, gap: 12 }}>
            <T v="small">Choosing the country sets the fees currency, phone country code and time zone. You can change each one too.</T>
            <Select label="Country" value={f.country} options={inst.countries.map((c) => ({ key: c.code, label: c.name }))} onChange={pickCountry} />
            <Row gap={10} style={{ flexWrap: 'wrap' }}>
              <View style={{ flex: 1, minWidth: 160 }}><Select label="Fees currency" value={f.currency} options={CURRENCIES.map((c) => ({ key: c, label: `${c} · ${money(1500, c)}` }))} onChange={set('currency')} /></View>
              <View style={{ flex: 1, minWidth: 160 }}><Select label="Phone country code" value={f.dial_code} options={Array.from(new Set([f.dial_code, ...inst.countries.map((c) => c.dial_code)])).map((d) => ({ key: d, label: d }))} onChange={set('dial_code')} /></View>
              <View style={{ flex: 1, minWidth: 180 }}><Select label="Time zone" value={f.timezone} options={Array.from(new Set([f.timezone, ...zones])).map((z) => ({ key: z, label: z.replace('_', ' ') }))} onChange={set('timezone')} /></View>
            </Row>
            <Row gap={10} style={{ flexWrap: 'wrap' }}>
              <View style={{ flex: 1, minWidth: 160 }}><Input label="Academic year" value={f.academic_year} onChangeText={set('academic_year')} placeholder="2026–27" /></View>
              <View style={{ flex: 1, minWidth: 160 }}><Input label={`Default monthly fee (${f.currency})`} value={f.default_fee} onChangeText={(v) => set('default_fee')(v.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" placeholder="Fills in Add fees" /></View>
            </Row>
            {msg ? <T style={{ color: msg.ok ? colors.green : colors.red }}>{msg.text}</T> : null}
            <Button title="Save changes" icon="checkmark-circle-outline" onPress={save} loading={busy} />
          </View>
        </SettingsGroup>
      )}

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
