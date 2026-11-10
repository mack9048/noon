// Small building blocks shared by the screens from the design canvas.
import React from 'react';
import { Alert, Platform, Pressable, StyleProp, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { T, Row } from './ui';
import { colors, fonts, radius, scriptFont } from '@/theme/tokens';

export type Pastel = readonly [string, string];
export type IconName = keyof typeof Ionicons.glyphMap;

export const pastel = {
  lav: colors.lav, sky: colors.sky, mint: colors.mint, pink: colors.pink, butter: colors.butter,
  white: ['#FFFFFF', colors.ink] as const,
};

/** Round avatar with initials. */
export function Avatar({ name, size = 44, tint = colors.lav }: { name: string; size?: number; tint?: Pastel }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tint[0], alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: tint[1], fontFamily: fonts.semibold, fontSize: size * 0.36 }}>{initials}</Text>
    </View>
  );
}

/** Rounded square with an Arabic letter or short glyph. */
export function Glyph({ text, size = 52, tint = colors.lav }: { text: string; size?: number; tint?: Pastel }) {
  // Shrink longer words (e.g. a surah name) so they stay inside the box. Vowel marks don't add width.
  const letters = Math.max(1, text.replace(/[\u064B-\u0652\u0670\s]/g, '').length);
  const fontSize = Math.min(size * 0.5, (size * 0.84) / (letters * 0.5));
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: tint[0], alignItems: 'center', justifyContent: 'center', overflow: 'hidden', paddingHorizontal: size * 0.06 }}>
      <Text numberOfLines={1} adjustsFontSizeToFit
        style={{ color: tint[1], fontFamily: scriptFont(text), fontSize, lineHeight: Math.max(fontSize * 1.6, size * 0.5) }}>{text}</Text>
    </View>
  );
}

/** Pastel tile with an icon and a label (quick actions, menus). */
export function Tile({ label, icon, tint, href, onPress, sub, height = 84 }: {
  label: string; icon: IconName; tint: Pastel; href?: string; onPress?: () => void; sub?: string; height?: number;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress ?? (href ? () => router.push(href as any) : undefined)}
      style={({ pressed }) => ({ height, borderRadius: 22, backgroundColor: tint[0], padding: 12, justifyContent: 'space-between', opacity: pressed ? 0.85 : 1 })}>
      <Ionicons name={icon} size={22} color={tint[1]} />
      <View>
        <Text style={{ color: tint[1], fontFamily: fonts.medium, fontSize: 14 }}>{label}</Text>
        {sub ? <Text style={{ color: tint[1], fontFamily: fonts.regular, fontSize: 11, opacity: 0.8 }}>{sub}</Text> : null}
      </View>
    </Pressable>
  );
}

/** Pastel box with a label on top and a big number (dashboards). */
export function Stat({ label, value, tint, note }: { label: string; value: string | number; tint: Pastel; note?: string }) {
  return (
    <View style={{ borderRadius: 20, backgroundColor: tint[0], paddingHorizontal: 12, paddingVertical: 10, minHeight: 68, justifyContent: 'center' }}>
      <Text style={{ color: tint[1], fontFamily: fonts.medium, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: tint[1], fontFamily: fonts.semibold, fontSize: 24 }}>{value}</Text>
      {note ? <Text style={{ color: tint[1], fontFamily: fonts.regular, fontSize: 11 }}>{note}</Text> : null}
    </View>
  );
}

/** White row with something on the left, title/subtitle, and something on the right. */
export function ListRow({ left, title, sub, right, onPress, style }: {
  left?: React.ReactNode; title: string; sub?: string; right?: React.ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable accessibilityRole={onPress ? 'button' : undefined} onPress={onPress}
      style={({ pressed }) => [{ minHeight: 68, borderRadius: 22, backgroundColor: '#FFF', borderWidth: 1.5, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed && onPress ? 0.85 : 1 }, style]}>
      {left}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontFamily: scriptFont(title), fontSize: 15, color: colors.ink }}>{title}</Text>
        {sub ? <Text numberOfLines={2} style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>{sub}</Text> : null}
      </View>
      {right}
    </Pressable>
  );
}

