// Quran & Hifz screens from the design canvas.
import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, Switch, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Grid, Header, Loading, Row, Screen, T } from '@/components/ui';
import { ayahAudio, BISMILLAH_TEXT, getLast, getMarks, getPrefs, JUZ_START, loadSurah, type Mark, RECITERS, type Reciter, setLast, setPrefs, showBismillah, surahList, toggleMark } from '@/lib/quran';
import { Avatar, Band, Chips, demoNote, Glyph, ListRow, pastel, Progress, Section, SmallButton, Tabs, Tag } from '@/components/kit';
import { useBase } from '@/lib/useBase';
import { colors, fonts } from '@/theme/tokens';

const ar = (size: number, color: string = colors.ink) => ({ fontFamily: fonts.arabic, fontSize: size, lineHeight: size * 1.7, color, writingDirection: 'rtl' as const, textAlign: 'right' as const });

/* ---------- Hub ---------- */
export function QuranHubScreen() {
  const base = useBase();
  const tools: [string, keyof typeof Ionicons.glyphMap, readonly [string, string], string | null][] = [
    ['Quran Kareem', 'book-outline', colors.mint, 'quran/read'],
    ['Usthad & kids', 'people-outline', colors.lav, 'quran/usthad'],
    ['Easy Hifz Tool', 'bulb-outline', colors.butter, 'quran/hifz'],
    ['Video Generator', 'videocam-outline', colors.sky, 'quran/video'],
    ['Reciters', 'mic-outline', colors.pink, 'quran/qari'],
    ['Thajweed Quran', 'reader-outline', ['#E3ECEF', colors.muted], null],
    ['Thajweed Rules', 'checkmark-done-outline', colors.mint, 'quran/rules'],
  ];
  return (
    <Screen>
      <Band tint={colors.mint[0]} />
      <Header title="Quran & Hifz" subtitle="Select one to start" />
      <View style={{ marginTop: 10 }}>
        <Grid cols={{ phone: 2, tablet: 3, desktop: 4 }} gap={8}>
          {tools.map(([label, icon, tint, href]) => (
            <Pressable key={label} accessibilityRole="button" disabled={!href} onPress={() => href && router.push(`${base}/${href}` as any)}
              style={{ height: 112, borderRadius: 26, backgroundColor: href ? '#FFF' : '#F7FBFC', borderWidth: href ? 0 : 1.5, borderStyle: 'dashed', borderColor: colors.line, padding: 14, justifyContent: 'space-between' }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: tint[0], alignItems: 'center', justifyContent: 'center' }}><Ionicons name={icon} size={22} color={tint[1]} /></View>
                {!href ? <Tag text="Coming soon" tone="pink" /> : null}
              </Row>
              <T style={{ fontFamily: fonts.semibold, color: href ? colors.ink : colors.muted }}>{label}</T>
            </Pressable>
          ))}
        </Grid>
      </View>
    </Screen>
  );
}

/* ---------- Quran Kareem (surah list) — the full Quran ---------- */
function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    setError(null);
    fn().then((d) => live && setData(d)).catch((e) => live && setError(e?.message ?? 'Could not load.'));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { data, error, retry: () => setTick((t) => t + 1) };
}

function LoadError({ text, retry }: { text: string; retry: () => void }) {
  return (
    <Card style={{ alignItems: 'center', gap: 10, padding: 24 }}>
      <Ionicons name="cloud-offline-outline" size={36} color={colors.muted} />
      <T style={{ textAlign: 'center' }}>{text}</T>
      <SmallButton title="Try again" filled tint={colors.ink} onPress={retry} />
    </Card>
  );
}

