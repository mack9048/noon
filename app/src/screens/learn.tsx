import React, { useEffect, useState } from 'react';
import { Image, Linking, Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { demoNote } from '@/components/kit';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, ErrorBox, GradientCard, Grid, Header, IconButton, Loading, Pill, Row, Screen, Segmented, T, TypeIcon, Empty } from '@/components/ui';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/lib/auth';
import { useBase } from '@/lib/useBase';
import { useLayout } from '@/lib/useLayout';
import { setLearnSpace, useLearnSpaces } from '@/lib/learnSpace';
import { LearnTiles } from './learnspace';
import { ContentViewerHost, openContent } from './courseBuilder';
import type { Board, Course, CourseDetail, CourseItem, LiveInfo, SchoolClass, Subject, SubjectDetail, StudyTool, SyllabusKey, ToolType } from '@/lib/types';
import { colors, ContentKind, fonts, gradients, scriptFont } from '@/theme/tokens';

const pastels = [colors.lav, colors.sky, colors.mint, colors.pink, colors.butter];
const open = (url?: string | null) => { if (url && url !== '#') Linking.openURL(url); };
/** A real meeting link set by a teacher (old built-in test rooms are ignored → Live classes). */
const meetLink = (url?: string | null) => (url && /^https:\/\//.test(url) && !/jit\.si/i.test(url) ? url : null);

/* ================= Noon Courses ================= */

const COURSE_GLYPH: Record<string, string> = { Arabic: 'ع', Quran: 'ق', Fiqh: 'ف', Seerah: 'س', Hifz: 'ح', Thajweed: 'ت' };
const deep = (hex: string) => {
  // A darker partner colour for the course banner gradient.
  const n = parseInt(hex.replace('#', ''), 16); const f = (v: number) => Math.max(0, Math.round(v * 0.55));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('')}`;
};
const BANNER: Record<string, [string, string]> = { Arabic: ['#5B43E0', '#9B7BE8'], Quran: ['#14945A', '#4ED68A'], Thajweed: ['#14945A', '#4ED68A'], Fiqh: ['#0B5166', '#1F8AA8'], Seerah: ['#C2307E', '#FF7EC4'], Hifz: ['#D9A21A', '#FFC93C'] };
const bannerFor = (c: Course): [string, string] => BANNER[c.category] ?? [deep(c.cover), c.cover];

/** Our Courses: live banner, Noon Buds, then Madrasa Support and every Noon Course. */
export function CoursesScreen() {
  const base = useBase();
  const list = useApi<Course[]>('/courses');
  const courses = [...(list.data ?? [])].sort((a, b) => Number(!!b.enrolled) - Number(!!a.enrolled));
  const live = courses.find((c) => c.enrolled && c.next_live_at);
  return (
    <Screen>
      <Header title="Our Courses" />
      {live ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Join live ${live.title}`} onPress={() => router.push(`${base}/courses/${live.id}` as any)}
          style={{ borderRadius: 22, backgroundColor: colors.pink[0], borderWidth: 1.5, borderColor: '#EDBEDD', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <T style={{ color: '#C2307E', fontFamily: fonts.semibold, fontSize: 11 }}>● LIVE {live.next_live_at?.toUpperCase()}</T>
            <T v="h3" numberOfLines={1}>{live.category} · {live.title}</T>
            <T v="small">{live.teacher_name ?? 'Noon Learn'} · Noon Meet</T>
          </View>
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}><T style={{ color: '#FFF', fontFamily: fonts.semibold }}>Join</T></View>
        </Pressable>
      ) : null}
      <Pressable accessibilityRole="button" accessibilityLabel="Noon Buds kids club" onPress={() => router.push(`${base}/noon-buds` as any)} style={{ marginTop: 10 }}>
        <LinearGradient colors={['#14945A', '#3DD9A8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 22, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="leaf-outline" size={22} color="#FFF" /></View>
          <View style={{ flex: 1 }}>
            <T style={{ color: '#D7F5E6', fontFamily: fonts.semibold, fontSize: 11 }}>KIDS CLUB · AGE 4–8</T>
            <T style={{ color: '#FFF', fontFamily: fonts.fun, fontSize: 18 }}>Noon Buds</T>
            <T style={{ color: '#D7F5E6', fontSize: 12 }}>Rhymes, colouring & first letters</T>
          </View>
          <View style={{ backgroundColor: '#FFF', borderRadius: 16, height: 32, paddingHorizontal: 14, justifyContent: 'center' }}><T style={{ color: '#14945A', fontFamily: fonts.semibold }}>Open</T></View>
        </LinearGradient>
      </Pressable>
      <T v="h2" style={{ marginTop: 16, marginBottom: 10 }}>All courses · {courses.length + 1}</T>
      {list.loading ? <Loading /> : list.error ? <ErrorBox message={list.error} onRetry={list.reload} /> : (
        <Grid cols={{ phone: 1, tablet: 2, desktop: 3 }} gap={12}>
          <MadrasaSupportCard />
          {courses.map((c) => <CourseCard key={c.id} c={c} />)}
        </Grid>
      )}
      {!list.loading && !courses.length ? <Empty text="No courses here yet." /> : null}
    </Screen>
  );
}

/* ================= Live-only courses ================= */

