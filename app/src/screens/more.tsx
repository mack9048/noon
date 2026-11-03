import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Grid, Header, Screen, T } from '@/components/ui';
import { Field } from './auth';
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

/** "More" tab for teacher, admin and super admin: shortcuts to their other screens, and log out. */
export function RoleMoreScreen({ links }: { links: MoreLink[] }) {
  const { user, logout } = useAuth();
  return (
    <Screen>
      <Header title="More" back={false} />
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
            <Ionicons name="log-out-outline" size={22} color={colors.red} />
          </View>
          <T v="h3">Log out</T>
          {user ? <T v="small">Signed in as {user.name}</T> : null}
        </Card>
      </Grid>
    </Screen>
  );
}

/** Student "More" menu (design: More menu). Used as the phone pop-up and as the More page on tablet/desktop. */
export function StudentMoreMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  const go = (href: string) => { onNavigate?.(); router.push(href as any); };
  const tiles: [string, string, keyof typeof Ionicons.glyphMap, readonly [string, string]][] = [
    ['Profile', '/student/profile', 'person-outline', colors.lav],
    ['Fees', '/student/fees', 'card-outline', colors.mint],
    ['Attendance', '/student/attendance', 'calendar-outline', colors.butter],
    ['Audio Book', '/student/audio', 'headset-outline', colors.pink],
    ['Settings', '/student/settings', 'settings-outline', colors.sky],
    ['Help', '/student/help', 'help-circle-outline', ['#FFFFFF', colors.ink]],
  ];
  return (
    <View style={{ gap: 12 }}>
      <Card onPress={() => go('/student/profile')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.pink[0], alignItems: 'center', justifyContent: 'center' }}>
          <T style={{ color: colors.pink[1], fontSize: 20 }}>{(user?.name ?? 'A')[0]}</T>
        </View>
        <View style={{ flex: 1 }}>
          <T v="h3">{user?.role === 'parent' ? 'Ayisha Abdulla' : user?.name ?? 'Ayisha Abdulla'}</T>
          <T v="small">Madrasa 5 · {user?.role === 'parent' ? 'Parent' : 'Student'}</T>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.ink} />
      </Card>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {tiles.map(([label, href, icon, tint]) => (
          <Card key={href} onPress={() => go(href)} tint={tint[0]} style={{ width: '31.5%', height: 84, padding: 10, justifyContent: 'space-between' }}>
            <Ionicons name={icon} size={22} color={tint[1]} />
            <T style={{ color: tint[1], fontSize: 14 }}>{label}</T>
          </Card>
        ))}
      </View>
    </View>
  );
}
