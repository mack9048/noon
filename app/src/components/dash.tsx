// Dashboard building blocks (admin, super admin, teacher): soft gradient page, glassy panels,
// big gradient number cards, action tiles, a to-do list with notes, and simple charts.
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleProp, TextInput, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';
import { T } from './ui';
import { api } from '@/lib/api';
import { useLayout } from '@/lib/useLayout';
import { colors, fonts } from '@/theme/tokens';

type Icon = keyof typeof Ionicons.glyphMap;
export type G2 = readonly [string, string];

/** Gradient pairs used across the dashboards. */
export const DG = {
  green: ['#2BC48A', '#0E9F7E'], teal: ['#14B8A6', '#0B7C86'], sky: ['#7CC8F8', '#3A8DDE'], violet: ['#8B5CF6', '#6D28D9'],
  red: ['#FF5A6E', '#E11D48'], orange: ['#FDBA74', '#F97316'], pink: ['#F9A8D4', '#DB2777'],
} as const;
/** Soft panel tints (top-left → bottom-right). */
export const TINT = {
  mint: ['#E9FBF5', '#D3F3EA'], peach: ['#FFF4E8', '#FDE4D2'], lilac: ['#F3EEFF', '#E6DCFF'], sky: ['#EAF6FF', '#D6ECFD'], white: ['#FFFFFF', '#F8FAFC'], rose: ['#FFF1F3', '#FDE0E6'],
} as const;

/** Whole page: soft gradient background and a padded, centred column. */
export function DashPage({ children }: { children: React.ReactNode }) {
  const { isPhone } = useLayout();
  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={['#E4F5F6', '#EEF4FF', '#F6F0FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
      <ScrollView contentContainerStyle={{ padding: isPhone ? 14 : 22, paddingBottom: 120, gap: 16, width: '100%', maxWidth: 1500, alignSelf: 'center' }}>{children}</ScrollView>
    </View>
  );
}

/** Top bar: avatar badge, title and subtitle, and pills / buttons on the right. */
export function DashHeader({ badge, logo, title, sub, right }: { badge: string; logo?: React.ReactNode; title: string; sub: string; right?: React.ReactNode }) {
  return (
    <Glass style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, flexWrap: 'wrap' }}>
      {logo ?? (
        <LinearGradient colors={DG.teal} style={{ width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }}>
          <T style={{ color: '#FFF', fontFamily: fonts.semibold }}>{badge}</T>
        </LinearGradient>
      )}
      <View style={{ flex: 1, minWidth: 180 }}>
        <T style={{ fontFamily: fonts.semibold, fontSize: 18, color: colors.ink }} numberOfLines={1}>{title}</T>
        <T v="small">{sub}</T>
      </View>
      {right ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>{right}</View> : null}
    </Glass>
  );
}