const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const whenText = (iso: string) => new Date(iso).toLocaleString([], { weekday: 'long', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const daysText = (d: number[]) => (d.length === 7 ? 'Every day' : [...d].sort((a, b) => ((a || 7) - (b || 7))).map((x) => WEEK[x]).join(', '));
const timeText = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };

/** Minutes or hours until a time, in plain words. */
function untilText(iso: string, now: number) {
  const min = Math.round((new Date(iso).getTime() - now) / 60000);
  if (min <= 0) return 'now';
  if (min < 60) return `in ${min} min`;
  if (min < 24 * 60) return `in ${Math.floor(min / 60)} h ${min % 60} min`;
  return `in ${Math.round(min / 1440)} day${Math.round(min / 1440) === 1 ? '' : 's'}`;
}

/** Open the meeting link of the class on now (the server checks the time and counts attendance). */
export async function joinLiveCourse(courseId: number) {
  try {
    const r = await api.post<{ url: string }>(`/courses/${courseId}/live/join`);
    await Linking.openURL(r.url);
  } catch (e: any) { demoNote(e?.message ?? 'Could not open the class.'); }
}

/** The weekly timetable and the next classes (course page before and after joining). */
export function LiveTimetableView({ live }: { live: LiveInfo }) {
  return (
    <View style={{ gap: 10, marginTop: 16 }}>
      <T v="h2">Class timetable</T>
      {live.slots.length ? (
        <Card style={{ gap: 8 }}>
          {live.slots.map((s) => (
            <Row key={s.id} gap={10}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.lav[0], alignItems: 'center', justifyContent: 'center' }}><Ionicons name="videocam" size={18} color={colors.lav[1]} /></View>
              <View style={{ flex: 1 }}><T style={{ fontFamily: fonts.semibold }}>{daysText(s.days)} · {timeText(s.start_time)}</T><T v="small">{s.duration_min} min live class{s.title ? ` · ${s.title}` : ''}</T></View>
            </Row>
          ))}
          <T v="small">Times are India time (IST).</T>
        </Card>
      ) : <T v="small">The timetable will be added soon.</T>}
      {live.upcoming.length ? (
        <Card style={{ gap: 6 }}>
          <T v="h3">Next classes · your time</T>
          {live.upcoming.slice(0, 5).map((u) => <Row key={u.starts_at} gap={8}><Ionicons name={u.state === 'live' ? 'radio' : 'calendar-outline'} size={16} color={u.state === 'live' ? colors.red : colors.muted} /><T style={{ flex: 1 }}>{whenText(u.starts_at)}{u.title ? ` · ${u.title}` : ''}</T></Row>)}
        </Card>
      ) : null}
    </View>
  );
}

