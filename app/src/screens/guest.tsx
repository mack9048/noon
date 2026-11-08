// Guest app from the design canvas: explore everything, 2 free demo lessons per subject.
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Logo } from '@/components/Logo';
import { TileRows } from '@/components/kit2';
import { Button, Card, Grid, Header, IconButton, Row, Screen, T } from '@/components/ui';
import { Chips, demoNote, Glyph, ListRow, pastel, Section, Tag } from '@/components/kit';
import { Field } from './auth';
import { api, ApiError } from '@/lib/api';
import { homeFor, useAuth } from '@/lib/auth';
import type { User } from '@/lib/types';
import { colors, fonts, gradients } from '@/theme/tokens';

const FREE_LESSONS = 2;

/* ---------- Home ---------- */
const PLAY = [['Car with Harakath', 'car', ['#FF9A3D', '#FF5E7E'], 'car-sport-outline'], ['Harakath Builder', 'builder', ['#8A6CFF', '#5B43E0'], 'extension-puzzle-outline'], ['River of Letters', 'river', ['#3CC6F0', '#1F6FE0'], 'map-outline'], ['Town Road', 'road', ['#4ED68A', '#14945A'], 'dice-outline']] as const;
const FEATURES: [string, keyof typeof Ionicons.glyphMap, [string, string], string | null][] = [
  ['Quran & Hifz', 'book', ['#3DD9A8', '#0E7A50'], '/guest/quran'], ['Ask AI', 'sparkles', ['#7D9BFF', '#4255E0'], '/guest/ai'],
  ['Adkar', 'ellipse', ['#FFD25A', '#F08A24'], '/guest/tools/adkar'], ['Charts', 'stats-chart', ['#FFB86B', '#E8681E'], '/guest/tools/chart'],
  ['Slides', 'easel', ['#FF7EC4', '#C2307E'], '/guest/tools/slide'], ['Audio books', 'headset', ['#B05CF0', '#7B2FD8'], '/guest/audio'],
  ['Live class', 'videocam', ['#FF8FA3', '#D6336C'], null], ['Class chat', 'chatbubbles', ['#5EE08F', '#1E8A4C'], null],
  ['Attendance', 'calendar', ['#7D9BFF', '#4255E0'], null], ['Fees', 'receipt', ['#FFD25A', '#F08A24'], null],
  ['Report card', 'ribbon', ['#3DD9A8', '#0E7A50'], null], ['Leave', 'airplane', ['#FF7EC4', '#C2307E'], null],
];

