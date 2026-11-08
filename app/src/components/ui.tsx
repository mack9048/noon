import React from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextProps, View, ViewStyle, StyleProp, TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, usePathname } from 'expo-router';
import { Logo } from './Logo';
import { colors, contentType, ContentKind, fonts, radius, shadow, scriptFont } from '@/theme/tokens';
import { useLayout } from '@/lib/useLayout';

/* ---------- Text ---------- */
type Variant = 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'label' | 'fun';
const variants: Record<Variant, TextStyle> = {
  h1: { fontFamily: fonts.semibold, fontSize: 28, lineHeight: 34, color: colors.ink },
  h2: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 26, color: colors.ink },
  h3: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.ink },
  small: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, color: colors.muted },
  label: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0.4, color: colors.muted },
  fun: { fontFamily: fonts.fun, fontSize: 26, lineHeight: 30, color: colors.ink },
};
export function T({ v = 'body', style, auto, children, ...rest }: TextProps & { v?: Variant; auto?: boolean }) {
  const extra: TextStyle | undefined = auto && typeof children === 'string' ? { fontFamily: scriptFont(children) } : undefined;
  return <Text {...rest} style={[variants[v], extra, style]}>{children}</Text>;
}

/* ---------- Layout ---------- */
// Main tab pages: no back button there (the tab bar is the way around).
const TAB_ROOTS = new Set([
  '/', '/student', '/student/classroom', '/student/chat', '/student/profile', '/student/explore',
  '/guest', '/guest/demo-classes', '/guest/demo-course', '/guest/games', '/guest/unlock',
  '/teacher', '/teacher/classes', '/teacher/attendance', '/teacher/chat', '/teacher/tests',
  '/admin', '/admin/students', '/admin/fees', '/admin/teachers', '/admin/more',
  '/super', '/super/tenants', '/super/content', '/super/billing', '/super/more',
]);

/** Goes back, or to the role's home page when there is no history (opened from a link or a refresh). */
export function goBack(path: string) {
  if (router.canGoBack()) return router.back();
  const first = path.split('/')[1];
  router.replace((['student', 'guest', 'teacher', 'admin', 'super'].includes(first) ? `/${first}` : '/') as any);
}

/** Top of every page: back button (except on main tab pages) and the Noon logo on phones. */
function TopBar({ back }: { back?: boolean }) {
  const path = usePathname();
  const { isPhone } = useLayout();
  const showBack = back ?? !TAB_ROOTS.has(path.replace(/\/$/, '') || '/');
  if (!showBack && !isPhone) return null; // tablet/desktop show the logo in the side menu
  return (
    <Row gap={10} style={{ minHeight: 44, marginBottom: 8 }}>
      {showBack ? <IconButton name="chevron-back" label="Back" size={44} onPress={() => goBack(path)} /> : null}
      {isPhone ? <Logo height={30} /> : null}
    </Row>
  );
}

export function Screen({ children, scroll = true, padded = true, bottomSpace = 120, style, overlay, bar = true, back }: {
  children: React.ReactNode; scroll?: boolean; padded?: boolean; bottomSpace?: number; style?: StyleProp<ViewStyle>;
  /** Floating content that stays put while the page scrolls (e.g. the Ask AI button). */
  overlay?: React.ReactNode;
  /** false: the page draws its own top (logo / back). */
  bar?: boolean;
  /** Force the back button on or off (default: off on main tab pages, on everywhere else). */
  back?: boolean;
}) {
  const { gutter, isPhone } = useLayout();
  const inner = (
    <View style={[{ width: '100%', maxWidth: 1200, alignSelf: 'center', paddingHorizontal: padded ? gutter : 0, paddingBottom: isPhone ? bottomSpace : 40 }, style]}>
      {bar ? <TopBar back={back} /> : null}
      {children}
    </View>
  );
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      {scroll ? <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 12 }}>{inner}</ScrollView> : inner}
      {overlay}
    </SafeAreaView>
  );
}

export function Row({ children, gap = 8, style }: { children: React.ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

/** Responsive grid: `cols` per device, e.g. {phone: 2, tablet: 3, desktop: 4}. */
export function Grid({ children, cols, gap = 10 }: { children: React.ReactNode; cols: { phone: number; tablet: number; desktop: number }; gap?: number }) {
  const { device } = useLayout();
  const n = cols[device];
  const items = React.Children.toArray(children);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -gap / 2 }}>
      {items.map((child, i) => (
        <View key={i} style={{ width: `${100 / n}%`, paddingHorizontal: gap / 2, paddingBottom: gap }}>{child}</View>
      ))}
    </View>
  );
}

/** Page title. `back` is kept for older calls; the back button is drawn by Screen's top bar. */
export function Header({ title, subtitle, right }: { title: string; subtitle?: string; back?: boolean; right?: React.ReactNode }) {
  return (
    <Row gap={12} style={{ minHeight: 56, marginBottom: 12 }}>
      <View style={{ flex: 1 }}>
        {subtitle ? <T v="label">{subtitle.toUpperCase()}</T> : null}
        <T v="h1" auto>{title}</T>
      </View>
      {right}
    </Row>
  );
}

/* ---------- Surfaces ---------- */
export function Card({ children, style, onPress, tint }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; tint?: string }) {
  const base = [styles.card, tint ? { backgroundColor: tint } : null, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [base, pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }]}>{children}</Pressable>;
}

export function GradientCard({ colors: g, children, style, onPress }: { colors: readonly string[]; children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const body = (
    <LinearGradient colors={g as unknown as [string, string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.gradient, style]}>
      <View style={styles.bubble} />
      {children}
    </LinearGradient>
  );
  if (!onPress) return body;
  // The shadow wrapper is rounded like the card, so no square edges show behind it.
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [shadow.lifted, { borderRadius: radius.xl }, pressed && { opacity: 0.9 }]}>{body}</Pressable>;
}