/** A joined live-only course: the next class with a countdown and Join, timetable, classes attended. */
function LiveCourseScreen({ c, live, reload }: { c: CourseDetail; live: LiveInfo; reload: () => void }) {
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);
  // When the next class starts or ends, ask the server for the new state.
  const next = live.upcoming[0];
  useEffect(() => {
    if (!next) return;
    const edge = (next.state === 'live' ? new Date(next.ends_at).getTime() : new Date(next.starts_at).getTime() - live.open_before_min * 60000) - Date.now();
    if (edge > 0 && edge < 6 * 3600000) { const t = setTimeout(reload, edge + 1000); return () => clearTimeout(t); }
  }, [next?.starts_at, next?.state]); // eslint-disable-line react-hooks/exhaustive-deps
  const g = bannerFor(c);
  const onNow = next?.state === 'live';
  const join = async () => { setBusy(true); await joinLiveCourse(c.id); setBusy(false); reload(); };
  return (
    <Screen>
      <Header title={c.title} subtitle={`Live classes · ${live.summary ?? 'timetable soon'}`} />
      <LinearGradient colors={onNow ? ['#C2307E', '#FF7EC4'] : [g[0], g[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 28, padding: 20, gap: 6, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', right: -50, top: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.14)' }} />
        <T style={{ color: 'rgba(255,255,255,0.85)', fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0.5 }}>{onNow ? '● LIVE NOW' : 'NEXT LIVE CLASS'}</T>
        {next ? (
          <>
            <T style={{ color: '#FFF', fontFamily: fonts.fun, fontSize: 26, lineHeight: 34 }}>{whenText(next.starts_at)}</T>
            <T style={{ color: 'rgba(255,255,255,0.9)' }}>{onNow ? 'The class is open. Join now.' : `Starts ${untilText(next.starts_at, now)} · join opens ${live.open_before_min} min before`}{next.title ? ` · ${next.title}` : ''}</T>
            <Pressable accessibilityRole="button" accessibilityLabel="Join live class" disabled={!onNow || busy} onPress={join}
              style={{ marginTop: 10, alignSelf: 'flex-start', backgroundColor: '#FFF', borderRadius: 24, height: 48, paddingLeft: 6, paddingRight: 18, flexDirection: 'row', alignItems: 'center', gap: 10, opacity: onNow ? 1 : 0.6 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: onNow ? '#C2307E' : '#9AA9AE', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="videocam" size={16} color="#FFF" /></View>
              <T style={{ fontFamily: fonts.fun, fontSize: 17, color: onNow ? '#74266A' : colors.muted }}>{busy ? 'Opening…' : onNow ? 'Join live class' : 'Join opens soon'}</T>
            </Pressable>
          </>
        ) : <T style={{ color: '#FFF', fontSize: 16 }}>No classes are planned right now. Please check back soon.</T>}
      </LinearGradient>
      <Row gap={10} style={{ marginTop: 12 }}>
        <Card style={{ flex: 1, alignItems: 'center', paddingVertical: 14 }}><T style={{ fontFamily: fonts.semibold, fontSize: 24, color: colors.violet }}>{live.attended}</T><T v="small">Classes attended</T></Card>
        <Card style={{ flex: 1, alignItems: 'center', paddingVertical: 14 }}><T style={{ fontFamily: fonts.semibold, fontSize: 24, color: colors.teal }}>{live.slots.reduce((n, s) => n + s.days.length, 0)}</T><T v="small">Classes a week</T></Card>
      </Row>
      <LiveTimetableView live={live} />
    </Screen>
  );
}

/** One course card (Our Courses grid and the Classroom course picker). */
/** "Free course", "2 free lessons", "7-day free trial". */
export function trialText(c: Pick<Course, 'is_free' | 'format' | 'trial_lessons' | 'trial_days'>) {
  if (c.is_free) return 'Free course';
  if (c.format === 'live') return c.trial_days ? `${c.trial_days}-day free trial` : 'Paid course';
  if (c.trial_lessons) return `${c.trial_lessons} free lesson${c.trial_lessons === 1 ? '' : 's'}`;
  return 'Paid course';
}

export function CourseCard({ c }: { c: Course }) {
  const base = useBase();
    const g = bannerFor(c);
    const tag = c.next_live_at ? `LIVE ${c.next_live_at.toUpperCase()}` : c.enrolled && c.progress != null ? `${Math.round((c.progress / 100) * c.lessons_count)} OF ${c.lessons_count} DONE` : c.is_free ? 'FREE' : 'NEW';
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={c.title} onPress={() => router.push(`${base}/courses/${c.id}` as any)}
        style={{ borderRadius: 26, backgroundColor: '#FFF', overflow: 'hidden' }}>
        <LinearGradient colors={g} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: c.thumbnail_url ? 140 : 96, padding: 14 }}>
          {c.thumbnail_url ? <Image source={{ uri: c.thumbnail_url }} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} resizeMode="cover" accessibilityLabel={c.title} /> : <>
            <View style={{ position: 'absolute', right: -30, top: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.14)' }} />
            <T style={{ position: 'absolute', right: 22, top: 6, fontFamily: fonts.arabic, fontSize: 48, color: 'rgba(255,255,255,0.9)' }}>{COURSE_GLYPH[c.category] ?? c.title[0]}</T>
          </>}
          <View style={{ alignSelf: 'flex-start', backgroundColor: '#FFF', borderRadius: 11, paddingHorizontal: 8, height: 22, justifyContent: 'center' }}><T style={{ fontSize: 10, fontFamily: fonts.semibold, color: g[0] }}>{c.next_live_at ? '● ' : ''}{tag}</T></View>
        </LinearGradient>
        <View style={{ padding: 14, gap: 6 }}>
          <T v="h3">{c.title}</T>
          <T v="small">{c.madrasa_label ?? c.teacher_name ?? c.category} · {c.format === 'live' ? `Live · ${c.live_summary ?? 'timetable soon'}` : `${c.lessons_count} lessons`}</T>
          {c.enrolled && c.progress != null ? <Progress value={c.progress} /> : null}
          <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
            <T v="small">{c.enrolled ? `Level · ${c.level}` : trialText(c)}</T>
            <View style={{ backgroundColor: g[0], borderRadius: 16, height: 32, paddingHorizontal: 14, justifyContent: 'center' }}><T style={{ color: '#FFF', fontFamily: fonts.semibold, fontSize: 13 }}>{c.enrolled ? 'Explore ›' : 'View ›'}</T></View>
          </Row>
        </View>
      </Pressable>
    );
}

/** Madrasa Support, shown as one of Our Courses: board → class → subject → lessons. */
export function MadrasaSupportCard() {
  const base = useBase();
  const { user } = useAuth();
  const mine = user?.board_name || user?.class_label ? [user.board_name, user.class_label ? `Class ${user.class_label}` : null].filter(Boolean).join(' · ') : 'AP · EK · Samastha · General';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Madrasa Support" onPress={() => router.push(`${base}/support` as any)} style={{ borderRadius: 26, backgroundColor: '#FFF', overflow: 'hidden' }}>
      <LinearGradient colors={gradients.support as unknown as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 96, padding: 14 }}>
        <View style={{ position: 'absolute', right: -30, top: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.14)' }} />
        <T style={{ position: 'absolute', right: 18, top: 10, fontFamily: fonts.arabic, fontSize: 40, color: 'rgba(255,255,255,0.9)' }}>مدرسة</T>
        <View style={{ alignSelf: 'flex-start', backgroundColor: '#FFF', borderRadius: 11, paddingHorizontal: 8, height: 22, justifyContent: 'center' }}><T style={{ fontSize: 10, fontFamily: fonts.semibold, color: colors.teal }}>CLASS 1 TO +2</T></View>
      </LinearGradient>
      <View style={{ padding: 14, gap: 6 }}>
        <T v="h3">Madrasa Support</T>
        <T v="small">Textbooks, video and audio classes for every subject · {mine}</T>
        <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
          <T v="small">By board and class</T>
          <View style={{ backgroundColor: colors.teal, borderRadius: 16, height: 32, paddingHorizontal: 14, justifyContent: 'center' }}><T style={{ color: '#FFF', fontFamily: fonts.semibold, fontSize: 13 }}>Open ›</T></View>
        </Row>
      </View>
    </Pressable>
  );
}

