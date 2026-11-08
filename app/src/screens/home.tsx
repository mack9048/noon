import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Card, GradientCard, Grid, IconButton, IconTile, Pill, Row, Screen, T } from '@/components/ui';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/useApi';
import { useBase } from '@/lib/useBase';
import { useLayout } from '@/lib/useLayout';
import { demoNote } from '@/components/kit';
import { HOME_CLASSES } from '@/lib/demo';
import type { Course } from '@/lib/types';
import { colors, fonts, gradients } from '@/theme/tokens';

const games = [
  { key: 'car', name: 'Car with Harakath', tag: '🔥 NEW GAME', desc: 'Drive to the sign with the right harakah!', emoji: '🚗', g: ['#FF9A3D', '#FF5E7E'], xp: 50 },
  { key: 'builder', name: 'Harakath Builder', tag: '🧩 PUZZLE', desc: 'Stack letters, add nuqta and marks', emoji: '🧩', g: ['#8A6CFF', '#5B43E0'], xp: 40 },
  { key: 'river', name: 'River of Letters', tag: '🐸 ADVENTURE', desc: 'Help Froggy hop on the right letter', emoji: '🐸', g: ['#3CC6F0', '#1F6FE0'], xp: 60 },
  { key: 'road', name: 'Town Road', tag: '🎲 BOARD GAME', desc: 'Roll the dice and read your way home', emoji: '🎲', g: ['#4ED68A', '#14945A'], xp: 30 },
];

/** Student home (also used for guests with `guest` flag). */
export function HomeScreen({ guest = false }: { guest?: boolean }) {
  const { user } = useAuth();
  const base = useBase();
  const { device } = useLayout();
  const mine = useApi<Course[]>('/courses?scope=mine');

  return (
    <Screen bar={false} overlay={<AskAiButton base={base} />}>
      <Row style={{ height: 52 }}>
        {device === 'phone' ? <Logo /> : <T v="h2">Home</T>}
        {guest ? <Pill text="GUEST" tint={colors.butter[0]} ink={colors.butter[1]} /> : null}
        <View style={{ flex: 1 }} />
        <IconButton name="notifications-outline" label="Notifications" size={44} onPress={() => router.push(`${base}/chat` as any)} />
        <IconButton name="person" label="My profile" size={44} tint={colors.pink[0]} color={colors.pink[1]}
          onPress={() => router.push((guest ? '/guest/more' : '/student/profile') as any)} />
      </Row>

      {/* My classes slider (students), then Madrasa Support + Noon Courses side by side */}
      {!guest ? <ClassCarousel base={base} /> : null}
      <View style={{ marginTop: 14 }}>
        <Grid cols={{ phone: 2, tablet: 2, desktop: 2 }} gap={10}>
          <HalfCard g={gradients.support} label={guest ? 'MADRASA · DEMO' : 'AP · CLASS 5'} title={'Madrasa\nSupport'} ink={colors.teal}
            art={<T style={{ position: 'absolute', right: 10, bottom: 30, fontFamily: fonts.arabic, fontSize: 36, color: 'rgba(255,255,255,0.85)' }}>مدرسة</T>}
            onPress={() => router.push(`${base}/support` as any)} />
          <HalfCard g={gradients.courses} label={`${mine.data?.length ?? 0} COURSES`} title={'Noon\nCourses'} ink={colors.lav[1]}
            art={<Ionicons name="school" size={40} color="rgba(255,255,255,0.85)" style={{ position: 'absolute', right: 12, bottom: 34 }} />}
            onPress={() => router.push(`${base}/courses` as any)} />
        </Grid>
      </View>

      <GameCarousel base={base} />

      <Section title="Explore" />
      <GradientCard colors={gradients.quran} onPress={() => router.push(`${base}/quran` as any)} style={{ marginBottom: 10 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View><T style={{ color: '#FFF', fontFamily: fonts.fun, fontSize: 22 }}>Quran & Hifz</T><T style={{ color: '#D7F5E6' }}>Read, listen and memorise</T></View>
          <View style={{ backgroundColor: '#FFF', borderRadius: 18, paddingHorizontal: 14, height: 36, justifyContent: 'center' }}><T style={{ color: '#0E7A50', fontFamily: fonts.semibold }}>Open</T></View>
        </Row>
      </GradientCard>
      <Grid cols={{ phone: 3, tablet: 3, desktop: 3 }}>
        <IconTile gradient={['#B05CF0', '#7B2FD8']} icon="sparkles" label="Stories" onPress={() => router.push(`${base}/audio` as any)} />
        <IconTile gradient={['#4C8DF6', '#1F5FE0']} icon="bulb" label="Quiz" onPress={() => router.push(`${base}/games` as any)} />
        <IconTile gradient={['#F2782B', '#D2500E']} icon="moon" label="Special Days" onPress={() => demoNote('Demo: Islamic calendar and special days come soon.')} />
      </Grid>

      <Section title="Study tools" />
      <Grid cols={{ phone: 4, tablet: 4, desktop: 4 }} gap={8}>
        <IconTile gradient={gradients.chart} icon="stats-chart" label="Chart" onPress={() => router.push(`${base}/tools/chart` as any)} />
        <IconTile gradient={gradients.adkar} icon="ellipse" label="Adkar" onPress={() => router.push(`${base}/tools/adkar` as any)} />
        <IconTile gradient={gradients.slides} icon="easel" label="Slides" onPress={() => router.push(`${base}/tools/slide` as any)} />
        <IconTile gradient={gradients.forms} icon="clipboard" label="Forms" onPress={() => router.push(`${base}/tools/form` as any)} />
      </Grid>

      {guest ? (
        <Card onPress={() => router.push('/guest/more' as any)} style={{ marginTop: 16, gap: 10 }}>
          <T v="h3">🔓 Join a madrasa to unlock more</T>
          <T v="small">Class chat · Attendance · Fees · Leave request · Report card</T>
        </Card>
      ) : null}
    </Screen>
  );
}

/** Floating "Ask AI" button above the tab bar. */
function AskAiButton({ base }: { base: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Ask Noon AI" onPress={() => router.push(`${base}/ai` as any)}
      style={({ pressed }) => ({ position: 'absolute', right: 16, bottom: 104, flexDirection: 'row', alignItems: 'center', gap: 8, height: 52, paddingLeft: 6, paddingRight: 16, borderRadius: 26, backgroundColor: colors.ink, opacity: pressed ? 0.85 : 1 })}>
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.pink[0], alignItems: 'center', justifyContent: 'center' }}><Ionicons name="sparkles" size={18} color={colors.pink[1]} /></View>
      <T style={{ color: '#FFF', fontFamily: fonts.semibold }}>Ask AI</T>
    </Pressable>
  );
}