export function QuranListScreen() {
  const base = useBase();
  const [tab, setTab] = useState<'surah' | 'juz' | 'saved'>('surah');
  const [q, setQ] = useState('');
  const { data: list, error, retry } = useAsync(surahList, []);
  const { data: last } = useAsync(getLast, []);
  const [marks, setMarks] = useState<Mark[]>([]);
  useEffect(() => { getMarks().then(setMarks); }, [tab]);
  const open = (s: number, ayah?: number) => router.push(`${base}/quran/reader?s=${s}${ayah ? `&a=${ayah}` : ''}` as any);
  const name = (n: number) => list?.find((x) => x.number === n)?.englishName ?? `Surah ${n}`;
  const shown = (list ?? []).filter((s) => !q.trim() || `${s.number} ${s.englishName} ${s.englishNameTranslation} ${s.name}`.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <Screen>
      <Header title="Quran Kareem" subtitle="114 surahs · 30 juz" right={<Text style={ar(30, colors.mint[1])}>القرآن</Text>} />
      <Card tint={colors.mint[0]} onPress={() => open(last?.surah ?? 1, last?.ayah)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}><T v="small" style={{ color: colors.mint[1] }}>{last ? 'Continue reading' : 'Start reading'}</T><T v="h3">{last?.name ?? 'Al-Faatiha'}</T><T v="small">{last ? `Ayah ${last.ayah}` : 'The Opening'}</T></View>
        <Ionicons name="play-circle" size={40} color={colors.mint[1]} />
      </Card>
      <Tabs value={tab} onChange={setTab} options={[{ key: 'surah', label: 'Surah' }, { key: 'juz', label: 'Juz' }, { key: 'saved', label: `Saved · ${marks.length}` }]} />
      {tab === 'surah' ? (
        <Row style={{ backgroundColor: '#FFF', borderRadius: 22, borderWidth: 1.5, borderColor: colors.line, paddingHorizontal: 14, height: 46, marginBottom: 8 }}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput value={q} onChangeText={setQ} placeholder="Search surah name or number" placeholderTextColor={colors.faint} accessibilityLabel="Search surah"
            style={{ flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink, outlineStyle: 'none' } as any} />
        </Row>
      ) : null}
      {error ? <LoadError text={error} retry={retry} /> : !list ? <Loading /> : (
        <View style={{ gap: 8 }}>
          {tab === 'surah' ? shown.map((s) => (
            <ListRow key={s.number} onPress={() => open(s.number)} left={<Glyph text={String(s.number)} size={40} tint={pastel.mint} />}
              title={s.englishName} sub={`${s.englishNameTranslation} · ${s.numberOfAyahs} ayahs · ${s.revelationType === 'Meccan' ? 'Makki' : 'Madani'}`}
              right={<Text style={ar(22, colors.mint[1])}>{s.name.replace('سُورَةُ ', '')}</Text>} />
          )) : tab === 'juz' ? JUZ_START.map(([j, s, a]) => (
            <ListRow key={j} onPress={() => open(s, a)} left={<Glyph text={String(j)} size={40} tint={pastel.sky} />} title={`Juz ${j}`} sub={`Starts at ${name(s)} ${a}`} />
          )) : marks.length ? marks.map((m) => (
            <ListRow key={`${m.surah}-${m.ayah}`} onPress={() => open(m.surah, m.ayah)} left={<Glyph text={String(m.surah)} size={40} tint={pastel.butter} />} title={m.name} sub={`Bookmarked · ayah ${m.ayah}`} />
          )) : <T v="small" style={{ textAlign: 'center', padding: 20 }}>Tap the bookmark next to an ayah to save it here.</T>}
        </View>
      )}
    </Screen>
  );
}

