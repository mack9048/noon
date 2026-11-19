// Course player: a progress sidebar with modules (subjects) and lessons, a big player for the
// chosen content, the lesson's other content, its downloads, previous / next, and the certificate.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, ErrorBox, Loading, Row, Screen, T, TypeIcon } from '@/components/ui';
import { demoNote } from '@/components/kit';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/lib/auth';
import { useBase } from '@/lib/useBase';
import { useLayout } from '@/lib/useLayout';
import { kindLabel } from '@/lib/courseBuilder';
import type { CourseDetail, CourseItem, CourseLessonRow } from '@/lib/types';
import { colors, fonts } from '@/theme/tokens';
import { ContentViewerHost, openContent } from './courseBuilder';

const web = Platform.OS === 'web';
const el = (tag: string, props: Record<string, unknown>) => React.createElement(tag, props);
const errText = (e: any, fallback: string) => (e instanceof ApiError ? e.friendly : e?.message ?? fallback);
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
/** Items that finish when they play to the end (others count as done once opened). */
const PLAYS = new Set(['video', 'audio']);
const DOWNLOADS = new Set(['pdf', 'audio', 'video', 'image']);

function youTubeId(url: string) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
  return m?.[1] ?? null;
}
function vimeoId(url: string) { return url.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1] ?? null; }

type Module = { key: string; title: string | null; lessons: CourseLessonRow[] };

/** Modules = subjects (lessons outside a subject come first, as their own module). */
function modulesOf(c: CourseDetail): Module[] {
  const lessons = c.lessons ?? [];
  const subjects = c.subjects ?? [];
  const loose = lessons.filter((l) => !l.subject_id || !subjects.some((s) => s.id === l.subject_id));
  return [
    { key: 'loose', title: subjects.length ? 'Lessons' : null, lessons: loose },
    ...subjects.map((s) => ({ key: `s${s.id}`, title: s.title, lessons: lessons.filter((l) => l.subject_id === s.id) })),
  ].filter((m) => m.lessons.length);
}

