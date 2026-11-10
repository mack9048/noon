// Building blocks for the second round of designs: app-style icon tiles, gradient
// profile headers, settings rows with switches, dropdowns, step tabs and colour swatches.
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Switch, Text, TextInput, View, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { IconButton, Row, T, goBack } from './ui';
import { Logo } from './Logo';
import { colors, fonts, radius } from '@/theme/tokens';
import { useLayout } from '@/lib/useLayout';
import type { IconName } from './kit';

/** Gradient pairs used by the icon chips in the designs. */
export const G = {
  indigo: ['#7D9BFF', '#4255E0'], orange: ['#FFD25A', '#F08A24'], pink: ['#FF7EC4', '#C2307E'],
  green: ['#3DD9A8', '#0E7A50'], purple: ['#B05CF0', '#7B2FD8'], blue: ['#4C8DF6', '#1F5FE0'],
  red: ['#FF8A8A', '#E0445A'], gray: ['#8FA3AB', '#4F646C'], teal: ['#5CC7C9', '#0B5166'],
  violet: ['#8A6CFF', '#5B43E0'], coral: ['#FF9A3D', '#FF5E7E'], lime: ['#9BE15D', '#3E9B2F'],
} as const;
export type Grad = readonly [string, string];

/** Square-ish tile with a gradient icon chip and a label (Explore, Classroom, Profile hub). */
export function AppTile({ label, icon, g, tint = '#FFF', badge, tag, onPress, height = 104 }: {
  label: string; icon: IconName; g: Grad; tint?: string; badge?: number | string; tag?: { text: string; bg: string; ink: string };
  onPress?: () => void; height?: number;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={({ pressed }) => ({ height, borderRadius: 22, backgroundColor: tint, alignItems: 'center', justifyContent: 'center', gap: 8, opacity: pressed ? 0.85 : 1,
        shadowColor: '#10303A', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } })}>
      <View>
        <LinearGradient colors={g as unknown as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={icon} size={22} color="#FFF" />
        </LinearGradient>
        {badge != null ? (
          <View style={{ position: 'absolute', right: -8, top: -8, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: '#E0445A', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, borderWidth: 2, borderColor: '#FFF' }}>
            <Text style={{ color: '#FFF', fontFamily: fonts.semibold, fontSize: 10 }}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text numberOfLines={1} style={{ color: colors.ink, fontFamily: fonts.medium, fontSize: 13 }}>{label}</Text>
      {tag ? (
        <View style={{ position: 'absolute', right: 8, top: 8, backgroundColor: tag.bg, borderRadius: 8, paddingHorizontal: 6, height: 18, justifyContent: 'center' }}>
          <Text style={{ color: tag.ink, fontFamily: fonts.semibold, fontSize: 9 }}>{tag.text}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/** Rows of `cols` equal tiles (keeps tiles the same width even when the last row is short). */
export function TileRows({ cols = 3, gap = 10, children }: { cols?: number; gap?: number; children: React.ReactNode }) {
  const items = React.Children.toArray(children);
  const rows: React.ReactNode[][] = [];
  for (let i = 0; i < items.length; i += cols) rows.push(items.slice(i, i + cols));
  return (
    <View style={{ gap }}>
      {rows.map((r, i) => (
        <View key={i} style={{ flexDirection: 'row', gap }}>
          {r.map((c, j) => <View key={j} style={{ flex: 1 }}>{c}</View>)}
          {Array.from({ length: cols - r.length }).map((_, j) => <View key={`e${j}`} style={{ flex: 1 }} />)}
        </View>
      ))}
    </View>
  );
}

/** Gradient profile header: back/settings buttons, avatar, name, a pill and three stats. */
export function HeroHeader({ g, initials, name, sub, pill, stats, back = true, right, logo, children }: {
  g: Grad; initials: string; name: string; sub?: string; pill?: string; stats?: [string, string][];
  back?: boolean; right?: React.ReactNode; logo?: boolean; children?: React.ReactNode;
}) {
  const path = usePathname();
  return (
    <LinearGradient colors={g as unknown as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ marginHorizontal: -20, marginTop: -12, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 56, borderBottomLeftRadius: 36, borderBottomRightRadius: 36, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', right: -60, top: -60, width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(255,255,255,0.10)' }} />
      <Row style={{ justifyContent: 'space-between', minHeight: 44 }}>
        {logo ? <View style={{ backgroundColor: '#FFF', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 }}><Logo height={24} /></View>
          : back ? <IconButton name="chevron-back" label="Back" size={44} tint="rgba(255,255,255,0.18)" color="#FFF" onPress={() => goBack(path)} /> : <View />}
        {right}
      </Row>
      <Row gap={14} style={{ marginTop: 14 }}>
        <View style={{ width: 78, height: 78, borderRadius: 24, backgroundColor: '#E4DDFF', borderWidth: 3, borderColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 28, color: '#46308A' }}>{initials}</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text numberOfLines={1} style={{ fontFamily: fonts.fun, fontSize: 24, color: '#FFF' }}>{name}</Text>
          {sub ? <Text numberOfLines={2} style={{ fontFamily: fonts.regular, fontSize: 13, color: 'rgba(255,255,255,0.88)' }}>{sub}</Text> : null}
          {pill ? (
            <View style={{ alignSelf: 'flex-start', marginTop: 4, backgroundColor: '#F7C948', borderRadius: 12, paddingHorizontal: 10, height: 24, justifyContent: 'center' }}>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 11, color: '#3F2E00' }}>{pill}</Text>
            </View>
          ) : null}
        </View>
      </Row>
      {stats ? (
        <Row gap={8} style={{ marginTop: 16 }}>
          {stats.map(([v, l]) => (
            <View key={l} style={{ flex: 1, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.16)', paddingVertical: 10, alignItems: 'center' }}>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 20, color: '#FFF' }}>{v}</Text>
              <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>{l}</Text>
            </View>
          ))}
        </Row>
      ) : null}
      {children}
    </LinearGradient>
  );
}

/** White card that overlaps the bottom of a HeroHeader. */
export function OverlapCard({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ marginTop: -36, backgroundColor: '#FFF', borderRadius: 28, padding: 14 }, style]}>{children}</View>;
}

/** Card of label/value rows (Bio, profile details). */
export function DetailRows({ rows, style }: { rows: [string, string][]; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ backgroundColor: '#FFF', borderRadius: 24, paddingHorizontal: 16 }, style]}>
      {rows.map(([k, v], i) => (
        <Row key={k} style={{ minHeight: 50, justifyContent: 'space-between', borderBottomWidth: i < rows.length - 1 ? 1 : 0, borderBottomColor: '#EEF3F5', gap: 12 }}>
          <T style={{ color: colors.muted, fontSize: 14 }}>{k}</T>
          <T style={{ fontFamily: fonts.medium, fontSize: 14, flexShrink: 1, textAlign: 'right' }}>{v}</T>
        </Row>
      ))}
    </View>
  );
}