export function GuestHomeScreen() {
  return (
    <Screen bar={false}>
      <Row style={{ height: 52 }}>
        <Logo height={32} />
        <Tag text="GUEST" tone="butter" />
        <View style={{ flex: 1 }} />
        <Button title="Sign up" kind="ghost" onPress={() => router.push('/guest/unlock' as any)} style={{ height: 40 }} />
      </Row>
      <T v="fun" style={{ marginTop: 8 }}>Assalamu alaikum! 👋</T>
      <T v="h2">Explore Noon Learn</T>

      <Card tint={colors.butter[0]} style={{ marginTop: 12, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <T style={{ fontSize: 30 }}>🎁</T>
        <T style={{ flex: 1, color: colors.butter[1] }}><T style={{ fontFamily: fonts.semibold, color: colors.butter[1] }}>2 free demo lessons </T>in every subject of every class. Sign up or join your madrasa to unlock all.</T>
      </Card>

      <View style={{ marginTop: 12 }}>
        <Grid cols={{ phone: 1, tablet: 2, desktop: 2 }} gap={12}>
          <Pressable accessibilityRole="button" onPress={() => router.push('/guest/demo-classes' as any)}>
            <LinearGradient colors={gradients.support as unknown as [string, string]} style={{ borderRadius: 30, padding: 18, minHeight: 150, overflow: 'hidden' }}>
              <T style={{ position: 'absolute', right: 16, bottom: 4, fontFamily: fonts.arabic, fontSize: 56, color: 'rgba(255,255,255,0.85)' }}>مدرسة</T>
              <T style={{ color: '#CFF3F4', fontFamily: fonts.semibold, fontSize: 12 }}>MADRASA CLASSES · DEMO</T>
              <T style={{ color: '#FFF', fontFamily: fonts.fun, fontSize: 24 }}>Class 1 to +2</T>
              <T style={{ color: '#D9F2F5' }}>AP · EK · General boards</T>
              <View style={{ marginTop: 12, alignSelf: 'flex-start', backgroundColor: '#FFF', borderRadius: 18, height: 36, paddingHorizontal: 14, justifyContent: 'center' }}><T style={{ color: colors.teal, fontFamily: fonts.semibold }}>▶ Try free lessons</T></View>
            </LinearGradient>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.push('/guest/demo-course' as any)}>
            <LinearGradient colors={gradients.courses as unknown as [string, string]} style={{ borderRadius: 30, padding: 18, minHeight: 150, overflow: 'hidden' }}>
              <T style={{ color: '#FFE6F6', fontFamily: fonts.semibold, fontSize: 12 }}>NOON COURSES · DEMO</T>
              <T style={{ color: '#FFF', fontFamily: fonts.fun, fontSize: 24 }}>5 courses to try</T>
              <T style={{ color: '#EDE7FF' }}>Arabic, Thajweed, Fiqh, Seerah, Hifz</T>
              <View style={{ marginTop: 12, alignSelf: 'flex-start', backgroundColor: '#FFF', borderRadius: 18, height: 36, paddingHorizontal: 14, justifyContent: 'center' }}><T style={{ color: colors.lav[1], fontFamily: fonts.semibold }}>▶ Watch a demo</T></View>
            </LinearGradient>
          </Pressable>
        </Grid>
      </View>

      <Section title="Play & learn · free" />
      <TileRows cols={2} gap={10}>
        {PLAY.map(([name, key, g, icon]) => (
          <Pressable key={key} accessibilityRole="button" accessibilityLabel={`Play ${name}`} onPress={() => router.push(`/guest/games/${key}` as any)}>
            <LinearGradient colors={g as unknown as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 104, borderRadius: 22, padding: 14, overflow: 'hidden' }}>
              <T style={{ color: '#FFF', fontFamily: fonts.fun, fontSize: 15, lineHeight: 17, maxWidth: '70%' }}>{name}</T>
              <View style={{ marginTop: 'auto', alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 11, paddingHorizontal: 10, height: 22, justifyContent: 'center' }}>
                <T style={{ color: '#FFF', fontFamily: fonts.semibold, fontSize: 10 }}>PLAY</T>
              </View>
              <Ionicons name={icon} size={38} color="#FFF" style={{ position: 'absolute', right: 12, bottom: 12 }} />
            </LinearGradient>
          </Pressable>
        ))}
      </TileRows>

      <Section title="All features" />
      <TileRows cols={4} gap={8}>
        {FEATURES.map(([label, icon, g, href]) => (
          <Pressable key={label} accessibilityRole="button" accessibilityLabel={href ? label : `${label}, locked for guests`} onPress={() => router.push((href ?? '/guest/unlock') as any)}
            style={{ height: 96, borderRadius: 20, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <View>
              <LinearGradient colors={g} style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={icon} size={22} color="#FFF" />
              </LinearGradient>
              {!href ? <View style={{ position: 'absolute', right: -8, top: -8, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' }}><Ionicons name="lock-closed" size={9} color="#FFF" /></View> : null}
            </View>
            <T numberOfLines={1} style={{ fontSize: 11, fontFamily: fonts.medium }}>{label}</T>
          </Pressable>
        ))}
      </TileRows>
      <Pressable accessibilityRole="link" onPress={() => router.push('/guest/unlock' as any)} style={{ marginTop: 12, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="lock-closed-outline" size={13} color={colors.muted} />
        <T v="small">Chat, attendance, fees and reports open after you join a madrasa</T>
      </Pressable>
    </Screen>
  );
}


/** Coloured top band with back button, a small title and white chips (guest demos). */
function GuestBand({ g, kicker, children }: { g: [string, string]; kicker: string; children: React.ReactNode }) {
  return (
    <LinearGradient colors={g} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ marginHorizontal: -20, marginTop: -12, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 44, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: 'hidden', gap: 12 }}>
      <View style={{ position: 'absolute', right: -60, top: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.10)' }} />
      <Row gap={12}>
        <IconButton name="chevron-back" label="Back" size={44} tint="rgba(255,255,255,0.2)" color="#FFF" onPress={() => (router.canGoBack() ? router.back() : router.replace('/guest' as any))} />
        <T style={{ color: '#FFF', fontFamily: fonts.semibold, fontSize: 13, flex: 1 }}>{kicker}</T>
      </Row>
      {children}
    </LinearGradient>
  );
}

function BandChips<K extends string>({ options, value, onChange, dark }: { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void; dark?: boolean }) {
  return (
    <Row gap={8} style={{ flexWrap: 'wrap' }}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable key={o.key} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(o.key)}
            style={{ height: 36, paddingHorizontal: 14, borderRadius: 18, justifyContent: 'center', backgroundColor: on ? (dark ? colors.ink : '#FFF') : 'rgba(255,255,255,0.18)' }}>
            <T style={{ fontFamily: fonts.semibold, fontSize: 13, color: on ? (dark ? '#FFF' : colors.ink) : '#FFF' }}>{o.label}</T>
          </Pressable>
        );
      })}
    </Row>
  );
}

/* ---------- Madrasa classes demo ---------- */
const DEMO_SUBJECTS: Record<string, string[]> = {
  Fiqh: ['Thaharah — purity', 'Types of water', 'Najas and cleaning', 'Wudu — steps', 'What breaks wudu', 'Ghusl', 'Tayammum', 'Times of Salah'],
  Quran: ['Surah Al-Fatiha', 'Surah An-Nas', 'Surah Al-Falaq', 'Surah Al-Ikhlas', 'Surah Al-Masad', 'Surah An-Nasr', 'Surah Al-Kafirun', 'Surah Al-Kawthar'],
  Thajweed: ['Makharij introduction', 'Heavy and light letters', 'Noon sakin', 'Meem sakin', 'Madd basics', 'Qalqala', 'Ghunna', 'Waqf signs'],
  Thareekh: ['Life in Makkah', 'Birth of the Prophet ﷺ', 'Early years', 'First revelation', 'Hijra', 'Life in Madinah', 'Badr', 'Fath Makkah'],
  Aqeedah: ['Belief in Allah', 'Angels', 'Books', 'Messengers', 'Last Day', 'Qadr', 'Names of Allah', 'Review'],
  Akhlaq: ['Truthfulness', 'Kindness to parents', 'Respect for teachers', 'Cleanliness', 'Sharing', 'Patience', 'Good speech', 'Review'],
};

function LockedCard({ text }: { text: string }) {
  return (
    <Card tint={colors.ink} style={{ marginTop: 12, gap: 8 }}>
      <T v="h3" style={{ color: '#FFF' }}>🔒 This lesson is locked</T>
      <T style={{ color: '#D9E6EA' }}>{text}</T>
      <Row gap={10}>
        <View style={{ flex: 1 }}><Button title="Unlock all lessons" kind="yellow" onPress={() => router.push('/guest/unlock' as any)} /></View>
      </Row>
    </Card>
  );
}

export function GuestClassesDemoScreen() {
  const [board, setBoard] = useState<'AP' | 'EK' | 'GEN'>('AP');
  const [cls, setCls] = useState('5');
  const [subject, setSubject] = useState<string>('Fiqh');
  const [playing, setPlaying] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const lessons = DEMO_SUBJECTS[subject];
  return (
    <Screen bar={false}>
      <GuestBand g={['#0B5166', '#1F8AA8']} kicker="Free demo · 2 lessons per subject">
        <T style={{ color: '#FFF', fontFamily: fonts.fun, fontSize: 28, marginTop: -4 }}>Madrasa classes</T>
        <BandChips value={board} onChange={setBoard} options={[{ key: 'AP', label: 'AP board' }, { key: 'EK', label: 'EK board' }, { key: 'GEN', label: 'General' }]} />
        <Row gap={6} style={{ flexWrap: 'wrap' }}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '+1', '+2'].map((c) => (
            <Pressable key={c} accessibilityLabel={`Class ${c}`} accessibilityState={{ selected: cls === c }} onPress={() => setCls(c)}
              style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: cls === c ? colors.yellow : 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
              <T style={{ fontFamily: fonts.semibold, color: cls === c ? '#2A1E00' : '#FFF' }}>{c}</T>
            </Pressable>
          ))}
        </Row>
        <BandChips dark value={subject} onChange={(s) => { setSubject(s); setPlaying(null); setLocked(false); }} options={Object.keys(DEMO_SUBJECTS).map((k) => ({ key: k, label: k }))} />
      </GuestBand>
      <View style={{ marginTop: -26, marginBottom: 10 }}>
        <TileRows cols={2} gap={10}>
          <Card tint={colors.butter[0]} onPress={() => demoNote('Demo: the textbook PDF opens here.')} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 }}>
            <Ionicons name="book-outline" size={22} color={colors.butter[1]} />
            <View style={{ flex: 1 }}><T style={{ fontFamily: fonts.semibold, color: colors.butter[1] }}>Textbook</T><T v="small" style={{ color: colors.butter[1] }}>First 4 pages free</T></View>
          </Card>
          <Card tint={colors.pink[0]} onPress={() => demoNote('Demo: class notes open here.')} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 }}>
            <Ionicons name="document-text-outline" size={22} color={colors.pink[1]} />
            <View style={{ flex: 1 }}><T style={{ fontFamily: fonts.semibold, color: colors.pink[1] }}>Class notes</T><T v="small" style={{ color: colors.pink[1] }}>Lesson 1–2 free</T></View>
          </Card>
        </TileRows>
      </View>
      {playing !== null ? (
        <Card tint={colors.mint[0]} style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1 }}><T v="small" style={{ color: colors.mint[1] }}>NOW PLAYING · FREE DEMO</T><T v="h3">{lessons[playing]}</T></View>
          <Pressable accessibilityLabel="Stop" onPress={() => setPlaying(null)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="stop" size={16} color="#FFF" /></Pressable>
        </Card>
      ) : null}
      <View style={{ gap: 8, marginTop: 8 }}>
        {lessons.map((title, i) => {
          const free = i < FREE_LESSONS;
          return (
            <ListRow key={title} onPress={() => (free ? (setPlaying(i), setLocked(false)) : setLocked(true))}
              left={<Glyph text={String(i + 1)} size={40} tint={free ? pastel.mint : ['#E3ECEF', colors.muted]} />}
              title={title} sub={`Lesson ${i + 1} · ${subject} · Class ${cls}`}
              right={free ? <Tag text="FREE" tone="mint" /> : <Ionicons name="lock-closed" size={18} color={colors.muted} />} />
          );
        })}
      </View>
      {locked ? <LockedCard text="You've seen the free demo. Unlock every lesson, textbook and class note for your class." /> : null}
    </Screen>
  );
}