/* ---------- Reader with recitation ---------- */
export function QuranReaderScreen() {
  const base = useBase();
  const { s: sParam, a: aParam } = useLocalSearchParams<{ s?: string; a?: string }>();
  const n = Math.min(114, Math.max(1, Number(sParam) || 1));
  const { data: surah, error, retry } = useAsync(() => loadSurah(n), [n]);
  const [prefs, setP] = useState<{ reciter: string; translation: 'en' | 'ml' | 'both' | 'none'; size: number }>({ reciter: 'ar.alafasy', translation: 'en', size: 1 });
  const [cur, setCur] = useState(Number(aParam) || 1);
  const [playing, setPlaying] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [marks, setMarks] = useState<Mark[]>([]);
  const audio = useRef<HTMLAudioElement | null>(null);
  const reciter = RECITERS.find((r) => r.id === prefs.reciter) ?? RECITERS[0];
  const fs = [24, 30, 38][prefs.size] ?? 30;

  useEffect(() => { getPrefs().then(setP); getMarks().then(setMarks); }, []);
  useEffect(() => { setCur(Number(aParam) || 1); setPlaying(false); }, [n, aParam]);
  useEffect(() => { if (surah) setLast({ surah: n, ayah: cur, name: surah.englishName }); }, [surah, cur, n]);
  useEffect(() => {
    if (!surah || Platform.OS !== 'web') return;
    const el = audio.current ?? new Audio();
    audio.current = el;
    if (!playing) { el.pause(); return; }
    const ayah = surah.ayahs.find((x) => x.n === cur);
    if (!ayah) { setPlaying(false); return; }
    el.src = ayahAudio(reciter, ayah.global);
    el.onended = () => { if (repeat) { el.currentTime = 0; el.play(); } else if (cur < surah.numberOfAyahs) setCur(cur + 1); else setPlaying(false); };
    el.onerror = () => setPlaying(false);
    el.play().catch(() => setPlaying(false));
    if (typeof document !== 'undefined') document.getElementById(`ayah-${cur}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [playing, cur, surah, reciter.id, repeat]);
  useEffect(() => () => { audio.current?.pause(); }, []);

  const save = (p: Partial<typeof prefs>) => { const next = { ...prefs, ...p }; setP(next); setPrefs(p); };
  const marked = (a: number) => marks.some((m) => m.surah === n && m.ayah === a);
  const go = (to: number) => router.replace(`${base}/quran/reader?s=${to}` as any);
  const tr = prefs.translation;
  const player = surah ? (
        <View style={{ position: 'absolute', left: 16, right: 16, bottom: 96, maxWidth: 640, alignSelf: 'center' }}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } }}>
            <Pressable accessibilityLabel="Choose reciter" onPress={() => router.push(`${base}/quran/qari` as any)}><Avatar name={reciter.name} size={40} tint={pastel.pink} /></Pressable>
            <View style={{ flex: 1 }}><T style={{ fontFamily: fonts.semibold }} numberOfLines={1}>{reciter.name}</T><T v="small">Ayah {cur} of {surah.numberOfAyahs}{repeat ? ' · repeating' : ''}</T></View>
            <Pressable accessibilityLabel="Previous ayah" onPress={() => setCur(Math.max(1, cur - 1))} style={{ padding: 6 }}><Ionicons name="play-skip-back" size={20} color={colors.ink} /></Pressable>
            <Pressable accessibilityLabel={playing ? 'Pause' : 'Play'} onPress={() => setPlaying(!playing)} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={playing ? 'pause' : 'play'} size={22} color="#FFF" /></Pressable>
            <Pressable accessibilityLabel="Next ayah" onPress={() => setCur(Math.min(surah.numberOfAyahs, cur + 1))} style={{ padding: 6 }}><Ionicons name="play-skip-forward" size={20} color={colors.ink} /></Pressable>
            <Pressable accessibilityLabel="Repeat ayah" onPress={() => setRepeat(!repeat)} style={{ padding: 6 }}><Ionicons name="repeat" size={22} color={repeat ? colors.teal : colors.muted} /></Pressable>
          </Card>
        </View>
  ) : undefined;
  return (
    <Screen overlay={player}>
      <Header title={surah?.englishName ?? `Surah ${n}`} subtitle={surah ? `${surah.englishNameTranslation} · ${surah.numberOfAyahs} ayahs · ${surah.revelationType === 'Meccan' ? 'Makki' : 'Madani'}` : 'Loading…'}
        right={surah ? <Text style={ar(28, colors.mint[1])}>{surah.name.replace('سُورَةُ ', '')}</Text> : undefined} />
      <Row gap={8} style={{ flexWrap: 'wrap' }}>
        <SmallButton title={`Translation: ${{ en: 'English', ml: 'മലയാളം', both: 'Both', none: 'Off' }[tr]}`} filled={tr !== 'none'}
          onPress={() => save({ translation: (['en', 'ml', 'both', 'none'] as const)[(['en', 'ml', 'both', 'none'].indexOf(tr) + 1) % 4] })} />
        <SmallButton title={`Text: ${['Small', 'Medium', 'Large'][prefs.size]}`} onPress={() => save({ size: (prefs.size + 1) % 3 })} />
      </Row>
      {error ? <View style={{ marginTop: 12 }}><LoadError text={error} retry={retry} /></View> : !surah ? <Loading /> : (
        <Card style={{ marginTop: 12, gap: 10, marginBottom: 110 }}>
          {showBismillah(n) ? <Text style={[ar(fs, colors.teal), { textAlign: 'center' }]}>{BISMILLAH_TEXT}</Text> : null}
          {surah.ayahs.map((a) => (
            <Pressable key={a.n} nativeID={`ayah-${a.n}`} onPress={() => setCur(a.n)}
              style={{ backgroundColor: cur === a.n ? colors.mint[0] : 'transparent', borderRadius: 14, padding: 8, gap: 4 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Glyph text={String(a.n)} size={30} tint={pastel.mint} />
                <Row gap={4}>
                  <Pressable accessibilityLabel={`Play ayah ${a.n}`} onPress={() => { setCur(a.n); setPlaying(true); }} hitSlop={8} style={{ padding: 4 }}><Ionicons name="play-circle-outline" size={22} color={colors.mint[1]} /></Pressable>
                  <Pressable accessibilityLabel={marked(a.n) ? 'Remove bookmark' : 'Bookmark ayah'} hitSlop={8} style={{ padding: 4 }}
                    onPress={async () => setMarks(await toggleMark({ surah: n, ayah: a.n, name: surah.englishName }))}>
                    <Ionicons name={marked(a.n) ? 'bookmark' : 'bookmark-outline'} size={20} color={colors.mint[1]} />
                  </Pressable>
                </Row>
              </Row>
              <Text style={ar(fs)}>{a.ar} ﴿{a.n}﴾</Text>
              {tr === 'en' || tr === 'both' ? <T style={{ fontSize: 14, lineHeight: 21 }}>{a.en}</T> : null}
              {tr === 'ml' || tr === 'both' ? <T style={{ fontSize: 14, lineHeight: 22, color: colors.muted }}>{a.ml}</T> : null}
            </Pressable>
          ))}
          <Row gap={10} style={{ marginTop: 6 }}>
            <View style={{ flex: 1 }}>{n > 1 ? <Button title="Previous surah" kind="ghost" icon="arrow-back" onPress={() => go(n - 1)} /> : null}</View>
            <View style={{ flex: 1 }}>{n < 114 ? <Button title="Next surah" kind="ghost" icon="arrow-forward" onPress={() => go(n + 1)} /> : null}</View>
          </Row>
        </Card>
      )}
    </Screen>
  );
}

/* ---------- Usthad & kids ---------- */
const USTHAD = [
  ['surah', 'Learning Surah Al-Ikhlas', '6:20', 'الإخلاص', 'Watched'], ['surah', 'Surah Al-Falaq, line by line', '7:45', 'الفلق', 'Continue'],
  ['surah', 'Surah An-Nas with actions', '5:10', 'الناس', ''], ['dua', 'Duas before sleeping', '4:30', 'دعاء', ''], ['story', 'Story of Prophet Yunus', '9:15', 'يونس', ''],
] as const;

export function UsthadScreen() {
  const [cat, setCat] = useState<'all' | 'surah' | 'dua' | 'story'>('all');
  const [now, setNow] = useState<(typeof USTHAD)[number]>(USTHAD[1]);
  return (
    <Screen>
      <Header title="Usthad & kids" subtitle="Learn the Quran together, step by step" />
      <Card tint={colors.lav[0]} style={{ gap: 8 }}>
        <View style={{ height: 150, borderRadius: 20, backgroundColor: '#2B2366', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={ar(44, '#FFFFFF')}>{now[3]}</Text>
          <Pressable accessibilityLabel={`Play ${now[1]}`} onPress={() => demoNote('Demo: the video plays here once lessons are uploaded.')} style={{ position: 'absolute', width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="play" size={26} color={colors.ink} /></Pressable>
          <T v="small" style={{ position: 'absolute', right: 12, bottom: 10, color: '#FFF' }}>{now[2]}</T>
        </View>
        <T v="h3">{now[1]}</T>
        <T v="small">Ustad Ahmed with Ayisha & Fathima · {now[0] === 'surah' ? 'Short surah' : now[0] === 'dua' ? 'Dua' : 'Story'}</T>
      </Card>
      <Chips value={cat} onChange={setCat} options={[{ key: 'all', label: 'All' }, { key: 'surah', label: 'Short surahs' }, { key: 'dua', label: 'Duas' }, { key: 'story', label: 'Stories' }]} />
      <View style={{ gap: 8 }}>
        {USTHAD.filter((u) => cat === 'all' || u[0] === cat).map((u) => (
          <ListRow key={u[1]} onPress={() => setNow(u)} left={<Glyph text={u[3]} size={52} tint={pastel.lav} />} title={u[1]} sub={u[2]} right={u[4] ? <Tag text={u[4]} tone={u[4] === 'Watched' ? 'mint' : 'butter'} /> : undefined} />
        ))}
      </View>
    </Screen>
  );
}

/* ---------- Easy Hifz ---------- */
const IKHLAS = [['قُلْ', 'هُوَ', 'ٱللَّهُ', 'أَحَدٌ'], ['ٱللَّهُ', 'ٱلصَّمَدُ'], ['لَمْ', 'يَلِدْ', 'وَلَمْ', 'يُولَدْ'], ['وَلَمْ', 'يَكُن', 'لَّهُۥ', 'كُفُوًا', 'أَحَدٌۢ']];

export function HifzScreen() {
  const [step, setStep] = useState<'read' | 'cover' | 'test'>('read');
  const [n, setN] = useState(1);
  const [reps, setReps] = useState(0);
  const [done, setDone] = useState<number[]>([]);
  const [shown, setShown] = useState(false);
  const words = IKHLAS[n - 1];
  const hide = (i: number) => !shown && ((step === 'cover' && i % 2 === 1) || step === 'test');
  return (
    <Screen>
      <Header title="Easy Hifz" subtitle="Al-Ikhlas" right={<Tag text={`${done.length}/4`} tone="butter" />} />
      <Card tint={colors.butter[0]} style={{ gap: 6 }}>
        <T v="h3">{done.length} of 4 ayahs memorised</T>
        <Progress value={(done.length / 4) * 100} color="#B07C00" track="#FFF6DA" />
        <T v="small" style={{ color: colors.butter[1] }}>5-day streak · keep going!</T>
      </Card>
      <View style={{ marginTop: 12 }}>
        <Tabs value={step} onChange={(s) => { setStep(s); setShown(false); }} options={[{ key: 'read', label: '1 · Read' }, { key: 'cover', label: '2 · Cover' }, { key: 'test', label: '3 · Test' }]} />
      </View>
      <T v="small">{step === 'read' ? 'Read and listen' : step === 'cover' ? 'Fill the hidden words' : 'Say it from memory'}</T>
      <Card style={{ marginTop: 8, alignItems: 'center', gap: 12 }}>
        <T v="label">AYAH {n} OF 4</T>
        <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
          {words.map((w, i) => hide(i)
            ? <View key={i} accessibilityLabel="hidden word" style={{ width: 70, height: 50, borderRadius: 12, backgroundColor: colors.butter[0], borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#B07C00' }} />
            : <Text key={i} style={ar(34)}>{w}</Text>)}
        </View>
        {step !== 'read' ? <SmallButton title={shown ? 'Hide words' : 'Show all words'} onPress={() => setShown(!shown)} /> : null}
        <Row gap={14}>
          <Pressable accessibilityLabel="Previous ayah" disabled={n === 1} onPress={() => { setN(n - 1); setReps(0); }} style={{ padding: 8, opacity: n === 1 ? 0.3 : 1 }}><Ionicons name="chevron-back" size={24} color={colors.ink} /></Pressable>
          <Button title={`Listen & repeat · ${reps}/5`} icon="volume-high-outline" onPress={() => setReps(Math.min(5, reps + 1))} />
          <Pressable accessibilityLabel="Next ayah" disabled={n === 4} onPress={() => { setN(n + 1); setReps(0); }} style={{ padding: 8, opacity: n === 4 ? 0.3 : 1 }}><Ionicons name="chevron-forward" size={24} color={colors.ink} /></Pressable>
        </Row>
      </Card>
      <View style={{ marginTop: 14 }}>
        <Button title={done.includes(n) ? `Ayah ${n} memorised ✓` : `I’ve memorised ayah ${n}`} kind={done.includes(n) ? 'ghost' : 'yellow'}
          onPress={() => setDone(done.includes(n) ? done : [...done, n])} />
      </View>
    </Screen>
  );
}

/* ---------- Video generator ---------- */
const IKHLAS_TR = [['قُلْ هُوَ ٱللَّهُ أَحَدٌ', 'Say: He is Allah, the One.'], ['ٱللَّهُ ٱلصَّمَدُ', 'Allah, the Eternal, on whom all depend.'], ['لَمْ يَلِدْ وَلَمْ يُولَدْ', 'He has no child, and He was not born.'], ['وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌۢ', 'And there is none like Him.']];
const BGS = [['Night sky', '#1D2B64'], ['Green garden', '#1E6B45'], ['Sunrise', '#E07A3F'], ['Lavender', '#6C55C8']] as const;

export function VideoGenScreen() {
  const [ayah, setAyah] = useState(0);
  const [bg, setBg] = useState(0);
  const [subs, setSubs] = useState(true);
  const [made, setMade] = useState(false);
  return (
    <Screen>
      <Header title="Video Generator" subtitle="Make a short ayah video to share" />
      <View accessibilityLabel="Video preview" style={{ height: 260, borderRadius: 26, backgroundColor: BGS[bg][1], padding: 18, justifyContent: 'center', alignItems: 'center', gap: 10 }}>
        <Text style={[ar(34, '#FFF'), { textAlign: 'center' }]}>{IKHLAS_TR[ayah][0]}</Text>
        {subs ? <T style={{ color: '#FFF', textAlign: 'center' }}>{IKHLAS_TR[ayah][1]}</T> : null}
        <T v="small" style={{ color: 'rgba(255,255,255,0.8)', position: 'absolute', bottom: 12 }}>Al-Ikhlas {ayah + 1} · Qari Ahmad Naseem · 0:12</T>
      </View>
      <Section title="Ayah" />
      <Row gap={8}>{IKHLAS_TR.map((_, i) => <SmallButton key={i} title={String(i + 1)} filled={ayah === i} onPress={() => { setAyah(i); setMade(false); }} />)}</Row>
      <Section title="Background" />
      <Row gap={8} style={{ flexWrap: 'wrap' }}>
        {BGS.map(([name, c], i) => (
          <Pressable key={name} accessibilityLabel={name} accessibilityState={{ selected: bg === i }} onPress={() => { setBg(i); setMade(false); }}
            style={{ width: 70, height: 50, borderRadius: 14, backgroundColor: c, borderWidth: bg === i ? 3 : 0, borderColor: colors.yellow }} />
        ))}
      </Row>
      <Row style={{ justifyContent: 'space-between', marginTop: 14 }}><T>Translation subtitles</T><Switch value={subs} onValueChange={setSubs} accessibilityLabel="Translation subtitles" /></Row>
      <View style={{ marginTop: 16, gap: 10 }}>
        {made ? (
          <Row gap={10}>
            <View style={{ flex: 1 }}><Button title="Share" kind="ghost" icon="share-outline" onPress={() => demoNote()} /></View>
            <View style={{ flex: 1 }}><Button title="Save video" icon="download-outline" onPress={() => demoNote('Demo: the video is made on the server once the generator is connected.')} /></View>
          </Row>
        ) : <Button title="Make video" kind="yellow" icon="sparkles-outline" onPress={() => setMade(true)} />}
      </View>
    </Screen>
  );
}

/* ---------- Qari ---------- */
const RECITATIONS = [[1, 'Al-Fatihah', '1:05', 'الفاتحة'], [67, 'Al-Mulk', '9:40', 'الملك'], [36, 'Ya-Sin', '14:20', 'يس'], [112, 'Al-Ikhlas', '0:25', 'الإخلاص'], [114, 'An-Nas', '0:40', 'الناس']] as const;

export function QariScreen() {
  const base = useBase();
  const [sel, setSel] = useState('ar.alafasy');
  const [sample, setSample] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  useEffect(() => { getPrefs().then((p) => setSel(p.reciter)); return () => audio.current?.pause(); }, []);
  const listen = (r: Reciter) => {
    if (Platform.OS !== 'web') return;
    const el = audio.current ?? new Audio(); audio.current = el;
    if (sample === r.id) { el.pause(); setSample(null); return; }
    el.src = ayahAudio(r, 1); el.onended = () => setSample(null); el.play().catch(() => setSample(null)); setSample(r.id);
  };
  return (
    <Screen>
      <Band tint={colors.pink[0]} height={200} />
      <Header title="Reciters" subtitle="Choose who recites in the Quran reader" />
      <View style={{ gap: 8, marginTop: 8 }}>
        {RECITERS.map((r) => (
          <ListRow key={r.id} onPress={() => { setSel(r.id); setPrefs({ reciter: r.id }); }} left={<Avatar name={r.name} size={44} tint={sel === r.id ? pastel.mint : pastel.pink} />}
            title={r.name} sub={r.style}
            right={<Row gap={8}>
              <SmallButton title={sample === r.id ? '■ Stop' : '▶ Listen'} onPress={() => listen(r)} />
              {sel === r.id ? <Tag text="Selected" tone="mint" /> : null}
            </Row>} />
        ))}
      </View>
      <Button title="Open the Quran" icon="book-outline" style={{ marginTop: 16 }} onPress={() => router.push(`${base}/quran/read` as any)} />
    </Screen>
  );
}

/* ---------- Thajweed rules ---------- */
const RULES = [
  ['Ghunnah', 'غنّة', 'Nasal sound on نّ and مّ', 'When noon or meem has a shaddah, hold the sound in the nose for two counts.', 'إِنَّ', colors.pink],
  ['Ikhfa', 'إخفاء', 'Hide the noon sound', 'When noon saakin or tanween meets one of 15 letters, say it lightly through the nose.', 'مِن قَبْلُ', colors.lav],
  ['Idgham', 'إدغام', 'Merge into the next letter', 'When noon saakin or tanween meets ي ر م ل و ن, join it into the next letter.', 'مَن يَقُولُ', colors.sky],
  ['Iqlab', 'إقلاب', 'Noon turns into meem', 'When noon saakin or tanween meets ب, change it to a light meem sound.', 'مِنۢ بَعْدِ', colors.butter],
  ['Qalqalah', 'قلقلة', 'Bouncing sound', 'The letters ق ط ب ج د bounce lightly when they have sukoon.', 'أَحَدْ', colors.mint],
  ['Madd', 'مدّ', 'Stretch the vowel', 'Stretch alif, waw or ya for two counts or more, depending on what comes after.', 'ٱلضَّآلِّينَ', colors.pink],
] as const;

export function RulesScreen() {
  const [learned, setLearned] = useState<string[]>(['Ghunnah']);
  const [open, setOpen] = useState('Ghunnah');
  return (
    <Screen>
      <Header title="Thajweed Rules" subtitle="Each rule has its own colour" right={<Text style={ar(28, colors.mint[1])}>تجويد</Text>} />
      <Card style={{ gap: 6 }}><T v="h3">Learned {learned.length} of 6 rules</T><Progress value={(learned.length / 6) * 100} color={colors.green} /></Card>
      <View style={{ gap: 8, marginTop: 12 }}>
        {RULES.map(([name, arabic, short, how, ex, tint]) => (
          <Pressable key={name} accessibilityRole="button" accessibilityState={{ expanded: open === name }} onPress={() => setOpen(open === name ? '' : name)}
            style={{ backgroundColor: '#FFF', borderRadius: 22, borderWidth: 1.5, borderColor: colors.line, padding: 14, gap: 8 }}>
            <Row gap={12}>
              <View style={{ width: 12, height: 40, borderRadius: 6, backgroundColor: tint[1] }} />
              <View style={{ flex: 1 }}><T v="h3">{name}</T><T v="small">{short}</T></View>
              <Text style={ar(24, tint[1])}>{arabic}</Text>
            </Row>
            {open === name ? (
              <View style={{ gap: 8 }}>
                <T style={{ fontSize: 14 }}>{how}</T>
                <Row style={{ backgroundColor: tint[0], borderRadius: 14, padding: 10, justifyContent: 'space-between' }}>
                  <T v="small" style={{ color: tint[1] }}>Example</T><Text style={ar(28, tint[1])}>{ex}</Text>
                </Row>
                <Row gap={8}>
                  <SmallButton title="Hear it" onPress={() => demoNote('Demo: example audio comes with the recordings.')} />
                  <SmallButton title={learned.includes(name) ? 'Learned ✓' : 'Mark as learned'} filled={learned.includes(name)} onPress={() => setLearned(learned.includes(name) ? learned.filter((l) => l !== name) : [...learned, name])} />
                </Row>
              </View>
            ) : null}
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
