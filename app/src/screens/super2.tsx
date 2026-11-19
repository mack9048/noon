// Super admin screens from the second design round: Games, New game, Course approvals,
// Profile and Settings.
import React, { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Card, Row, Screen, T } from '@/components/ui';
import { demoNote } from '@/components/kit';
import { Status } from '@/components/kit2';
import { RoleProfileScreen, RoleSettingsScreen, T_ } from './roles2';
import { ApprovalStatus, decide, useApprovals } from '@/lib/approvals';
import { colors, fonts } from '@/theme/tokens';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/lib/auth';
import { profileRows } from '@/lib/profile';

/* ---------- Games store (demo, in memory) ---------- */
/* ---------- Course approvals ---------- */
export function ApprovalsScreen() {
  const list = useApprovals();
  const [tab, setTab] = useState<'waiting' | 'approved' | 'other'>('waiting');
  const shown = list.filter((c) => (tab === 'other' ? c.status === 'changes' || c.status === 'rejected' : c.status === tab));
  const act = async (id: number, s: Exclude<ApprovalStatus, 'waiting'>, title: string) => {
    try {
      await decide(id, s);
      demoNote(s === 'approved' ? `"${title}" is approved and visible to students.` : s === 'changes' ? `Asked the institution to change "${title}".` : `"${title}" was rejected.`);
    } catch (e: any) { demoNote(e?.message ?? 'Could not save.'); }
  };
  return (
    <Screen>
      <T v="h1">Course approvals</T>
      <T v="small">Courses created by institution admins</T>
      <Row gap={6} style={{ marginTop: 12, backgroundColor: '#FFF', borderRadius: 26, padding: 4 }}>
        {([['waiting', `Waiting · ${list.filter((c) => c.status === 'waiting').length}`], ['approved', 'Approved'], ['other', 'Changes / rejected']] as const).map(([k, l]) => (
          <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: tab === k }} onPress={() => setTab(k)} style={{ flex: 1, height: 44, borderRadius: 22, backgroundColor: tab === k ? colors.violet : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
            <T numberOfLines={1} style={{ color: tab === k ? '#FFF' : colors.muted, fontFamily: fonts.semibold, fontSize: 13 }}>{l}</T>
          </Pressable>
        ))}
      </Row>
      <View style={{ gap: 10, marginTop: 12 }}>
        {shown.map((c) => (
          <Card key={c.id} style={{ gap: 10 }}>
            <Row gap={12}>
              <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: c.tint[0], alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: fonts.arabic, fontSize: 22, color: c.tint[1] }}>{c.glyph}</Text></View>
              <View style={{ flex: 1 }}><T v="h3">{c.title}</T><T v="small">{c.madrasa} · {c.when}</T></View>
              {c.status !== 'waiting' ? <Status text={{ approved: 'Approved', changes: 'Review', rejected: 'Rejected', waiting: '' }[c.status]} /> : null}
            </Row>
            <Row gap={6} style={{ flexWrap: 'wrap' }}>{c.tags.map((t) => <View key={t} style={{ backgroundColor: '#EEF3F5', borderRadius: 10, paddingHorizontal: 8, height: 24, justifyContent: 'center' }}><T style={{ fontSize: 11, fontFamily: fonts.medium }}>{t}</T></View>)}</Row>
            {c.status === 'waiting' ? (
              <Row gap={8}>
                <Pressable accessibilityRole="button" onPress={() => act(c.id, 'rejected', c.title)} style={{ flex: 1, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: '#F3B7BD', alignItems: 'center', justifyContent: 'center' }}><T style={{ color: colors.red, fontFamily: fonts.semibold }}>Reject</T></Pressable>
                <Pressable accessibilityRole="button" onPress={() => act(c.id, 'changes', c.title)} style={{ flex: 1.2, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}><T style={{ fontFamily: fonts.semibold }}>Ask changes</T></Pressable>
                <Pressable accessibilityRole="button" onPress={() => act(c.id, 'approved', c.title)} style={{ flex: 1.1, height: 44, borderRadius: 22, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}><T style={{ color: '#FFF', fontFamily: fonts.semibold }}>Approve</T></Pressable>
              </Row>
            ) : null}
          </Card>
        ))}
        {!shown.length ? <T v="small" style={{ textAlign: 'center', padding: 20 }}>Nothing here.</T> : null}
      </View>
    </Screen>
  );
}