/* ---------- Noon Course demo ---------- */
const DEMO_COURSES = [
  ['Arabic', 'Arabic for Beginners', 'Ustad Ahmed', 'ع', colors.lav], ['Thajweed', 'Thajweed Level 1', 'Safwan Usthad', 'ت', colors.mint],
  ['Fiqh', 'Fiqh of Salah', 'Ayisha Miss', 'ف', colors.sky], ['Seerah', 'Seerah Stories', 'Noon Learn', 'س', colors.pink], ['Hifz', 'Hifz Juz Amma', 'Noon Learn', 'ح', colors.butter],
] as const;

export function GuestCourseDemoScreen() {
  const [c, setC] = useState(0);
  const [locked, setLocked] = useState(false);
  const [short, title, teacher, glyph, tint] = DEMO_COURSES[c];
  const items = [
    ['video', 'Lesson 1 · Introduction', 'Recorded video · 8:40', true], ['audio', 'Lesson 1 · Listen and repeat', 'Audio note · 3:05', true],
    ['live', 'Live class · Lesson 2', `Live with ${teacher} · weekly`, false], ['video', 'Lesson 2 · Practice', 'Recorded video · 10:15', false],
    ['pdf', 'Worksheet 1', 'PDF note · 2 pages', false], ['test', 'Quiz 1', 'Assessment · 10 questions', false],
  ] as const;
  const icon: Record<string, keyof typeof Ionicons.glyphMap> = { video: 'play', audio: 'musical-notes', live: 'videocam', pdf: 'document-text', test: 'checkbox' };
  return (
    <Screen bar={false}>
      <GuestBand g={['#5B43E0', '#9B7BE8']} kicker="NOON COURSES · FREE DEMO">
        <BandChips value={String(c)} onChange={(k) => { setC(+k); setLocked(false); }} options={DEMO_COURSES.map(([s], i) => ({ key: String(i), label: s }))} />
        <T style={{ position: 'absolute', right: 20, bottom: 18, fontFamily: fonts.arabic, fontSize: 90, color: 'rgba(255,255,255,0.18)' }}>{glyph}</T>
        <View><T style={{ color: '#FFF', fontFamily: fonts.fun, fontSize: 28 }}>{title}</T><T style={{ color: '#EDE7FF' }}>{teacher} · {short}</T></View>
      </GuestBand>
      <Card style={{ marginTop: -26, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Ionicons name="film-outline" size={24} color={colors.ink} />
        <View style={{ flex: 1 }}><T v="h3">Try 2 lessons free</T><T v="small">Live classes, notes and tests open after you unlock</T></View>
      </Card>
      <View style={{ gap: 8, marginTop: 10 }}>
        {items.map(([kind, t, meta, free]) => (
          <ListRow key={t} onPress={() => (free ? demoNote(`Demo: "${t}" plays here.`) : setLocked(true))}
            left={<View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: free ? colors.sky[0] : '#E3ECEF', alignItems: 'center', justifyContent: 'center' }}><Ionicons name={icon[kind]} size={20} color={free ? colors.teal : colors.muted} /></View>}
            title={t} sub={meta} right={free ? <Tag text="FREE" tone="mint" /> : <Ionicons name="lock-closed" size={18} color={colors.muted} />} />
        ))}
        <ListRow left={<Glyph text="+" size={44} tint={['#E3ECEF', colors.muted]} />} title="Lesson 3 and 20 more" sub="Full course" onPress={() => setLocked(true)} right={<Ionicons name="lock-closed" size={18} color={colors.muted} />} />
      </View>
      {locked ? <LockedCard text={`Unlock ${title}: every lesson, live class with ${teacher}, PDF notes and tests.`} /> : null}
      <Button title="See all courses and enrol" icon="school-outline" kind="ghost" style={{ marginTop: 14 }} onPress={() => router.push('/guest/courses' as any)} />
    </Screen>
  );
}

