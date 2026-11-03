import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Slot, router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, shadow } from '@/theme/tokens';
import { useLayout } from '@/lib/useLayout';
import { useAuth } from '@/lib/auth';
import { Logo } from './Logo';

export interface NavItem {
  href: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** Text shown instead of the icon, e.g. '₹' (Ionicons has no rupee sign). */
  glyph?: string;
  /** Extra path prefixes that should highlight this item. */
  match?: string[];
}

/**
 * Responsive app frame used by every role:
 *  phone   → floating bottom tab bar
 *  tablet  → left icon rail
 *  desktop → left sidebar with logo, labels and user card
 */
export function AppShell({ items }: { items: NavItem[] }) {
  const { device } = useLayout();
  const path = usePathname();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const isActive = (it: NavItem) =>
    [it.href, ...(it.match ?? [])].some((p) => (p === items[0].href ? path === p : path === p || path.startsWith(p + '/')));

  // Full-screen routes (chat thread on phones, live class everywhere) hide the navigation.
  const fullScreen = /\/live\/[^/]+$/.test(path) || (device === 'phone' && /\/chat\/[^/]+$/.test(path));
  if (fullScreen) return <Slot />;

  if (device === 'phone') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Slot />
        <View accessibilityRole="tablist" style={[styles.bottom, { bottom: Math.max(insets.bottom, 12) + 8 }]}>
          {items.map((it) => {
            const on = isActive(it);
            return (
              <Pressable key={it.href} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => router.navigate(it.href as any)}
                style={[styles.bottomItem, on && { backgroundColor: colors.teal }]}>
                <NavIcon item={it} size={21} color={on ? '#FFF' : colors.muted} />
                <Text numberOfLines={1} style={[styles.bottomLabel, { color: on ? '#FFF' : colors.muted }]}>{it.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  const wide = device === 'desktop';
  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.bg }}>
      <View style={[styles.side, { width: wide ? 248 : 96, paddingTop: insets.top + 20 }]}>
        <View style={{ paddingHorizontal: wide ? 20 : 0, alignItems: wide ? 'flex-start' : 'center', marginBottom: 24 }}>
          <Logo compact={!wide} />
        </View>
        {items.map((it) => {
          const on = isActive(it);
          return (
            <Pressable key={it.href} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => router.navigate(it.href as any)}
              style={({ hovered }: any) => [styles.sideItem, wide ? styles.sideItemWide : styles.sideItemRail, on ? { backgroundColor: colors.teal } : hovered && { backgroundColor: colors.bg }]}>
              <NavIcon item={it} size={22} color={on ? '#FFF' : colors.muted} />
              <Text style={{ color: on ? '#FFF' : colors.ink, fontFamily: on ? fonts.semibold : fonts.medium, fontSize: wide ? 15 : 11 }}>{it.label}</Text>
            </Pressable>
          );
        })}
        <View style={{ flex: 1 }} />
        {wide && user ? (
          <View style={styles.userCard}>
            <View style={styles.avatar}><Text style={{ fontFamily: fonts.semibold, color: colors.pink[1] }}>{user.name[0]}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.semibold, color: colors.ink }} numberOfLines={1}>{user.name}</Text>
              <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>{user.role}</Text>
            </View>
            <Pressable accessibilityLabel="Log out" onPress={() => logout().then(() => router.replace('/'))}>
              <Ionicons name="log-out-outline" size={20} color={colors.muted} />
            </Pressable>
          </View>
        ) : null}
      </View>
      <View style={{ flex: 1 }}><Slot /></View>
    </View>
  );
}

function NavIcon({ item, size, color }: { item: NavItem; size: number; color: string }) {
  if (item.glyph) {
    return <Text style={{ fontFamily: fonts.medium, fontSize: size, lineHeight: size + 2, color }}>{item.glyph}</Text>;
  }
  return <Ionicons name={item.icon} size={size} color={color} />;
}

const styles = StyleSheet.create({
  bottom: {
    position: 'absolute', left: 16, right: 16, height: 72, borderRadius: 36, backgroundColor: '#FFF',
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 2, maxWidth: 560, alignSelf: 'center', ...shadow.lifted,
  },
  bottomItem: { flex: 1, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', gap: 2 },
  bottomLabel: { fontFamily: fonts.medium, fontSize: 11 },
  side: { backgroundColor: '#FFF', paddingBottom: 20, borderRightWidth: 1, borderRightColor: colors.line, gap: 4 },
  sideItem: { borderRadius: 18, alignItems: 'center' },
  sideItemWide: { flexDirection: 'row', gap: 12, height: 50, paddingHorizontal: 16, marginHorizontal: 12 },
  sideItemRail: { height: 64, justifyContent: 'center', gap: 4, marginHorizontal: 10 },
  userCard: { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 12, padding: 12, borderRadius: 18, backgroundColor: colors.bg },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.pink[0], alignItems: 'center', justifyContent: 'center' },
});