/* ---------- Controls ---------- */
export function Button({ title, onPress, kind = 'primary', icon, loading, disabled, style }: {
  title: string; onPress?: () => void; kind?: 'primary' | 'yellow' | 'ghost' | 'danger' | 'white' | 'outlineLight';
  icon?: keyof typeof Ionicons.glyphMap; loading?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const palette = {
    primary: { bg: colors.teal, fg: '#FFF', border: 'transparent' },
    yellow: { bg: colors.yellow, fg: '#2A1E00', border: 'transparent' },
    ghost: { bg: 'transparent', fg: colors.ink, border: colors.line },
    danger: { bg: colors.red, fg: '#FFF', border: 'transparent' },
    white: { bg: '#FFF', fg: colors.ink, border: 'transparent' },
    outlineLight: { bg: 'transparent', fg: '#FFF', border: 'rgba(255,255,255,0.6)' }, // on dark/gradient backgrounds
  }[kind];
  const inner = (
    <Row gap={8} style={{ justifyContent: 'center' }}>
      {loading ? <ActivityIndicator color={palette.fg} /> : icon ? <Ionicons name={icon} size={18} color={palette.fg} /> : null}
      <Text style={{ color: palette.fg, fontFamily: fonts.semibold, fontSize: 16 }}>{title}</Text>
    </Row>
  );
  return (
    <Pressable accessibilityRole="button" disabled={disabled || loading} onPress={onPress}
      style={({ pressed }) => [styles.button, { backgroundColor: palette.bg, borderColor: palette.border, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        kind === 'yellow' && { borderBottomWidth: 5, borderBottomColor: colors.yellowDeep }, style]}>
      {kind === 'primary' ? (
        <LinearGradient colors={['#0B5166', '#5B43E0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: radius.pill }]} />
      ) : null}
      {inner}
    </Pressable>
  );
}

export function IconButton({ name, label, onPress, tint = '#FFF', color = colors.ink, size = 48 }: {
  name: keyof typeof Ionicons.glyphMap; label: string; onPress?: () => void; tint?: string; color?: string; size?: number;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={({ pressed }) => [{ width: size, height: size, borderRadius: size / 2, backgroundColor: tint, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 }]}>
      <Ionicons name={name} size={size * 0.44} color={color} />
    </Pressable>
  );
}

export function Pill({ text, tint = colors.mint[0], ink = colors.mint[1] }: { text: string; tint?: string; ink?: string }) {
  return (
    <View style={{ backgroundColor: tint, borderRadius: radius.pill, paddingHorizontal: 10, height: 24, justifyContent: 'center', alignSelf: 'flex-start' }}>
      <Text style={{ color: ink, fontFamily: fonts.semibold, fontSize: 11 }}>{text}</Text>
    </View>
  );
}

/** Segmented control / tabs. */
export function Segmented<K extends string>({ value, options, onChange, activeColor = colors.teal }: {
  value: K; options: { key: K; label: string }[]; onChange: (k: K) => void; activeColor?: string;
}) {
  return (
    <View accessibilityRole="tablist" style={styles.segment}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable key={o.key} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(o.key)}
            style={[styles.segmentItem, on && { backgroundColor: activeColor }]}>
            <Text numberOfLines={1} style={{ color: on ? '#FFF' : colors.muted, fontFamily: on ? fonts.semibold : fonts.regular, fontSize: 14 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Coloured square icon for course content types. */
export function TypeIcon({ kind, size = 44 }: { kind: ContentKind; size?: number }) {
  const [bg, ink] = contentType[kind];
  const icon: Record<ContentKind, keyof typeof Ionicons.glyphMap> = {
    live: 'videocam', video: 'play', audio: 'musical-notes', pdf: 'document-text', test: 'checkbox',
  };
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icon[kind]} size={size * 0.45} color={ink} />
    </View>
  );
}

/** Gradient squircle icon tile (Explore / Study tools). */
export function IconTile({ gradient, icon, label, onPress }: { gradient: readonly string[]; icon: keyof typeof Ionicons.glyphMap; label: string; onPress?: () => void }) {
  return (
    <Card onPress={onPress} style={{ alignItems: 'center', paddingVertical: 16, gap: 10 }}>
      <LinearGradient colors={gradient as unknown as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={26} color="#FFF" />
      </LinearGradient>
      <T v="h3" style={{ fontSize: 13, textAlign: 'center' }}>{label}</T>
    </Card>
  );
}

export function Loading() {
  return <View style={{ padding: 40, alignItems: 'center' }}><ActivityIndicator color={colors.violet} /></View>;
}
export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card style={{ alignItems: 'center', gap: 10 }}>
      <T v="body">{message}</T>
      {onRetry ? <Button title="Try again" kind="ghost" onPress={onRetry} /> : null}
    </Card>
  );
}
export function Empty({ text }: { text: string }) {
  return <View style={{ padding: 30, alignItems: 'center' }}><T v="small">{text}</T></View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, ...shadow.card },
  gradient: { borderRadius: radius.xl, padding: 18, overflow: 'hidden' },
  bubble: { position: 'absolute', right: -40, top: -50, width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(255,255,255,0.12)' },
  button: { height: 54, borderRadius: radius.pill, paddingHorizontal: 22, justifyContent: 'center', borderWidth: 1.5, overflow: 'hidden' },
  segment: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: radius.pill, padding: 4, gap: 4 },
  segmentItem: { flex: 1, height: 42, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
});
