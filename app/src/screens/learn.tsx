import React, { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { demoNote } from '@/components/kit';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, ErrorBox, GradientCard, Grid, Header, IconButton, Loading, Pill, Row, Screen, Segmented, T, TypeIcon, Empty } from '@/components/ui';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useBase } from '@/lib/useBase';
import { useLayout } from '@/lib/useLayout';
import { setLearnSpace, useLearnSpaces } from '@/lib/learnSpace';
import { LearnTiles } from './learnspace';
import type { Board, Course, CourseDetail, SchoolClass, Subject, SubjectDetail, StudyTool, ToolType } from '@/lib/types';
import { colors, ContentKind, fonts, gradients, scriptFont } from '@/theme/tokens';

const pastels = [colors.lav, colors.sky, colors.mint, colors.pink, colors.butter];
const open = (url?: string | null) => { if (url && url !== '#') Linking.openURL(url); };

/* ================= Noon Courses ================= */

const COURSE_GLYPH: Record<string, string> = { Arabic: 'ع', Quran: 'ق', Fiqh: 'ف', Seerah: 'س', Hifz: 'ح', Thajweed: 'ت' };
const deep = (hex: string) => {
  // A darker partner colour for the course banner gradient.
  const n = parseInt(hex.replace('#', ''), 16); const f = (v: number) => Math.max(0, Math.round(v * 0.55));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('')}`;
};
const BANNER: Record<string, [string, string]> = { Arabic: ['#5B43E0', '#9B7BE8'], Quran: ['#14945A', '#4ED68A'], Thajweed: ['#14945A', '#4ED68A'], Fiqh: ['#0B5166', '#1F8AA8'], Seerah: ['#C2307E', '#FF7EC4'], Hifz: ['#D9A21A', '#FFC93C'] };
const bannerFor = (c: Course): [string, string] => BANNER[c.category] ?? [deep(c.cover), c.cover];

/** Noon Courses: live banner, Noon Buds, then every course with progress. */
export function CoursesScreen() {
  const base = useBase();
  const list = useApi<Course[]>('/courses');
  const courses = [...(list.data ?? [])].sort((a, b) => Number(!!b.enrolled) - Number(!!a.enrolled));
  const live = courses.find((c) => c.enrolled && c.next_live_at);
  return (
    <Screen>
      <Header title="Noon Courses" />
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
      <T v="h2" style={{ marginTop: 16, marginBottom: 10 }}>All courses · {courses.length}</T>
      {list.loading ? <Loading /> : list.error ? <ErrorBox message={list.error} onRetry={list.reload} /> : (
        <Grid cols={{ phone: 1, tablet: 2, desktop: 3 }} gap={12}>
          {courses.map((c) => {
            const g = bannerFor(c);
            const tag = c.next_live_at ? `LIVE ${c.next_live_at.toUpperCase()}` : c.enrolled && c.progress != null ? `${Math.round((c.progress / 100) * c.lessons_count)} OF ${c.lessons_count} DONE` : c.is_free ? 'FREE' : 'NEW';
            return (
              <Pressable key={c.id} accessibilityRole="button" accessibilityLabel={c.title} onPress={() => router.push(`${base}/courses/${c.id}` as any)}
                style={{ borderRadius: 26, backgroundColor: '#FFF', overflow: 'hidden' }}>
                <LinearGradient colors={g} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 96, padding: 14 }}>
                  <View style={{ position: 'absolute', right: -30, top: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.14)' }} />
                  <T style={{ position: 'absolute', right: 22, top: 6, fontFamily: fonts.arabic, fontSize: 48, color: 'rgba(255,255,255,0.9)' }}>{COURSE_GLYPH[c.category] ?? c.title[0]}</T>
                  <View style={{ alignSelf: 'flex-start', backgroundColor: '#FFF', borderRadius: 11, paddingHorizontal: 8, height: 22, justifyContent: 'center' }}><T style={{ fontSize: 10, fontFamily: fonts.semibold, color: g[0] }}>{c.next_live_at ? '● ' : ''}{tag}</T></View>
                </LinearGradient>
                <View style={{ padding: 14, gap: 6 }}>
                  <T v="h3">{c.title}</T>
                  <T v="small">{c.teacher_name ?? c.category} · {c.lessons_count} lessons</T>
                  {c.enrolled && c.progress != null ? <Progress value={c.progress} /> : null}
                  <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
                    <T v="small">{c.enrolled ? `Level · ${c.level}` : c.is_free ? 'Free course' : '7-day free trial'}</T>
                    <View style={{ backgroundColor: g[0], borderRadius: 16, height: 32, paddingHorizontal: 14, justifyContent: 'center' }}><T style={{ color: '#FFF', fontFamily: fonts.semibold, fontSize: 13 }}>{c.enrolled ? 'Explore ›' : 'View ›'}</T></View>
                  </Row>
                </View>
              </Pressable>
            );
          })}
        </Grid>
      )}
      {!list.loading && !courses.length ? <Empty text="No courses here yet." /> : null}
    </Screen>
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
        <View><T v="small">Price</T><T style={{ fontFamily: fonts.fun, fontSize: 20, color: g[0] }}>{c.is_free ? 'Free' : '7 days free'}</T></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Join course" disabled={busy} onPress={join} style={{ flex: 1 }}>
          <LinearGradient colors={[g[1], g[0]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.7 : 1 }}>
            <T style={{ color: '#FFF', fontFamily: fonts.fun, fontSize: 18 }}>{busy ? 'Joining…' : 'Join course'}</T>
          </LinearGradient>
        </Pressable>
      </View>
    )}>
      <LinearGradient colors={[g[1], g[0]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ marginHorizontal: -20, marginTop: -12, height: 250, padding: 20, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', right: -40, top: -40, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.14)' }} />
        <Row style={{ justifyContent: 'space-between' }}>
          <IconButton name="chevron-back" label="Back" size={44} onPress={() => (router.canGoBack() ? router.back() : router.replace(`${base}/courses` as any))} />
          <IconButton name="heart-outline" label="Save course" size={44} color={g[0]} onPress={() => demoNote('Saved to your list.')} />
        </Row>
        <View style={{ alignSelf: 'flex-start', marginTop: 12, backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 10, height: 24, justifyContent: 'center' }}><T style={{ fontSize: 11, fontFamily: fonts.semibold, color: g[0] }}>{c.is_free ? 'FREE' : '7-DAY TRIAL'} · {c.level.toUpperCase()}</T></View>
        <T style={{ position: 'absolute', right: 30, bottom: 30, fontFamily: fonts.arabic, fontSize: 110, color: 'rgba(255,255,255,0.9)' }}>{COURSE_GLYPH[c.category] ?? c.title[0]}</T>
      </LinearGradient>
      <View style={{ marginHorizontal: -20, marginTop: -28, backgroundColor: colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 20 }}>
        <T v="h1">{c.title}</T>
        <T v="small">{c.category} · {c.level} · with {c.teacher_name ?? 'Noon Learn teachers'}</T>
        <T v="small" style={{ marginTop: 4 }}><T style={{ color: '#D9A21A', fontFamily: fonts.semibold }}>★ 4.8</T> · Malayalam & English</T>
        <Row gap={8} style={{ marginTop: 12 }}>
          {[[String(c.lessons_count), 'Lessons', colors.pink], [`${Math.max(1, Math.round(c.lessons_count / 5))} h`, 'Total', colors.lav], ['✓', 'Certificate', colors.butter]].map(([v, l, t]) => (
            <View key={l as string} style={{ flex: 1, borderRadius: 18, backgroundColor: (t as readonly string[])[0], paddingVertical: 10, alignItems: 'center' }}>
              <T style={{ fontFamily: fonts.semibold, fontSize: 20, color: (t as readonly string[])[1] }}>{v as string}</T><T v="small" style={{ color: (t as readonly string[])[1] }}>{l as string}</T>
            </View>
          ))}
        </Row>
        <Card style={{ marginTop: 12, gap: 8 }}>
          <T v="h3">What you'll learn</T>
          {learn.map((l) => <Row key={l} gap={8}><Ionicons name="checkmark-circle" size={18} color={colors.green} /><T style={{ flex: 1, fontSize: 14 }}>{l}</T></Row>)}
        </Card>
        <Row style={{ justifyContent: 'space-between', marginTop: 16, marginBottom: 8 }}><T v="h2">Lessons</T><T v="small">{c.items.length} items</T></Row>
        <View style={{ gap: 8 }}>
          {items.map((it, i) => (
            <Card key={it.id} onPress={() => (i < 2 ? (it.kind === 'live' ? router.push(`${base}/live/${it.id}` as any) : open(it.url)) : demoNote('Join the course to open this lesson.'))}
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
  if (course.loading) return <Screen><Loading /></Screen>;
  if (!course.data) return <Screen><ErrorBox message={course.error ?? 'Not found'} onRetry={course.reload} /></Screen>;
  const c = course.data;
  if (!c.enrolled) return <CourseIntro c={c} onJoin={async () => { await api.post(`/courses/${c.id}/enroll`); setLearnSpace(`course-${c.id}`); course.reload(); }} />;
  const items = c.items.filter((i) => filter === 'all' || i.kind === filter);
  const live = c.items.find((i) => i.kind === 'live' && !i.done);
  const action: Record<ContentKind, string> = { live: 'Join', video: 'Watch', audio: 'Listen', pdf: 'Open', test: 'Start' };

  return (
    <Screen>
      <Header title={c.title} subtitle={`${c.teacher_name ?? c.category} · ${c.lessons_count} lessons`} />
      {c.progress != null ? <Progress value={c.progress} /> : null}
      <View style={{ marginTop: 14 }}><LearnTiles space={{ key: `course-${c.id}`, type: 'course', id: c.id, title: c.title, subtitle: 'Noon Course' }} /></View>
      {live ? (
        <Card tint={colors.pink[0]} onPress={() => router.push(`${base}/live/${live.id}` as any)} style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TypeIcon kind="live" />
          <View style={{ flex: 1 }}><T v="label" style={{ color: colors.pink[1] }}>{live.meta?.toUpperCase()}</T><T v="h3">{live.title}</T></View>
          <Button title="Join" style={{ height: 42 }} />
        </Card>
      ) : null}
      <View style={{ marginTop: 14 }}>
        <Segmented value={filter} onChange={setFilter} activeColor={colors.ink}
          options={[{ key: 'all', label: 'All' }, { key: 'live', label: 'Live' }, { key: 'video', label: 'Video' }, { key: 'audio', label: 'Audio' }, { key: 'pdf', label: 'PDF' }, { key: 'test', label: 'Tests' }]} />
      </View>
      <View style={{ marginTop: 10, gap: 8 }}>
        {items.map((it) => (
          <Card key={it.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TypeIcon kind={it.kind} />
            <View style={{ flex: 1 }}><T v="h3" numberOfLines={1}>{it.title}</T><T v="small">{it.meta}</T></View>
            {it.done ? <Ionicons name="checkmark-circle" size={28} color={colors.green} accessibilityLabel="Done" />
              : <Button title={action[it.kind]} kind="ghost" style={{ height: 38, paddingHorizontal: 14 }} onPress={() => (it.kind === 'live' ? router.push(`${base}/live/${it.id}` as any) : open(it.url))} />}
          </Card>
        ))}
        {!items.length ? <Empty text="Nothing in this section yet." /> : null}
      </View>
    </Screen>
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
        <Grid cols={{ phone: 1, tablet: 3, desktop: 3 }}>
          {(boards.data ?? []).map((b, i) => (
            <Card key={b.id} onPress={() => router.push(`${base}/support/board/${b.id}` as any)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 20 }}>
              <View style={{ width: 70, height: 70, borderRadius: 22, backgroundColor: pastels[(i + 2) % 5][0], alignItems: 'center', justifyContent: 'center' }}>
                <T style={{ fontFamily: fonts.semibold, fontSize: 20, color: pastels[(i + 2) % 5][1] }}>{b.code}</T>
              </View>
              <View style={{ flex: 1 }}><T v="h3">{b.name}</T><T v="small">{b.meta} · Class 1–10, +1, +2</T></View>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </Card>
          ))}
        </Grid>
      )}
    </Screen>
  );
}

export function ClassesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const base = useBase();
  const classes = useApi<SchoolClass[]>(`/boards/${id}/classes`);
  return (
    <Screen>
      <Header title="Choose class" subtitle="Step 2" />
      {classes.loading ? <Loading /> : (
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
      <Header title="Subjects" subtitle="Step 3" />
      {subjects.loading ? <Loading /> : (
        <Grid cols={{ phone: 2, tablet: 3, desktop: 4 }}>
          {(subjects.data ?? []).map((s, i) => {
            const p = pastels[(i + 2) % 5];
            return (
              <Card key={s.id} tint={p[0]} onPress={() => router.push(`${base}/support/subject/${s.id}` as any)} style={{ minHeight: 120 }}>
                <T style={{ position: 'absolute', right: 12, bottom: 4, fontFamily: fonts.arabic, fontSize: 40, color: p[1], opacity: 0.3 }}>{s.name_ar}</T>
                <T v="h2" style={{ color: p[1] }}>{s.name}</T>
                <T v="small" style={{ color: p[1] }}>{s.lessons_count} lessons</T>
                <Row gap={4} style={{ marginTop: 'auto' }}>
                  <Pill text="VIDEO" tint="rgba(255,255,255,0.7)" ink={p[1]} /><Pill text="AUDIO" tint="rgba(255,255,255,0.7)" ink={p[1]} /><Pill text="PDF" tint="rgba(255,255,255,0.7)" ink={p[1]} />
                </Row>
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

const toolMeta: Record<ToolType, { title: string; g: readonly string[] }> = {
  chart: { title: 'Charts', g: gradients.chart }, adkar: { title: 'Adkar', g: gradients.adkar },
  slide: { title: 'Slides', g: gradients.slides }, form: { title: 'Forms', g: gradients.forms },
};

export function StudyToolsScreen() {
  const { type } = useLocalSearchParams<{ type: ToolType }>();
  const [t, setT] = useState<ToolType>((type as ToolType) ?? 'chart');
  const list = useApi<StudyTool[]>(`/study-tools?type=${t}`);
  return (
    <Screen back={false}>
      <GradientCard colors={gradients.brand} style={{ marginBottom: 14, gap: 12 }}>
        <Row gap={12}>
          <IconButton name="arrow-back" label="Back" tint="rgba(255,255,255,0.2)" color="#FFF" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
          <View><T style={{ fontFamily: fonts.semibold, fontSize: 28, color: '#FFF' }}>{toolMeta[t].title}</T><T style={{ color: '#E4DDFF' }}>Select one · {list.data?.length ?? 0} files</T></View>
        </Row>
        <Segmented value={t} onChange={setT} activeColor={colors.violet}
          options={(Object.keys(toolMeta) as ToolType[]).map((k) => ({ key: k, label: toolMeta[k].title }))} />
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