/* ---------- Unlock everything ---------- */
export function UnlockScreen() {
  const { refresh, logout } = useAuth();
  const [opt, setOpt] = useState<'code' | 'plan' | 'login'>('code');
  const [plan, setPlan] = useState<'month' | 'year'>('year');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const options = [
    ['code', '🕌', colors.sky[0], 'Join my madrasa', 'Enter the code from your madrasa office'],
    ['plan', '⭐', colors.butter[0], 'Subscribe to Noon Learn', 'Learn on your own — all classes and courses'],
    ['login', '🔑', colors.lav[0], 'I already have an account', 'Log in to your madrasa account'],
  ] as const;
  const go = async () => {
    setErr(null);
    if (opt === 'login') { await logout(); router.replace('/login' as any); return; }
    if (opt === 'plan') { demoNote('Demo: payment opens Razorpay once subscriptions are connected (step 5).'); return; }
    setBusy(true);
    try {
      const u = await api.post<User>('/auth/join-tenant', { code: code.trim().toUpperCase() });
      await refresh();
      router.replace(homeFor(u.role) as any);
    } catch (e: any) {
      setErr(e instanceof ApiError ? e.friendly : e?.message ?? 'Could not join. Please try again.');
    } finally { setBusy(false); }
  };
  return (
    <Screen bar={false}>
      <IconButton name="close" label="Close" size={48} onPress={() => (router.canGoBack() ? router.back() : router.replace('/guest' as any))} />
      <View style={{ marginTop: 16, gap: 4 }}>
        <Ionicons name="lock-open-outline" size={48} color={colors.ink} />
        <T style={{ fontFamily: fonts.fun, fontSize: 30, lineHeight: 34, marginTop: 8 }}>Unlock all of{'\n'}Noon Learn</T>
        <T v="small">Every class, lesson, live class, note and test. Your demo progress is kept.</T>
      </View>
      <View style={{ gap: 10, marginTop: 16 }}>
        {options.map(([k, icon, bg, title, desc]) => (
          <Pressable key={k} accessibilityRole="radio" accessibilityState={{ checked: opt === k }} onPress={() => setOpt(k)}
            style={{ backgroundColor: '#FFF', borderRadius: 24, borderWidth: 2, borderColor: opt === k ? colors.violet : 'transparent', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}><T style={{ fontSize: 22 }}>{icon}</T></View>
            <View style={{ flex: 1 }}><T v="h3">{title}</T><T v="small">{desc}</T></View>
            <Ionicons name={opt === k ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={opt === k ? colors.violet : colors.line} />
          </Pressable>
        ))}
      </View>
      <Card style={{ marginTop: 12, gap: 10 }}>
        {opt === 'code' ? (
          <>
            <Field label="Madrasa code" value={code} onChangeText={(v) => setCode(v.toUpperCase())} autoCapitalize="characters" placeholder="e.g. NOON01" maxLength={20} />
            {err ? <T style={{ color: colors.red }}>{err}</T> : null}
          </>
        ) : opt === 'plan' ? (
          <Row gap={10}>
            {(['month', 'year'] as const).map((p) => (
              <Pressable key={p} accessibilityRole="radio" accessibilityState={{ checked: plan === p }} onPress={() => setPlan(p)}
                style={{ flex: 1, borderRadius: 20, borderWidth: 2, borderColor: plan === p ? colors.violet : colors.line, padding: 12 }}>
                <T v="small">{p === 'month' ? 'Monthly' : 'Yearly · best value'}</T>
                <T v="h2">[PRICE]</T><T v="small">per student</T>
              </Pressable>
            ))}
          </Row>
        ) : (
          <T v="small">Already a student? Log in with the phone, email or admission number your madrasa gave you.</T>
        )}
        <Button title={opt === 'code' ? 'Join madrasa' : opt === 'plan' ? 'Continue to payment' : 'Log in'} kind="yellow" loading={busy}
          disabled={opt === 'code' && code.trim().length < 4} onPress={go} />
      </Card>
      <Pressable accessibilityRole="button" onPress={() => logout().then(() => router.replace('/'))} style={{ alignSelf: 'center', marginTop: 16, padding: 10 }}>
        <T style={{ color: colors.red, fontFamily: fonts.medium }}>Log out of guest account</T>
      </Pressable>
    </Screen>
  );
}
