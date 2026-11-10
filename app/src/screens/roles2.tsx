// Profile and Settings pages shared by teacher, institute admin and super admin.
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Row, Screen, T, IconButton } from '@/components/ui';
import { demoNote } from '@/components/kit';
import { DetailRows, G, Grad, HeroHeader, OverlapCard, SettingRow, SettingsGroup, TileRows } from '@/components/kit2';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { colors, fonts } from '@/theme/tokens';
import type { IconName } from '@/components/kit';

export type ProfileTile = { label: string; icon: IconName; tint: readonly [string, string]; href?: string; note?: string };

/** Gradient header, chips card, detail rows and shortcut tiles. */
export function RoleProfileScreen({ g, name, sub, pill, stats, chipsTitle, chips, rows, tiles, settingsHref }: {
  g: Grad; name?: string; sub: string; pill: string; stats: [string, string][]; chipsTitle: string; chips: { text: string; tint: readonly [string, string] }[];
  rows: [string, string][]; tiles: ProfileTile[]; settingsHref: string;
}) {
  const { user } = useAuth();
  const display = name ?? user?.name ?? 'Me';
  const initials = display.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <Screen bar={false}>
      <HeroHeader g={g} initials={initials} name={display} sub={sub} pill={pill} stats={stats}
        right={<IconButton name="settings-outline" label="Settings" size={44} tint="rgba(255,255,255,0.18)" color="#FFF" onPress={() => router.push(settingsHref as any)} />} />
      <OverlapCard style={{ gap: 10 }}>
        <T v="label">{chipsTitle.toUpperCase()}</T>
        <Row gap={8} style={{ flexWrap: 'wrap' }}>
          {chips.map((c) => (
            <View key={c.text} style={{ backgroundColor: c.tint[0], borderRadius: 14, paddingHorizontal: 12, height: 30, justifyContent: 'center' }}>
              <Text style={{ color: c.tint[1], fontFamily: fonts.semibold, fontSize: 13 }}>{c.text}</Text>
            </View>
          ))}
        </Row>
      </OverlapCard>
      <DetailRows rows={rows} style={{ marginTop: 12 }} />
      <View style={{ marginTop: 12 }}>
        <TileRows cols={2} gap={10}>
          {tiles.map((t) => (
            <Pressable key={t.label} accessibilityRole="button" accessibilityLabel={t.label}
              onPress={() => (t.href ? router.push(t.href as any) : demoNote(t.note ?? `Demo: ${t.label} opens here.`))}
              style={{ height: 64, borderRadius: 20, backgroundColor: `${t.tint[0]}AA`, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 }}>
              <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: t.tint[0], alignItems: 'center', justifyContent: 'center' }}><Ionicons name={t.icon} size={18} color={t.tint[1]} /></View>
              <T style={{ fontFamily: fonts.semibold, fontSize: 14, flex: 1 }} numberOfLines={1}>{t.label}</T>
            </Pressable>
          ))}
        </TileRows>
      </View>
    </Screen>
  );
}

export type SettingDef = { icon: IconName; tint: readonly [string, string]; label: string; sub?: string; value?: string; toggle?: boolean; href?: string };

/** Settings: profile row, groups of rows (switches remember their state on this page), log out. */
export function RoleSettingsScreen({ roleLine, profileHref, groups, footer }: { roleLine: string; profileHref: string; groups: { title: string; rows: SettingDef[] }[]; footer: string }) {
  const { user, logout } = useAuth();
  const [on, setOn] = useState<Record<string, boolean>>(() => Object.fromEntries(groups.flatMap((g) => g.rows.filter((r) => r.toggle != null).map((r) => [r.label, !!r.toggle]))));
  const name = user?.name ?? 'Me';
  return (
    <Screen>
      <T v="h1">Settings</T>
      <Pressable accessibilityRole="button" onPress={() => router.push(profileHref as any)}
        style={{ marginTop: 12, backgroundColor: '#FFF', borderRadius: 24, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: colors.lav[0], alignItems: 'center', justifyContent: 'center' }}>
          <T style={{ fontFamily: fonts.semibold, color: colors.lav[1] }}>{name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()}</T>
        </View>
        <View style={{ flex: 1 }}><T v="h3">{name}</T><T v="small">{roleLine}</T></View>
        <T style={{ color: colors.teal, fontFamily: fonts.semibold }}>Edit ›</T>
      </Pressable>
      {groups.map((g) => (
        <SettingsGroup key={g.title} title={g.title}>
          {g.rows.map((r) => (
            <SettingRow key={r.label} icon={r.icon} tint={r.tint} label={r.label} sub={r.sub} value={r.value}
              toggle={r.toggle != null ? on[r.label] : undefined} onToggle={(v) => setOn({ ...on, [r.label]: v })}
              onPress={() => (r.href ? router.push(r.href as any) : demoNote(`Demo: "${r.label}" opens here.`))} />
          ))}
        </SettingsGroup>
      ))}
      <SettingsGroup title="Security">
        <SettingRow icon="key-outline" tint={colors.butter} label="Change password" onPress={() => router.push('/account/password' as any)} />
      </SettingsGroup>
      <Pressable accessibilityRole="button" onPress={() => logout().then(() => router.replace('/login' as any))}
        style={{ marginTop: 18, height: 54, borderRadius: 27, backgroundColor: '#FBD9DC', alignItems: 'center', justifyContent: 'center' }}>
        <T style={{ color: colors.red, fontFamily: fonts.semibold }}>Log out</T>
      </Pressable>
      <T v="small" style={{ textAlign: 'center', marginTop: 10 }}>{footer}</T>
    </Screen>
  );
}

export const T_ = { lav: colors.lav, sky: colors.sky, mint: colors.mint, pink: colors.pink, butter: colors.butter, red: ['#FBD9DC', colors.red] as const };
export { G };