function Section({ title }: { title: string }) {
  return <T v="h2" style={{ marginTop: 18, marginBottom: 10 }}>{title}</T>;
}

function GameCarousel({ base }: { base: string }) {
  const { width } = useWindowDimensions();
  const { device, gutter } = useLayout();
  const [i, setI] = useState(0);
  const slideW = device === 'phone' ? width - gutter * 2 : Math.min(520, (Math.min(width, 1200) - 300) / 1.6);
  return (
    <View style={{ marginTop: 18 }}>
      <Row style={{ justifyContent: 'space-between', marginBottom: 10 }}>
        <T v="h2">Latest games</T>
      </Row>
      <ScrollView horizontal pagingEnabled={device === 'phone'} snapToInterval={slideW + 12} decelerationRate="fast" showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setI(Math.round(e.nativeEvent.contentOffset.x / (slideW + 12)))}>
        {games.map((g) => (
          <Pressable key={g.name} accessibilityRole="button" accessibilityLabel={`Play ${g.name}`} onPress={() => router.push(`${base}/games/${g.key}` as any)} style={{ marginRight: 12 }}>
            <LinearGradient colors={g.g as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: slideW, height: 180, borderRadius: 30, padding: 16, overflow: 'hidden' }}>
              <View style={{ position: 'absolute', right: -30, top: -30, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.16)' }} />
              <T style={{ position: 'absolute', right: 14, bottom: 6, fontSize: 96 }}>{g.emoji}</T>
              <Pill text={g.tag} tint="rgba(255,255,255,0.25)" ink="#FFF" />
              <T style={{ fontFamily: fonts.fun, fontSize: 24, color: '#FFF', marginTop: 8, maxWidth: '60%' }}>{g.name}</T>
              <T style={{ color: '#FFF', fontSize: 12, opacity: 0.92, maxWidth: '58%' }}>{g.desc}</T>
              <Row style={{ marginTop: 'auto' }}>
                <View style={{ backgroundColor: '#FFF', borderRadius: 21, height: 42, paddingLeft: 6, paddingRight: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: g.g[1], alignItems: 'center', justifyContent: 'center' }}><Ionicons name="play" size={13} color="#FFF" /></View>
                  <T style={{ fontFamily: fonts.fun, fontSize: 16, color: colors.ink }}>Play</T>
                </View>
                <Pill text={`⭐ +${g.xp} XP`} tint="rgba(0,0,0,0.16)" ink="#FFF" />
              </Row>
            </LinearGradient>
          </Pressable>
        ))}
      </ScrollView>
      <Row gap={6} style={{ justifyContent: 'center', marginTop: 8 }}>
        {games.map((g, k) => <View key={g.name} style={{ width: k === i ? 22 : 8, height: 8, borderRadius: 4, backgroundColor: k === i ? colors.violet : '#C9D6DB' }} />)}
      </Row>
    </View>
  );
}