/** Small outlined or filled pill button used on the right of rows. */
export function SmallButton({ title, onPress, filled = false, tint = colors.teal, disabled }: {
  title: string; onPress?: () => void; filled?: boolean; tint?: string; disabled?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled}
      style={({ pressed }) => ({ height: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1.5, borderColor: tint, backgroundColor: filled ? tint : 'transparent', alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.5 : pressed ? 0.8 : 1 })}>
      <Text style={{ color: filled ? '#FFF' : tint, fontFamily: fonts.medium, fontSize: 13 }}>{title}</Text>
    </Pressable>
  );
}

/** Underlined tabs (My Classroom, teacher classes...). */
export function Tabs<K extends string>({ value, options, onChange }: { value: K; options: { key: K; label: string }[]; onChange: (k: K) => void }) {
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', borderBottomWidth: 1.5, borderBottomColor: colors.line, marginVertical: 8 }}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable key={o.key} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(o.key)}
            style={{ flex: 1, height: 46, alignItems: 'center', justifyContent: 'center', borderBottomWidth: on ? 2.5 : 0, borderBottomColor: colors.teal, marginBottom: -1.5 }}>
            <Text numberOfLines={1} style={{ color: on ? colors.teal : colors.muted, fontFamily: on ? fonts.semibold : fonts.regular, fontSize: 14 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Horizontal filter chips (All, Unread, Groups...). */
export function Chips<K extends string>({ value, options, onChange }: { value: K; options: { key: K; label: string }[]; onChange: (k: K) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 }}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable key={o.key} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => onChange(o.key)}
            style={{ height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: on ? colors.pink[0] : '#FFF', borderWidth: 1.5, borderColor: on ? colors.pink[0] : colors.line, justifyContent: 'center' }}>
            <Text style={{ color: on ? colors.pink[1] : colors.ink, fontFamily: on ? fonts.semibold : fonts.regular, fontSize: 13 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Progress({ value, color = colors.teal, track = colors.line, height = 8 }: { value: number; color?: string; track?: string; height?: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: v }} style={{ height, borderRadius: height, backgroundColor: track, overflow: 'hidden' }}>
      <View style={{ width: `${v}%`, height, borderRadius: height, backgroundColor: color }} />
    </View>
  );
}

export function Section({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <Row style={{ justifyContent: 'space-between', marginTop: 18, marginBottom: 10 }}>
      <T v="h2">{title}</T>
      {action ? (
        <Pressable accessibilityRole="button" onPress={onAction}><T style={{ color: colors.teal, fontFamily: fonts.medium }}>{action}</T></Pressable>
      ) : null}
    </Row>
  );
}

/** Tag pill coloured by meaning. */
export function Tag({ text, tone = 'mint' }: { text: string; tone?: keyof typeof pastel }) {
  const [bg, ink] = pastel[tone];
  return (
    <View style={{ backgroundColor: bg, borderRadius: radius.pill, paddingHorizontal: 10, height: 26, justifyContent: 'center', alignSelf: 'center' }}>
      <Text style={{ color: ink, fontFamily: fonts.medium, fontSize: 12 }}>{text}</Text>
    </View>
  );
}

/** Coloured header band at the top of a screen (Quran & Hifz, Profile...). */
export function Band({ tint, height = 200 }: { tint: string; height?: number }) {
  return <View pointerEvents="none" style={{ position: 'absolute', left: -40, right: -40, top: -12, height, backgroundColor: tint, borderBottomLeftRadius: 60, borderBottomRightRadius: 60 }} />;
}

/** Plain demo message shown when a button would need the real backend. */
/**
 * Short message popup. Messages written as "Demo: …" belong to features that are
 * not live yet; users see a friendly "coming soon" note instead of developer wording.
 */
export function demoNote(text = 'This feature is coming soon, in sha Allah.') {
  const msg = /^Demo[:\s]/i.test(text) || /\(demo\)|step \d/i.test(text)
    ? 'This feature is coming soon, in sha Allah. We are working on it.'
    : text;
  if (Platform.OS === 'web') (globalThis as any).alert?.(msg);
  else Alert.alert('Noon Learn', msg);
}
