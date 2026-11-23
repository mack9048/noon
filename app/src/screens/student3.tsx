// Play Land (games hub), Ayah Puzzle game and Noon Buds (kids club).
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { IconButton, Row, Screen, T } from '@/components/ui';
import { demoNote } from '@/components/kit';
import { TileRows } from '@/components/kit2';
import { useBase } from '@/lib/useBase';
import { useAuth } from '@/lib/auth';
import { colors, fonts } from '@/theme/tokens';
import { GameThumb, UploadedGames } from './htmlGames';
import { NooniAvatar } from '@/components/Nooni';
import { useApi } from '@/lib/useApi';
import type { HtmlGame } from '@/lib/games';

const back = (base: string) => () => (router.canGoBack() ? router.back() : router.replace(base as any));

/* ---------- Play Land: the Noon games uploaded by Noon Learn (super admin → Games) ---------- */
export function PlayLandScreen() {
  const base = useBase();
  const { user } = useAuth();
  const { data: games } = useApi<HtmlGame[]>('/games');
  const today = games?.length ? games[new Date().getDate() % games.length] : null;
  return (
    <View style={{ flex: 1, backgroundColor: '#8ED8F8' }}>
      <LinearGradient colors={['#8ED8F8', '#DDF3FB', '#F6EDD6']} style={StyleSheet.absoluteFill} />
      <Screen bar={false} style={{ backgroundColor: 'transparent' }}>
        <Row gap={10} style={{ height: 52 }}>
          <IconButton name="chevron-back" label="Back" size={44} onPress={back(base)} />
          <Text style={{ fontFamily: fonts.fun, fontSize: 26, color: '#1B3A8C', flex: 1 }}>Play Land</Text>
        </Row>
        <Row gap={10} style={{ marginTop: 8 }}>
          <NooniAvatar size={62} mood="wave" />
          <View style={{ flex: 1, backgroundColor: '#FFF', borderRadius: 18, padding: 10 }}>
            <T style={{ fontFamily: fonts.fun, color: '#1B3A8C' }}>Hi {user?.name?.split(' ')[0] ?? 'friend'}, shall we play?</T>
            <T v="small">Pick a Noon game and learn while you play.</T>
          </View>
        </Row>
        {today ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`Game of the day: ${today.title}`} onPress={() => router.push(`${base}/games/play/${today.id}` as any)} style={{ marginTop: 12 }}>
            <LinearGradient colors={['#FF7A45', '#FF5E7E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 28, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: 6, borderBottomColor: '#C2304F' }}>
              <GameThumb g={today} size={120} radius={20} />
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ alignSelf: 'flex-start', backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 10, height: 24, justifyContent: 'center' }}>
                  <T style={{ color: '#D6336C', fontFamily: fonts.semibold, fontSize: 11 }}>GAME OF THE DAY</T>
                </View>
                <Text style={{ fontFamily: fonts.fun, fontSize: 24, color: '#FFF' }} numberOfLines={2}>{today.title}</Text>
                <View style={{ alignSelf: 'flex-start', backgroundColor: '#FFD84D', borderRadius: 18, height: 36, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="play" size={14} color="#2A1600" /><Text style={{ fontFamily: fonts.fun, fontSize: 17, color: '#2A1600' }}>Play</Text>
                </View>
              </View>
            </LinearGradient>
          </Pressable>
        ) : null}
        {games && !games.length ? <View style={{ marginTop: 14, backgroundColor: '#FFF', borderRadius: 22, padding: 16 }}><T>New Noon games are coming soon, in sha Allah.</T></View> : null}
        <UploadedGames />
      </Screen>
    </View>
  );
}

/* ---------- Noon Buds (kids club, age 4–8) ---------- */
const DHIKR = [
  { name: 'SubhanAllah', ar: 'سُبْحَانَ اللّٰه', meaning: 'Glory be to Allah', bg: '#EEFAF1', ink: '#14945A' },
  { name: 'Alhamdulillah', ar: 'اَلْحَمْدُ لِلّٰه', meaning: 'All praise is for Allah', bg: '#FFF8E5', ink: '#C27A00' },
  { name: 'Allahu Akbar', ar: 'اَللّٰهُ أَكْبَر', meaning: 'Allah is the Greatest', bg: '#F4F1FF', ink: '#5B43E0' },
];