/** Small round icon button / pill for the header. */
export function HeadPill({ icon, label, onPress, tone = 'white', dot }: { icon: Icon; label?: string; onPress?: () => void; tone?: 'white' | 'green' | 'butter'; dot?: boolean }) {
  const bg = tone === 'green' ? '#14A37F' : tone === 'butter' ? '#FFF6D6' : '#FFFFFF';
  const ink = tone === 'green' ? '#FFF' : colors.ink;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label ?? icon} onPress={onPress}
      style={{ height: 40, minWidth: 40, paddingHorizontal: label ? 14 : 0, borderRadius: 20, backgroundColor: bg, borderWidth: tone === 'white' ? 1 : 0, borderColor: '#E3EAF0', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
      <Ionicons name={icon} size={17} color={ink} />
      {label ? <T style={{ fontFamily: fonts.semibold, fontSize: 13, color: ink }}>{label}</T> : null}
      {dot ? <View style={{ position: 'absolute', top: 7, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#E11D48' }} /> : null}
    </Pressable>
  );
}

/** A white, slightly see-through card with a soft shadow. */
export function Glass({ children, style, tint }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; tint?: G2 }) {
  const box: ViewStyle = { borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)', shadowColor: '#1E3A5F', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, overflow: 'hidden' };
  if (tint) return <LinearGradient colors={tint} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[box, style]}>{children}</LinearGradient>;
  return <View style={[box, { backgroundColor: 'rgba(255,255,255,0.82)' }, style]}>{children}</View>;
}

/** A panel with an icon and an upper-case title. */
export function Panel({ icon, title, right, tint = TINT.white, children, style }: { icon: Icon; title: string; right?: React.ReactNode; tint?: G2; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Glass tint={tint} style={[{ padding: 18, gap: 14, flexGrow: 1 }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' }}><Ionicons name={icon} size={17} color={colors.ink} /></View>
        <T style={{ flex: 1, fontFamily: fonts.semibold, fontSize: 13, letterSpacing: 0.8, color: colors.ink }}>{title.toUpperCase()}</T>
        {right}
      </View>
      {children}
    </Glass>
  );
}

/** Small rounded chip used in panel headers. */
export function Chip({ text, onPress, tone = 'violet' }: { text: string; onPress?: () => void; tone?: 'violet' | 'green' | 'red' }) {
  const c = tone === 'green' ? ['#E3F8EF', '#0E8A62'] : tone === 'red' ? ['#FFE4E8', '#C81E45'] : ['#EFE9FF', '#6D28D9'];
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={{ backgroundColor: c[0], borderRadius: 12, paddingHorizontal: 10, height: 26, justifyContent: 'center' }}>
      <T style={{ color: c[1], fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 0.5 }}>{text.toUpperCase()}</T>
    </Pressable>
  );
}

/** Big gradient number card. */
export function BigStat({ label, value, sub, g, icon, onPress, center }: { label: string; value: string | number; sub?: string; g: G2; icon?: Icon; onPress?: () => void; center?: boolean }) {
  return (
    <Pressable accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={`${label}: ${value}`} disabled={!onPress} onPress={onPress} style={{ flex: 1, minWidth: 150 }}>
      <LinearGradient colors={g} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 20, padding: 16, minHeight: 124, justifyContent: 'space-between', overflow: 'hidden' }}>
        <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '45%', backgroundColor: 'rgba(255,255,255,0.06)', borderTopLeftRadius: 80, borderBottomLeftRadius: 80 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: center ? 'center' : 'space-between' }}>
          <T style={{ color: '#FFF', fontFamily: fonts.semibold, fontSize: center ? 11 : 13, letterSpacing: center ? 0.8 : 0 }}>{center ? label.toUpperCase() : label}</T>
          {icon && !center ? <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' }}><Ionicons name={icon} size={15} color={g[1]} /></View> : null}
        </View>
        <T style={{ color: '#FFF', fontFamily: fonts.semibold, fontSize: center ? 26 : 34, lineHeight: center ? 32 : 40, letterSpacing: -0.5, fontVariant: ['tabular-nums'], textAlign: center ? 'center' : 'left' }} numberOfLines={1} adjustsFontSizeToFit>{value}</T>
        {sub ? <T style={{ color: 'rgba(255,255,255,0.92)', fontSize: 12, textAlign: center ? 'center' : 'left' }}>{sub}</T> : null}
      </LinearGradient>
    </Pressable>
  );
}

/** Soft tinted number block (outstanding amounts, cash style). */
export function SoftStat({ label, value, sub, icon, tint, ink = colors.ink, iconTint = '#F97316' }: { label: string; value: string; sub?: string; icon: Icon; tint: G2; ink?: string; iconTint?: string }) {
  return (
    <LinearGradient colors={tint} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, minWidth: 150, borderRadius: 18, padding: 14, gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <T style={{ fontFamily: fonts.medium, color: ink }}>{label}</T>
        <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center' }}><Ionicons name={icon} size={15} color={iconTint} /></View>
      </View>
      {sub ? <T v="small">{sub}</T> : null}
      <T style={{ fontFamily: fonts.semibold, fontSize: 22, color: ink }} numberOfLines={1} adjustsFontSizeToFit>{value}</T>
    </LinearGradient>
  );
}

/** A big tinted action tile ("Receive payment"). */
export function ActionTile({ icon, title, sub, tint, ink, onPress }: { icon: Icon; title: string; sub: string; tint: G2; ink: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={{ flex: 1, minWidth: 150 }}>
      {({ pressed }) => (
        <Glass tint={tint} style={{ padding: 16, gap: 8, minHeight: 124, opacity: pressed ? 0.85 : 1 }}>
          <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' }}><Ionicons name={icon} size={20} color={ink} /></View>
          <T style={{ fontFamily: fonts.semibold, color: ink, marginTop: 'auto' }}>{title}</T>
          <T style={{ fontSize: 12, color: ink, opacity: 0.8 }}>{sub}</T>
        </Glass>
      )}
    </Pressable>
  );
}

