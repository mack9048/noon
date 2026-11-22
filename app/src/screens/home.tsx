import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { GradientCard, IconButton, IconTile, Pill, Row, Screen, T } from '@/components/ui';
import { Logo } from '@/components/Logo';
import { TileRows } from '@/components/kit2';
import { GameThumb } from './htmlGames';
import type { HtmlGame } from '@/lib/games';
import { demoNote } from '@/components/kit';
import { useApi } from '@/lib/useApi';
import { useBase } from '@/lib/useBase';
import { useLayout } from '@/lib/useLayout';
import { useAuth } from '@/lib/auth';
import type { Course } from '@/lib/types';
import { colors, fonts, gradients } from '@/theme/tokens';

const SLIDE_G: [string, string][] = [['#8A6CFF', '#5B43E0'], ['#FF9A3D', '#FF5E7E'], ['#3CC6F0', '#1F6FE0'], ['#4ED68A', '#14945A']];

const CAMPUS_LIFE = [
  { name: 'Arts Fest', meta: 'Entries open', icon: 'color-palette-outline', tint: colors.pink },
  { name: 'Magazine', meta: 'Nov issue', icon: 'newspaper-outline', tint: colors.sky },
  { name: 'Election', meta: 'Vote by Fri', icon: 'checkbox-outline', tint: colors.butter },
] as const;

/** Logo, notifications and profile: top of Campus and Classroom. */
export function BrandRow({ base, title }: { base: string; title?: string }) {
  const { device } = useLayout();
  const { user } = useAuth();
  return (
    <Row style={{ height: 52 }}>
      {device === 'phone' ? <Logo height={32} /> : <T v="h2">{title ?? ''}</T>}
      <View style={{ flex: 1 }} />
      <View>
        <IconButton name="notifications-outline" label="Notifications, 1 new" size={44} onPress={() => router.push(`${base}/chat` as any)} />
        <View style={{ position: 'absolute', right: 2, top: 2, width: 10, height: 10, borderRadius: 5, backgroundColor: '#D63BAF', borderWidth: 2, borderColor: '#FFF' }} />
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="My profile" onPress={() => router.push(`${base}/profile` as any)}
        style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.pink[0], alignItems: 'center', justifyContent: 'center', marginLeft: 8 }}>
        <T style={{ fontFamily: fonts.semibold, fontSize: 18, color: colors.pink[1] }}>{(user?.name ?? 'A')[0]}</T>
      </Pressable>
    </Row>
  );
}

/** Student home: "My Campus". */
// Only once per app start: a student with a course lands in Classroom (their next lesson).
let openedApp = false;

export function HomeScreen() {
  const base = useBase();
  const mine = useApi<Course[]>('/courses?scope=mine');
  useEffect(() => {
    if (openedApp || mine.loading) return;
    openedApp = true;
    if (mine.data?.length) router.replace(`${base}/classroom` as any);
  }, [mine.loading]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Screen bar={false}>
      <BrandRow base={base} title="Campus" />
      <T v="h1" style={{ marginTop: 10 }}>My Campus</T>
      <T v="small">Noon Campus · everything in one place</T>

      <View style={{ marginTop: 12 }}>
<CampusCard g={gradients.courses} tag={`MADRASA SUPPORT · ${mine.data?.length ?? 0} ENROLLED`} title={'Our\nCourses'} icon="school" ink={colors.lav[1]}
          onPress={() => router.push(`${base}/courses` as any)} />
      </View>

      <GameCarousel base={base} />

      <T v="h2" style={{ marginTop: 18, marginBottom: 10 }}>Campus life</T>
      <TileRows cols={3} gap={10}>
        {CAMPUS_LIFE.map((l) => (
          <Pressable key={l.name} accessibilityRole="button" accessibilityLabel={l.name} onPress={() => demoNote(`Demo: ${l.name} opens here once your institution posts it.`)}
            style={{ height: 112, borderRadius: 22, backgroundColor: l.tint[0], padding: 12, justifyContent: 'space-between' }}>
            <Ionicons name={l.icon} size={28} color={l.tint[1]} />
            <View>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: l.tint[1] }}>{l.name}</Text>
              <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: l.tint[1] }}>{l.meta}</Text>
            </View>
          </Pressable>
        ))}
      </TileRows>

      <T v="h2" style={{ marginTop: 18, marginBottom: 10 }}>Explore</T>
      <TileRows cols={3} gap={10}>
        <IconTile gradient={['#B05CF0', '#7B2FD8']} icon="sparkles" label="Stories" onPress={() => router.push(`${base}/audio` as any)} />
        <IconTile gradient={['#4C8DF6', '#1F5FE0']} icon="bulb" label="Quiz" onPress={() => router.push(`${base}/games` as any)} />
        <IconTile gradient={['#F2782B', '#D2500E']} icon="moon" label="Special Days" onPress={() => demoNote('Demo: Islamic calendar and special days come soon.')} />
      </TileRows>
    </Screen>
  );
}

