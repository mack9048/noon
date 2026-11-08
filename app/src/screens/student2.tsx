// Student screens from the second design round: Classroom, Class done, Explore,
// Profile hub, Bio and Performance.
import React, { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Card, IconButton, IconTile, Row, Screen, T } from '@/components/ui';
import { Tabs, demoNote } from '@/components/kit';
import { AppTile, DetailRows, G, HeroHeader, MiniStat, OverlapCard, Panel, Select, TileRows } from '@/components/kit2';
import { AskAiButton, BrandRow } from './home';
import { useApi } from '@/lib/useApi';
import { useBase } from '@/lib/useBase';
import { useAuth } from '@/lib/auth';
import { setLearnSpace, useLearnSpaces } from '@/lib/learnSpace';
import { BIO, CLASSROOM_INFO, FEES, PERFORMANCE, PROFILE } from '@/lib/demo';
import type { LeaveSummary, LearnDetail, LearnSpace } from '@/lib/types';
import { colors, fonts } from '@/theme/tokens';

const pad = (n: number) => String(n).padStart(2, '0');
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
      <AppTile label="Puzzle" icon="extension-puzzle" g={G.green} tint="#ECF9F2" onPress={() => router.push(`${base}/games/builder` as any)} />
      <AppTile label="Test" icon="checkmark-circle" g={G.purple} tint="#F5EEFE" tag={{ text: 'NEW', bg: colors.mint[0], ink: colors.mint[1] }} onPress={learn('exam')} />
      <AppTile label="Report" icon="bar-chart" g={G.blue} tint="#EDF4FF" onPress={() => router.push(`${base}/performance` as any)} />
    </TileRows>
  );
}