export function CoursePlayerScreen() {
  const { id, lesson: lessonParam, item: itemParam } = useLocalSearchParams<{ id: string; lesson?: string; item?: string }>();
  const base = useBase();
  const { user } = useAuth();
  const { width } = useLayout();
  const wide = width >= 1000;
  const course = useApi<CourseDetail>(`/courses/${id}`);
  // Items finished in this visit: shown at once, before the course reloads.
  const [doneNow, setDoneNow] = useState<Set<number>>(new Set());
  const [openModules, setOpenModules] = useState<Set<string> | null>(null);
  const [tab, setTab] = useState<'content' | 'downloads'>('content');
  const main = useRef<ScrollView>(null);

  const c = course.data;
  const modules = useMemo(() => (c ? modulesOf(c) : []), [c]);
  const ordered = useMemo(() => modules.flatMap((m) => m.lessons), [modules]);
  const isDone = (it: CourseItem) => !!it.done || doneNow.has(it.id);
  const canOpen = (l: CourseLessonRow) => !!c?.enrolled || l.free_preview;

  const lesson = ordered.find((l) => String(l.id) === lessonParam)
    ?? ordered.find((l) => canOpen(l) && l.items.some((i) => !isDone(i))) ?? ordered.find(canOpen) ?? ordered[0];
  const item = lesson?.items.find((i) => String(i.id) === itemParam) ?? lesson?.items.find((i) => !isDone(i)) ?? lesson?.items[0];
  const locked = lesson ? !canOpen(lesson) : false;

  // Open the module that holds the current lesson.
  useEffect(() => {
    if (!lesson || openModules) return;
    const m = modules.find((x) => x.lessons.some((l) => l.id === lesson.id));
    if (m) setOpenModules(new Set([m.key]));
  }, [lesson?.id, modules.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const complete = (it?: CourseItem) => {
    if (!it || !c?.enrolled || isDone(it)) return;
    setDoneNow((s) => new Set(s).add(it.id));
    api.post(`/course-items/${it.id}/complete`).then(() => course.reload()).catch(() => {});
  };
  // Non-playing content counts as done once it is opened.
  useEffect(() => { if (item && !locked && !PLAYS.has(item.kind) && item.kind !== 'test') complete(item); }, [item?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (course.loading && !c) return <Screen><Loading /></Screen>;
  if (!c) return <Screen><ErrorBox message={course.error ?? 'Not found'} onRetry={course.reload} /></Screen>;
  const coursePage = `${base}/courses/${c.id}`;
  if (!ordered.length) {
    return <Screen><T v="h2">{c.title}</T><T v="small" style={{ marginTop: 6 }}>No lessons yet.</T><Button title="Back to course" style={{ marginTop: 12 }} onPress={() => router.replace(coursePage as any)} /></Screen>;
  }

  const all = ordered.flatMap((l) => l.items);
  const doneCount = all.filter(isDone).length;
  const pct = all.length ? Math.round((doneCount / all.length) * 100) : 0;
  const go = (l: CourseLessonRow, it?: CourseItem) => {
    if (!canOpen(l)) return demoNote('Join the course to open this lesson.');
    router.setParams({ lesson: String(l.id), item: it ? String(it.id) : '' } as any);
    setTab('content');
    main.current?.scrollTo({ y: 0, animated: true });
  };
  const li = lesson ? ordered.indexOf(lesson) : 0;
  const prev = ordered[li - 1];
  const next = ordered[li + 1];
  const itemIdx = lesson && item ? lesson.items.indexOf(item) : -1;
  const nextItem = lesson && itemIdx >= 0 ? lesson.items[itemIdx + 1] : undefined;
  const downloads = (lesson?.items ?? []).filter((i) => DOWNLOADS.has(i.kind) && i.url && !youTubeId(i.url) && !vimeoId(i.url));
  const toggle = (k: string) => setOpenModules((s) => { const n = new Set(s ?? []); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  const sidebar = (
    <View style={{ backgroundColor: '#FFF', borderRadius: wide ? 0 : 24, overflow: 'hidden', borderWidth: wide ? 0 : 1, borderColor: colors.line }}>
      <View style={{ padding: 16, gap: 10, borderBottomWidth: 1, borderBottomColor: colors.line }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T style={{ fontFamily: fonts.semibold, fontSize: 14 }}>{doneCount} of {all.length} completed</T>
          <T style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.violet }}>{pct}%</T>
        </Row>
        <View style={{ height: 7, borderRadius: 4, backgroundColor: '#EBE8F7', overflow: 'hidden' }} accessibilityLabel={`${pct}% of the course completed`}>
          <View style={{ width: `${pct}%`, height: 7, borderRadius: 4, backgroundColor: colors.violet }} />
        </View>
      </View>
      {modules.map((m, mi) => {
        const open = !m.title || openModules?.has(m.key);
        const finished = m.lessons.filter((l) => l.items.length && l.items.every(isDone)).length;
        return (
          <View key={m.key} style={{ borderBottomWidth: 1, borderBottomColor: colors.line }}>
            {m.title ? (
              <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={`Module ${mi + 1}: ${m.title}`} onPress={() => toggle(m.key)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 }}>
                <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: finished === m.lessons.length ? colors.mint[0] : '#EEEBFB', alignItems: 'center', justifyContent: 'center' }}>
                  <T style={{ fontFamily: fonts.semibold, color: finished === m.lessons.length ? colors.mint[1] : colors.violet }}>{mi + 1}</T>
                </View>
                <View style={{ flex: 1 }}>
                  <T style={{ fontSize: 11, letterSpacing: 1, color: colors.violet, fontFamily: fonts.semibold }}>MODULE</T>
                  <T style={{ fontFamily: fonts.semibold, fontSize: 15 }} numberOfLines={1}>{m.title}</T>
                  <T v="small">{finished}/{m.lessons.length} lessons completed</T>
                </View>
                <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
              </Pressable>
            ) : null}
            {open ? m.lessons.map((l) => {
              const current = l.id === lesson?.id;
              const done = l.items.length > 0 && l.items.every(isDone);
              const shut = !canOpen(l);
              return (
                <Pressable key={l.id} accessibilityRole="button" accessibilityState={{ selected: current }} accessibilityLabel={l.title} onPress={() => go(l)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: current ? '#EEEBFB' : 'transparent', borderLeftWidth: 3, borderLeftColor: current ? colors.violet : 'transparent' }}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: current ? colors.violet : done ? colors.green : 'transparent', borderWidth: current || done ? 0 : 1.5, borderColor: colors.line }}>
                    <Ionicons name={shut ? 'lock-closed' : current ? 'play' : done ? 'checkmark' : 'play-outline'} size={13} color={current || done ? '#FFF' : colors.muted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <T style={{ fontFamily: current ? fonts.semibold : fonts.medium, fontSize: 14, color: current ? colors.violet : colors.ink }} numberOfLines={2}>{l.title}</T>
                    <T v="small" style={{ color: current ? colors.violet : colors.muted }}>{l.duration ? `${l.duration} · ` : ''}{plural(l.items.length, 'item')}{!c.enrolled && l.free_preview ? ' · Free preview' : ''}</T>
                  </View>
                </Pressable>
              );
            }) : null}
          </View>
        );
      })}
      <Pressable accessibilityRole="button" accessibilityLabel={pct === 100 ? 'Download certificate' : 'Certificate: finish all lessons to unlock'}
        onPress={() => (pct === 100 ? router.push(`${coursePage}/certificate` as any) : demoNote(`Finish all lessons to get your certificate. You have done ${pct}%.`))}
        style={{ margin: 12, padding: 14, borderRadius: 18, borderWidth: 1.5, borderColor: pct === 100 ? '#CFC6F7' : colors.line, backgroundColor: pct === 100 ? '#F4F1FE' : '#F7FBFC', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: pct === 100 ? colors.violet : '#D9E3E7', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={pct === 100 ? 'ribbon' : 'lock-closed'} size={20} color="#FFF" />
        </View>
        <View style={{ flex: 1 }}>
          <T style={{ fontFamily: fonts.semibold }}>{pct === 100 ? 'Download Certificate' : 'Certificate'}</T>
          <T v="small">{pct === 100 ? 'Get your certificate' : 'Finish all lessons to unlock'}</T>
        </View>
      </Pressable>
    </View>
  );

  const content = lesson ? (
    <View style={{ gap: 16, width: '100%', maxWidth: 900, alignSelf: 'center' }}>
      <Pressable accessibilityRole="link" onPress={() => router.replace(coursePage as any)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 }}>
        <Ionicons name="arrow-back" size={16} color={colors.violet} /><T style={{ color: colors.violet, fontFamily: fonts.semibold }}>Back to course</T>
      </Pressable>
      {locked ? <LockedBox onJoin={() => router.replace(coursePage as any)} />
        : item ? <Player key={item.id} item={item} watermark={user?.phone || user?.email || user?.name || ''} onEnded={() => complete(item)} />
        : <View style={{ borderRadius: 20, backgroundColor: '#FFF', padding: 24 }}><T v="small">Nothing in this lesson yet.</T></View>}
      <View style={{ gap: 4 }}>
        <T style={{ fontFamily: fonts.semibold, fontSize: 24, color: colors.ink }}>{item && lesson.items.length > 1 ? item.title : lesson.title}</T>
        <T v="small">{lesson.title !== item?.title && lesson.items.length > 1 ? `${lesson.title} · ` : ''}{item ? kindLabel(item.kind) : ''}{item?.meta ? ` · ${item.meta}` : ''}</T>
        {lesson.description ? <T style={{ marginTop: 6, color: colors.muted }}>{lesson.description}</T> : null}
      </View>
      {item && !locked && c.enrolled ? (
        <Row gap={10} style={{ flexWrap: 'wrap' }}>
          {isDone(item) ? (
            <Row gap={6} style={{ height: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: colors.mint[0] }}><Ionicons name="checkmark-circle" size={18} color={colors.green} /><T style={{ fontFamily: fonts.semibold, color: colors.mint[1] }}>Completed</T></Row>
          ) : (
            <Button title="Mark as complete" icon="checkmark" kind="ghost" style={{ height: 40 }} onPress={() => complete(item)} />
          )}
          {nextItem ? <Button title={`Next: ${nextItem.title}`} icon="arrow-forward" style={{ height: 40 }} onPress={() => go(lesson, nextItem)} /> : null}
        </Row>
      ) : null}

      <Row gap={8} style={{ borderBottomWidth: 1, borderBottomColor: colors.line, paddingBottom: 12 }}>
        <TabPill on={tab === 'content'} icon="list" label={wide ? 'Lesson content' : 'Content'} count={lesson.items.length} onPress={() => setTab('content')} />
        <TabPill on={tab === 'downloads'} icon="attach" label={wide ? 'Attachments & Downloads' : 'Downloads'} count={downloads.length} onPress={() => setTab('downloads')} />
      </Row>
      {tab === 'content' ? (
        <View style={{ backgroundColor: '#FFF', borderRadius: 20, padding: 8 }}>
          {lesson.items.map((it, i) => {
            const on = it.id === item?.id;
            return (
              <Pressable key={it.id} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`${i + 1}. ${it.title}`} onPress={() => go(lesson, it)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 14, backgroundColor: on ? '#EEEBFB' : 'transparent' }}>
                <T style={{ width: 20, textAlign: 'center', fontFamily: fonts.semibold, color: on ? colors.violet : colors.muted }}>{i + 1}</T>
                <TypeIcon kind={it.kind} size={40} />
                <View style={{ flex: 1 }}>
                  <T style={{ fontFamily: fonts.semibold, color: on ? colors.violet : colors.ink }} numberOfLines={1}>{it.title}</T>
                  <T v="small">{kindLabel(it.kind)}{it.meta ? ` · ${it.meta}` : ''}</T>
                </View>
                {isDone(it) ? <Ionicons name="checkmark-circle" size={22} color={colors.green} accessibilityLabel="Done" /> : on ? <Ionicons name="play-circle" size={22} color={colors.violet} /> : null}
              </Pressable>
            );
          })}
          {!lesson.items.length ? <T v="small" style={{ padding: 10 }}>Nothing in this lesson yet.</T> : null}
        </View>
      ) : (
        <View style={{ backgroundColor: '#FFF', borderRadius: 20, padding: 16, gap: 10 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}><T v="h3">Lesson Resources & Downloads</T><T v="small">PDFs, audio and other files of this lesson.</T></View>
            <View style={{ backgroundColor: '#EEEBFB', borderRadius: 12, paddingHorizontal: 10, height: 26, justifyContent: 'center' }}><T style={{ fontSize: 12, color: colors.violet, fontFamily: fonts.semibold }}>{plural(downloads.length, 'File')}</T></View>
          </Row>
          {downloads.map((it) => (
            <Row key={it.id} gap={12} style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 10 }}>
              <TypeIcon kind={it.kind} size={40} />
              <View style={{ flex: 1 }}><T style={{ fontFamily: fonts.semibold }} numberOfLines={1}>{it.title}</T><T v="small">{kindLabel(it.kind)}</T></View>
              <Button title="Download" icon="download-outline" kind="ghost" style={{ height: 38, paddingHorizontal: 12 }} disabled={locked} onPress={() => it.url && Linking.openURL(it.url)} />
            </Row>
          ))}
          {!downloads.length ? <T v="small">No files to download in this lesson.</T> : null}
        </View>
      )}

      <Row gap={10}>
        <Button title="Previous lesson" icon="arrow-back" kind="ghost" style={{ flex: 1 }} disabled={!prev} onPress={() => prev && go(prev)} />
        <Button title={next ? 'Next lesson' : 'Back to course'} icon="arrow-forward" style={{ flex: 1 }} onPress={() => (next ? go(next) : router.replace(coursePage as any))} />
      </Row>
    </View>
  ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ContentViewerHost />
      {wide ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <ScrollView style={{ width: 340, flexGrow: 0, backgroundColor: '#FFF', borderRightWidth: 1, borderRightColor: colors.line }}>{sidebar}</ScrollView>
          <ScrollView ref={main} style={{ flex: 1 }} contentContainerStyle={{ padding: 28, paddingBottom: 60 }}>{content}</ScrollView>
        </View>
      ) : (
        <ScrollView ref={main} contentContainerStyle={{ padding: 16, paddingBottom: 130, gap: 18 }}>
          {content}
          <T v="h2" style={{ marginTop: 8 }}>Course content</T>
          {sidebar}
        </ScrollView>
      )}
    </View>
  );
}

