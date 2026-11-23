// Student screens from the second design round: Classroom, Class done, Explore,
// Profile hub, Bio and Performance.
import React, { useEffect, useState } from 'react';
import { Linking, Modal, Platform, Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Card, Grid, IconButton, IconTile, Row, Screen, T } from '@/components/ui';
import { Tabs, demoNote } from '@/components/kit';
import { AppTile, DetailRows, G, HeroHeader, MiniStat, OverlapCard, Panel, Select, TileRows } from '@/components/kit2';
import { BrandRow } from './home';
import { CourseLogo } from '@/components/CourseLogo';
import { useApi } from '@/lib/useApi';
import { useBase } from '@/lib/useBase';
import { useAuth } from '@/lib/auth';
import { profileLine, profileRows, splitName } from '@/lib/profile';
import { setLearnSpace, useLearnSpaces } from '@/lib/learnSpace';
import { CLASSROOM_INFO, PERFORMANCE } from '@/lib/demo';
import { kindLabel } from '@/lib/courseBuilder';
import { CourseCard, joinLiveCourse, MadrasaSupportCard } from './learn';
import { useMyAttendancePercent } from './attendance';
import { MeetingBanner } from '@/components/MeetingBanner';
import type { Course, CourseDetail, CourseLessonRow, LeaveSummary, LearnDetail, LearnSpace } from '@/lib/types';
import { colors, fonts } from '@/theme/tokens';

const pad = (n: number) => String(n).padStart(2, '0');

/** GET /courses/continue: the next lesson after the last one the student completed. */
type ContinueInfo = {
  course: Course; lesson: { id: number; title: string; number: number; duration?: string | null } | null;
  item: { id: number; title: string; kind: any } | null; done: number; total: number; lessons: number; finished: boolean;
  /** Live-only course: its next class instead of a lesson. */
  live?: { starts_at: string; ends_at: string; title?: string | null; state: 'live' | 'upcoming' } | null; attended?: number;
} | null;
const LESSON_TINTS = [['#F4F1FF', '#C9BEF5'], ['#EEF8FC', '#B4D7E6'], ['#EEFAF1', '#B5E2BE'], ['#FDF1F8', '#EDBEDD'], ['#FFF8E5', '#EBD596']] as const;

/** The student's class subjects and the one picked in Classroom (remembered with the learning space). */
function useSubjects() {
  const learn = useLearnSpaces();
  const subjects = learn.spaces.filter((s) => s.type === 'subject');
  const selected = learn.selected?.type === 'subject' ? learn.selected : subjects.find((s) => s.title === 'Fiqh') ?? subjects[0] ?? null;
  return { subjects, selected, select: (s: LearnSpace) => setLearnSpace(s.key), loading: learn.loading };
}

/** The six classroom tiles; they open the picked subject's content. */
function ClassTiles({ space, lesson }: { space: LearnSpace | null; lesson?: number }) {
  const base = useBase();
  const learn = (section: string) => () => router.push((space ? `${base}/learn/${section}?space=${space.key}` : `${base}/learn/${section}`) as any);
  // Text book, Work book and Class note open just that PDF.
  const pdf = (type: 'textbook' | 'workbook' | 'note') => () =>
    router.push(`${base}/pdf?type=${type}${space ? `&space=${space.key}` : ''}${lesson && type === 'note' ? `&lesson=${lesson}` : ''}` as any);
  return (
    <TileRows cols={3} gap={10}>
      <AppTile label="Text book" icon="book" g={G.indigo} tint="#EEF1FF" onPress={pdf('textbook')} />
      <AppTile label="Work book" icon="pencil" g={G.orange} tint="#FFF6E2" tag={{ text: 'DUE', bg: '#FBD9DC', ink: colors.red }} onPress={pdf('workbook')} />
      <AppTile label="Class note" icon="document-text" g={G.pink} tint="#FDF0F7" onPress={pdf('note')} />
      <AppTile label="Puzzle" icon="extension-puzzle" g={G.green} tint="#ECF9F2" onPress={() => router.push(`${base}/games` as any)} />
      <AppTile label="Test" icon="checkmark-circle" g={G.purple} tint="#F5EEFE" tag={{ text: 'NEW', bg: colors.mint[0], ink: colors.mint[1] }} onPress={learn('exam')} />
      <AppTile label="Report" icon="bar-chart" g={G.blue} tint="#EDF4FF" onPress={() => router.push(`${base}/performance` as any)} />
    </TileRows>
  );
}

