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