function TabPill({ on, icon, label, count, onPress }: { on: boolean; icon: any; label: string; count: number; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5, borderColor: on ? '#CFC6F7' : colors.line, backgroundColor: on ? '#FFF' : 'transparent', flexShrink: 1 }}>
      <Ionicons name={icon} size={15} color={on ? colors.violet : colors.muted} />
      <T numberOfLines={1} style={{ flexShrink: 1, fontSize: 13, fontFamily: fonts.semibold, color: on ? colors.violet : colors.muted }}>{label}</T>
      <View style={{ minWidth: 20, height: 20, borderRadius: 10, backgroundColor: on ? '#EEEBFB' : '#E3ECEF', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }}>
        <T style={{ fontSize: 11, fontFamily: fonts.semibold, color: on ? colors.violet : colors.muted }}>{count}</T>
      </View>
    </Pressable>
  );
}

function LockedBox({ onJoin }: { onJoin: () => void }) {
  return (
    <View style={{ aspectRatio: 16 / 9, borderRadius: 20, backgroundColor: '#10162B', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20 }}>
      <Ionicons name="lock-closed" size={36} color="#FFF" />
      <T style={{ color: '#FFF', fontFamily: fonts.semibold, fontSize: 17, textAlign: 'center' }}>Join the course to open this lesson</T>
      <Button title="Join course" kind="yellow" onPress={onJoin} />
    </View>
  );
}