function CampusCard({ g, tag, title, icon, ink, onPress }: { g: readonly string[]; tag: string; title: string; icon: keyof typeof Ionicons.glyphMap; ink: string; onPress: () => void }) {
  return (
    <GradientCard colors={g} onPress={onPress} style={{ height: 136, padding: 14, borderRadius: 26 }}>
      <Ionicons name={icon} size={38} color="rgba(255,255,255,0.9)" style={{ position: 'absolute', right: 14, bottom: 16 }} />
      <T style={{ color: 'rgba(255,255,255,0.88)', fontFamily: fonts.semibold, fontSize: 11 }}>{tag}</T>
      <T style={{ color: '#FFF', fontFamily: fonts.fun, fontSize: 19, lineHeight: 21, marginTop: 2 }}>{title}</T>
      <View style={{ marginTop: 'auto', alignSelf: 'flex-start', backgroundColor: '#FFF', borderRadius: 15, height: 30, paddingHorizontal: 12, justifyContent: 'center' }}>
        <T style={{ color: ink, fontFamily: fonts.semibold, fontSize: 12 }}>Open ›</T>
      </View>
    </GradientCard>
  );
}

/** Floating "Ask AI" button above the tab bar. */
export function AskAiButton({ base }: { base: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Ask Noon AI" onPress={() => router.push(`${base}/ai` as any)}
      style={({ pressed }) => ({ position: 'absolute', right: 16, bottom: 104, flexDirection: 'row', alignItems: 'center', gap: 8, height: 52, paddingLeft: 6, paddingRight: 16, borderRadius: 26, backgroundColor: colors.ink, opacity: pressed ? 0.85 : 1 })}>
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.pink[0], alignItems: 'center', justifyContent: 'center' }}><Ionicons name="sparkles" size={18} color={colors.pink[1]} /></View>
      <T style={{ color: '#FFF', fontFamily: fonts.semibold }}>Ask AI</T>
    </Pressable>
  );
}

/** "Play Area" slider with arrows and dots. */
function GameCarousel({ base }: { base: string }) {
  const { width } = useWindowDimensions();
  const { device, gutter } = useLayout();
  const [i, setI] = useState(0);
  const ref = useRef<ScrollView>(null);
  const slideW = device === 'phone' ? width - gutter * 2 : Math.min(520, (Math.min(width, 1200) - 300) / 1.6);
  const games = useApi<HtmlGame[]>('/games').data ?? [];
  const n = Math.max(1, games.length);
  const go = (k: number) => { const j = (k + n) % n; setI(j); ref.current?.scrollTo({ x: j * (slideW + 12), animated: true }); };
  if (!games.length) return null;
  return (
    <View style={{ marginTop: 18 }}>
      <Row style={{ justifyContent: 'space-between', marginBottom: 10 }}>
        <T v="h2">Play Area</T>
        <Row gap={6}>
          <IconButton name="chevron-back" label="Previous game" size={32} onPress={() => go(i - 1)} />
          <IconButton name="chevron-forward" label="Next game" size={32} onPress={() => go(i + 1)} />
        </Row>
      </Row>
      <ScrollView ref={ref} horizontal pagingEnabled={device === 'phone'} snapToInterval={slideW + 12} decelerationRate="fast" showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setI(Math.round(e.nativeEvent.contentOffset.x / (slideW + 12)))}>
        {games.map((g, k) => {
          const c = SLIDE_G[k % SLIDE_G.length];
          return (
            <Pressable key={g.id} accessibilityRole="button" accessibilityLabel={`Play ${g.title}`} onPress={() => router.push(`${base}/games/play/${g.id}` as any)} style={{ marginRight: 12 }}>
              <LinearGradient colors={c} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: slideW, height: 180, borderRadius: 30, padding: 16, overflow: 'hidden' }}>
                <View style={{ position: 'absolute', right: 14, top: 14 }}><GameThumb g={g} size={150} radius={22} /></View>
                <Pill text={g.mode === 'group' ? 'GROUP GAME' : 'NOON GAME'} tint="rgba(255,255,255,0.25)" ink="#FFF" />
                <T style={{ fontFamily: fonts.fun, fontSize: 24, color: '#FFF', marginTop: 8, maxWidth: '50%' }} numberOfLines={3}>{g.title}</T>
                {g.age_group ? <T style={{ color: '#FFF', fontSize: 12, opacity: 0.92 }}>Age {g.age_group}</T> : null}
                <Row style={{ marginTop: 'auto' }}>
                  <View style={{ backgroundColor: '#FFF', borderRadius: 21, height: 42, paddingLeft: 6, paddingRight: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c[1], alignItems: 'center', justifyContent: 'center' }}><Ionicons name="play" size={13} color="#FFF" /></View>
                    <T style={{ fontFamily: fonts.fun, fontSize: 16, color: c[1] }}>Play</T>
                  </View>
                </Row>
              </LinearGradient>
            </Pressable>
          );
        })}
      </ScrollView>
      <Row gap={6} style={{ justifyContent: 'center', marginTop: 8 }}>
        {games.map((g, k) => (
          <Pressable key={g.id} accessibilityRole="tab" accessibilityLabel={g.title} accessibilityState={{ selected: k === i }} onPress={() => go(k)} hitSlop={8}
            style={{ width: k === i ? 22 : 8, height: 8, borderRadius: 4, backgroundColor: k === i ? SLIDE_G[i % SLIDE_G.length][1] : '#C9D6DB' }} />
        ))}
      </Row>
    </View>
  );
}