/* ---------- Super admin profile & settings ---------- */
export function SuperProfileScreen() {
  const { user } = useAuth();
  const tenants = useApi<{ students_count?: number; teachers_count?: number; active?: boolean }[]>('/super/tenants').data;
  const sum = (k: 'students_count' | 'teachers_count') => tenants?.reduce((n, t) => n + (t[k] ?? 0), 0);
  return (
    <RoleProfileScreen g={['#0B5166', '#1F8AA8']} sub="Super admin · Noon Learn" pill="Platform owner · All tenants"
      stats={[[String(tenants?.length ?? '–'), 'Tenants'], [String(sum('students_count') ?? '–'), 'Students'], [String(sum('teachers_count') ?? '–'), 'Teachers']]} chipsTitle="My role & access"
      chips={[{ text: 'All tenants', tint: colors.sky }, { text: 'Log in as', tint: colors.butter }, { text: 'Content & courses', tint: colors.lav }, { text: 'Approvals', tint: colors.mint }]}
      rows={profileRows(user, [['Role', 'Owner (full access)']])}
      tiles={[
        { label: 'Team & roles', icon: 'people-outline', tint: colors.sky, note: 'Coming soon: add admins and choose what each can do.' },
        { label: 'Billing', icon: 'wallet-outline', tint: colors.butter, href: '/super/billing' },
        { label: 'Activity log', icon: 'time-outline', tint: colors.lav, note: 'Coming soon: every admin action is listed here.' },
        { label: 'Settings', icon: 'settings-outline', tint: colors.mint, href: '/super/settings' },
      ]} settingsHref="/super/settings" />
  );
}

export function SuperSettingsScreen() {
  return (
    <RoleSettingsScreen roleLine="Super admin · Noon Learn HQ" profileHref="/super/profile" footer="Noon Learn super admin · v1.0" groups={[
      { title: 'Platform', rows: [
        { icon: 'color-palette-outline', tint: T_.lav, label: 'App name & branding', value: 'Noon Learn' },
        { icon: 'globe-outline', tint: T_.sky, label: 'Default language', value: 'English · മലയാളം' },
        { icon: 'business-outline', tint: T_.mint, label: 'New institution sign-ups', sub: 'Institutions can register themselves', toggle: true },
        { icon: 'person-outline', tint: T_.butter, label: 'Guest mode', sub: '2 free lessons per subject', toggle: true },
      ] },
      { title: 'Courses & content', rows: [
        { icon: 'checkmark-circle-outline', tint: T_.mint, label: 'Approve institution courses', sub: 'Admins need approval to publish', toggle: true, href: '/super/approvals' },
        { icon: 'pie-chart-outline', tint: T_.butter, label: 'Revenue share', sub: 'Institution / Noon Learn', value: '70 / 30' },
        { icon: 'sparkles-outline', tint: T_.pink, label: 'Noon AI tutor', sub: 'On for all students', toggle: true },
      ] },
      { title: 'Billing', rows: [
        { icon: 'pricetags-outline', tint: T_.butter, label: 'Plans & prices', value: '3 plans', href: '/super/billing' },
        { icon: 'card-outline', tint: T_.sky, label: 'Payment gateway', value: 'Razorpay' },
        { icon: 'receipt-outline', tint: T_.lav, label: 'GST / tax', value: '18%' },
      ] },
      { title: 'Security', rows: [
        { icon: 'people-outline', tint: T_.sky, label: 'Team & roles', value: '5 admins' },
        { icon: 'shield-checkmark-outline', tint: T_.mint, label: '2-step login for admins', sub: 'Required for all admin accounts', toggle: true },
        { icon: 'server-outline', tint: T_.lav, label: 'Backups', value: 'Daily · 2 AM' },
        { icon: 'construct-outline', tint: T_.pink, label: 'Maintenance mode', sub: 'Shows a notice to every user', toggle: false },
      ] },
    ]} />
  );
}