/** The user's phone / email drifts over videos so screen recordings show who shared them. */
function Watermark({ text }: { text: string }) {
  const spots = [{ top: '12%', left: '8%' }, { top: '70%', right: '8%' }, { top: '40%', left: '45%' }, { top: '75%', left: '10%' }, { top: '15%', right: '10%' }];
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((x) => (x + 1) % spots.length), 9000); return () => clearInterval(t); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!text) return null;
  return <View pointerEvents="none" style={[{ position: 'absolute' }, spots[i] as any]}><T style={{ color: 'rgba(255,255,255,0.45)', fontFamily: fonts.semibold, fontSize: 14 }}>{text}</T></View>;
}

/** Plays one piece of content inside the page. */
function Player({ item, watermark, onEnded }: { item: CourseItem; watermark: string; onEnded: () => void }) {
  const [html, setHtml] = useState<string | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (item.kind !== 'html') return;
    api.get<{ url: string }>(`/course-items/${item.id}/open`).then((r) => setHtml(r.url)).catch((e) => setErr(errText(e, 'This lesson can not be opened right now.')));
  }, [item.id, item.kind]);
  const frame = { position: 'relative' as const, width: '100%' as const, aspectRatio: 16 / 9, borderRadius: 20, overflow: 'hidden' as const, backgroundColor: '#000' };
  const fill = { width: '100%', height: '100%', border: 0, display: 'block', background: '#000' };
  const noMenu = (e: any) => e.preventDefault();

  if (!web) {
    // Phone app: open in the system player / viewer.
    return (
      <View style={[frame, { alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#10162B' }]}>
        <TypeIcon kind={item.kind} size={56} />
        <Button title={`Open ${kindLabel(item.kind)}`} kind="yellow" onPress={() => { openContent(item); onEnded(); }} />
      </View>
    );
  }
  const url = item.url ?? '';
  if (item.kind === 'video') {
    const yt = youTubeId(url); const vm = vimeoId(url);
    return (
      <View style={frame}>
        {yt || vm ? el('iframe', { src: yt ? `https://www.youtube-nocookie.com/embed/${yt}?rel=0&modestbranding=1` : `https://player.vimeo.com/video/${vm}`, title: item.title, allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen', allowFullScreen: true, style: fill })
          : url ? el('video', { src: url, controls: true, playsInline: true, controlsList: 'nodownload', disablePictureInPicture: true, onContextMenu: noMenu, onEnded, style: { ...fill, objectFit: 'contain' } })
          : <T style={{ color: '#FFF', margin: 20 }}>This video has no file yet.</T>}
        <Watermark text={watermark} />
      </View>
    );
  }
  if (item.kind === 'audio') {
    return (
      <View style={{ borderRadius: 20, padding: 22, gap: 16, backgroundColor: '#211A4D' }}>
        <Row gap={14}>
          <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: '#5B43E0', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="musical-notes" size={30} color="#FFF" /></View>
          <View style={{ flex: 1 }}><T style={{ color: '#CFC6F7', fontSize: 12, fontFamily: fonts.semibold, letterSpacing: 1 }}>AUDIO</T><T style={{ color: '#FFF', fontFamily: fonts.semibold, fontSize: 18 }} numberOfLines={2}>{item.title}</T></View>
        </Row>
        {url ? el('audio', { src: url, controls: true, controlsList: 'nodownload', onContextMenu: noMenu, onEnded, style: { width: '100%' } }) : <T style={{ color: '#FFF' }}>This audio has no file yet.</T>}
      </View>
    );
  }
  if (item.kind === 'pdf') {
    return <View style={{ width: '100%', height: 640, maxHeight: 900, borderRadius: 20, overflow: 'hidden', backgroundColor: '#FFF' }}>{url ? el('iframe', { src: url, title: item.title, style: { ...fill, background: '#FFF' } }) : null}</View>;
  }
  if (item.kind === 'html') {
    return (
      <View style={[frame, { backgroundColor: '#FFF' }]}>
        {html ? el('iframe', {
          src: html, title: item.title,
          // No allow-same-origin: the page gets its own blank origin and can't touch the app or its login.
          sandbox: 'allow-scripts allow-pointer-lock allow-modals allow-forms', allow: 'autoplay; fullscreen', allowFullScreen: true, style: { ...fill, background: '#FFF' },
        }) : err ? <T style={{ margin: 20, color: colors.red }}>{err}</T> : <Loading />}
      </View>
    );
  }
  if (item.kind === 'image' && url) {
    return <View style={[frame, { backgroundColor: '#FFF' }]}>{el('img', { src: url, alt: item.title, style: { width: '100%', height: '100%', objectFit: 'contain' } })}</View>;
  }
  if (item.kind === 'note') {
    return <View style={{ borderRadius: 20, backgroundColor: '#FFF', padding: 24, borderLeftWidth: 5, borderLeftColor: colors.pink[1] }}><T style={{ fontSize: 17, lineHeight: 28 }}>{item.body || 'Empty note.'}</T></View>;
  }
  // Live class, link, quiz: a card with the action.
  const when = item.starts_at ? new Date(item.starts_at) : null;
  return (
    <View style={{ borderRadius: 20, padding: 24, gap: 14, backgroundColor: '#211A4D', alignItems: 'flex-start' }}>
      <TypeIcon kind={item.kind} size={56} />
      <T style={{ color: '#FFF', fontFamily: fonts.semibold, fontSize: 20 }}>{item.title}</T>
      {when ? <T style={{ color: '#CFC6F7' }}>{when.toLocaleString([], { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' })}</T> : null}
      {url ? <Button title={item.kind === 'live' ? 'Join live class' : 'Open'} icon="open-outline" kind="yellow" onPress={() => { Linking.openURL(url); onEnded(); }} /> : <T style={{ color: '#CFC6F7' }}>The link will show here.</T>}
    </View>
  );
}

/* ================= Certificate ================= */

export function CourseCertificateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const base = useBase();
  const { user } = useAuth();
  const course = useApi<CourseDetail>(`/courses/${id}`);
  if (course.loading && !course.data) return <Screen><Loading /></Screen>;
  const c = course.data;
  if (!c) return <Screen><ErrorBox message={course.error ?? 'Not found'} onRetry={course.reload} /></Screen>;
  const items = c.items;
  const finished = c.enrolled && items.length > 0 && items.every((i) => i.done);
  if (!finished) {
    return (
      <Screen>
        <T v="h2">Certificate</T>
        <T style={{ marginTop: 8 }}>Finish every lesson of “{c.title}” to get your certificate.</T>
        <Button title="Continue the course" style={{ marginTop: 14 }} onPress={() => router.replace(`${base}/courses/${c.id}/play` as any)} />
      </Screen>
    );
  }
  const today = new Date().toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <Screen>
      <View nativeID="certificate" style={{ backgroundColor: '#FFF', borderRadius: 24, padding: 10, maxWidth: 900, width: '100%', alignSelf: 'center' }}>
        <View style={{ borderWidth: 3, borderColor: colors.violet, borderRadius: 18, padding: 28, alignItems: 'center', gap: 10 }}>
          <Ionicons name="ribbon" size={54} color={colors.yellowDeep} />
          <T style={{ fontSize: 13, letterSpacing: 3, color: colors.violet, fontFamily: fonts.semibold }}>CERTIFICATE OF COMPLETION</T>
          <T v="small">This certifies that</T>
          <T style={{ fontFamily: fonts.fun, fontSize: 34, color: colors.ink, textAlign: 'center' }}>{user?.name ?? 'Student'}</T>
          <T v="small">has completed the Noon Learn course</T>
          <T style={{ fontFamily: fonts.semibold, fontSize: 22, color: colors.violet, textAlign: 'center' }}>{c.title}</T>
          <T v="small">{c.category} · {c.level} · {plural(c.lessons?.length ?? c.lessons_count, 'lesson')}</T>
          <Row gap={40} style={{ marginTop: 18 }}>
            <View style={{ alignItems: 'center' }}><T style={{ fontFamily: fonts.semibold }}>{today}</T><T v="small">Date</T></View>
            <View style={{ alignItems: 'center' }}><T style={{ fontFamily: fonts.semibold }}>{c.teacher_name ?? 'Noon Learn'}</T><T v="small">Teacher</T></View>
          </Row>
        </View>
      </View>
      {web ? <Button title="Download / print" icon="download-outline" style={{ marginTop: 14, alignSelf: 'center' }} onPress={() => (globalThis as any).print?.()} /> : null}
    </Screen>
  );
}