/** Columns that stack on phones: [3 parts] on desktop, 2 on tablet, 1 on phone. */
export function DashRow({ children, cols = 3 }: { children: React.ReactNode; cols?: number }) {
  const { device } = useLayout();
  const n = device === 'phone' ? 1 : device === 'tablet' ? Math.min(2, cols) : cols;
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
      {items.map((c, i) => <View key={i} style={{ width: n === 1 ? '100%' : `${(100 - (n - 1) * 1.6) / n}%` as any, flexGrow: 1, flexDirection: 'column' }}>{c}</View>)}
    </View>
  );
}

/** Bars for the last months (one or two series). */
export function Bars({ data, a, b, colorsA = DG.green, colorB = '#FDA4AF', height = 150, format }: {
  data: { label: string }[]; a: (d: any) => number; b?: (d: any) => number; colorsA?: G2; colorB?: string; height?: number; format?: (n: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => Math.max(a(d), b ? b(d) : 0)));
  return (
    <View accessibilityLabel={data.map((d) => `${d.label} ${format ? format(a(d)) : a(d)}`).join(', ')} style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: height + 22 }}>
      {data.map((d, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height }}>
            {b ? <View style={{ width: 10, height: Math.max(3, (b(d) / max) * height), borderRadius: 5, backgroundColor: colorB }} /> : null}
            <LinearGradient colors={colorsA} style={{ width: b ? 10 : 22, height: Math.max(3, (a(d) / max) * height), borderRadius: 6 }} />
          </View>
          <T style={{ fontSize: 11, color: colors.muted }}>{d.label}</T>
        </View>
      ))}
    </View>
  );
}

/** A smooth area line for the last months. */
export function AreaLine({ data, color = '#10B981', height = 140 }: { data: { label: string; value: number }[]; color?: string; height?: number }) {
  const [w, setW] = useState(0);
  const max = Math.max(1, ...data.map((d) => d.value));
  const pad = 8;
  const pts = data.map((d, i) => [pad + (i * (w - pad * 2)) / Math.max(1, data.length - 1), pad + (1 - d.value / max) * (height - pad * 2)] as const);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const id = useRef(`g${Math.random().toString(36).slice(2, 8)}`).current;
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} accessibilityLabel={data.map((d) => `${d.label} ${d.value}`).join(', ')}>
      {w ? (
        <Svg width={w} height={height}>
          <Defs><SvgGradient id={id} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={color} stopOpacity="0.35" /><Stop offset="1" stopColor={color} stopOpacity="0.02" /></SvgGradient></Defs>
          <Path d={`${line} L${pts[pts.length - 1][0]},${height} L${pts[0][0]},${height} Z`} fill={`url(#${id})`} />
          <Path d={line} stroke={color} strokeWidth={2.5} fill="none" />
          {pts.map(([x, y], i) => <Circle key={i} cx={x} cy={y} r={3.5} fill="#FFF" stroke={color} strokeWidth={2} />)}
        </Svg>
      ) : <View style={{ height }} />}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 }}>
        {data.map((d) => <T key={d.label} style={{ fontSize: 11, color: colors.muted }}>{d.label}</T>)}
      </View>
    </View>
  );
}

/** Legend dot. */
export const Legend = ({ items }: { items: [string, string][] }) => (
  <View style={{ flexDirection: 'row', gap: 14 }}>
    {items.map(([c, l]) => <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: c }} /><T v="small">{l}</T></View>)}
  </View>
);

/** One line in a "recent" list. */
export function RecentRow({ icon, title, sub, amount, when, iconTint = '#10B981' }: { icon: Icon; title: string; sub: string; amount?: string; when?: string; iconTint?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(15,23,42,0.06)' }}>
      <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#E6F7F1', alignItems: 'center', justifyContent: 'center' }}><Ionicons name={icon} size={17} color={iconTint} /></View>
      <View style={{ flex: 1 }}><T style={{ fontFamily: fonts.semibold }} numberOfLines={1}>{title}</T><T v="small" numberOfLines={1}>{sub}</T></View>
      <View style={{ alignItems: 'flex-end' }}>{amount ? <T style={{ fontFamily: fonts.semibold }}>{amount}</T> : null}{when ? <T v="small">{when}</T> : null}</View>
    </View>
  );
}

