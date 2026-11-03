// Quran & Hifz screens from the design canvas.
import React, { useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Grid, Header, Row, Screen, T } from '@/components/ui';
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
    ["Qari'u Ahmad Naseem", 'mic-outline', colors.pink, 'quran/qari'],
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

/* ---------- Quran Kareem (surah list) ---------- */
const SURAHS = [
  [1, 'Al-Fatihah', 'The Opening · 7 ayahs · Makki', 'الفاتحة'], [2, 'Al-Baqarah', 'The Cow · 286 ayahs · Madani', 'البقرة'],
  [18, 'Al-Kahf', 'The Cave · 110 ayahs · Makki', 'الكهف'], [36, 'Ya-Sin', 'Ya-Sin · 83 ayahs · Makki', 'يس'],
  [67, 'Al-Mulk', 'The Kingdom · 30 ayahs · Makki', 'الملك'], [112, 'Al-Ikhlas', 'Sincerity · 4 ayahs · Makki', 'الإخلاص'],
] as const;
const JUZ = [
  [1, 'Juz 1', 'Al-Fatihah 1 – Al-Baqarah 141', 'الم'], [2, 'Juz 2', 'Al-Baqarah 142 – 252', 'سيقول'], [3, 'Juz 3', 'Al-Baqarah 253 – Aal-Imran 92', 'تلك الرسل'],
  [28, 'Juz 28', 'Al-Mujadilah – At-Tahrim', 'قد سمع'], [29, 'Juz 29', 'Al-Mulk – Al-Mursalat', 'تبارك'], [30, 'Juz 30', 'An-Naba – An-Nas', 'عمّ'],
] as const;
const SAVED = [[18, 'Al-Kahf', 'Bookmarked · ayah 12', 'الكهف'], [67, 'Al-Mulk', 'Bookmarked · ayah 1', 'الملك'], [2, 'Al-Baqarah', 'Bookmarked · ayah 58', 'البقرة']] as const;

export function QuranListScreen() {
  const base = useBase();
  const [tab, setTab] = useState<'surah' | 'juz' | 'saved'>('surah');
  const rows = tab === 'surah' ? SURAHS : tab === 'juz' ? JUZ : SAVED;
  return (
    <Screen>
      <Header title="Quran Kareem" subtitle="114 surahs · 30 juz" right={<Text style={ar(30, colors.mint[1])}>القرآن</Text>} />
      <Card tint={colors.mint[0]} onPress={() => router.push(`${base}/quran/reader` as any)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}><T v="small" style={{ color: colors.mint[1] }}>Continue reading</T><T v="h3">Al-Fatihah</T><T v="small">Ayah 4 of 7 · Juz 1</T></View>
        <Ionicons name="play-circle" size={40} color={colors.mint[1]} />
      </Card>
      <Tabs value={tab} onChange={setTab} options={[{ key: 'surah', label: 'Surah' }, { key: 'juz', label: 'Juz' }, { key: 'saved', label: 'Saved' }]} />
      <View style={{ gap: 8 }}>
        {rows.map(([n, name, meta, arabic]) => (
          <ListRow key={`${tab}-${n}`} onPress={() => router.push(`${base}/quran/reader` as any)} left={<Glyph text={String(n)} size={40} tint={pastel.mint} />} title={name} sub={meta} right={<Text style={ar(22, colors.mint[1])}>{arabic}</Text>} />
        ))}
      </View>
    </Screen>
  );
}

/* ---------- Reader ---------- */
const FATIHA = [
  ['ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ', 'All praise belongs to Allah, Lord of all the worlds.'],
  ['ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', 'The Most Merciful, the Most Kind.'],
  ['مَٰلِكِ يَوْمِ ٱلدِّينِ', 'Master of the Day of Judgement.'],
  ['إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ', 'You alone we worship, and You alone we ask for help.'],
  ['ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ', 'Guide us along the straight path,'],
  ['صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ', 'the path of those You have blessed, not of those who earned anger, nor of those who went astray.'],
];

