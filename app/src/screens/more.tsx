import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Grid, Header, Screen, T } from '@/components/ui';
import { Field } from './auth';
import { InstallAppButton } from '@/components/InstallApp';
import { api, ApiError } from '@/lib/api';
import { homeFor, useAuth } from '@/lib/auth';
import type { User } from '@/lib/types';
import { colors } from '@/theme/tokens';

const links: [string, string, keyof typeof Ionicons.glyphMap, readonly [string, string]][] = [
  ['Quran & Hifz', '/guest/quran', 'book', colors.mint],
  ['Study tools', '/guest/tools/chart', 'document-text', colors.butter],
  ['Madrasa Support', '/guest/support', 'library', colors.sky],
  ['Change my class', '/join', 'swap-horizontal', colors.lav],
];

/** Guest "More" tab: join a madrasa with its code, other sections, log out. */
export function GuestMoreScreen() {
  const { user, logout, refresh } = useAuth();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const join = async () => {
    setBusy(true); setErr(null);
    try {
      const u = await api.post<User>('/auth/join-tenant', { code: code.trim().toUpperCase() });
      await refresh();
      router.replace(homeFor(u.role) as any);
    } catch (e: any) {
      setErr(e instanceof ApiError ? e.friendly : e?.message ?? 'Could not join. Please try again.');
    } finally { setBusy(false); }
  };

  return (
    <Screen>
      <Header title="More" back={false} />

      <Card style={{ gap: 12, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.sky[0], alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="school" size={22} color={colors.sky[1]} />
          </View>
          <View style={{ flex: 1 }}>
            <T v="h3">Join your madrasa</T>
            <T v="small">Unlock class chat, attendance, fees, leave and report cards.</T>
          </View>
        </View>
        <Field label="Madrasa code" value={code} onChangeText={(v) => setCode(v.toUpperCase())} autoCapitalize="characters" placeholder="e.g. NOON01" maxLength={20} />
        {err ? <T style={{ color: colors.red }}>{err}</T> : null}
        <Button title="Join madrasa" icon="arrow-forward" onPress={join} loading={busy} disabled={code.trim().length < 4} />
        <T v="small">Ask your madrasa office for the code.</T>
      </Card>

      <Grid cols={{ phone: 2, tablet: 3, desktop: 4 }}>
        {links.map(([label, href, icon, pastel]) => (
          <Card key={href} onPress={() => router.push(href as any)} style={{ gap: 10, minHeight: 100 }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: pastel[0], alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={icon} size={22} color={pastel[1]} />
            </View>
            <T v="h3">{label}</T>
          </Card>
        ))}
        <Card onPress={() => logout().then(() => router.replace('/'))} style={{ gap: 10, minHeight: 100 }}>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#FBD9DC', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="log-out" size={22} color={colors.red} />
          </View>
          <T v="h3">Log out</T>
          {user ? <T v="small">Signed in as {user.name}</T> : null}
        </Card>
      </Grid>
    </Screen>
  );
}

export type MoreLink = [label: string, href: string, icon: keyof typeof Ionicons.glyphMap, pastel: readonly [string, string]];

const roleName: Record<string, string> = { student: 'Student', parent: 'Parent', teacher: 'Teacher', admin: 'Institute admin', super_admin: 'Super admin', guest: 'Guest' };

export const STUDENT_MORE: MoreLink[] = [
  ['Profile', '/student/profile', 'person-outline', colors.lav],
  ['Fees', '/student/fees', 'card-outline', colors.mint],
  ['Attendance', '/student/attendance', 'calendar-outline', colors.butter],
  ['Audio Book', '/student/audio', 'headset-outline', colors.pink],
  ['Settings', '/student/settings', 'settings-outline', colors.sky],
  ['Help', '/student/help', 'help-circle-outline', ['#FFFFFF', colors.ink]],
];
export const TEACHER_MORE: MoreLink[] = [
  ['Live class', '/teacher/course/1', 'videocam-outline', colors.pink],
  ['Review work', '/teacher/review', 'clipboard-outline', colors.sky],
  ['Assess Salah', '/teacher/assess', 'ribbon-outline', colors.mint],
  ['Leave', '/teacher/leave', 'calendar-outline', colors.lav],
];
export const ADMIN_MORE: MoreLink[] = [
  ['Admissions', '/admin/admissions', 'person-add-outline', colors.mint],
  ['Batches', '/admin/batches', 'people-outline', colors.sky],
  ['Courses', '/admin/courses', 'school-outline', colors.lav],
  ['Attendance', '/admin/attendance', 'stats-chart-outline', colors.butter],
  ['Bulk add', '/admin/bulk', 'cloud-upload-outline', colors.pink],
  ['Leave', '/admin/leave', 'calendar-outline', colors.sky],
  ['Profile', '/admin/profile', 'person-circle-outline', colors.lav],
  ['Settings', '/admin/settings', 'settings-outline', colors.mint],
];
export const SUPER_MORE: MoreLink[] = [
  ['Courses', '/super/courses', 'school-outline', colors.lav],
  ['Approvals', '/super/approvals', 'checkmark-done-outline', colors.mint],
  ['Games', '/super/games', 'game-controller-outline', colors.pink],
  ['Study tools', '/super/tools', 'document-text-outline', colors.butter],
  ['Profile', '/super/profile', 'person-circle-outline', colors.sky],
  ['Settings', '/super/settings', 'settings-outline', colors.lav],
];

/**
 * The "More" menu (design: More menu): profile card, then tiles in rows of 3.
 * Used as the phone pop-up above the tab bar, and as the More page on tablet/desktop.
 */
export function MoreMenu({ links, onNavigate, profileHref, logout: withLogout }: {
  links: MoreLink[]; onNavigate?: () => void; profileHref?: string; logout?: boolean;
}) {
  const { user, logout } = useAuth();
  const go = (href: string) => { onNavigate?.(); router.push(href as any); };
  const signOut = () => { onNavigate?.(); logout().then(() => router.replace('/')); };
  const tiles = withLogout ? [...links, ['Log out', '#logout', 'log-out-outline', ['#FBD9DC', colors.red]] as MoreLink] : links;
  const rows: (MoreLink | null)[][] = [];
  for (let i = 0; i < tiles.length; i += 3) {
    const row: (MoreLink | null)[] = tiles.slice(i, i + 3);
    while (row.length < 3) row.push(null);
    rows.push(row);
  }
  const name = user?.role === 'parent' ? 'Ayisha Abdulla' : user?.name ?? 'Ayisha Abdulla';
  const sub = user?.role === 'student' || user?.role === 'parent' ? `Madrasa 5 · ${roleName[user.role]}` : roleName[user?.role ?? ''] ?? '';
  return (
    <View style={{ gap: 12 }}>
      <Card onPress={profileHref ? () => go(profileHref) : undefined} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, minHeight: 72 }}>
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.pink[0], alignItems: 'center', justifyContent: 'center' }}>
          <T style={{ color: colors.pink[1], fontSize: 20 }}>{name[0]}</T>
        </View>
        <View style={{ flex: 1 }}>
          <T v="h3" numberOfLines={1}>{name}</T>
          <T v="small" numberOfLines={1}>{sub}</T>
        </View>
        {profileHref ? (
          <View style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="chevron-forward" size={18} color={colors.ink} />
          </View>
        ) : null}
      </Card>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', gap: 8 }}>
          {row.map((t, c) => t ? (
            <Card key={t[1]} onPress={() => (t[1] === '#logout' ? signOut() : go(t[1]))} tint={t[3][0]}
              style={{ flex: 1, height: 84, padding: 10, paddingHorizontal: 12, justifyContent: 'space-between' }}>
              <Ionicons name={t[2]} size={22} color={t[3][1]} />
              <T numberOfLines={1} style={{ color: t[3][1], fontSize: 14 }}>{t[0]}</T>
            </Card>
          ) : <View key={`e${c}`} style={{ flex: 1, paddingHorizontal: 12 }} />)}
        </View>
      ))}
      <InstallAppButton />
    </View>
  );
}

/** More page for tablet/desktop (on phones the tab opens the pop-up instead). */
export function MorePage(props: { links: MoreLink[]; profileHref?: string; logout?: boolean }) {
  return (
    <Screen>
      <Header title="More" back={false} />
      <MoreMenu {...props} />
    </Screen>
  );
}

/** Kept for older imports. */
export function RoleMoreScreen({ links }: { links: MoreLink[] }) {
  return <MorePage links={links} logout />;
}

export function StudentMoreMenu({ onNavigate }: { onNavigate?: () => void }) {
  return <MoreMenu links={STUDENT_MORE} onNavigate={onNavigate} profileHref="/student/profile" />;
}