/** Small gradient card with a label, a two-line title and an "Open" pill (design: Main). */
function HalfCard({ g, label, title, ink, art, onPress }: { g: readonly string[]; label: string; title: string; ink: string; art: React.ReactNode; onPress: () => void }) {
  return (
    <GradientCard colors={g} onPress={onPress} style={{ height: 150, padding: 14, borderRadius: 26 }}>
      {art}
      <T style={{ color: 'rgba(255,255,255,0.85)', fontFamily: fonts.semibold, fontSize: 11 }}>{label}</T>
      <T style={{ color: '#FFF', fontFamily: fonts.fun, fontSize: 19, lineHeight: 21, marginTop: 2 }}>{title}</T>
      <View style={{ marginTop: 'auto', alignSelf: 'flex-start', backgroundColor: '#FFF', borderRadius: 15, height: 30, paddingHorizontal: 12, justifyContent: 'center' }}>
        <T style={{ color: ink, fontFamily: fonts.semibold, fontSize: 12 }}>Open ›</T>
      </View>
    </GradientCard>
  );
}

/** "My classes" slider with arrows and dots (design: Main). */
function ClassCarousel({ base }: { base: string }) {
  const { width } = useWindowDimensions();
  const { device, gutter } = useLayout();
  const [i, setI] = useState(0);
  const ref = useRef<ScrollView>(null);
  const slideW = device === 'phone' ? width - gutter * 2 : Math.min(520, (Math.min(width, 1200) - 300) / 1.6);
  const n = HOME_CLASSES.length;
  const go = (k: number) => { const j = (k + n) % n; setI(j); ref.current?.scrollTo({ x: j * (slideW + 12), animated: true }); };
  return (
    <View style={{ marginTop: 14 }}>
      <Row style={{ justifyContent: 'space-between', marginBottom: 10 }}>
        <T v="h2">My classes</T>
        <Pressable accessibilityRole="link" onPress={() => router.push(`${base}/classroom` as any)}><T style={{ color: colors.teal, fontFamily: fonts.semibold, fontSize: 13 }}>See all</T></Pressable>
      </Row>
      <ScrollView ref={ref} horizontal pagingEnabled={device === 'phone'} snapToInterval={slideW + 12} decelerationRate="fast" showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setI(Math.round(e.nativeEvent.contentOffset.x / (slideW + 12)))}>
        {HOME_CLASSES.map((c) => (
          <View key={c.name} accessibilityLabel={c.name} style={{ marginRight: 12 }}>
            <LinearGradient colors={c.g as unknown as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: slideW, height: 214, borderRadius: 30, padding: 16, overflow: 'hidden' }}>
              <View style={{ position: 'absolute', right: -40, top: -50, width: 210, height: 210, borderRadius: 105, backgroundColor: 'rgba(255,255,255,0.14)' }} />
              <T style={{ position: 'absolute', right: 20, top: 18, fontFamily: fonts.arabic, fontSize: 84, color: 'rgba(255,255,255,0.9)' }}>{c.glyph}</T>
              <Pill text={c.tag} tint={c.hot ? 'rgba(255,92,138,0.9)' : 'rgba(255,255,255,0.25)'} ink="#FFF" />
              <T numberOfLines={2} style={{ fontFamily: fonts.fun, fontSize: c.name.length > 14 ? 23 : 26, lineHeight: 28, color: '#FFF', marginTop: 10, maxWidth: '72%' }}>{c.name}</T>
              <T style={{ color: '#FFF', fontSize: 13, opacity: 0.92, marginTop: 4 }}>{c.teacher}</T>
              <Row gap={6} style={{ marginTop: 6 }}><Ionicons name="time-outline" size={14} color="#FFF" /><T style={{ color: '#FFF', fontSize: 13, fontFamily: fonts.medium }}>{c.time}</T></Row>
              <Row style={{ marginTop: 'auto' }}>
                <Pressable accessibilityRole="button" accessibilityLabel={`${c.cta}: ${c.name}`} onPress={() => router.push(`${base}${c.href}` as any)}
                  style={{ backgroundColor: '#FFF', borderRadius: 21, height: 42, paddingLeft: 6, paddingRight: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c.btn, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={c.icon} size={14} color="#FFF" /></View>
                  <T style={{ fontFamily: fonts.fun, fontSize: 16, color: c.btn }}>{c.cta}</T>
                </Pressable>
                <View style={{ alignSelf: 'center' }}><Pill text={c.src} tint="rgba(0,0,0,0.16)" ink="#FFF" /></View>
              </Row>
            </LinearGradient>
          </View>
        ))}
      </ScrollView>
      <Row gap={8} style={{ justifyContent: 'center', marginTop: 8 }}>
        <IconButton name="chevron-back" label="Previous class" size={26} onPress={() => go(i - 1)} />
        {HOME_CLASSES.map((c, k) => (
          <Pressable key={c.name} accessibilityRole="button" accessibilityLabel={c.name} accessibilityState={{ selected: k === i }} onPress={() => go(k)} hitSlop={8}
            style={{ width: k === i ? 22 : 8, height: 8, borderRadius: 4, backgroundColor: k === i ? HOME_CLASSES[i].btn : '#C9D6DB' }} />
        ))}
        <IconButton name="chevron-forward" label="Next class" size={26} onPress={() => go(i + 1)} />
      </Row>
    </View>
  );
}