export function NoonBudsScreen() {
  const base = useBase();
  const { user } = useAuth();
  const [d, setD] = useState(0);
  const [n, setN] = useState(0);
  const dh = DHIKR[d];
  const tiles = [
    { label: 'PDF Book', icon: 'book-outline', bg: '#CDE6F1', ink: '#0B3F50', shadow: '#9CC9DD', go: `${base}/pdf?type=textbook` },
    { label: 'Work Book', icon: 'pencil-outline', bg: '#FFF2C9', ink: '#5C4200', shadow: '#EBD58F', tag: 'NEW', go: `${base}/pdf?type=workbook` },
    { label: 'Test', icon: 'checkmark-circle-outline', bg: '#E9E2FF', ink: '#3A2A85', shadow: '#C9BEF5', tag: '5 Qs', go: base === '/guest' ? '/guest/unlock' : `${base}/learn/exam` },
    { label: 'Report', icon: 'ribbon-outline', bg: '#FDE2F0', ink: '#74266A', shadow: '#EDBEDD', go: base === '/guest' ? '/guest/unlock' : `${base}/performance` },
  ] as const;
  return (
    <Screen bar={false}>
      <View style={{ position: 'absolute', right: -60, top: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: '#DDF3E0' }} />
      <Row gap={10} style={{ height: 52 }}>
        <IconButton name="chevron-back" label="Back" size={44} onPress={back(base)} />
        <Ionicons name="leaf" size={18} color="#14945A" />
        <Text style={{ fontFamily: fonts.fun, fontSize: 20, color: '#14945A', flex: 1 }}>Noon Buds</Text>
        <View style={{ height: 32, borderRadius: 16, backgroundColor: '#FFF2C9', paddingHorizontal: 10, justifyContent: 'center' }}><T style={{ fontFamily: fonts.semibold }}>★85</T></View>
      </Row>
      <Row gap={12} style={{ marginTop: 8 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFC93C', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="person-outline" size={30} color="#2A1600" /></View>
        <View><T v="small">Assalamu alaikum,</T><Text style={{ fontFamily: fonts.fun, fontSize: 28, color: colors.ink }}>{user?.name ?? 'Zayan'}! 👋</Text></View>
      </Row>

      <LinearGradient colors={['#14945A', '#4ED68A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ marginTop: 14, borderRadius: 28, padding: 18, overflow: 'hidden', borderBottomWidth: 6, borderBottomColor: '#0E6B40' }}>
        <View style={{ alignSelf: 'flex-start', backgroundColor: '#FF5C8A', borderRadius: 12, paddingHorizontal: 10, height: 24, justifyContent: 'center' }}><T style={{ color: '#FFF', fontFamily: fonts.semibold, fontSize: 11 }}>● LIVE TODAY · 4:00 PM</T></View>
        <Text style={{ fontFamily: fonts.fun, fontSize: 28, color: '#FFF', marginTop: 8 }}>Lesson 5</Text>
        <T style={{ color: '#E5F8EC' }}>Letters ث ت ب with Ayisha Miss</T>
        <Pressable accessibilityRole="button" accessibilityLabel="Join live lesson" onPress={() => router.push(`${base}/live` as any)}
          style={{ marginTop: 12, alignSelf: 'flex-start', backgroundColor: '#FFF', borderRadius: 22, height: 44, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="play" size={16} color="#14945A" /><Text style={{ fontFamily: fonts.fun, fontSize: 18, color: '#14945A' }}>Join</Text>
        </Pressable>
        <Ionicons name="leaf-outline" size={48} color="#FFF" style={{ position: 'absolute', right: 20, bottom: 18 }} />
      </LinearGradient>

      <View style={{ marginTop: 12 }}>
        <TileRows cols={2} gap={12}>
          {tiles.map((t) => (
            <Pressable key={t.label} accessibilityRole="button" accessibilityLabel={t.label} onPress={() => ('go' in t && t.go ? router.push(t.go as any) : demoNote('Demo: your work book opens here.'))}
              style={{ height: 120, borderRadius: 24, backgroundColor: t.bg, borderBottomWidth: 6, borderBottomColor: t.shadow, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Ionicons name={t.icon} size={40} color={t.ink} />
              <Text style={{ fontFamily: fonts.fun, fontSize: 18, color: t.ink }}>{t.label}</Text>
              {'tag' in t ? <View style={{ position: 'absolute', right: 10, top: 10, backgroundColor: '#FFF', borderRadius: 9, paddingHorizontal: 6, height: 18, justifyContent: 'center' }}><Text style={{ fontSize: 10, fontFamily: fonts.semibold, color: t.ink }}>{t.tag}</Text></View> : null}
            </Pressable>
          ))}
        </TileRows>
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel="Play game" onPress={() => router.push(`${base}/games` as any)} style={{ marginTop: 12 }}>
        <LinearGradient colors={['#FF9A3D', '#FF5E7E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 76, borderRadius: 26, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 12, borderBottomWidth: 6, borderBottomColor: '#C2304F' }}>
          <Ionicons name="game-controller-outline" size={32} color="#FFF" /><Text style={{ fontFamily: fonts.fun, fontSize: 26, color: '#FFF' }}>Play game</Text>
        </LinearGradient>
      </Pressable>

      <View style={{ marginTop: 12, backgroundColor: '#FFF', borderRadius: 26, padding: 14 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Row gap={6}><Ionicons name="flower-outline" size={18} color={colors.ink} /><Text style={{ fontFamily: fonts.fun, fontSize: 17, color: colors.ink }}>Dhikr</Text></Row>
          <Pressable accessibilityRole="button" accessibilityLabel={`Change dhikr, now ${dh.name}`} onPress={() => { setD((d + 1) % DHIKR.length); setN(0); }}
            style={{ height: 34, paddingHorizontal: 12, borderRadius: 17, borderWidth: 1.5, borderColor: colors.line, justifyContent: 'center' }}>
            <T style={{ fontFamily: fonts.semibold, fontSize: 13 }}>{dh.name} ▾</T>
          </Pressable>
        </Row>
        <Pressable accessibilityRole="button" accessibilityLabel={`Count ${dh.name}, ${n} of 33`} onPress={() => setN(n >= 33 ? 0 : n + 1)}
          style={{ marginTop: 12, borderRadius: 22, backgroundColor: dh.bg, alignItems: 'center', paddingVertical: 18 }}>
          <Text style={{ fontFamily: fonts.arabic, fontSize: 34, color: colors.ink }}>{dh.ar}</Text>
          <T v="small">{dh.meaning}</T>
          <Text style={{ fontFamily: fonts.fun, fontSize: 30, color: dh.ink, marginTop: 6 }}>{n} / 33</Text>
          <T v="small">{n >= 33 ? 'MashaAllah! You finished!' : 'Tap to count'}</T>
        </Pressable>
      </View>
    </Screen>
  );
}
