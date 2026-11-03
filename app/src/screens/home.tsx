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
import type { Course } from '@/lib/types';
import { colors, fonts, gradients } from '@/theme/tokens';

const games = [
  { name: 'Car with Harakath', tag: '🔥 NEW GAME', desc: 'Drive to the sign with the right harakah!', emoji: '🚗', g: ['#FF9A3D', '#FF5E7E'], xp: 50 },
  { name: 'Harakath Builder', tag: '🧩 PUZZLE', desc: 'Stack letters, add nuqta and marks', emoji: '🧩', g: ['#8A6CFF', '#5B43E0'], xp: 40 },
  { name: 'River of Letters', tag: '🐸 ADVENTURE', desc: 'Help Froggy hop on the right letter', emoji: '🐸', g: ['#3CC6F0', '#1F6FE0'], xp: 60 },
  { name: 'Town Road', tag: '🎲 BOARD GAME', desc: 'Roll the dice and read your way home', emoji: '🎲', g: ['#4ED68A', '#14945A'], xp: 30 },
];

/** Student home (also used for guests with `guest` flag). */
export function HomeScreen({ guest = false }: { guest?: boolean }) {
  const { user } = useAuth();
  const base = useBase();
  const { device } = useLayout();
  const mine = useApi<Course[]>('/courses?scope=mine');
  const firstCourse = mine.data?.[0];

  return (
    <Screen>
      <Row style={{ height: 52 }}>
        {device === 'phone' ? <Logo /> : <T v="h2">Home</T>}
        {guest ? <Pill text="GUEST" tint={colors.butter[0]} ink={colors.butter[1]} /> : null}
        <View style={{ flex: 1 }} />
        <IconButton name="notifications-outline" label="Notifications" size={44} />
        <IconButton name="person" label="Profile" size={44} tint={colors.pink[0]} color={colors.pink[1]} />
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
            <T style={{ color: '#CFF3F4', fontFamily: fonts.semibold, fontSize: 12 }}>MADRASA SUPPORT</T>
            <T style={{ color: '#FFF', fontFamily: fonts.fun, fontSize: 26, marginTop: 4 }}>Textbooks & classes</T>
            <T style={{ color: '#D9F2F5', fontSize: 13 }}>Video, audio and PDF for your board and class</T>
            <View style={{ marginTop: 14, alignSelf: 'flex-start', backgroundColor: '#FFF', borderRadius: 18, paddingHorizontal: 14, height: 36, justifyContent: 'center' }}>
              <T style={{ color: colors.teal, fontFamily: fonts.semibold }}>Open ›</T>
            </View>
          </GradientCard>
        </Grid>
      </View>

      <GameCarousel base={base} />

      <Section title="Explore" />
      <Grid cols={{ phone: 2, tablet: 4, desktop: 4 }}>
        <IconTile gradient={gradients.quran} icon="book" label="Quran & Hifz" onPress={() => router.push(`${base}/quran` as any)} />
        <IconTile gradient={['#B05CF0', '#7B2FD8']} icon="sparkles" label="Islamic Stories" />
        <IconTile gradient={['#4C8DF6', '#1F5FE0']} icon="bulb" label="Islamic Quiz" />
        <IconTile gradient={['#F2782B', '#D2500E']} icon="moon" label="Special Days" />
      </Grid>

      <Section title="Study tools" />
      <Grid cols={{ phone: 4, tablet: 4, desktop: 4 }} gap={8}>
        <IconTile gradient={gradients.chart} icon="stats-chart" label="Chart" onPress={() => router.push(`${base}/tools/chart` as any)} />
        <IconTile gradient={gradients.adkar} icon="ellipse" label="Adkar" onPress={() => router.push(`${base}/tools/adkar` as any)} />
        <IconTile gradient={gradients.slides} icon="easel" label="Slides" onPress={() => router.push(`${base}/tools/slide` as any)} />
        <IconTile gradient={gradients.forms} icon="clipboard" label="Forms" onPress={() => router.push(`${base}/tools/form` as any)} />
      </Grid>

      {guest ? (
        <Card style={{ marginTop: 16, gap: 10 }}>
          <T v="h3">🔓 Join a madrasa to unlock more</T>
          <T v="small">Class chat · Attendance · Fees · Leave request · Report card</T>
        </Card>
      ) : null}
    </Screen>
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
          <Pressable key={g.name} accessibilityRole="button" accessibilityLabel={`Play ${g.name}`} onPress={() => router.push(`${base}/games` as any)} style={{ marginRight: 12 }}>
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
