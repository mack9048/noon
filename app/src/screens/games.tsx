// Games hub and four playable letter games from the design canvas.
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Card, Grid, Header, Row, Screen, Segmented, T } from '@/components/ui';
import { demoNote, SmallButton, Tag } from '@/components/kit';
import { useBase } from '@/lib/useBase';
import { GAMES } from '@/lib/demo';
import { colors, fonts } from '@/theme/tokens';

const big = (size: number, color: string = colors.ink) => ({ fontFamily: fonts.arabic, fontSize: size, lineHeight: size * 1.6, color, textAlign: 'center' as const });
const route: Record<string, string> = { car: 'games/car', builder: 'games/builder', river: 'games/river', road: 'games/road' };

/* ---------- Hub ---------- */
export function GamesHubScreen() {
  const base = useBase();
  const open = (key: string) => (route[key] ? router.push(`${base}/${route[key]}` as any) : demoNote('This game is coming soon.'));
  return (
    <Screen>
      <LinearGradient colors={['#7B5CF0', '#5B43E0']} style={{ marginHorizontal: -16, marginTop: -12, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View><T style={{ fontFamily: fonts.fun, fontSize: 30, color: '#FFF' }}>Play & Learn</T><T style={{ color: '#EDE7FF' }}>Pick a game, Ayisha!</T></View>
          <View style={{ backgroundColor: colors.yellow, borderRadius: 18, paddingHorizontal: 12, height: 36, flexDirection: 'row', alignItems: 'center', gap: 6 }}><Ionicons name="star" size={16} color="#2A1E00" /><T style={{ fontFamily: fonts.semibold, color: '#2A1E00' }}>240</T></View>
        </Row>
        <Pressable accessibilityRole="button" accessibilityLabel="Play Harakath Builder" onPress={() => open('builder')} style={{ marginTop: 16 }}>
          <LinearGradient colors={['#FF9A3D', '#FF5E7E']} style={{ borderRadius: 26, padding: 16, minHeight: 130, overflow: 'hidden' }}>
            <Tag text="NEW GAME" tone="butter" />
            <T style={{ fontFamily: fonts.fun, fontSize: 24, color: '#FFF', marginTop: 6 }}>Harakath{'\n'}Builder</T>
            <View style={{ position: 'absolute', right: 18, top: 18, width: 92, height: 92, borderRadius: 24, backgroundColor: '#FFF', transform: [{ rotate: '8deg' }], alignItems: 'center', justifyContent: 'center' }}><Text style={big(44, colors.violet)}>بَا</Text></View>
            <View style={{ marginTop: 10, alignSelf: 'flex-start', backgroundColor: colors.ink, borderRadius: 18, height: 36, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 6 }}><Ionicons name="play" size={14} color="#FFF" /><T style={{ color: '#FFF', fontFamily: fonts.semibold }}>Play now</T></View>
          </LinearGradient>
        </Pressable>
      </LinearGradient>
      <Row style={{ justifyContent: 'space-between', marginTop: 18, marginBottom: 10 }}><T v="h2">All games</T><T v="small">{GAMES.length} games</T></Row>
      <Grid cols={{ phone: 3, tablet: 5, desktop: 6 }} gap={8}>
        {GAMES.map((g) => (
          <Pressable key={g.key} accessibilityRole="button" accessibilityLabel={g.ready ? `Play ${g.name}` : `${g.name}, coming soon`} onPress={() => open(g.key)}>
            <LinearGradient colors={g.g as unknown as [string, string]} style={{ height: 110, borderRadius: 22, padding: 10, justifyContent: 'space-between', opacity: g.ready ? 1 : 0.75 }}>
              <Text style={[big(26, '#FFF'), { textAlign: 'left' }]} numberOfLines={1}>{g.art}</Text>
              <View>
                <T style={{ color: '#FFF', fontFamily: fonts.semibold, fontSize: 13, lineHeight: 16 }}>{g.name}</T>
                {!g.ready ? <T style={{ color: '#FFF', fontSize: 10 }}>Coming soon</T> : null}
              </View>
            </LinearGradient>
          </Pressable>
        ))}
      </Grid>
    </Screen>
  );
}

/* ---------- Car with Harakath ---------- */
const SIGNS = [['بَ', 'ba', 'fatha'], ['بِ', 'bi', 'kasra'], ['بُ', 'bu', 'damma'], ['تَ', 'ta', 'fatha'], ['تِ', 'ti', 'kasra'], ['تُ', 'tu', 'damma'],
  ['ثَ', 'tha', 'fatha'], ['جِ', 'ji', 'kasra'], ['حُ', 'hu', 'damma'], ['دَ', 'da', 'fatha'], ['رِ', 'ri', 'kasra'], ['سُ', 'su', 'damma']] as const;

export function CarGameScreen() {
  const [i, setI] = useState(0);
  const [running, setRunning] = useState(true);
  const [sound, setSound] = useState(true);
  const [speed, setSpeed] = useState<'1' | '2' | '3'>('2');
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setI((x) => Math.min(SIGNS.length - 1, x + 1)), [5000, 3500, 2200][+speed - 1]);
    return () => clearInterval(t);
  }, [running, speed]);
  const [sign, say, mark] = SIGNS[i];
  return (
    <Screen>
      <Header title="Car with Harakath" right={<Tag text={`${i + 1}/${SIGNS.length}`} tone="white" />} />
      <View style={{ height: 380, borderRadius: 30, overflow: 'hidden', backgroundColor: '#CFEAFE' }}>
        <View style={{ alignSelf: 'center', marginTop: 14, backgroundColor: '#FFF', borderRadius: 18, paddingHorizontal: 14, height: 36, justifyContent: 'center' }}>
          <T>Read the sign: <T style={{ fontFamily: fonts.semibold }}>“{say}”</T> · {mark}</T>
        </View>
        <View style={{ position: 'absolute', left: -40, right: -40, top: 160, height: 140, borderRadius: 140, backgroundColor: '#7FCF8A' }} />
        <View style={{ position: 'absolute', alignSelf: 'center', top: 90, width: 130, height: 110, borderRadius: 22, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', borderWidth: 5, borderColor: colors.yellow }}>
          <Text accessibilityLabel={`Sign ${say}`} style={big(64, colors.yellowDeep)}>{sign}</Text>
        </View>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 120, backgroundColor: '#4E4B6C' }}>
          <View style={{ position: 'absolute', top: 56, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around' }}>{[0, 1, 2, 3, 4].map((k) => <View key={k} style={{ width: 36, height: 6, borderRadius: 3, backgroundColor: '#FFF' }} />)}</View>
        </View>
        <View style={{ position: 'absolute', bottom: 34, left: `${15 + (i / (SIGNS.length - 1)) * 55}%` }}><Ionicons name="car-sport" size={86} color="#2B2F9E" /></View>
      </View>
      <Card style={{ marginTop: 12, gap: 10 }}>
        <Row gap={8}>
          <View style={{ flex: 1 }}><Button title={running ? 'Pause ride' : 'Resume ride'} icon={running ? 'pause' : 'play'} onPress={() => setRunning(!running)} /></View>
          <View style={{ flex: 1 }}><Button title="Next sign" kind="yellow" onPress={() => setI(Math.min(SIGNS.length - 1, i + 1))} /></View>
        </Row>
        <Row gap={8}>
          <View style={{ flex: 1 }}><Button title="Restart" kind="ghost" onPress={() => { setI(0); setRunning(true); }} /></View>
          <View style={{ flex: 1 }}><Button title={`Sound: ${sound ? 'On' : 'Off'}`} kind="ghost" onPress={() => setSound(!sound)} /></View>
        </Row>
        <Row gap={10}><T v="small">Speed</T><View style={{ flex: 1 }}><Segmented value={speed} onChange={setSpeed} options={[{ key: '1', label: 'Slow' }, { key: '2', label: 'Normal' }, { key: '3', label: 'Fast' }]} /></View></Row>
      </Card>
    </Screen>
  );
}

/* ---------- Harakath Builder ---------- */
const LETTERS = [['ا', 'Alif', 'a'], ['ب', 'Baa', 'b'], ['ت', 'Taa', 't'], ['ث', 'Thaa', 'th'], ['ج', 'Jeem', 'j'], ['ح', 'Haa', 'h'], ['خ', 'Khaa', 'kh'],
  ['د', 'Daal', 'd'], ['ذ', 'Dhaal', 'dh'], ['ر', 'Raa', 'r'], ['س', 'Seen', 's'], ['ش', 'Sheen', 'sh'], ['ق', 'Qaaf', 'q'], ['ك', 'Kaaf', 'k'],
  ['ل', 'Laam', 'l'], ['م', 'Meem', 'm'], ['ن', 'Noon', 'n'], ['و', 'Waaw', 'w'], ['ي', 'Yaa', 'y']] as const;
const MARKS = [['', 'None', 'none', ''], ['َ', 'Fatha', 'fatha', 'a'], ['ِ', 'Kasra', 'kasra', 'i'], ['ُ', 'Damma', 'damma', 'u'], ['ْ', 'Sukoon', 'sukoon', ''],
  ['ً', 'Tanween a', 'fathatain', 'an'], ['ٍ', 'Tanween i', 'kasratain', 'in'], ['ٌ', 'Tanween u', 'dammatain', 'un'],
  ['َا', 'Madd alif', 'maddA', 'aa'], ['ُو', 'Madd waw', 'maddW', 'oo'], ['ِي', 'Madd ya', 'maddY', 'ee']] as const;

export function BuilderGameScreen() {
  const [l, setL] = useState(1);
  const [m, setM] = useState(1);
  const [made, setMade] = useState(0);
  const [stars, setStars] = useState(21);
  const [ch, name, sound] = LETTERS[l];
  const [glyph, markName, , vowel] = MARKS[m];
  const shown = ch === 'ا' && m > 0 ? 'أ' + glyph : ch + glyph;
  return (
    <Screen>
      <Header title="Harakath Builder" right={<Tag text={`★ ${stars}`} tone="butter" />} />
      <T v="label">1 · PICK A LETTER</T>
      <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
        {LETTERS.map(([c, n], k) => (
          <Pressable key={n} accessibilityLabel={n} accessibilityState={{ selected: k === l }} onPress={() => setL(k)}
            style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: k === l ? colors.pink[0] : '#FFF', borderWidth: 1.5, borderColor: k === l ? colors.pink[1] : colors.line, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={big(24, colors.pink[1])}>{c}</Text>
          </Pressable>
        ))}
      </View>
      <Card tint="#FFF7EC" style={{ marginTop: 14, alignItems: 'center', gap: 6, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.pink[0] }}>
        <Text style={big(110, colors.pink[1])}>{shown}</Text>
        <T style={{ fontFamily: fonts.semibold, fontSize: 18 }}>“{sound}{vowel}”</T>
        <T v="small">{name} · {markName}</T>
        <Row gap={10}>
          <SmallButton title="Hear it" onPress={() => demoNote('Demo: letter sounds come with the recordings.')} />
          <SmallButton title={`Add · ${made}`} filled onPress={() => { setMade(made + 1); setStars(stars + 1); }} />
        </Row>
      </Card>
      <T v="label" style={{ marginTop: 14 }}>2 · HARAKAH OR MADD</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
        {MARKS.map(([g, short], k) => (
          <Pressable key={short} accessibilityLabel={short} accessibilityState={{ selected: k === m }} onPress={() => setM(k)}
            style={{ width: 74, height: 64, borderRadius: 16, backgroundColor: k === m ? colors.lav[0] : '#FFF', borderWidth: 1.5, borderColor: k === m ? colors.violet : colors.line, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={big(22, colors.lav[1])}>{'ـ' + g}</Text>
            <T style={{ fontSize: 10 }}>{short}</T>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

/* ---------- River of Letters ---------- */
const RIVER = [['بُ', 'bu'], ['كَ', 'ka'], ['مِ', 'mi'], ['تَ', 'ta'], ['بِ', 'bi'], ['ثُ', 'thu'], ['مَ', 'ma'], ['كِ', 'ki'], ['بَ', 'ba']] as const;

export function RiverGameScreen() {
  const order = useMemo(() => ['ta', 'mi', 'bu', 'ka', 'thu', 'ma', 'bi', 'ki', 'ba'], []);
  const [found, setFound] = useState<string[]>([]);
  const [feedback, setFeedback] = useState('');
  const target = order[found.length];
  const tap = (say: string) => {
    if (say === target) { setFound([...found, say]); setFeedback(''); } else setFeedback('Not that one — try again');
  };
  const done = found.length === order.length;
  return (
    <Screen>
      <Header title="River of Letters" right={<Tag text={`${found.length}/${order.length}`} tone="white" />} />
      <View style={{ borderRadius: 30, backgroundColor: '#8FD18A', padding: 14 }}>
        <View style={{ borderRadius: 26, backgroundColor: '#4AB3E8', padding: 14, gap: 14 }}>
          {[0, 1, 2].map((rowI) => (
            <View key={rowI} style={{ flexDirection: rowI % 2 ? 'row-reverse' : 'row', justifyContent: 'space-around' }}>
              {RIVER.slice(rowI * 3, rowI * 3 + 3).map(([c, say]) => {
                const got = found.includes(say);
                return (
                  <Pressable key={say} accessibilityRole="button" accessibilityLabel={got ? `${say}, found` : say} disabled={got || done} onPress={() => tap(say)}
                    style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: got ? colors.mint[0] : '#FFF', borderWidth: 3, borderColor: got ? colors.green : '#E7F4FB', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={big(30, got ? colors.mint[1] : '#C2307E')}>{c}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </View>
      <Card style={{ marginTop: 12, alignItems: 'center', gap: 10 }}>
        {done ? (
          <>
            <T v="h2">MashaAllah! The boat reached home.</T>
            <Button title="Play again" kind="yellow" onPress={() => setFound([])} />
          </>
        ) : (
          <>
            <T style={{ fontSize: 17 }}>Tap the letter that says <T style={{ fontFamily: fonts.semibold, color: colors.violet, fontSize: 17 }}>“{target}”</T></T>
            {feedback ? <T style={{ color: colors.red }}>{feedback}</T> : null}
            <Button title="Hear it again" icon="volume-high-outline" onPress={() => demoNote('Demo: letter sounds come with the recordings.')} />
          </>
        )}
      </Card>
    </Screen>
  );
}

/* ---------- Town Road ---------- */
const ROAD = [['ا', 'Alif'], ['ب', 'Baa'], ['ت', 'Taa'], ['ث', 'Thaa'], ['ج', 'Jeem'], ['ح', 'Haa'], ['خ', 'Khaa'], ['د', 'Daal'], ['ذ', 'Dhaal'], ['ر', 'Raa'], ['ز', 'Zaay'], ['س', 'Seen']] as const;

export function RoadGameScreen() {
  const [pos, setPos] = useState(0);
  const [roll, setRoll] = useState(0);
  const [laps, setLaps] = useState(0);
  const go = () => {
    const r = 1 + Math.floor(Math.random() * 6);
    setRoll(r);
    const next = pos + r;
    if (next >= ROAD.length) setLaps(laps + 1);
    setPos(next % ROAD.length);
  };
  return (
    <Screen>
      <Header title="Town Road" right={<Tag text={`Laps ${laps}`} tone="white" />} />
      <View style={{ borderRadius: 30, backgroundColor: '#9ADB8E', padding: 16 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          {ROAD.map(([c, n], k) => (
            <View key={n} accessibilityLabel={k === pos ? `Your car is on ${n}` : n}
              style={{ width: 70, height: 70, borderRadius: 18, backgroundColor: k === pos ? colors.yellow : '#4E4B6C', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={big(28, k === pos ? '#2A1E00' : '#FFF')}>{c}</Text>
              {k === pos ? <Ionicons name="car" size={18} color="#2A1E00" style={{ position: 'absolute', top: 4, right: 6 }} /> : null}
              {k === 0 ? <T style={{ position: 'absolute', bottom: 2, fontSize: 8, color: k === pos ? '#2A1E00' : '#FFF' }}>BUS STAND</T> : null}
            </View>
          ))}
        </View>
      </View>
      <Card style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}><T v="small">Dice</T><T style={{ fontSize: 26, fontFamily: fonts.semibold }}>{roll || '–'}</T></View>
        <View style={{ flex: 1 }}><T v="small">Read aloud</T><Text style={[big(40), { textAlign: 'left' }]}>{ROAD[pos][0]}</Text><T v="h3">{ROAD[pos][1]}</T></View>
      </Card>
      <View style={{ marginTop: 12 }}><Button title="Roll the dice" kind="yellow" icon="dice-outline" onPress={go} /></View>
      <T v="small" style={{ textAlign: 'center', marginTop: 8 }}>Move your car, then read the letter you land on</T>
    </Screen>
  );
}