/** The course's own lessons (player order) with Upcoming / Done tabs; a lesson opens in the course player. */
function CourseLessonsBlock({ course, subjects, onPickSubject, nextId }: { course: Course; subjects: LearnSpace[]; onPickSubject: (s: LearnSpace) => void; nextId?: number }) {
  const base = useBase();
  const detail = useApi<CourseDetail>(`/courses/${course.id}`);
  const [tab, setTab] = useState<'up' | 'done'>('up');
  const c = detail.data;
  const subs = c?.subjects ?? [];
  const lessons: CourseLessonRow[] = c?.lessons ?? [];
  const ordered = [...lessons.filter((l) => !l.subject_id || !subs.some((x) => x.id === l.subject_id)), ...subs.flatMap((x) => lessons.filter((l) => l.subject_id === x.id))];
  const isDone = (l: CourseLessonRow) => l.items.length > 0 && l.items.every((i) => i.done);
  const up = ordered.filter((l) => !isDone(l));
  const done = ordered.filter(isDone).reverse();
  const list = tab === 'up' ? up : done;
  const subjectOf = (l: CourseLessonRow) => subs.find((x) => x.id === l.subject_id)?.title ?? course.category;
  return (
    <View style={{ marginTop: 18 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="h2">Lessons</T>
        <Select compact label={undefined} value="my-course" options={[{ key: 'my-course', label: course.title }, ...subjects.map((x) => ({ key: x.key, label: x.title }))]}
          onChange={(k) => { const x = subjects.find((y) => y.key === k); if (x) onPickSubject(x); }} />
      </Row>
      <Tabs value={tab} onChange={setTab} options={[{ key: 'up', label: `Upcoming · ${up.length}` }, { key: 'done', label: `Done · ${done.length}` }]} />
      <View style={{ gap: 8 }}>
        {detail.loading && !c ? <T v="small" style={{ padding: 16, textAlign: 'center' }}>Loading lessons…</T> : null}
        {list.map((l, i) => {
          const t = LESSON_TINTS[i % 5];
          // The same lesson as the "Up next" card (the first unfinished one if that is not known).
          const current = tab === 'up' && (nextId && up.some((x) => x.id === nextId) ? l.id === nextId : i === 0);
          const n = ordered.indexOf(l) + 1;
          const doneItems = l.items.filter((x) => x.done).length;
          return (
            <Pressable key={l.id} accessibilityRole="button" accessibilityLabel={`Lesson ${n}: ${l.title}`} onPress={() => router.push(`${base}/courses/${course.id}/play?lesson=${l.id}` as any)}
              style={{ minHeight: 58, borderRadius: 18, backgroundColor: t[0], borderWidth: 1.5, borderColor: current ? colors.violet : t[1], flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 12 }}>
              <T v="small" numberOfLines={1} style={{ width: 108, fontSize: 11 }}>{subjectOf(l)} · lesson {pad(n)}</T>
              <View style={{ flex: 1 }}>
                <T v="h3" numberOfLines={1}>{l.title}</T>
                {tab === 'up' && l.items.length ? <T v="small" style={{ fontSize: 11 }}>{doneItems ? `${doneItems}/${l.items.length} done` : `${l.items.length} item${l.items.length === 1 ? '' : 's'}`}{l.duration ? ` · ${l.duration}` : ''}</T> : null}
              </View>
              <View style={{ width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: tab === 'done' ? colors.mint[0] : current ? '#E6E0FF' : colors.butter[0] }}>
                {tab === 'done' ? <Ionicons name="checkmark" size={14} color={colors.mint[1]} />
                  : current ? <Ionicons name="play" size={12} color={colors.violet} />
                  : <View style={{ width: 9, height: 9, borderRadius: 5, borderWidth: 1.5, borderColor: colors.butter[1] }} />}
              </View>
            </Pressable>
          );
        })}
        {c && !list.length ? <T v="small" style={{ padding: 16, textAlign: 'center' }}>{tab === 'up' ? (lessons.length ? 'All lessons done. MashaAllah!' : 'Lessons coming soon.') : 'No lessons done yet.'}</T> : null}
      </View>
    </View>
  );
}

/** Lessons of the picked subject with Upcoming / Done tabs. */
function LessonsBlock({ subjects, selected, onSelect, detail, doneFirst, course, onPickCourse }: {
  subjects: LearnSpace[]; selected: LearnSpace | null; onSelect: (s: LearnSpace) => void; detail?: LearnDetail; doneFirst?: boolean;
  course?: Course; onPickCourse?: () => void;
}) {
  const base = useBase();
  const [tab, setTab] = useState<'up' | 'done'>(doneFirst ? 'done' : 'up');
  const name = selected?.title ?? 'Fiqh';
  const all = detail?.syllabus ?? [];
  const up = all.filter((l) => !l.done);
  const done = all.filter((l) => l.done).reverse();
  const list = tab === 'up' ? up : done;
  const tabs = [{ key: 'up' as const, label: `Upcoming · ${up.length}` }, { key: 'done' as const, label: `Done · ${done.length}` }];
  return (
    <View style={{ marginTop: 18 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="h2">Lessons</T>
        {subjects.length ? (
          <Select compact label={undefined} value={selected?.key ?? ''} options={[...(course ? [{ key: 'my-course', label: course.title }] : []), ...subjects.map((s) => ({ key: s.key, label: s.title }))]}
            onChange={(k) => { if (k === 'my-course') return onPickCourse?.(); const s = subjects.find((x) => x.key === k); if (s) onSelect(s); }} />
        ) : null}
      </Row>
      <Tabs value={tab} onChange={setTab} options={doneFirst ? [tabs[1], tabs[0]] : tabs} />
      <View style={{ gap: 8 }}>
        {list.map((l, i) => {
          const t = LESSON_TINTS[i % 5];
          const current = tab === 'up' && i === 0;
          const href = tab === 'done' ? `${base}/class-done?space=${selected?.key ?? ''}&pos=${l.position}` : current ? `${base}/live` : null;
          return (
            <Pressable key={l.position} accessibilityRole="button" accessibilityLabel={`${name} lesson ${l.position}: ${l.title}`}
              onPress={() => (href ? router.push(href as any) : demoNote('This lesson opens on its class day.'))}
              style={{ minHeight: 58, borderRadius: 18, backgroundColor: t[0], borderWidth: 1.5, borderColor: t[1], flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 12 }}>
              <T v="small" numberOfLines={1} style={{ width: 108, fontSize: 11 }}>{name} · lesson {pad(l.position)}</T>
              <T v="h3" style={{ flex: 1 }} numberOfLines={1}>{l.title}</T>
              <View style={{ width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: tab === 'done' ? colors.mint[0] : current ? '#FBD9DC' : colors.butter[0] }}>
                {tab === 'done' ? <Ionicons name="checkmark" size={14} color={colors.mint[1]} />
                  : <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: current ? '#D6336C' : 'transparent', borderWidth: current ? 0 : 1.5, borderColor: colors.butter[1] }} />}
              </View>
            </Pressable>
          );
        })}
        {!list.length ? <T v="small" style={{ padding: 16, textAlign: 'center' }}>{tab === 'up' ? 'All lessons done. MashaAllah!' : 'No lessons done yet.'}</T> : null}
      </View>
    </View>
  );
}

/* ---------- My Classroom ---------- */
export function ClassroomScreen() {
  const base = useBase();
  const { subjects, selected, select } = useSubjects();
  const detail = useApi<LearnDetail>(selected ? `/learn/subject/${selected.id}` : null);
  // The card shows a course the student bought: its next lesson, teacher and live time.
  const mine = useApi<Course[]>('/courses?scope=mine');
  const [courseId, setCourseId] = useState<number | null>(null);
  const [pickOpen, setPickOpen] = useState(false);
  // Lessons list: the student's course by default; the dropdown can switch to a Madrasa Support subject.
  const [showCourse, setShowCourse] = useState(true);
  // Up next: where the student stopped (last course worked on, or the one picked with the switcher).
  const cont = useApi<ContinueInfo>(courseId ? `/courses/continue?course=${courseId}` : '/courses/continue');
  // No course yet: the server sends an empty answer, so only trust it when it names a course.
  const contData = cont.data?.course ? cont.data : null;
  const course = mine.data?.find((c) => c.id === (courseId ?? contData?.course.id)) ?? mine.data?.[0];
  const next = contData && contData.course.id === course?.id ? contData : null;
  const noCourse = !mine.loading && !mine.error && !mine.data?.length;
  const courseDetail = useApi<LearnDetail>(course && !next ? `/learn/course/${course.id}` : null);
  const current = course ? courseDetail.data?.syllabus.find((l) => !l.done) : detail.data?.syllabus.find((l) => !l.done);
  const name = course ? course.title : selected?.title ?? CLASSROOM_INFO.live.subject;
  const teacher = course?.teacher_name ?? CLASSROOM_INFO.live.teacher;
  const liveWhen = course ? (course.next_live_at ? `LIVE ${course.next_live_at.toUpperCase()}` : null) : CLASSROOM_INFO.live.when;
  // Course items are named "Lesson 6 · Letters with harakath": split into the number and the name.
  const m = current?.title.match(/^lesson\s*(\d+)\s*[·:-]\s*(.+)$/i);
  const lessonNo = m ? Number(m[1]) : current?.position ?? 1;
  const lessonTitle = m ? m[2] : current?.title ?? (course ? 'Lessons coming soon' : 'Najas');
  const liveCourse = course?.format === 'live';
  const liveNext = next?.live ?? null;
  const lessonLine = liveCourse ? `${course!.title} · live class` : next?.lesson ? `${course!.title} · Lesson ${pad(next.lesson.number)} of ${pad(next.lessons)}`
    : course ? `${course.category} · Lesson ${pad(lessonNo)}` : `${name} · Lesson ${pad(current?.position ?? 5)}`;
  const heroTitle = liveCourse ? (liveNext ? new Date(liveNext.starts_at).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : 'No class planned') : next ? (next.finished ? 'Course complete!' : next.lesson?.title ?? 'Lessons coming soon') : lessonTitle;
  const play = () => {
    if (!course) return router.push(`${base}/live` as any);
    if (liveCourse) return liveNext?.state === 'live' ? joinLiveCourse(course.id) : router.push(`${base}/courses/${course.id}` as any);
    if (next?.finished) return router.push(`${base}/courses/${course.id}/certificate` as any);
    if (next?.lesson) return router.push(`${base}/courses/${course.id}/play?lesson=${next.lesson.id}${next.item ? `&item=${next.item.id}` : ''}` as any);
    router.push(`${base}/courses/${course.id}` as any);
  };

  return (
    <Screen bar={false}>
      <BrandRow base={base} title="Classroom" />
      <T style={{ marginTop: 8, fontFamily: fonts.medium, color: colors.muted }}>{CLASSROOM_INFO.title} · {CLASSROOM_INFO.cls}</T>

      <MeetingBanner />
      {noCourse ? <ChooseCourse /> : null}
      {/* Current lesson of the course the student bought; its logo on the right (tap to switch course). */}
      {noCourse ? null : <LinearGradient colors={['#5B43E0', '#9B7BE8', '#D59BE0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ marginTop: 10, borderRadius: 30, padding: 18, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ position: 'absolute', right: -60, top: -40, width: 230, height: 230, borderRadius: 115, backgroundColor: 'rgba(255,255,255,0.12)' }} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <T style={{ color: '#EDE7FF', fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0.5 }}>{liveCourse ? (liveNext?.state === 'live' ? '● LIVE NOW' : 'NEXT LIVE CLASS') : next ? (next.finished ? 'ALL LESSONS DONE' : next.done ? 'UP NEXT' : 'START HERE') : 'CURRENT LESSON'}</T>
          <T style={{ color: '#EDE7FF', marginTop: 6 }} numberOfLines={1}>{lessonLine}</T>
          <T style={{ color: '#FFF', fontFamily: fonts.fun, fontSize: 30, lineHeight: 38 }} numberOfLines={2}>{heroTitle}</T>
          {!liveCourse && next?.item ? <T style={{ color: '#EDE7FF', marginTop: 2 }} numberOfLines={1}><Ionicons name="play" size={12} color="#EDE7FF" /> {kindLabel(next.item.kind)} · {next.item.title}</T> : null}
          {liveCourse ? <T style={{ color: '#EDE7FF', marginTop: 2 }} numberOfLines={1}>{course?.live_summary ?? ''}{next?.attended ? ` · ${next.attended} attended` : ''}</T> : next && next.total ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, maxWidth: 260 }}>
              <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' }}>
                <View style={{ width: `${Math.round((next.done / next.total) * 100)}%`, height: 6, backgroundColor: '#FFF' }} />
              </View>
              <T style={{ color: '#FFF', fontSize: 12, fontFamily: fonts.semibold }}>{next.done}/{next.total}</T>
            </View>
          ) : null}
          {liveWhen ? <T style={{ color: '#FFE6F6', fontFamily: fonts.semibold, fontSize: 11, marginTop: 2 }} numberOfLines={1}>● {liveWhen}{course?.teacher_name ? ` · ${course.teacher_name}` : ''}</T> : null}
          <Pressable accessibilityRole="button" accessibilityLabel={liveCourse ? (liveNext?.state === 'live' ? 'Join live class' : 'See timetable') : next ? (next.finished ? 'Get certificate' : 'Continue lesson') : 'Join class'} onPress={play}
            style={{ marginTop: 12, alignSelf: 'flex-start', backgroundColor: '#FFF', borderRadius: 24, height: 48, paddingLeft: 6, paddingRight: 18, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#5B36C9', alignItems: 'center', justifyContent: 'center' }}><Ionicons name={liveCourse ? 'videocam' : next ? (next.finished ? 'ribbon' : 'play') : 'videocam'} size={16} color="#FFF" /></View>
            <T style={{ fontFamily: fonts.fun, fontSize: 17, color: '#46308A' }}>{liveCourse ? (liveNext?.state === 'live' ? 'Join live' : 'Timetable') : next ? (next.finished ? 'Get certificate' : next.done ? 'Continue' : 'Start') : 'Join Class'}</T>
          </Pressable>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={course ? `${course.title}. Change course` : 'Get a course'}
          onPress={() => (mine.data?.length ? setPickOpen(true) : router.push(`${base}/courses` as any))}
          style={{ width: 128, height: 128, borderRadius: 26, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', padding: 8 }}>
          {course ? <CourseLogo title={course.title} logo={course.logo_url} category={course.category} size={116} />
            : <View style={{ alignItems: 'center', gap: 6 }}><Ionicons name="add-circle-outline" size={34} color={colors.violet} /><T style={{ color: colors.violet, fontFamily: fonts.semibold, fontSize: 12, textAlign: 'center' }}>Get a course</T></View>}
          {(mine.data?.length ?? 0) > 1 ? (
            <View style={{ position: 'absolute', right: 6, bottom: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: '#EEF3F5', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="swap-horizontal" size={13} color={colors.ink} /></View>
          ) : null}
        </Pressable>
      </LinearGradient>}
      <Modal visible={pickOpen} transparent animationType="fade" onRequestClose={() => setPickOpen(false)}>
        <Pressable accessibilityLabel="Close" onPress={() => setPickOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(11,42,53,0.42)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: colors.bg, borderRadius: 26, padding: 14, gap: 8, width: '100%', maxWidth: 440, alignSelf: 'center' }}>
            <T v="h3" style={{ marginBottom: 4 }}>My courses</T>
            {(mine.data ?? []).map((c) => (
              <Pressable key={c.id} accessibilityRole="button" onPress={() => { setCourseId(c.id); setShowCourse(true); setPickOpen(false); }}
                style={{ backgroundColor: '#FFF', borderRadius: 18, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderColor: c.id === course?.id ? colors.violet : 'transparent' }}>
                <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: '#FFF', borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}><CourseLogo title={c.title} logo={c.logo_url} size={46} /></View>
                <View style={{ flex: 1 }}><T style={{ fontFamily: fonts.semibold }}>{c.title}</T><T v="small">{c.teacher_name ?? c.category}{c.progress != null ? ` · ${c.progress}% done` : ''}</T></View>
                {c.id === course?.id ? <Ionicons name="checkmark-circle" size={22} color={colors.violet} /> : null}
              </Pressable>
            ))}
            <Pressable accessibilityRole="button" onPress={() => { setPickOpen(false); router.push(`${base}/courses` as any); }} style={{ padding: 10, alignItems: 'center' }}>
              <T style={{ color: colors.violet, fontFamily: fonts.semibold }}>+ Get a new course</T>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <View style={{ marginTop: 14 }}><ClassTiles space={selected} /></View>
      {course && showCourse && !liveCourse ? (
        <CourseLessonsBlock course={course} nextId={next?.lesson?.id} subjects={subjects} onPickSubject={(sub) => { setShowCourse(false); select(sub); }} />
      ) : (
        <LessonsBlock subjects={subjects} selected={selected} onSelect={select} detail={detail.data}
          course={course} onPickCourse={() => setShowCourse(true)} />
      )}
    </Screen>
  );
}

/** A student without a course: Madrasa Support and every course, to pick one and start. */
function ChooseCourse() {
  const list = useApi<Course[]>('/courses');
  const courses = (list.data ?? []).filter((c) => !c.enrolled);
  return (
    <View style={{ marginTop: 10, gap: 10 }}>
      <LinearGradient colors={['#5B43E0', '#9B7BE8', '#D59BE0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 30, padding: 20, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', right: -60, top: -40, width: 230, height: 230, borderRadius: 115, backgroundColor: 'rgba(255,255,255,0.12)' }} />
        <T style={{ color: '#EDE7FF', fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0.5 }}>START LEARNING</T>
        <T style={{ color: '#FFF', fontFamily: fonts.fun, fontSize: 28, lineHeight: 36, marginTop: 4 }}>Choose your course</T>
        <T style={{ color: '#EDE7FF', marginTop: 4 }}>Pick one below to join. Your next lesson will show here every time you open the app.</T>
      </LinearGradient>
      {list.loading && !list.data ? <T v="small">Loading courses…</T> : (
        <Grid cols={{ phone: 1, tablet: 2, desktop: 3 }} gap={12}>
          <MadrasaSupportCard />
          {courses.map((c) => <CourseCard key={c.id} c={c} />)}
        </Grid>
      )}
    </View>
  );
}

/* ---------- Class done (a finished lesson) ---------- */
export function ClassDoneScreen() {
  const { space, pos } = useLocalSearchParams<{ space?: string; pos?: string }>();
  const { subjects, selected, select } = useSubjects();
  const subject = subjects.find((s) => s.key === space) ?? selected;
  const detail = useApi<LearnDetail>(subject ? `/learn/subject/${subject.id}` : null);
  const lesson = detail.data?.syllabus.find((l) => String(l.position) === pos) ?? detail.data?.syllabus.filter((l) => l.done).pop();
  const video = detail.data?.materials.find((m) => m.kind === 'video' && lesson && m.title.startsWith(`Lesson ${lesson.position} `));

  return (
    <Screen>
      <Row style={{ marginBottom: 10 }}>
        <View style={{ backgroundColor: colors.mint[0], borderRadius: 14, paddingHorizontal: 12, height: 28, justifyContent: 'center' }}>
          <T style={{ color: colors.mint[1], fontFamily: fonts.semibold, fontSize: 12 }}>✓ Class done</T>
        </View>
      </Row>
      <T style={{ color: colors.violet, fontFamily: fonts.semibold }}>{subject?.title ?? 'Fiqh'} · Lesson {pad(lesson?.position ?? 4)}</T>
      <T v="h1">{lesson?.title ?? 'Thahur'}</T>
      <T v="small">{CLASSROOM_INFO.live.teacher} · 45 min · {subject?.subtitle ?? 'Class 5'}</T>

      <View style={{ marginTop: 14 }}><ClassTiles space={subject} lesson={lesson?.position} /></View>

      <LinearGradient colors={['#0B5166', '#5B43E0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ marginTop: 14, borderRadius: 26, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 70, height: 52, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}><T style={{ fontFamily: fonts.arabic, fontSize: 22, color: '#FFF' }}>فقه</T></View>
        <View style={{ flex: 1, gap: 4 }}>
          <T style={{ color: '#FFF', fontFamily: fonts.semibold }}>Recorded class</T>
          <T style={{ color: '#D9F2F5', fontSize: 11 }}>38 min · watched 30%</T>
          <View style={{ height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)' }}><View style={{ width: '30%', height: 4, borderRadius: 2, backgroundColor: colors.yellow }} /></View>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Play recorded class" onPress={() => (video?.url && video.url !== '#' ? Linking.openURL(video.url) : demoNote('Demo: the recording plays here once it is uploaded.'))}
          style={{ backgroundColor: '#FFF', borderRadius: 18, height: 36, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="play" size={12} color={colors.ink} /><T style={{ fontFamily: fonts.semibold, fontSize: 13 }}>Play now</T>
        </Pressable>
      </LinearGradient>

      <LessonsBlock subjects={subjects} selected={subject} onSelect={select} detail={detail.data} doneFirst />
    </Screen>
  );
}

/* ---------- Explore (tab) ---------- */
export function ExploreScreen() {
  const base = useBase();
  const go = (p: string) => () => router.push(`${base}${p}` as any);
  return (
    <Screen bar={false}>
      <T v="h1" style={{ marginTop: 8 }}>Explore</T>
      <T v="small">Play, listen and learn</T>
      <MeetingBanner />

      <BigCard g={['#FF9A3D', '#FF5E7E']} tag="NOON GAMES" title="Games" cta="Play" icon="game-controller-outline" onPress={go('/games')} />
      <BigCard g={['#5B43E0', '#9B7BE8']} tag="STORIES · SEERAH · DUAS" title="Audiobook" cta="Listen" icon="headset-outline" onPress={go('/audio')} />
      <BarCard g={['#0E7A50', '#22A86B']} icon="book-outline" title="Quran & Hifz" sub="Read, listen and memorise" onPress={go('/quran')} />
      <BarCard g={['#0F766E', '#14B8A6']} icon="people-circle-outline" title="Meetings" sub="Join your madrasa's meetings with teachers" onPress={go('/meetings')} />

      <View style={{ marginTop: 12 }}>
        <TileRows cols={3} gap={10}>
          <IconTile gradient={['#B05CF0', '#7B2FD8']} icon="sparkles" label="Stories" onPress={go('/audio')} />
          <IconTile gradient={['#4C8DF6', '#1F5FE0']} icon="bulb" label="Quiz" onPress={go('/games')} />
          <IconTile gradient={['#F2782B', '#D2500E']} icon="moon" label="Special Days" onPress={() => demoNote('Demo: Islamic calendar and special days come soon.')} />
        </TileRows>
      </View>

      <T v="h2" style={{ marginTop: 18, marginBottom: 10 }}>Study tools</T>
      <TileRows cols={4} gap={8}>
        <IconTile gradient={['#3DD9A8', '#0E7A50']} icon="flower-outline" label="Adkar" onPress={go('/tools/adkar')} />
        <IconTile gradient={['#FF7EC4', '#C2307E']} icon="image-outline" label="Slides" onPress={go('/tools/slide')} />
        <IconTile gradient={['#FFD25A', '#F08A24']} icon="stats-chart" label="Charts" onPress={go('/tools/chart')} />
        <IconTile gradient={['#7D9BFF', '#4255E0']} icon="document-text-outline" label="Forms" onPress={go('/tools/form')} />
        <IconTile gradient={['#FFB547', '#E07B0E']} icon="storefront-outline" label="Shop" onPress={go('/shop')} />
      </TileRows>
      <BarCard g={['#FF9A3D', '#F06A24']} icon="library-outline" title="Virtual Library" sub="E-books, textbooks & reference" onPress={go('/support')} />
    </Screen>
  );
}

function BigCard({ g, tag, title, cta, icon, onPress }: { g: readonly string[]; tag: string; title: string; cta: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={{ marginTop: 12 }}>
      <LinearGradient colors={g as unknown as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 130, borderRadius: 28, padding: 18, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', right: -30, top: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.14)' }} />
        <Ionicons name={icon} size={64} color="#FFF" style={{ position: 'absolute', right: 22, top: 32 }} />
        <T style={{ color: 'rgba(255,255,255,0.9)', fontFamily: fonts.semibold, fontSize: 11 }}>{tag}</T>
        <T style={{ color: '#FFF', fontFamily: fonts.fun, fontSize: 28 }}>{title}</T>
        <View style={{ marginTop: 'auto', alignSelf: 'flex-start', backgroundColor: '#FFF', borderRadius: 16, height: 32, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="play" size={11} color={g[1]} /><T style={{ color: g[1], fontFamily: fonts.semibold, fontSize: 13 }}>{cta}</T>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function BarCard({ g, icon, title, sub, onPress }: { g: readonly string[]; icon: keyof typeof Ionicons.glyphMap; title: string; sub: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={{ marginTop: 12 }}>
      <LinearGradient colors={g as unknown as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ minHeight: 64, borderRadius: 22, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Ionicons name={icon} size={26} color="#FFF" />
        <View style={{ flex: 1 }}>
          <T style={{ color: '#FFF', fontFamily: fonts.fun, fontSize: 17 }}>{title}</T>
          <T style={{ color: 'rgba(255,255,255,0.88)', fontSize: 11 }}>{sub}</T>
        </View>
        <View style={{ backgroundColor: '#FFF', borderRadius: 15, height: 30, paddingHorizontal: 12, justifyContent: 'center' }}><T style={{ color: g[1], fontFamily: fonts.semibold, fontSize: 13 }}>Open</T></View>
      </LinearGradient>
    </Pressable>
  );
}

/* ---------- Profile hub (tab) ---------- */
export function ProfileHubScreen() {
  const base = useBase();
  const { user } = useAuth();
  const leave = useApi<LeaveSummary>('/leave-requests');
  const fullName = user?.name ?? 'Student';
  const attPct = useMyAttendancePercent();
  const myFees = useApi<{ due_total: number; fees: { status: string }[] }>('/fees').data;
  const due = myFees?.due_total ?? 0;
  const dueCount = myFees?.fees.filter((f) => f.status === 'due').length ?? 0;
  const go = (p: string) => () => router.push(`${base}${p}` as any);
  return (
    <Screen bar={false}>
      <HeroHeader g={['#0B5166', '#5B43E0']} logo initials={fullName[0]} name={fullName} sub={profileLine(user)} pill={`★ ${PERFORMANCE.stats.stars} stars · Level 6`}
        right={user?.role === 'parent' ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Switch child" onPress={() => demoNote('Demo: parents with more than one child switch between them here.')}
            style={{ height: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <T style={{ color: '#FFF', fontFamily: fonts.medium, fontSize: 13 }}>Switch</T><Ionicons name="chevron-down" size={14} color="#FFF" />
          </Pressable>
        ) : undefined}
        stats={[[attPct, 'Attendance'], [PERFORMANCE.stats.avg, 'Avg score'], [`₹${due.toLocaleString('en-IN')}`, 'Fees due']]} />
      <OverlapCard>
        <TileRows cols={3} gap={10}>
          <AppTile label="Bio" icon="id-card" g={G.pink} tint="#FDF1F8" onPress={go('/bio')} />
          <AppTile label="Performance" icon="trending-up" g={G.blue} tint="#EDF4FF" onPress={go('/performance')} />
          <AppTile label="Attendance" icon="calendar" g={G.green} tint="#ECF9F2" onPress={go('/attendance')} />
          <AppTile label="Fees" icon="cash" g={G.orange} tint="#FFF6E2" badge={dueCount || undefined} onPress={go('/fees')} />
          <AppTile label="Settings" icon="settings" g={G.gray} tint="#F1F4F5" onPress={go('/settings')} />
          <AppTile label="Help" icon="chatbubble-ellipses" g={G.purple} tint="#F5EEFE" onPress={go('/help')} />
        </TileRows>
      </OverlapCard>
      <Card onPress={go('/leave')} style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Ionicons name="airplane-outline" size={22} color={colors.ink} />
        <T v="h3" style={{ flex: 1 }}>Leave request</T>
        <T v="small">{leave.data ? `${leave.data.remaining} days left ›` : '›'}</T>
      </Card>
    </Screen>
  );
}

/* ---------- Bio ---------- */
export function BioScreen() {
  const { user } = useAuth();
  return (
    <Screen bar={false}>
      <View style={{ position: 'absolute', left: -40, right: -40, top: -12, height: 230, backgroundColor: colors.pink[0], borderBottomLeftRadius: 60, borderBottomRightRadius: 60 }} />
      <Row style={{ justifyContent: 'space-between', height: 56 }}>
        <IconButton name="chevron-back" label="Back" size={52} onPress={() => (router.canGoBack() ? router.back() : router.replace('/student/profile' as any))} />
        <Pressable accessibilityRole="button" accessibilityLabel="Edit profile" onPress={() => demoNote('To change these details, please ask your institution office.')}
          style={{ height: 46, paddingHorizontal: 18, borderRadius: 23, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="pencil" size={15} color={colors.ink} /><T style={{ fontFamily: fonts.medium }}>Edit</T>
        </Pressable>
      </Row>
      <Row gap={14} style={{ marginTop: 10 }}>
        <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: '#FFF', borderWidth: 4, borderColor: '#EAB9DF', alignItems: 'center', justifyContent: 'center' }}>
          <T style={{ fontSize: 34, fontFamily: fonts.semibold, color: '#74266A' }}>{splitName(user?.name).first[0]}</T>
        </View>
        <View style={{ flex: 1 }}>
          <T style={{ fontSize: 24, color: '#3A1233' }}>{splitName(user?.name).first}</T>
          {splitName(user?.name).last ? <T style={{ fontSize: 26, fontFamily: fonts.semibold, color: '#3A1233' }}>{splitName(user?.name).last}</T> : null}
          <T style={{ fontSize: 13, color: '#74266A' }}>{profileLine(user)}</T>
        </View>
      </Row>
      <T v="h2" style={{ marginTop: 26, marginBottom: 10 }}>Bio</T>
      <DetailRows rows={profileRows(user)} />
    </Screen>
  );
}

/* ---------- Performance ---------- */
export function PerformanceScreen() {
  const base = useBase();
  const p = PERFORMANCE;
  const gradeTint: Record<string, readonly [string, string]> = { 'A+': colors.mint, A: colors.sky, 'B+': colors.butter };
  return (
    <Screen>
      <T v="h1">Performance</T>
      <T v="small">{profileLine(useAuth().user)}</T>
      <Row gap={8} style={{ marginTop: 12 }}>
        <MiniStat value={p.stats.attendance} label="Attendance" tint={colors.mint} />
        <MiniStat value={`${p.stats.stars} ★`} label="Stars" tint={colors.butter} />
        <MiniStat value={p.stats.avg} label="Avg score" tint={colors.lav} />
      </Row>
      <Panel title="By subject" right={<T v="small">{p.term}</T>}>
        {p.subjects.map(([name, v, c]) => (
          <Row key={name} gap={10}>
            <T style={{ width: 76, fontSize: 13 }}>{name}</T>
            <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: '#E3ECEF' }}><View style={{ width: `${v}%`, height: 8, borderRadius: 4, backgroundColor: c }} /></View>
            <T style={{ width: 40, textAlign: 'right', fontFamily: fonts.semibold, fontSize: 13 }}>{v}%</T>
          </Row>
        ))}
      </Panel>
      <Panel title="Exam results">
        {p.exams.map(([g, title, sub, score]) => (
          <Row key={title} gap={12}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: (gradeTint[g] ?? colors.sky)[0], alignItems: 'center', justifyContent: 'center' }}>
              <T style={{ fontFamily: fonts.semibold, color: (gradeTint[g] ?? colors.sky)[1] }}>{g}</T>
            </View>
            <View style={{ flex: 1 }}><T style={{ fontFamily: fonts.semibold }}>{title}</T><T v="small">{sub}</T></View>
            <T style={{ fontFamily: fonts.semibold }}>{score}</T>
          </Row>
        ))}
      </Panel>
      <Button title="Previous exam results" icon="document-text-outline" kind="ghost" style={{ marginTop: 12 }} onPress={() => router.push(`${base}/learn/result` as any)} />
      <Button title="Salah assessment report" icon="business-outline" kind="ghost" style={{ marginTop: 10 }} onPress={() => router.push(`${base}/salah-report` as any)} />
    </Screen>
  );
}