/** "2 days ago", "Yesterday", "Just now". */
export function ago(iso?: string | null) {
  if (!iso) return '';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 90) return 'Just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  if (s < 172800) return 'Yesterday';
  return `${Math.round(s / 86400)} days ago`;
}

type Board = { todos: { id: string; text: string; done: boolean }[]; note: string };

/** To-do list and a quick note, saved on the person's account. */
export function TodoNotes() {
  const [b, setB] = useState<Board | null>(null);
  const [text, setText] = useState('');
  const [adding, setAdding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { api.get<Board>('/me/board').then((r) => setB({ todos: r.todos ?? [], note: r.note ?? '' })).catch(() => setB({ todos: [], note: '' })); }, []);
  const save = (next: Board, later = false) => {
    setB(next);
    if (timer.current) clearTimeout(timer.current);
    const go = () => api.put('/me/board', next).catch(() => {});
    if (later) timer.current = setTimeout(go, 700); else go();
  };
  if (!b) return <Panel icon="list-outline" title="To do list" tint={TINT.mint}><T v="small">Loading…</T></Panel>;
  const add = () => { const t = text.trim(); if (!t) return; save({ ...b, todos: [...b.todos, { id: Date.now().toString(36), text: t.slice(0, 160), done: false }] }); setText(''); setAdding(false); };
  return (
    <Panel icon="list-outline" title="To do list" tint={TINT.mint} right={
      <Pressable accessibilityRole="button" accessibilityLabel="Add a task" onPress={() => setAdding(true)} style={{ backgroundColor: '#0E9F7E', borderRadius: 16, height: 32, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Ionicons name="add" size={16} color="#FFF" /><T style={{ color: '#FFF', fontFamily: fonts.semibold, fontSize: 13 }}>Add</T>
      </Pressable>
    }>
      {b.todos.map((t) => (
        <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: t.done }} accessibilityLabel={t.text} onPress={() => save({ ...b, todos: b.todos.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)) })}>
            <Ionicons name={t.done ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={t.done ? '#0E9F7E' : '#9AB4B0'} />
          </Pressable>
          <View style={{ flex: 1, backgroundColor: '#FFF', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 }}>
            <T style={{ textDecorationLine: t.done ? 'line-through' : 'none', color: t.done ? colors.muted : colors.ink }}>{t.text}</T>
          </View>
          <Pressable accessibilityLabel={`Delete ${t.text}`} onPress={() => save({ ...b, todos: b.todos.filter((x) => x.id !== t.id) })}><Ionicons name="trash-outline" size={18} color="#9AA9AE" /></Pressable>
        </View>
      ))}
      {adding ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput autoFocus value={text} onChangeText={setText} onSubmitEditing={add} placeholder="New task…" placeholderTextColor={colors.faint} accessibilityLabel="New task"
            style={{ flex: 1, backgroundColor: '#FFF', borderRadius: 14, paddingHorizontal: 12, height: 42, fontFamily: fonts.regular, fontSize: 15, color: colors.ink, outlineStyle: 'none' } as any} />
          <Pressable onPress={add} style={{ backgroundColor: colors.ink, borderRadius: 14, paddingHorizontal: 14, justifyContent: 'center' }}><T style={{ color: '#FFF', fontFamily: fonts.semibold }}>Save</T></Pressable>
        </View>
      ) : !b.todos.length ? <T v="small">Nothing to do yet. Tap Add.</T> : null}
      <Glass tint={TINT.lilac} style={{ padding: 14, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Ionicons name="document-text-outline" size={17} color={colors.ink} /><T style={{ fontFamily: fonts.semibold, fontSize: 13, letterSpacing: 0.8 }}>NOTES</T></View>
        <TextInput multiline value={b.note} onChangeText={(v) => save({ ...b, note: v.slice(0, 2000) }, true)} placeholder="Write a quick note for today…" placeholderTextColor={colors.faint} accessibilityLabel="Notes"
          style={{ minHeight: 80, backgroundColor: '#FFF', borderRadius: 14, padding: 12, fontFamily: fonts.regular, fontSize: 14, color: colors.ink, textAlignVertical: 'top', outlineStyle: 'none' } as any} />
      </Glass>
    </Panel>
  );
}