export function QuranReaderScreen() {
  const base = useBase();
  const [tr, setTr] = useState(true);
  const [size, setSize] = useState(1);
  const [cur, setCur] = useState(4);
  const [playing, setPlaying] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const fs = [24, 30, 38][size];
  return (
    <Screen>
      <Header title="Al-Fatihah" subtitle="The Opening · 7 ayahs · Juz 1" right={<Pressable accessibilityLabel="Bookmark surah" onPress={() => demoNote('Saved to your bookmarks (demo).')}><Ionicons name="bookmark-outline" size={24} color={colors.ink} /></Pressable>} />
      <Row gap={8} style={{ flexWrap: 'wrap' }}>
        <SmallButton title={tr ? 'Translation on' : 'Translation off'} filled={tr} onPress={() => setTr(!tr)} />
        <SmallButton title={`Text size: ${['Small', 'Medium', 'Large'][size]}`} onPress={() => setSize((size + 1) % 3)} />
      </Row>
      <Card style={{ marginTop: 12, gap: 14 }}>
        <Text style={[ar(fs, colors.teal), { textAlign: 'center' }]}>بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</Text>
        {FATIHA.map(([a, t], i) => (
          <Pressable key={i} onPress={() => setCur(i + 2)} style={{ backgroundColor: cur === i + 2 ? colors.mint[0] : 'transparent', borderRadius: 14, padding: 8 }}>
            <Text style={ar(fs)}>{a} ﴿{i + 2}﴾</Text>
            {tr ? <T v="small" style={{ fontSize: 13 }}>{i + 2}. {t}</T> : null}
          </Pressable>
        ))}
      </Card>
      <Card style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable accessibilityLabel="Choose reciter" onPress={() => router.push(`${base}/quran/qari` as any)}><Avatar name="Ahmad Naseem" size={40} tint={pastel.pink} /></Pressable>
        <View style={{ flex: 1 }}><T v="h3">Qari Ahmad Naseem</T><T v="small">Ayah {cur} of 7{repeat ? ' · repeating' : ''}</T></View>
        <Pressable accessibilityLabel="Repeat ayah" onPress={() => setRepeat(!repeat)} style={{ padding: 8 }}><Ionicons name="repeat" size={22} color={repeat ? colors.teal : colors.muted} /></Pressable>
        <Pressable accessibilityLabel={playing ? 'Pause' : 'Play'} onPress={() => setPlaying(!playing)} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={playing ? 'pause' : 'play'} size={22} color="#FFF" /></Pressable>
      </Card>
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
  const [now, setNow] = useState<(typeof RECITATIONS)[number]>(RECITATIONS[1]);
  const [playing, setPlaying] = useState(true);
  const [slow, setSlow] = useState(false);
  return (
    <Screen>
      <Band tint={colors.pink[0]} height={240} />
      <Header title="" />
      <Row gap={14}>
        <Avatar name="Ahmad Naseem" size={76} tint={pastel.white} />
        <View><T style={{ fontSize: 22, fontFamily: fonts.light }}>Qari’u Ahmad</T><T style={{ fontSize: 26, fontFamily: fonts.semibold }}>Naseem</T><T v="small">Hafiz · Murattal style · 114 surahs</T></View>
      </Row>
      <Row style={{ justifyContent: 'space-between', marginTop: 16 }}><T>Slow learning mode</T><Switch value={slow} onValueChange={setSlow} accessibilityLabel="Slow learning mode" /></Row>
      <Card style={{ marginTop: 10, gap: 10 }}>
        <T v="small">Now playing</T>
        <Row style={{ justifyContent: 'space-between' }}><T v="h3">{now[1]}</T><Text style={ar(24, colors.pink[1])}>{now[3]}</Text></Row>
        <Progress value={35} color={colors.pink[1]} />
        <Row style={{ justifyContent: 'space-between' }}><T v="small">0:42</T><T v="small">{now[2]}</T></Row>
        <Row gap={24} style={{ justifyContent: 'center' }}>
          <Pressable accessibilityLabel="Previous"><Ionicons name="play-skip-back" size={24} color={colors.ink} /></Pressable>
          <Pressable accessibilityLabel={playing ? 'Pause' : 'Play'} onPress={() => setPlaying(!playing)} style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={playing ? 'pause' : 'play'} size={24} color="#FFF" /></Pressable>
          <Pressable accessibilityLabel="Next"><Ionicons name="play-skip-forward" size={24} color={colors.ink} /></Pressable>
        </Row>
      </Card>
      <Section title="Recitations" />
      <View style={{ gap: 8 }}>
        {RECITATIONS.map((r) => (
          <ListRow key={r[0]} onPress={() => { setNow(r); setPlaying(true); }} left={<Glyph text={String(r[0])} size={40} tint={pastel.pink} />} title={r[1]} sub={r[2]} right={<Text style={ar(22, colors.pink[1])}>{r[3]}</Text>} />
        ))}
      </View>
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
