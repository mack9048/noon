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
import { isVip, useVip } from '@/lib/vip';
import { colors, fonts } from '@/theme/tokens';

const back = (base: string) => () => (router.canGoBack() ? router.back() : router.replace(base as any));

/* ---------- Play Land ---------- */
type Game = { name: string; icon: keyof typeof Ionicons.glyphMap; cat: 'letters' | 'quran' | 'fun'; bg: string; shade: string; dark?: boolean; stars?: number; lv?: number; cost?: number; route?: string; vip?: boolean };
const GAMES: Game[] = [
  { name: 'Little Driver', icon: 'car-sport', cat: 'letters', bg: '#2EC4B6', shade: '#1E9A8F', dark: true, stars: 3, lv: 4, route: 'car' },
  { name: 'Harakath Builder', icon: 'grid', cat: 'letters', bg: '#E0368C', shade: '#A8236A', stars: 2, lv: 3, route: 'builder' },
  { name: 'Letter Runner', icon: 'pulse', cat: 'fun', bg: '#3D8BFD', shade: '#2563C8', stars: 2, lv: 2, route: 'river' },
  { name: 'Letter Maze', icon: 'git-network', cat: 'letters', bg: '#FFC93C', shade: '#D9A21A', dark: true, stars: 1, lv: 1, route: 'road' },
  { name: 'Quran Echo', icon: 'book', cat: 'quran', bg: '#7A4BE6', shade: '#5631B8', stars: 3, lv: 5, vip: true },
  { name: 'Water the Plants', icon: 'leaf', cat: 'fun', bg: '#7BD148', shade: '#56A22A', dark: true, stars: 1, lv: 1, vip: true },
  { name: 'Ice Cream Shop', icon: 'ice-cream', cat: 'fun', bg: '#FF9EC7', shade: '#D96C9C', dark: true, cost: 120 },
  { name: 'Sleepy Bird', icon: 'moon', cat: 'fun', bg: '#FF7A45', shade: '#D45524', dark: true, cost: 80 },
  { name: 'Letters in Space', icon: 'rocket', cat: 'letters', bg: '#2B2F77', shade: '#181A4F', cost: 150 },
  { name: 'Ayah Puzzle', icon: 'extension-puzzle', cat: 'quran', bg: '#12A6A0', shade: '#0B7874', stars: 2, lv: 2, route: 'ayah' },
];
const CAR_COLOURS = [{ c: '#2EC4B6', n: 'Teal', cost: 0 }, { c: '#FF5E7E', n: 'Pink', cost: 0 }, { c: '#FFC93C', n: 'Yellow', cost: 30 }, { c: '#7A4BE6', n: 'Purple', cost: 50 }, { c: '#2B2F77', n: 'Night blue', cost: 80 }];
const RANK = [['Ameen', 410], ['Hiba', 365], ['you', 240], ['Nihal', 198]] as const;