/** Settings section with a small caps title. */
export function SettingsGroup({ title, children }: { title?: string; children: React.ReactNode }) {
  const items = React.Children.toArray(children);
  return (
    <View style={{ marginTop: 14 }}>
      {title ? <T v="label" style={{ marginBottom: 8, marginLeft: 4 }}>{title.toUpperCase()}</T> : null}
      <View style={{ backgroundColor: '#FFF', borderRadius: 24, paddingHorizontal: 14 }}>
        {items.map((c, i) => <View key={i} style={{ borderBottomWidth: i < items.length - 1 ? 1 : 0, borderBottomColor: '#EEF3F5' }}>{c}</View>)}
      </View>
    </View>
  );
}

/** One settings row: icon chip, label (+sub), and a value/chevron or a switch. */
export function SettingRow({ icon, tint = colors.sky, label, sub, value, toggle, onToggle, onPress, danger }: {
  icon: IconName; tint?: readonly [string, string]; label: string; sub?: string; value?: string;
  toggle?: boolean; onToggle?: (v: boolean) => void; onPress?: () => void; danger?: boolean;
}) {
  const body = (
    <Row gap={12} style={{ minHeight: 54, paddingVertical: 8 }}>
      <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: tint[0], alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={17} color={tint[1]} />
      </View>
      <View style={{ flex: 1 }}>
        <T style={{ fontFamily: fonts.medium, fontSize: 14, color: danger ? colors.red : colors.ink }}>{label}</T>
        {sub ? <T v="small" style={{ fontSize: 11 }}>{sub}</T> : null}
      </View>
      {toggle != null ? (
        <Switch accessibilityLabel={label} value={toggle} onValueChange={onToggle} trackColor={{ true: colors.green, false: '#D2E1E5' }} thumbColor="#FFF" />
      ) : (
        <Row gap={4}>{value ? <T v="small">{value}</T> : null}<Ionicons name="chevron-forward" size={16} color={colors.muted} /></Row>
      )}
    </Row>
  );
  if (toggle != null) return body;
  return <Pressable accessibilityRole="button" onPress={onPress}>{body}</Pressable>;
}