/** Lessons of the picked subject with Upcoming / Done tabs. */
function LessonsBlock({ subjects, selected, onSelect, detail, doneFirst }: {
  subjects: LearnSpace[]; selected: LearnSpace | null; onSelect: (s: LearnSpace) => void; detail?: LearnDetail; doneFirst?: boolean;
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
          <Select compact label={undefined} value={selected?.key ?? ''} options={subjects.map((s) => ({ key: s.key, label: s.title }))}
            onChange={(k) => { const s = subjects.find((x) => x.key === k); if (s) onSelect(s); }} />
        ) : null}
      </Row>
      <Tabs value={tab} onChange={setTab} options={doneFirst ? [tabs[1], tabs[0]] : tabs} />
      <View style={{ gap: 8 }}>
        {list.map((l, i) => {
          const t = LESSON_TINTS[i % 5];
          const current = tab === 'up' && i === 0;
          const href = tab === 'done' ? `${base}/class-done?space=${selected?.key ?? ''}&pos=${l.position}` : current ? `${base}/live/1` : null;
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
  const current = detail.data?.syllabus.find((l) => !l.done);
  const name = selected?.title ?? CLASSROOM_INFO.live.subject;

  return (
    <Screen bar={false} overlay={<AskAiButton base={base} />}>
      <BrandRow base={base} title="Classroom" />
      <T style={{ marginTop: 8, fontFamily: fonts.medium, color: colors.muted }}>{CLASSROOM_INFO.title} · {CLASSROOM_INFO.cls}</T>

      <LinearGradient colors={['#5B43E0', '#9B7BE8', '#D59BE0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ marginTop: 10, borderRadius: 30, padding: 18, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', right: -40, top: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.12)' }} />
        <Row style={{ justifyContent: 'space-between' }}>
          <T style={{ color: '#EDE7FF', fontFamily: fonts.semibold, fontSize: 12 }}>CURRENT LESSON</T>
          <View style={{ backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 10, height: 24, justifyContent: 'center' }}>
            <T style={{ color: '#D6336C', fontFamily: fonts.semibold, fontSize: 11 }}>● {CLASSROOM_INFO.live.when}</T>
          </View>
        </Row>
        <T style={{ color: '#EDE7FF', marginTop: 8 }}>{name} · lesson {pad(current?.position ?? 5)}</T>
        <T style={{ color: '#FFF', fontFamily: fonts.fun, fontSize: 30, lineHeight: 40 }} numberOfLines={1}>{current?.title ?? 'Najas'}</T>
        <Row style={{ marginTop: 12 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Join class" onPress={() => router.push(`${base}/live/1` as any)}
            style={{ backgroundColor: '#FFF', borderRadius: 22, height: 44, paddingLeft: 6, paddingRight: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.violet, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="videocam" size={15} color="#FFF" /></View>
            <T style={{ fontFamily: fonts.fun, fontSize: 16, color: '#46308A' }}>Join class</T>
          </Pressable>
          <T style={{ color: '#EDE7FF', fontSize: 12, flex: 1 }} numberOfLines={2}>{CLASSROOM_INFO.live.teacher} · {CLASSROOM_INFO.live.starts}</T>
        </Row>
      </LinearGradient>

      <View style={{ marginTop: 14 }}><ClassTiles space={selected} /></View>
      <LessonsBlock subjects={subjects} selected={selected} onSelect={select} detail={detail.data} />
    </Screen>
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
      <T v="small">{CLASSROOM_INFO.live.teacher} · 45 min · {subject?.subtitle ?? 'Madrasa 5'}</T>

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

      <BigCard g={['#FF9A3D', '#FF5E7E']} tag="9 GAMES · +50 XP" title="Games" cta="Play" icon="game-controller-outline" onPress={go('/games')} />
      <BigCard g={['#5B43E0', '#9B7BE8']} tag="STORIES · SEERAH · DUAS" title="Audiobook" cta="Listen" icon="headset-outline" onPress={go('/audio')} />
      <BarCard g={['#FF9A3D', '#F06A24']} icon="library-outline" title="Virtual Library" sub="E-books, textbooks & reference" onPress={go('/support')} />

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
      </TileRows>
      <BarCard g={['#0E7A50', '#22A86B']} icon="book-outline" title="Quran & Hifz" sub="Read, listen and memorise" onPress={go('/quran')} />
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
  const fullName = user?.role === 'parent' || user?.name === PROFILE.first ? `${PROFILE.first} ${PROFILE.last}` : user?.name ?? 'Student';
  const due = FEES.due.reduce((n, f) => n + f.amount, 0);
  const go = (p: string) => () => router.push(`${base}${p}` as any);
  return (
    <Screen bar={false}>
      <HeroHeader g={['#0B5166', '#5B43E0']} logo initials={fullName[0]} name={fullName} sub="Madrasa 5 · Roll 1 · AP board" pill={`★ ${PERFORMANCE.stats.stars} stars · Level 6`}
        right={user?.role === 'parent' ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Switch child" onPress={() => demoNote('Demo: parents with more than one child switch between them here.')}
            style={{ height: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <T style={{ color: '#FFF', fontFamily: fonts.medium, fontSize: 13 }}>Switch</T><Ionicons name="chevron-down" size={14} color="#FFF" />
          </Pressable>
        ) : undefined}
        stats={[[PERFORMANCE.stats.attendance, 'Attendance'], [PERFORMANCE.stats.avg, 'Avg score'], [`₹${due.toLocaleString('en-IN')}`, 'Fees due']]} />
      <OverlapCard>
        <TileRows cols={3} gap={10}>
          <AppTile label="Bio" icon="id-card" g={G.pink} tint="#FDF1F8" onPress={go('/bio')} />
          <AppTile label="Performance" icon="trending-up" g={G.blue} tint="#EDF4FF" onPress={go('/performance')} />
          <AppTile label="Attendance" icon="calendar" g={G.green} tint="#ECF9F2" onPress={go('/attendance')} />
          <AppTile label="Fees" icon="cash" g={G.orange} tint="#FFF6E2" badge={FEES.due.length || undefined} onPress={go('/fees')} />
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
        <Pressable accessibilityRole="button" accessibilityLabel="Edit profile" onPress={() => demoNote('Demo: ask your madrasa office to change these details.')}
          style={{ height: 46, paddingHorizontal: 18, borderRadius: 23, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="pencil" size={15} color={colors.ink} /><T style={{ fontFamily: fonts.medium }}>Edit</T>
        </Pressable>
      </Row>
      <Row gap={14} style={{ marginTop: 10 }}>
        <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: '#FFF', borderWidth: 4, borderColor: '#EAB9DF', alignItems: 'center', justifyContent: 'center' }}>
          <T style={{ fontSize: 34, fontFamily: fonts.semibold, color: '#74266A' }}>{(user?.name ?? PROFILE.first)[0]}</T>
        </View>
        <View>
          <T style={{ fontSize: 24, color: '#3A1233' }}>{PROFILE.first}</T>
          <T style={{ fontSize: 26, fontFamily: fonts.semibold, color: '#3A1233' }}>{PROFILE.last}</T>
          <T style={{ fontSize: 13, color: '#74266A' }}>Madrasa 5 · Roll 1 · Student</T>
        </View>
      </Row>
      <T v="h2" style={{ marginTop: 26, marginBottom: 10 }}>Bio</T>
      <DetailRows rows={BIO} />
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
      <T v="small">{PROFILE.first} {PROFILE.last} · Madrasa 5</T>
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