export function PlayLandScreen() {
  const base = useBase();
  const { user } = useAuth();
  const me = user?.name ?? 'Zayan';
  const [cat, setCat] = useState<'all' | Game['cat']>('all');
  const [stars, setStars] = useState(240);
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [car, setCar] = useState(0);
  const [owned, setOwned] = useState([0, 1]);
  const [msg, setMsg] = useState('Tap a colour to paint your car');
  const shown = GAMES.filter((g) => cat === 'all' || g.cat === cat);
  const vip = isVip(useVip());

  const open = (g: Game) => {
    if (g.vip && !vip) return router.push(`${base}/games/vip` as any);
    if (g.cost && !unlocked.includes(g.name)) {
      if (stars < g.cost) return demoNote(`You need ${g.cost - stars} more stars to unlock ${g.name}. Play other games to earn stars!`);
      setStars(stars - g.cost); setUnlocked([...unlocked, g.name]); return;
    }
    if (g.route) router.push(`${base}/games/${g.route}` as any);
    else demoNote(`${g.name} is coming soon, insha'Allah.`);
  };
  const paint = (i: number) => {
    const k = CAR_COLOURS[i];
    if (owned.includes(i)) { setCar(i); setMsg(`${k.n} car ready!`); return; }
    if (stars < k.cost) { setMsg(`Need ${k.cost - stars} more stars for ${k.n}`); return; }
    setCar(i); setStars(stars - k.cost); setOwned([...owned, i]); setMsg(`Yay! You bought ${k.n} for ${k.cost} stars`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#8ED8F8' }}>
      <LinearGradient colors={['#8ED8F8', '#DDF3FB', '#F6EDD6']} style={StyleSheet.absoluteFill} />
      <Screen bar={false} style={{ backgroundColor: 'transparent' }}>
        <Row gap={10} style={{ height: 52 }}>
          <IconButton name="chevron-back" label="Back" size={44} onPress={back(base)} />
          <Text style={{ fontFamily: fonts.fun, fontSize: 26, color: '#1B3A8C', flex: 1 }}>Play Land</Text>
          <View style={{ height: 34, borderRadius: 17, backgroundColor: '#FFF', paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="timer-outline" size={14} color={colors.ink} /><T style={{ fontFamily: fonts.semibold, fontSize: 13 }}>18m</T>
          </View>
          <View accessibilityLabel={`${stars} stars`} style={{ height: 34, borderRadius: 17, backgroundColor: '#FFD84D', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="star" size={14} color="#2A1600" /><T style={{ fontFamily: fonts.fun, fontSize: 15, color: '#2A1600' }}>{stars}</T>
          </View>
        </Row>

        <Row gap={10} style={{ marginTop: 8 }}>
          <View style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: '#FFB547', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 32 }}>🙂</Text></View>
          <View style={{ flex: 1, backgroundColor: '#FFF', borderRadius: 18, padding: 10 }}>
            <T style={{ fontFamily: fonts.fun, color: '#1B3A8C' }}>Hi {me}, I'm Bulbul!</T>
            <T v="small">Play, earn stars, unlock new worlds ✨</T>
          </View>
        </Row>

        <Pressable accessibilityRole="button" accessibilityLabel="Game of the day: Little Driver" onPress={() => router.push(`${base}/games/car` as any)} style={{ marginTop: 12 }}>
          <LinearGradient colors={['#FF7A45', '#FF5E7E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 170, borderRadius: 28, padding: 16, overflow: 'hidden', borderBottomWidth: 6, borderBottomColor: '#C2304F' }}>
            <View style={{ position: 'absolute', right: 30, top: 18, width: 46, height: 46, borderRadius: 23, backgroundColor: '#FFD84D' }} />
            <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 52, backgroundColor: '#3B3561' }} />
            <Ionicons name="car-sport" size={72} color="#2EC4B6" style={{ position: 'absolute', right: 34, bottom: 24 }} />
            <View style={{ alignSelf: 'flex-start', backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 10, height: 24, justifyContent: 'center' }}>
              <T style={{ color: '#D6336C', fontFamily: fonts.semibold, fontSize: 11 }}>GAME OF THE DAY</T>
            </View>
            <Text style={{ fontFamily: fonts.fun, fontSize: 28, color: '#FFF', marginTop: 6 }}>Little Driver</Text>
            <T style={{ color: '#FFE6EE', fontSize: 12 }}>Drive to the right harakath</T>
            <View style={{ position: 'absolute', left: 16, bottom: 12, backgroundColor: '#FFD84D', borderRadius: 18, height: 36, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="play" size={14} color="#2A1600" /><Text style={{ fontFamily: fonts.fun, fontSize: 17, color: '#2A1600' }}>Play</Text>
            </View>
          </LinearGradient>
        </Pressable>

        <Pressable accessibilityRole="button" accessibilityLabel="Noon Play VIP plans" onPress={() => router.push(`${base}/games/vip` as any)} style={{ marginTop: 12 }}>
          <LinearGradient colors={['#FFC93C', '#F08A24']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 22, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 5, borderBottomColor: '#C27A00' }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="star" size={24} color="#F08A24" /></View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.fun, fontSize: 18, color: '#2A1600' }}>{vip ? 'You are VIP ★' : 'Go VIP'}</Text>
              <T style={{ fontSize: 12, color: '#4A3600' }}>{vip ? 'All VIP games are open · double stars' : 'Unlock every VIP game · from ₹199'}</T>
            </View>
            <View style={{ backgroundColor: '#FFF', borderRadius: 16, height: 32, paddingHorizontal: 14, justifyContent: 'center' }}><T style={{ fontFamily: fonts.semibold, color: '#C2560E' }}>{vip ? 'Plans' : 'See plans'}</T></View>
          </LinearGradient>
        </Pressable>

        <Row gap={8} style={{ marginTop: 14, flexWrap: 'wrap' }}>
          {([['all', 'All'], ['letters', 'أ Letters'], ['quran', 'Quran puzzles'], ['fun', 'Fun']] as const).map(([k, l]) => {
            const on = k === cat;
            return (
              <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setCat(k)}
                style={{ height: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: on ? '#1B3A8C' : '#FFF', justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: on ? '#0F2463' : '#9FCFE6' }}>
                <Text style={{ fontFamily: fonts.fun, fontSize: 14, color: on ? '#FFF' : '#1B3A8C' }}>{l}</Text>
              </Pressable>
            );
          })}
        </Row>

        <View style={{ marginTop: 12 }}>
          <TileRows cols={2} gap={12}>
            {shown.map((g) => {
              const locked = !!g.cost && !unlocked.includes(g.name);
              const fg = g.dark ? '#2A1600' : '#FFF';
              const s = g.stars ?? 0;
              return (
                <Pressable key={g.name} accessibilityRole="button" accessibilityLabel={locked ? `${g.name}, locked, ${g.cost} stars to unlock` : `${g.name}, level ${g.lv ?? 1}`} onPress={() => open(g)}
                  style={{ height: 150, borderRadius: 24, backgroundColor: g.bg, borderBottomWidth: 6, borderBottomColor: g.shade, alignItems: 'center', justifyContent: 'center', padding: 10, overflow: 'hidden', opacity: locked ? 0.92 : 1 }}>
                  <View style={{ position: 'absolute', left: 8, top: 8, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 9, paddingHorizontal: 6, height: 18, justifyContent: 'center' }}>
                    <Text style={{ fontFamily: fonts.semibold, fontSize: 10, color: '#2A1600' }}>{g.cost ? (locked ? 'NEW' : 'Lv 1') : `Lv ${g.lv}`}</Text>
                  </View>
                  {g.vip ? <View style={{ position: 'absolute', right: -22, top: 12, transform: [{ rotate: '35deg' }], backgroundColor: '#F7C948', paddingHorizontal: 24, paddingVertical: 2 }}><Text style={{ fontFamily: fonts.fun, fontSize: 11, color: '#6A4D00' }}>VIP</Text></View> : null}
                  <Ionicons name={locked ? 'lock-closed' : g.vip && !vip ? 'star' : g.icon} size={44} color={fg} />
                  {locked ? (
                    <View style={{ marginTop: 10, backgroundColor: '#FFD84D', borderRadius: 14, height: 28, paddingHorizontal: 12, justifyContent: 'center' }}>
                      <Text style={{ fontFamily: fonts.fun, fontSize: 13, color: '#2A1600' }}>Unlock · ★{g.cost}</Text>
                    </View>
                  ) : (
                    <>
                      <Text numberOfLines={1} style={{ fontFamily: fonts.fun, fontSize: 16, color: fg, marginTop: 8 }}>{g.name}</Text>
                      <Text style={{ color: fg, fontSize: 13 }}>{'★★★'.slice(0, s)}{'☆☆☆'.slice(0, 3 - s)}</Text>
                    </>
                  )}
                </Pressable>
              );
            })}
          </TileRows>
        </View>

        <View style={{ marginTop: 14, backgroundColor: '#FFF', borderRadius: 24, padding: 14, borderBottomWidth: 5, borderBottomColor: '#F2E3B9' }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row gap={6}><Ionicons name="car-outline" size={18} color={colors.ink} /><Text style={{ fontFamily: fonts.fun, fontSize: 17, color: colors.ink }}>My Garage</Text></Row>
            <T v="small">Spend stars on car colours</T>
          </Row>
          <Row gap={14} style={{ marginTop: 10 }}>
            <Ionicons name="car-sport" size={70} color={CAR_COLOURS[car].c} />
            <Row gap={10} style={{ flex: 1, flexWrap: 'wrap' }}>
              {CAR_COLOURS.map((k, i) => (
                <Pressable key={k.c} accessibilityRole="button" accessibilityLabel={`${k.n}${owned.includes(i) ? '' : `, ${k.cost} stars`}`} onPress={() => paint(i)} style={{ alignItems: 'center' }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: k.c, borderWidth: 3, borderColor: i === car ? '#2A1600' : '#FFF' }} />
                  {!owned.includes(i) ? <Text style={{ fontSize: 9, fontFamily: fonts.semibold, backgroundColor: '#FFD84D', borderRadius: 6, paddingHorizontal: 3, marginTop: -6 }}>★{k.cost}</Text> : null}
                </Pressable>
              ))}
            </Row>
          </Row>
          <T v="small" style={{ marginTop: 6 }}>{msg}</T>
        </View>

        <LinearGradient colors={['#7A4BE6', '#5B43E0']} style={{ marginTop: 14, borderRadius: 24, padding: 14, gap: 8, borderBottomWidth: 5, borderBottomColor: '#3A2A85' }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row gap={6}><Ionicons name="trophy-outline" size={18} color="#FFF" /><Text style={{ fontFamily: fonts.fun, fontSize: 17, color: '#FFF' }}>Class ranking</Text></Row>
            <T style={{ color: '#E4DDFF', fontSize: 11 }}>5th E · this week</T>
          </Row>
          {RANK.map(([n, s], i) => {
            const mine = n === 'you';
            return (
              <Row key={n} style={{ height: 40, borderRadius: 14, paddingHorizontal: 12, backgroundColor: mine ? '#FFD84D' : 'rgba(255,255,255,0.16)' }}>
                <T style={{ width: 22, color: mine ? '#2A1600' : '#FFF', fontFamily: fonts.semibold }}>{i + 1}</T>
                <T style={{ flex: 1, color: mine ? '#2A1600' : '#FFF', fontFamily: fonts.semibold }}>{mine ? `${me} (you)` : n}</T>
                <T style={{ color: mine ? '#2A1600' : '#FFF', fontFamily: fonts.semibold }}>★ {mine ? stars : s}</T>
              </Row>
            );
          })}
        </LinearGradient>

        <Pressable accessibilityRole="button" onPress={() => demoNote('Demo: parents set the daily play time and a PIN here.')}
          style={{ marginTop: 12, backgroundColor: '#FFF', borderRadius: 20, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Ionicons name="people-outline" size={22} color={colors.ink} />
          <View style={{ flex: 1 }}><T style={{ fontFamily: fonts.semibold }}>Parent corner</T><T v="small">Daily play time 30 min · PIN locked</T></View>
          <Ionicons name="chevron-forward" size={18} color={colors.ink} />
        </Pressable>
      </Screen>
    </View>
  );
}

/* ---------- Ayah Puzzle (Surah Al-Ikhlas) ---------- */
const AYAHS = [
  { w: ['قُلْ', 'هُوَ', 'اللَّهُ', 'أَحَدٌ'], mix: [2, 0, 3, 1] },
  { w: ['اللَّهُ', 'الصَّمَدُ'], mix: [1, 0] },
  { w: ['لَمْ', 'يَلِدْ', 'وَلَمْ', 'يُولَدْ'], mix: [3, 1, 0, 2] },
  { w: ['وَلَمْ', 'يَكُن', 'لَّهُ', 'كُفُوًا', 'أَحَدٌ'], mix: [3, 0, 4, 2, 1] },
];
const TILE_PAL = [['#FFD84D', '#D9A92A'], ['#7FE0C4', '#3FAE8E'], ['#FF9EC7', '#D96C9C'], ['#8FC8FF', '#4F8FD6'], ['#FFB07A', '#E07A3A']];

export function AyahPuzzleScreen() {
  const base = useBase();
  const [a, setA] = useState(0);
  const [placed, setPlaced] = useState<number[]>([]);
  const [wrong, setWrong] = useState(false);
  const [miss, setMiss] = useState(0);
  const [stars, setStars] = useState(240);
  const cur = AYAHS[a];
  const done = placed.length === cur.w.length;
  const last = a === AYAHS.length - 1;

  const tap = (wi: number) => {
    if (placed.includes(wi) || done) return;
    if (wi === placed.length) {
      const np = [...placed, wi];
      setPlaced(np); setWrong(false);
      if (np.length === cur.w.length) setStars(stars + (miss === 0 ? 10 : 5));
    } else { setWrong(true); setMiss(miss + 1); }
  };
  const next = () => { setA(last ? 0 : a + 1); setPlaced([]); setWrong(false); setMiss(0); };

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={['#7A4BE6', '#9B7BE8', '#F3CFEA']} style={StyleSheet.absoluteFill} />
      <Screen bar={false} style={{ backgroundColor: 'transparent' }}>
        <Row gap={10} style={{ height: 52 }}>
          <IconButton name="chevron-back" label="Back" size={44} onPress={back(base)} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.fun, fontSize: 22, color: '#FFF' }}>Ayah Puzzle</Text>
            <Text style={{ fontSize: 12, color: '#EDE7FF' }}>Surah Al-Ikhlas</Text>
          </View>
          <View style={{ height: 36, borderRadius: 18, backgroundColor: '#FFD84D', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="star" size={14} color="#2A1600" /><Text style={{ fontFamily: fonts.fun, fontSize: 16, color: '#2A1600' }}>{stars}</Text>
          </View>
        </Row>
        <Row gap={6} style={{ marginTop: 8 }}>
          {AYAHS.map((_, i) => <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i < a ? '#FFD84D' : i === a ? '#FFF' : 'rgba(255,255,255,0.35)' }} />)}
        </Row>

        <View style={{ marginTop: 16, backgroundColor: '#FFF', borderRadius: 26, padding: 16, borderBottomWidth: 6, borderBottomColor: '#D9CCF7' }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: fonts.fun, fontSize: 18, color: '#2A1A5E' }}>Ayah {a + 1}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Listen" onPress={() => demoNote('Demo: the ayah plays here.')}
              style={{ height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#F1EDFF', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="volume-medium-outline" size={14} color="#46308A" /><T style={{ color: '#46308A', fontSize: 12, fontFamily: fonts.semibold }}>Listen</T>
            </Pressable>
          </Row>
          <T v="small" style={{ marginTop: 6 }}>Tap the words in the right order. Arabic reads right to left.</T>
          {/* Slots fill from the right */}
          <View style={{ marginTop: 12, backgroundColor: '#F4F1FF', borderRadius: 20, padding: 12, flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, justifyContent: 'center', minHeight: 84 }}>
            {cur.w.map((w, i) => {
              const f = i < placed.length;
              return (
                <View key={i} style={{ minWidth: 56, height: 56, borderRadius: 14, borderWidth: 2, borderStyle: f ? 'solid' : 'dashed', borderColor: f ? '#C9BEF5' : '#9B7BE8', backgroundColor: f ? '#FFF' : 'transparent', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }}>
                  <Text style={{ fontFamily: fonts.arabic, fontSize: 24, color: '#2A1A5E' }}>{f ? w : ''}</Text>
                </View>
              );
            })}
          </View>
          {done || wrong ? (
            <T style={{ marginTop: 10, textAlign: 'center', fontFamily: fonts.semibold, color: done ? '#1E8A4C' : '#C2307E' }}>
              {done ? `MashaAllah! +${miss === 0 ? 10 : 5} stars` : 'Not this one — try again!'}
            </T>
          ) : null}
        </View>

        <View style={{ marginTop: 16, flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
          {cur.mix.map((wi, k) => {
            const used = placed.includes(wi);
            const p = TILE_PAL[k % TILE_PAL.length];
            return (
              <Pressable key={wi} accessibilityRole="button" accessibilityLabel={`Word ${cur.w[wi]}`} accessibilityState={{ disabled: used }} onPress={() => tap(wi)}
                style={{ minWidth: 72, height: 64, borderRadius: 18, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: used ? '#E9E2FF' : p[0], borderBottomWidth: 5, borderBottomColor: used ? '#D9CCF7' : p[1], opacity: used ? 0.6 : 1 }}>
                <Text style={{ fontFamily: fonts.arabic, fontSize: 26, color: used ? '#B8AEDB' : '#2A1600' }}>{cur.w[wi]}</Text>
              </Pressable>
            );
          })}
        </View>

        {done ? (
          <Row gap={10} style={{ marginTop: 18 }}>
            <Pressable accessibilityRole="button" onPress={() => { setPlaced([]); setWrong(false); setMiss(0); }} style={{ flex: 1, height: 52, borderRadius: 26, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: fonts.fun, fontSize: 16, color: '#46308A' }}>Try again</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={next} style={{ flex: 1, height: 52, borderRadius: 26, backgroundColor: '#FFD84D', alignItems: 'center', justifyContent: 'center', borderBottomWidth: 4, borderBottomColor: '#D9A92A' }}>
              <Text style={{ fontFamily: fonts.fun, fontSize: 16, color: '#2A1600' }}>{last ? 'Play again' : 'Next ayah ›'}</Text>
            </Pressable>
          </Row>
        ) : null}
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
    { label: 'PDF Book', icon: 'book-outline', bg: '#CDE6F1', ink: '#0B3F50', shadow: '#9CC9DD', go: `${base}/tools/chart` },
    { label: 'Work Book', icon: 'pencil-outline', bg: '#FFF2C9', ink: '#5C4200', shadow: '#EBD58F', tag: 'NEW' },
    { label: 'Test', icon: 'checkmark-circle-outline', bg: '#E9E2FF', ink: '#3A2A85', shadow: '#C9BEF5', tag: '5 Qs', go: `${base}/learn/exam` },
    { label: 'Report', icon: 'ribbon-outline', bg: '#FDE2F0', ink: '#74266A', shadow: '#EDBEDD', go: `${base}/performance` },
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
        <Pressable accessibilityRole="button" accessibilityLabel="Join live lesson" onPress={() => router.push(`${base}/live/1` as any)}
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