/** Labelled text input. */
export function Input({ label, ...props }: React.ComponentProps<typeof TextInput> & { label?: string }) {
  return (
    <View style={{ gap: 6, flex: 1 }}>
      {label ? <T v="small" style={{ fontFamily: fonts.medium }}>{label}</T> : null}
      <TextInput placeholderTextColor={colors.faint} accessibilityLabel={label} {...props}
        style={[{ minHeight: 50, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.line, backgroundColor: '#FFF', paddingHorizontal: 14, fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
          props.multiline && { minHeight: 90, paddingTop: 12, textAlignVertical: 'top' }, props.style]} />
    </View>
  );
}

/** Dropdown: shows the value, opens a list to pick from. */
export function Select<V extends string>({ label, value, options, onChange, compact }: {
  label?: string; value: V; options: readonly V[] | { key: V; label: string }[]; onChange: (v: V) => void; compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const opts = (options as any[]).map((o) => (typeof o === 'string' ? { key: o, label: o } : o)) as { key: V; label: string }[];
  const current = opts.find((o) => o.key === value)?.label ?? value;
  return (
    <View style={{ gap: 6, flex: compact ? undefined : 1 }}>
      {label ? <T v="small" style={{ fontFamily: fonts.medium }}>{label}</T> : null}
      <Pressable accessibilityRole="button" accessibilityLabel={`${label ?? 'Choose'}: ${current}`} onPress={() => setOpen(true)}
        style={{ height: compact ? 42 : 50, borderRadius: compact ? 21 : radius.md, borderWidth: 1.5, borderColor: colors.line, backgroundColor: '#FFF', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <T numberOfLines={1} style={{ flex: compact ? undefined : 1, fontFamily: compact ? fonts.medium : fonts.regular }}>{current}</T>
        <Ionicons name="chevron-down" size={16} color={colors.ink} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable accessibilityLabel="Close" onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(11,42,53,0.42)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#FFF', borderRadius: 24, padding: 8, maxHeight: '70%', width: '100%', maxWidth: 420, alignSelf: 'center' }}>
            <ScrollView>
              {opts.map((o) => (
                <Pressable key={o.key} accessibilityRole="button" onPress={() => { onChange(o.key); setOpen(false); }}
                  style={{ minHeight: 48, borderRadius: 16, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: o.key === value ? colors.sky[0] : 'transparent' }}>
                  <T style={{ flex: 1, fontFamily: o.key === value ? fonts.semibold : fonts.regular }}>{o.label}</T>
                  {o.key === value ? <Ionicons name="checkmark" size={18} color={colors.teal} /> : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

/** Multi-select chips (classes / batches / days). */
export function ToggleChips({ options, value, onChange, activeBg = colors.violet }: { options: string[]; value: string[]; onChange: (v: string[]) => void; activeBg?: string }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <Pressable key={o} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}
            style={{ minHeight: 38, paddingHorizontal: 14, borderRadius: 19, backgroundColor: on ? activeBg : '#EEF3F5', justifyContent: 'center' }}>
            <Text style={{ color: on ? '#FFF' : colors.ink, fontFamily: on ? fonts.semibold : fonts.regular, fontSize: 13 }}>{o}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Single-choice chips with a dark active state (time, class, level). */
export function ChoiceChips<K extends string>({ options, value, onChange }: { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable key={o.key} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => onChange(o.key)}
            style={{ minHeight: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: on ? colors.ink : '#EEF3F5', justifyContent: 'center' }}>
            <Text style={{ color: on ? '#FFF' : colors.ink, fontFamily: on ? fonts.semibold : fonts.regular, fontSize: 13 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** "STEP 1 · Setup" tabs for multi-step forms. */
export function Stepper({ steps, step, onStep }: { steps: string[]; step: number; onStep: (i: number) => void }) {
  return (
    <Row gap={6} style={{ marginBottom: 12 }}>
      {steps.map((s, i) => {
        const on = i === step;
        return (
          <Pressable key={s} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onStep(i)}
            style={{ flex: 1, height: 52, borderRadius: 16, backgroundColor: on ? colors.ink : '#FFF', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 9, color: on ? 'rgba(255,255,255,0.75)' : colors.muted }}>STEP {i + 1}</Text>
            <Text numberOfLines={1} style={{ fontFamily: fonts.semibold, fontSize: 12, color: on ? '#FFF' : colors.ink }}>{s}</Text>
          </Pressable>
        );
      })}
    </Row>
  );
}

/** Colour circles. */
export function Swatches({ colorsList, value, onChange }: { colorsList: string[]; value: string; onChange: (c: string) => void }) {
  return (
    <Row gap={10} style={{ flexWrap: 'wrap' }}>
      {colorsList.map((c) => (
        <Pressable key={c} accessibilityRole="radio" accessibilityLabel={`Colour ${c}`} accessibilityState={{ selected: c === value }} onPress={() => onChange(c)}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c, borderWidth: c === value ? 3 : 0, borderColor: colors.ink }} />
      ))}
    </Row>
  );
}

/** White rounded section card with an optional title row. */
export function Panel({ title, right, children, style }: { title?: string; right?: React.ReactNode; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ backgroundColor: '#FFF', borderRadius: 24, padding: 16, marginTop: 12, gap: 12 }, style]}>
      {title ? <Row style={{ justifyContent: 'space-between' }}><T v="h3">{title}</T>{right}</Row> : null}
      {children}
    </View>
  );
}

/** Small stat box (pastel) used in status rows. */
export function MiniStat({ value, label, tint }: { value: string | number; label: string; tint: readonly [string, string] }) {
  return (
    <View style={{ flex: 1, borderRadius: 20, backgroundColor: tint[0], paddingVertical: 10, paddingHorizontal: 12 }}>
      <Text style={{ fontFamily: fonts.semibold, fontSize: 22, color: tint[1] }}>{value}</Text>
      <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: tint[1] }}>{label}</Text>
    </View>
  );
}

/** Fixed bottom bar with one or two buttons, passed to Screen's overlay. */
export function BottomActions({ children }: { children: React.ReactNode }) {
  const { isPhone } = useLayout();
  const path = usePathname();
  // On phones the tab bar sits at the bottom, so the buttons float just above it (public pages have no tab bar).
  const bottom = isPhone && !path.startsWith('/apply') ? 100 : 16;
  return (
    <View style={{ position: 'absolute', left: 16, right: 16, bottom, flexDirection: 'row', gap: 10, maxWidth: 560, alignSelf: 'center' }}>{children}</View>
  );
}

/** Small round status chip (Live / Draft / New ...). */
export function Status({ text }: { text: string }) {
  const map: Record<string, readonly [string, string]> = {
    live: colors.mint, active: colors.mint, published: colors.mint, approved: colors.mint, admitted: colors.mint, uploaded: colors.mint, results: colors.mint,
    draft: colors.butter, review: colors.lav, 'in review': colors.lav, new: colors.butter, 'on leave': colors.butter, pending: colors.butter,
    rejected: ['#FBD9DC', colors.red], missing: ['#FBD9DC', colors.red],
  };
  const t = map[text.toLowerCase()] ?? colors.sky;
  return (
    <View style={{ backgroundColor: t[0], borderRadius: 12, paddingHorizontal: 10, height: 24, justifyContent: 'center', alignSelf: 'flex-start' }}>
      <Text style={{ color: t[1], fontFamily: fonts.semibold, fontSize: 11 }}>{text}</Text>
    </View>
  );
}

export const go = (href: string) => router.push(href as any);
