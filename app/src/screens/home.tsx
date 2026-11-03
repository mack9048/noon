import React, { useState } from 'react';
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
  const firstCourse = mine.data?.[0];

  return (
    <Screen overlay={<AskAiButton base={base} />}>
      <Row style={{ height: 52 }}>
        {device === 'phone' ? <Logo /> : <T v="h2">Home</T>}
        {guest ? <Pill text="GUEST" tint={colors.butter[0]} ink={colors.butter[1]} /> : null}
        <View style={{ flex: 1 }} />
        <IconButton name="notifications-outline" label="Notifications" size={44} onPress={() => router.push(`${base}/chat` as any)} />
        <IconButton name="person" label="My profile" size={44} tint={colors.pink[0]} color={colors.pink[1]}
          onPress={() => router.push((guest ? '/guest/more' : '/student/profile') as any)} />
      </Row>
      <T v="fun" style={{ marginTop: 8 }}>Assalamu alaikum, {user?.name ?? 'friend'} 👋</T>

      {/* Featured: Noon Courses + Madrasa Support side by side on tablet/desktop */}
      <View style={{ marginTop: 14 }}>
        <Grid cols={{ phone: 1, tablet: 2, desktop: 2 }} gap={12}>
          <GradientCard colors={gradients.courses} onPress={() => router.push(firstCourse ? `${base}/courses/${firstCourse.id}` as any : `${base}/courses` as any)} style={{ minHeight: 160 }}>
            {firstCourse?.next_live_at ? <T style={{ color: '#FFE6F6', fontFamily: fonts.semibold, fontSize: 12 }}>● LIVE {firstCourse.next_live_at.toUpperCase()}</T> : null}
            <T style={{ color: '#FFF', fontFamily: fonts.fun, fontSize: 26, marginTop: 4 }}>Noon Courses</T>
            <T style={{ color: '#EDE7FF', fontSize: 13 }}>{mine.data?.length ?? 0} courses{firstCourse?.progress != null ? ` · ${firstCourse.title} ${firstCourse.progress}%` : ''}</T>
            <View style={{ marginTop: 14, alignSelf: 'flex-start', backgroundColor: '#FFF', borderRadius: 18, paddingHorizontal: 14, height: 36, justifyContent: 'center' }}>
              <T style={{ color: colors.lav[1], fontFamily: fonts.semibold }}>Continue course ›</T>
            </View>
          </GradientCard>
          <GradientCard colors={gradients.support} onPress={() => router.push(`${base}/support` as any)} style={{ minHeight: 160 }}>
            <T style={{ position: 'absolute', right: 16, bottom: 6, fontFamily: fonts.arabic, fontSize: 56, color: 'rgba(255,255,255,0.85)' }}>مدرسة</T>
            <T style={{ color: '#CFF3F4', fontFamily: fonts.semibold, fontSize: 12 }}>{guest ? 'MADRASA SUPPORT' : 'AP BOARD · CLASS 5'}</T>
            <T style={{ color: '#FFF', fontFamily: fonts.fun, fontSize: 26, marginTop: 4 }}>{guest ? 'Textbooks & classes' : 'Madrasa Support'}</T>
            <T style={{ color: '#D9F2F5', fontSize: 13 }}>Textbooks, video & audio classes</T>
            <View style={{ marginTop: 14, alignSelf: 'flex-start', backgroundColor: '#FFF', borderRadius: 18, paddingHorizontal: 14, height: 36, justifyContent: 'center' }}>
              <T style={{ color: colors.teal, fontFamily: fonts.semibold }}>{guest ? 'Try free lessons ›' : 'Fiqh · Lesson 4 ›'}</T>
            </View>
          </GradientCard>
        </Grid>
      </View>

      {!guest ? (
        <>
          <Row style={{ justifyContent: 'space-between', marginTop: 18, marginBottom: 10 }}>
            <T v="h2">Next class</T>
            <Pressable accessibilityRole="button" onPress={() => router.push('/student/classroom' as any)}><T style={{ color: colors.teal, fontFamily: fonts.medium }}>My classroom</T></Pressable>
          </Row>
          <Card onPress={() => router.push('/student/classroom' as any)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: colors.lav[0], alignItems: 'center', justifyContent: 'center' }}><T style={{ fontFamily: fonts.arabic, fontSize: 34, color: colors.lav[1] }}>ع</T></View>
            <View style={{ flex: 1 }}>
              <T v="h3">Arabic Class</T>
              <Row gap={4}><Ionicons name="time-outline" size={14} color={colors.muted} /><T v="small">Today, 4:30 PM</T></Row>
            </View>
            <View accessibilityLabel="Classes on Mon, Wed and Thu" style={{ alignItems: 'flex-end', gap: 4 }}>
              <T v="small">This week</T>
              <Row gap={4}>
                {['s', 'm', 't', 'w', 't', 'f', 's'].map((d, k) => (
                  <View key={k} style={{ alignItems: 'center', gap: 2 }}>
                    <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: k === 1 ? colors.violet : k === 3 || k === 4 ? colors.teal : colors.line }} />
                    <T style={{ fontSize: 9, color: k === 1 ? colors.violet : colors.muted }}>{d}</T>
                  </View>
                ))}
              </Row>
            </View>
          </Card>
        </>
      ) : null}

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