/** Course page before joining: what you'll learn, lessons with previews, teacher, price and Join. */
function CourseIntro({ c, onJoin }: { c: CourseDetail; onJoin: () => Promise<void> }) {
  const base = useBase();
  const { isPhone } = useLayout();
  const [busy, setBusy] = useState(false);
  const [all, setAll] = useState(false);
  const g = bannerFor(c);
  const learn = [`Key ideas of ${c.category} in simple order`, 'Short lessons with video, audio and notes', 'A quiz after every few lessons', 'Listen offline with audio notes'];
  const items = all ? c.items : c.items.slice(0, 5);
  const join = async () => { setBusy(true); try { await onJoin(); } finally { setBusy(false); } };
  return (
    <Screen bar={false} overlay={(
      <View style={{ position: 'absolute', left: 12, right: 12, bottom: isPhone ? 100 : 16, backgroundColor: '#FFF', borderRadius: 24, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 14, maxWidth: 640, alignSelf: 'center', shadowColor: '#10303A', shadowOpacity: 0.12, shadowRadius: 16 }}>
        <View><T v="small">{c.is_free ? 'Price' : 'Free trial'}</T><T style={{ fontFamily: fonts.fun, fontSize: 18, color: g[0] }}>{c.is_free ? 'Free' : trialText(c).replace('Paid course', '—')}</T></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Join course" disabled={busy} onPress={join} style={{ flex: 1 }}>
          <LinearGradient colors={[g[1], g[0]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.7 : 1 }}>
            <T style={{ color: '#FFF', fontFamily: fonts.fun, fontSize: 18 }}>{busy ? 'Joining…' : 'Join course'}</T>
          </LinearGradient>
        </Pressable>
      </View>
    )}>
      <LinearGradient colors={[g[1], g[0]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ marginHorizontal: -20, marginTop: -12, height: 250, padding: 20, overflow: 'hidden' }}>
        {c.thumbnail_url ? <Image source={{ uri: c.thumbnail_url }} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} resizeMode="cover" accessibilityLabel={c.title} />
          : <View style={{ position: 'absolute', right: -40, top: -40, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.14)' }} />}
        <Row style={{ justifyContent: 'space-between' }}>
          <IconButton name="chevron-back" label="Back" size={44} onPress={() => (router.canGoBack() ? router.back() : router.replace(`${base}/courses` as any))} />
          <IconButton name="heart-outline" label="Save course" size={44} color={g[0]} onPress={() => demoNote('Saved to your list.')} />
        </Row>
        <View style={{ alignSelf: 'flex-start', marginTop: 12, backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 10, height: 24, justifyContent: 'center' }}><T style={{ fontSize: 11, fontFamily: fonts.semibold, color: g[0] }}>{trialText(c).toUpperCase()} · {c.level.toUpperCase()}</T></View>
        {c.thumbnail_url ? null : <T style={{ position: 'absolute', right: 30, bottom: 30, fontFamily: fonts.arabic, fontSize: 110, color: 'rgba(255,255,255,0.9)' }}>{COURSE_GLYPH[c.category] ?? c.title[0]}</T>}
      </LinearGradient>
      <View style={{ marginHorizontal: -20, marginTop: -28, backgroundColor: colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 20 }}>
        <T v="h1">{c.title}</T>
        <T v="small">{c.madrasa_label ?? c.category} · {c.level} · with {c.teacher_name ?? 'Noon Learn teachers'}</T>
        <T v="small" style={{ marginTop: 4 }}><T style={{ color: '#D9A21A', fontFamily: fonts.semibold }}>★ 4.8</T> · Malayalam & English</T>
        <Row gap={8} style={{ marginTop: 12 }}>
          {(c.format === 'live' ? [['Live', 'Classes', colors.pink], [String(c.live?.upcoming.length ? c.live.slots.reduce((n, s) => n + s.days.length, 0) : 0), 'A week', colors.lav], [c.live?.slots[0] ? `${c.live.slots[0].duration_min}m` : '—', 'Each class', colors.butter]] : [[String(c.lessons_count), 'Lessons', colors.pink], [`${Math.max(1, Math.round(c.lessons_count / 5))} h`, 'Total', colors.lav], ['✓', 'Certificate', colors.butter]]).map(([v, l, t]) => (
            <View key={l as string} style={{ flex: 1, borderRadius: 18, backgroundColor: (t as readonly string[])[0], paddingVertical: 10, alignItems: 'center' }}>
              <T style={{ fontFamily: fonts.semibold, fontSize: 20, color: (t as readonly string[])[1] }}>{v as string}</T><T v="small" style={{ color: (t as readonly string[])[1] }}>{l as string}</T>
            </View>
          ))}
        </Row>
        <Card style={{ marginTop: 12, gap: 8 }}>
          <T v="h3">What you'll learn</T>
          {learn.map((l) => <Row key={l} gap={8}><Ionicons name="checkmark-circle" size={18} color={colors.green} /><T style={{ flex: 1, fontSize: 14 }}>{l}</T></Row>)}
        </Card>
        {c.format === 'live' && c.live ? <LiveTimetableView live={c.live} /> : null}
        {c.format === 'live' ? null : <Row style={{ justifyContent: 'space-between', marginTop: 16, marginBottom: 8 }}><T v="h2">Lessons</T><T v="small">{c.lessons?.length ? `${c.lessons.length} lessons` : `${c.items.length} items`}</T></Row>}
        {c.format === 'live' ? null : c.lessons?.length ? <LessonList c={c} locked /> : (
        <View style={{ gap: 8 }}>
          {items.map((it, i) => (
            <Card key={it.id} onPress={() => (i < 2 ? (it.kind === 'live' ? (meetLink(it.url) ? open(it.url) : router.push(`${base}/live` as any)) : openContent(it)) : demoNote('Join the course to open this lesson.'))}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
              <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: i < 2 ? colors.pink[0] : '#EEF3F5', alignItems: 'center', justifyContent: 'center' }}><T style={{ fontFamily: fonts.semibold, color: i < 2 ? colors.pink[1] : colors.muted }}>{i + 1}</T></View>
              <View style={{ flex: 1 }}><T style={{ fontFamily: fonts.semibold }} numberOfLines={1}>{it.title}</T><T v="small">{it.meta ?? it.kind}</T></View>
              {i < 2 ? <View style={{ backgroundColor: colors.pink[0], borderRadius: 12, paddingHorizontal: 10, height: 26, justifyContent: 'center' }}><T style={{ color: colors.pink[1], fontSize: 12, fontFamily: fonts.semibold }}>▶ Preview</T></View>
                : <Ionicons name="lock-closed-outline" size={16} color={colors.muted} />}
            </Card>
          ))}
          {c.items.length > 5 && !all ? (
            <Pressable accessibilityRole="button" onPress={() => setAll(true)} style={{ height: 48, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#EDBEDD', alignItems: 'center', justifyContent: 'center' }}>
              <T style={{ color: '#C2307E', fontFamily: fonts.semibold }}>Show all {c.items.length} lessons</T>
            </Pressable>
          ) : null}
        </View>
        )}
        <ContentViewerHost />
        <Card style={{ marginTop: 12, marginBottom: 100, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.pink[0], alignItems: 'center', justifyContent: 'center' }}><T style={{ fontFamily: fonts.semibold, color: colors.pink[1] }}>{(c.teacher_name ?? 'NL').split(' ').map((w) => w[0]).join('').slice(0, 2)}</T></View>
          <View style={{ flex: 1 }}><T style={{ fontFamily: fonts.semibold }}>{c.teacher_name ?? 'Noon Learn'}</T><T v="small">{c.category} teacher</T></View>
          <SmallBtn title="Message" onPress={() => router.push(`${base}/chat` as any)} />
        </Card>
      </View>
    </Screen>
  );
}

function SmallBtn({ title, onPress }: { title: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={{ height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: '#EEF3F5', justifyContent: 'center' }}><T style={{ fontFamily: fonts.semibold, fontSize: 13 }}>{title}</T></Pressable>;
}

export function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const base = useBase();
  const course = useApi<CourseDetail>(`/courses/${id}`);
  const [filter, setFilter] = useState<'all' | ContentKind>('all');
  if (course.loading && !course.data) return <Screen><Loading /></Screen>;
  if (!course.data) return <Screen><ErrorBox message={course.error ?? 'Not found'} onRetry={course.reload} /></Screen>;
  const c = course.data;
  if (!c.enrolled) return <CourseIntro c={c} onJoin={async () => { await api.post(`/courses/${c.id}/enroll`); setLearnSpace(`course-${c.id}`); course.reload(); }} />;
  if (c.format === 'live' && c.live) return <LiveCourseScreen c={c} live={c.live} reload={course.reload} />;
  const items = c.items.filter((i) => filter === 'all' || i.kind === filter);
  const live = c.items.find((i) => i.kind === 'live' && !i.done);

  return (
    <Screen>
      <Header title={c.title} subtitle={`${c.teacher_name ?? c.category} · ${c.lessons_count} lessons`} />
      {c.progress != null ? <Progress value={c.progress} /> : null}
      <View style={{ marginTop: 14 }}><LearnTiles space={{ key: `course-${c.id}`, type: 'course', id: c.id, title: c.title, subtitle: 'Noon Course' }} /></View>
      {live ? (
        <Card tint={colors.pink[0]} onPress={() => (meetLink(live.url) ? open(live.url) : router.push(`${base}/live` as any))} style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TypeIcon kind="live" />
          <View style={{ flex: 1 }}><T v="label" style={{ color: colors.pink[1] }}>{live.meta?.toUpperCase()}</T><T v="h3">{live.title}</T></View>
          <Button title="Join" style={{ height: 42 }} onPress={() => (meetLink(live.url) ? open(live.url) : router.push(`${base}/live` as any))} />
        </Card>
      ) : null}
      <ContentViewerHost />
      {c.lessons?.length ? (
        <View style={{ marginTop: 14, gap: 12 }}>
          {c.access && !c.access.paid && c.lessons.some((l) => l.locked) ? (
            <Card tint={colors.butter[0]} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Ionicons name="gift-outline" size={24} color={colors.butter[1]} />
              <View style={{ flex: 1 }}>
                <T v="h3" style={{ color: colors.butter[1] }}>Free trial · {c.lessons.filter((l) => !l.locked).length} of {c.lessons.length} lessons open</T>
                <T v="small" style={{ color: colors.butter[1] }}>The other lessons open after the free trial. Ask your madrasa office or Noon Learn to unlock the full course.</T>
              </View>
            </Card>
          ) : null}
          <Button title={(c.progress ?? 0) > 0 ? 'Continue learning' : 'Start learning'} icon="play" onPress={() => router.push(`${base}/courses/${c.id}/play` as any)} />
          <LessonList c={c} onDone={course.reload} />
        </View>
      ) : (
      <>
      <View style={{ marginTop: 14 }}>
        <Segmented value={filter} onChange={setFilter} activeColor={colors.ink}
          options={[{ key: 'all', label: 'All' }, { key: 'live', label: 'Live' }, { key: 'video', label: 'Video' }, { key: 'audio', label: 'Audio' }, { key: 'pdf', label: 'PDF' }, { key: 'test', label: 'Tests' }]} />
      </View>
      <View style={{ marginTop: 10, gap: 8 }}>
        {items.map((it) => <ItemRow key={it.id} it={it} onDone={course.reload} />)}
        {!items.length ? <Empty text="Nothing in this section yet." /> : null}
      </View>
      </>
      )}
    </Screen>
  );
}

const ACTION: Record<ContentKind, string> = { live: 'Join', video: 'Watch', audio: 'Listen', pdf: 'Open', test: 'Start', html: 'Play', note: 'Read', image: 'View', link: 'Open' };

/** Open a piece of content and mark it done (enrolled students only). */
function ItemRow({ it, onDone, locked }: { it: CourseItem; onDone?: () => void; locked?: boolean }) {
  const base = useBase();
  const go = async () => {
    if (locked) return demoNote('Join the course to open this lesson.');
    if (it.kind === 'live') { if (meetLink(it.url)) open(it.url); else router.push(`${base}/live` as any); }
    else await openContent(it);
    if (onDone && !it.done) { api.post(`/course-items/${it.id}/complete`).then(onDone).catch(() => {}); }
  };
  return (
    <Card onPress={go} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <TypeIcon kind={it.kind} />
      <View style={{ flex: 1 }}><T v="h3" numberOfLines={1}>{it.title}</T>{it.meta ? <T v="small" numberOfLines={1}>{it.meta}</T> : null}</View>
      {locked ? <Ionicons name="lock-closed-outline" size={16} color={colors.muted} />
        : it.done ? <Ionicons name="checkmark-circle" size={28} color={colors.green} accessibilityLabel="Done" />
        : <Button title={ACTION[it.kind] ?? 'Open'} kind="ghost" style={{ height: 38, paddingHorizontal: 14 }} onPress={go} />}
    </Card>
  );
}

export const LOCKED_MSG = 'This lesson opens after the free trial. Ask your madrasa office or Noon Learn to unlock the full course.';

/** Lessons grouped by subject; tap a lesson to open it in the course player. */
function LessonList({ c, locked }: { c: CourseDetail; locked?: boolean; onDone?: () => void }) {
  const base = useBase();
  const lessons = c.lessons ?? [];
  const subjects = c.subjects ?? [];
  const groups = [{ title: null as string | null, list: lessons.filter((l) => !l.subject_id || !subjects.some((s) => s.id === l.subject_id)) },
    ...subjects.map((s) => ({ title: s.title as string | null, thumb: s.thumbnail_url ?? null, list: lessons.filter((l) => l.subject_id === s.id) }))].filter((g) => g.list.length) as { title: string | null; thumb?: string | null; list: typeof lessons }[];
  let n = 0;
  return (
    <View style={{ gap: 14 }}>
      {groups.map((g, gi) => (
        <View key={gi} style={{ gap: 8 }}>
          {g.title ? <Row gap={8} style={{ alignItems: 'center' }}>{g.thumb ? <Image source={{ uri: g.thumb }} style={{ width: 40, height: 40, borderRadius: 12 }} accessibilityLabel={g.title} /> : <Ionicons name="folder-open" size={18} color={colors.violet} />}<T v="h3">{g.title}</T></Row> : null}
          {g.list.map((l) => {
            n += 1;
            // Before joining: free-trial lessons are open to preview. After joining: past the free trial is locked.
            const shut = locked ? (l.locked ?? !l.free_preview) : !!l.locked;
            const preview = locked && !shut;
            const done = l.items.length > 0 && l.items.every((i) => i.done);
            const started = l.items.some((i) => i.done);
            return (
              <Card key={l.id} onPress={() => (shut ? demoNote(locked ? 'Join the course to open this lesson.' : LOCKED_MSG) : router.push(`${base}/courses/${c.id}/play?lesson=${l.id}` as any))}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
                <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: done ? colors.mint[0] : shut ? '#EEF3F5' : colors.lav[0], alignItems: 'center', justifyContent: 'center' }}>
                  {done ? <Ionicons name="checkmark" size={18} color={colors.mint[1]} /> : <T style={{ fontFamily: fonts.semibold, color: shut ? colors.muted : colors.lav[1] }}>{n}</T>}
                </View>
                <View style={{ flex: 1 }}>
                  <T style={{ fontFamily: fonts.semibold }} numberOfLines={2}>{l.title}</T>
                  <T v="small">{l.items.length} items{l.duration ? ` · ${l.duration}` : ''}{!locked && started && !done ? ` · ${l.items.filter((i) => i.done).length}/${l.items.length} done` : ''}</T>
                </View>
                {preview ? <View style={{ backgroundColor: colors.pink[0], borderRadius: 12, paddingHorizontal: 10, height: 26, justifyContent: 'center' }}><T style={{ color: colors.pink[1], fontSize: 12, fontFamily: fonts.semibold }}>▶ Free</T></View>
                  : shut ? <Ionicons name="lock-closed-outline" size={16} color={colors.muted} /> : <Ionicons name="play-circle" size={26} color={colors.violet} />}
              </Card>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function Progress({ value }: { value: number }) {
  return (
    <Row gap={8}>
      <View style={{ flex: 1, height: 7, borderRadius: 4, backgroundColor: '#E3ECEF', overflow: 'hidden' }}>
        <View style={{ width: `${value}%`, height: 7, backgroundColor: colors.violet }} />
      </View>
      <T v="small" style={{ fontFamily: fonts.semibold, color: colors.ink }}>{value}%</T>
    </Row>
  );
}

/* ================= Madrasa Support: board → class → subject → lessons ================= */

export function BoardsScreen() {
  const base = useBase();
  const boards = useApi<Board[]>('/boards');
  return (
    <Screen>
      <Header title="Madrasa Support" subtitle="Step 1 · choose your board" />
      {boards.loading ? <Loading /> : (
        <Grid cols={{ phone: 1, tablet: 2, desktop: 2 }}>
          {(boards.data ?? []).map((b, i) => (
            <Card key={b.id} onPress={() => router.push(`${base}/support/board/${b.id}` as any)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 18 }}>
              <View style={{ width: 76, height: 76, borderRadius: 22, backgroundColor: b.logo_url ? '#FFF' : pastels[(i + 2) % 5][0], alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: b.logo_url ? 1 : 0, borderColor: colors.line }}>
                {b.logo_url ? <Image source={{ uri: b.logo_url }} style={{ width: 70, height: 70 }} resizeMode="contain" accessibilityLabel={`${b.name} logo`} />
                  : <T style={{ fontFamily: fonts.semibold, fontSize: 18, color: pastels[(i + 2) % 5][1] }}>{b.code}</T>}
              </View>
              <View style={{ flex: 1 }}>
                <T v="h3">{b.name}</T>
                <T v="small">{b.full_name || b.meta}</T>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </Card>
          ))}
        </Grid>
      )}
    </Screen>
  );
}

export function ClassesScreen() {
  const { id, syllabus } = useLocalSearchParams<{ id: string; syllabus?: string }>();
  const { user } = useAuth();
  const base = useBase();
  const boards = useApi<Board[]>('/boards');
  const board = boards.data?.find((b) => String(b.id) === String(id));
  const [syl, setSyl] = useState<SyllabusKey>(syllabus === 'english' || syllabus === 'general' ? syllabus : user?.syllabus === 'english' ? 'english' : 'general');
  const classes = useApi<SchoolClass[]>(`/boards/${id}/classes?syllabus=${syl}`);
  const syllabi = board?.syllabi ?? [{ key: 'general' as const, label: 'General Madrasa Syllabus', classes: 0 }, { key: 'english' as const, label: 'English Medium Madrasa Syllabus', classes: 0 }];
  return (
    <Screen>
      <Header title={board ? board.name : 'Choose class'} subtitle="Step 2 · choose syllabus and class" />
      <T v="label" style={{ marginBottom: 8 }}>Syllabus</T>
      <Grid cols={{ phone: 1, tablet: 2, desktop: 2 }}>
        {syllabi.map((s) => {
          const on = s.key === syl;
          return (
            <Card key={s.key} onPress={() => setSyl(s.key)} tint={on ? colors.mint[0] : undefined} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 2, borderColor: on ? colors.teal : 'transparent' }}>
              <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={22} color={on ? colors.teal : colors.muted} />
              <View style={{ flex: 1 }}>
                <T v="h3">{s.label}</T>
                <T v="small">{s.key === 'english' ? 'Lessons taught in English' : 'Lessons taught in Malayalam'}</T>
              </View>
            </Card>
          );
        })}
      </Grid>
      <T v="label" style={{ marginTop: 16, marginBottom: 8 }}>Class</T>
      {classes.loading ? <Loading /> : (classes.data ?? []).length === 0 ? <Empty text="Classes for this syllabus are coming soon, in sha Allah." /> : (
        <Grid cols={{ phone: 3, tablet: 4, desktop: 6 }}>
          {(classes.data ?? []).map((c, i) => (
            <Card key={c.id} tint={pastels[i % 5][0]} onPress={() => router.push(`${base}/support/class/${c.id}` as any)} style={{ alignItems: 'center', paddingVertical: 20 }}>
              <T v="small" style={{ color: pastels[i % 5][1] }}>{c.label.startsWith('+') ? 'Plus' : 'Class'}</T>
              <T style={{ fontFamily: fonts.semibold, fontSize: 38, color: pastels[i % 5][1] }}>{c.label}</T>
              <T v="small" style={{ color: pastels[i % 5][1] }}>{c.subjects_count} subjects</T>
            </Card>
          ))}
        </Grid>
      )}
    </Screen>
  );
}

export function SubjectsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const base = useBase();
  const subjects = useApi<Subject[]>(`/classes/${id}/subjects`);
  return (
    <Screen>
      <Header title="Subjects" subtitle="Step 3 · choose a subject" />
      {subjects.loading ? <Loading /> : (
        <Grid cols={{ phone: 2, tablet: 3, desktop: 4 }}>
          {(subjects.data ?? []).map((s, i) => {
            const p = pastels[(i + 2) % 5];
            return (
              <Card key={s.id} tint={p[0]} onPress={() => router.push(`${base}/support/subject/${s.id}` as any)} style={{ padding: 0, overflow: 'hidden' }}>
                {s.thumbnail_url ? (
                  <Image source={{ uri: s.thumbnail_url }} style={{ width: '100%', aspectRatio: 1.4, backgroundColor: '#FFF' }} resizeMode="cover" accessibilityLabel={s.name} />
                ) : (
                  <View style={{ width: '100%', aspectRatio: 1.4, alignItems: 'center', justifyContent: 'center' }}>
                    <T style={{ fontFamily: fonts.arabic, fontSize: 40, color: p[1], opacity: 0.45 }}>{s.name_ar || s.name.slice(0, 1)}</T>
                  </View>
                )}
                <View style={{ padding: 12 }}>
                  <T v="h3" style={{ color: p[1] }} numberOfLines={1}>{s.name}</T>
                  <T v="small" style={{ color: p[1] }}>{s.lessons_count} lessons</T>
                </View>
              </Card>
            );
          })}
        </Grid>
      )}
    </Screen>
  );
}

export function SubjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const subject = useApi<SubjectDetail>(`/subjects/${id}`);
  const { spaces } = useLearnSpaces();
  const mine = spaces.find((x) => x.key === `subject-${id}`) ?? null; // only the student's own class has tests and marks
  const [tab, setTab] = useState<'video' | 'audio' | 'pdf'>('video');
  if (subject.loading) return <Screen><Loading /></Screen>;
  if (!subject.data) return <Screen><ErrorBox message={subject.error ?? 'Not found'} onRetry={subject.reload} /></Screen>;
  const s = subject.data;
  return (
    <Screen>
      <Header title={s.name} subtitle={`${s.board_name ?? ''} board · Class ${s.class_label ?? ''}`} />
      {mine ? <View style={{ marginBottom: 14 }}><LearnTiles space={mine} /></View> : null}
      <Grid cols={{ phone: 2, tablet: 2, desktop: 2 }}>
        <Card tint={colors.butter[0]} onPress={() => open(s.textbook_pdf_url)}><T v="label" style={{ color: colors.butter[1] }}>PDF</T><T v="h3">Textbook</T></Card>
        <Card tint={colors.pink[0]} onPress={() => setTab('pdf')}><T v="label" style={{ color: colors.pink[1] }}>PDF</T><T v="h3">Class notes</T></Card>
      </Grid>
      <Segmented value={tab} onChange={setTab} options={[{ key: 'video', label: 'Video class' }, { key: 'audio', label: 'Audio class' }, { key: 'pdf', label: 'PDF notes' }]} />
      <View style={{ marginTop: 10, gap: 8 }}>
        {s.lessons.map((l) => {
          const url = tab === 'video' ? l.video_url : tab === 'audio' ? l.audio_url : l.note_pdf_url;
          const meta = tab === 'video' ? `Video class · ${l.video_duration ?? ''}` : tab === 'audio' ? `Audio class · ${l.audio_duration ?? ''}` : 'Class note · PDF';
          return (
            <Card key={l.id} onPress={() => open(url)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: colors.sky[0], alignItems: 'center', justifyContent: 'center' }}><T v="h3" style={{ color: colors.sky[1] }}>{l.position}</T></View>
              <View style={{ flex: 1 }}><T v="h3" numberOfLines={1}>{l.title}</T><T v="small">{meta}</T></View>
              <Ionicons name={tab === 'pdf' ? 'download-outline' : 'play-circle'} size={30} color={colors.teal} />
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

/* ================= Study tools: charts / adkar / slides / forms ================= */

const toolMeta: Record<Exclude<ToolType, 'audio'>, { title: string; g: readonly string[] }> = {
  chart: { title: 'Charts', g: gradients.chart }, adkar: { title: 'Adkar', g: gradients.adkar },
  slide: { title: 'Slides', g: gradients.slides }, form: { title: 'Forms', g: gradients.forms },
};

export function StudyToolsScreen() {
  const { type } = useLocalSearchParams<{ type: ToolType }>();
  const [t, setT] = useState<Exclude<ToolType, 'audio'>>(((type as ToolType) === 'audio' ? 'chart' : (type as Exclude<ToolType, 'audio'>)) ?? 'chart');
  const list = useApi<StudyTool[]>(`/study-tools?type=${t}`);
  return (
    <Screen back={false}>
      <GradientCard colors={gradients.brand} style={{ marginBottom: 14, gap: 12 }}>
        <Row gap={12}>
          <IconButton name="arrow-back" label="Back" tint="rgba(255,255,255,0.2)" color="#FFF" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
          <View><T style={{ fontFamily: fonts.semibold, fontSize: 28, color: '#FFF' }}>{toolMeta[t].title}</T><T style={{ color: '#E4DDFF' }}>Select one · {list.data?.length ?? 0} files</T></View>
        </Row>
        <Segmented value={t} onChange={setT} activeColor={colors.violet}
          options={(Object.keys(toolMeta) as Exclude<ToolType, 'audio'>[]).map((k) => ({ key: k, label: toolMeta[k].title }))} />
      </GradientCard>
      {list.loading ? <Loading /> : (
        <Grid cols={{ phone: 1, tablet: 2, desktop: 3 }}>
          {(list.data ?? []).map((it) => (
            <Card key={it.id} onPress={() => open(it.file_url)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 76 }}>
              <View style={{ width: 50, height: 50, borderRadius: 16, backgroundColor: '#F1F4F5', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="document-text" size={24} color={colors.ink} /></View>
              <T style={{ flex: 1, fontFamily: scriptFont(it.title), fontSize: /[؀-ۿ]/.test(it.title) ? 20 : 15, color: colors.ink }}>{it.title}</T>
              {it.is_new ? <Pill text="NEW" /> : null}
            </Card>
          ))}
        </Grid>
      )}
    </Screen>
  );
}
