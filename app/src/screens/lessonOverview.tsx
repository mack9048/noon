// After the class: one lesson of a course with everything in it — the class recording, the textbook,
// the worksheet (students hand in their finished work), learning videos and interactive activities.
import React, { useState } from 'react';
import { Image, Linking, Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Empty, Loading, Screen, T } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useBase } from '@/lib/useBase';
import { appendFile } from '@/lib/pickImage';
import { say } from '@/lib/dialog';
import type { CourseDetail, CourseItem } from '@/lib/types';
import { colors, fonts } from '@/theme/tokens';

const NOONI = require('../../assets/nooni/nooni-full.png');
const isSheet = (i: CourseItem) => /work\s*sheet|activity sheet/i.test(i.title);
const isRecording = (i: CourseItem) => i.kind === 'video' && /record/i.test(i.title);
type Work = { id: number; name: string; size: number; at: string; url: string };

const ROWS: { key: string; title: string; sub: string; icon: keyof typeof Ionicons.glyphMap; tint: [string, string]; test: (i: CourseItem) => boolean }[] = [
  { key: 'rec', title: 'Class Recording', sub: 'Watch the live class again', icon: 'play', tint: ['#EDE9FE', '#6D28D9'], test: isRecording },
  { key: 'book', title: 'Textbook', sub: 'Read and explore the lesson', icon: 'book-outline', tint: ['#E0F2FE', '#0369A1'], test: (i) => i.kind === 'pdf' && !isSheet(i) },
  { key: 'sheet', title: 'Worksheet', sub: 'Do the activities and submit your work', icon: 'clipboard-outline', tint: ['#F3E8FF', '#7E22CE'], test: (i) => i.kind === 'pdf' && isSheet(i) },
  { key: 'video', title: 'Learning Videos', sub: 'Watch short learning videos', icon: 'play-circle', tint: ['#FEE2E2', '#DC2626'], test: (i) => i.kind === 'video' && !isRecording(i) },
  { key: 'game', title: 'Interactive Activities', sub: 'Play and learn with Nooni', icon: 'game-controller-outline', tint: ['#FEF3C7', '#B45309'], test: (i) => i.kind === 'html' },
  { key: 'more', title: 'More', sub: 'Pictures, audio and notes', icon: 'albums-outline', tint: ['#DCFCE7', '#15803D'], test: (i) => ['image', 'audio', 'note', 'link'].includes(i.kind) },
];

/** Hand in a photo or PDF of the finished worksheet. */
function HandIn({ item }: { item: CourseItem }) {
  const { data, reload } = useApi<Work[]>(`/course-items/${item.id}/work`);
  const [busy, setBusy] = useState(false);
  const attach = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], copyToCacheDirectory: true });
    const f = r.canceled ? null : r.assets[0];
    if (!f) return;
    if (f.size && f.size > 10 * 1024 * 1024) { say('This file is over 10 MB. Please choose a smaller photo or PDF.'); return; }
    setBusy(true);
    try { const fd = new FormData(); appendFile(fd, 'file', { ...f, mimeType: f.mimeType ?? 'image/jpeg' }); await api.post(`/course-items/${item.id}/work`, fd); reload(); }
    catch (e) { say(e instanceof ApiError ? e.friendly : 'Could not send your work.'); } finally { setBusy(false); }
  };
  const remove = async (w: Work) => { try { await api.del(`/course-work/${w.id}`); reload(); } catch { say('Could not remove it.'); } };
  return (
    <View style={{ gap: 6, paddingHorizontal: 12, paddingBottom: 12 }}>
      {(data ?? []).map((w) => (
        <View key={w.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F0FDF4', borderRadius: 12, padding: 8 }}>
          <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
          <Pressable style={{ flex: 1 }} onPress={() => Linking.openURL(w.url)}><T numberOfLines={1} style={{ color: '#166534', fontFamily: fonts.medium }}>{w.name}</T><T v="small">Sent {new Date(w.at).toLocaleString([], { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</T></Pressable>
          <Pressable accessibilityLabel={`Remove ${w.name}`} onPress={() => remove(w)}><Ionicons name="trash-outline" size={18} color={colors.red} /></Pressable>
        </View>
      ))}
      <Pressable accessibilityRole="button" accessibilityLabel="Attach your work" disabled={busy} onPress={attach}
        style={{ height: 44, borderRadius: 22, backgroundColor: '#EDE9FE', borderWidth: 1, borderColor: '#C4B5FD', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: busy ? 0.6 : 1 }}>
        <Ionicons name="attach" size={18} color="#6D28D9" /><T style={{ color: '#6D28D9', fontFamily: fonts.semibold }}>{busy ? 'Sending…' : data?.length ? 'Attach more work' : 'Attach Your Work'}</T>
      </Pressable>
    </View>
  );
}

export function LessonOverviewScreen() {
  const { id, lessonId } = useLocalSearchParams<{ id: string; lessonId: string }>();
  const base = useBase();
  const { data: c, error } = useApi<CourseDetail>(`/courses/${id}`);
  const [open, setOpen] = useState<string | null>(null);
  if (error) return <Screen><Empty text={error} /></Screen>;
  if (!c) return <Screen><Loading /></Screen>;
  const lessons = c.lessons ?? [];
  const idx = lessons.findIndex((l) => String(l.id) === String(lessonId));
  const lesson = lessons[idx];
  if (!lesson) return <Screen><Empty text="This lesson is not available." /></Screen>;
  const items = lesson.items;
  const done = items.length > 0 && items.every((i) => i.done);
  const play = (i: CourseItem) => router.push(`${base}/courses/${c.id}/play?lesson=${lesson.id}&item=${i.id}` as any);
  return (
    <Screen>
      <Pressable accessibilityRole="button" onPress={() => (router.canGoBack() ? router.back() : router.replace(`${base}/courses/${c.id}` as any))} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Ionicons name="arrow-back" size={20} color={colors.ink} /><T style={{ fontFamily: fonts.semibold }}>Back to course</T>
      </Pressable>
      <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF', borderRadius: 16, paddingHorizontal: 12, height: 32, borderWidth: 1, borderColor: colors.line, marginBottom: 10 }}>
        <Ionicons name="leaf" size={14} color="#16A34A" /><T numberOfLines={1} style={{ fontSize: 13 }}>{c.title}</T>
      </View>
      <LinearGradient colors={['#0F766E', '#2DD4BF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 26, padding: 18, minHeight: 170, overflow: 'hidden', flexDirection: 'row' }}>
        <View style={{ flex: 1, gap: 4, paddingRight: 110 }}>
          <T style={{ color: '#CCFBF1', fontFamily: fonts.semibold }}>Lesson {String(idx + 1).padStart(2, '0')}</T>
          <T style={{ color: '#FFF', fontFamily: fonts.fun, fontSize: 28, lineHeight: 32 }} numberOfLines={2}>{lesson.title}</T>
          {lesson.description ? <T style={{ color: '#E6FFFA' }} numberOfLines={2}>{lesson.description}</T> : null}
          {done ? (
            <View style={{ marginTop: 8, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF', borderRadius: 16, paddingHorizontal: 10, height: 30 }}>
              <Ionicons name="checkmark-circle" size={16} color="#16A34A" /><T style={{ color: '#166534', fontFamily: fonts.semibold, fontSize: 13 }}>Lesson completed</T>
            </View>
          ) : null}
        </View>
        <Image source={NOONI} accessibilityLabel="Nooni" style={{ position: 'absolute', right: 6, bottom: -40, width: 120, height: 180 }} resizeMode="contain" />
      </LinearGradient>
      <View style={{ gap: 10, marginTop: 14, marginBottom: 100 }}>
        {!items.length ? <Empty text="Your teacher will add the lesson materials here." /> : ROWS.map((r) => {
          const list = items.filter(r.test);
          if (!list.length) return null;
          const isOpen = open === r.key || r.key === 'sheet';
          return (
            <View key={r.key} style={{ backgroundColor: '#F5F3FF', borderRadius: 22, borderWidth: 1, borderColor: '#E9E5FB', overflow: 'hidden' }}>
              <Pressable accessibilityRole="button" accessibilityLabel={r.title} onPress={() => (list.length === 1 && r.key !== 'sheet' ? play(list[0]) : setOpen(open === r.key ? null : r.key))}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
                <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: r.tint[0], alignItems: 'center', justifyContent: 'center' }}><Ionicons name={r.icon} size={24} color={r.tint[1]} /></View>
                <View style={{ flex: 1 }}><T style={{ fontFamily: fonts.semibold, fontSize: 17, color: colors.ink }}>{r.title}</T><T v="small">{r.sub}{list.length > 1 ? ` · ${list.length}` : ''}</T></View>
                <Ionicons name={list.length === 1 && r.key !== 'sheet' ? 'chevron-forward' : isOpen ? 'chevron-down' : 'chevron-forward'} size={20} color={colors.ink} />
              </Pressable>
              {isOpen ? list.map((i) => (
                <View key={i.id}>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Open ${i.title}`} onPress={() => play(i)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#E9E5FB', backgroundColor: '#FFF' }}>
                    <Ionicons name={i.done ? 'checkmark-circle' : 'play-circle-outline'} size={18} color={i.done ? '#16A34A' : r.tint[1]} />
                    <T numberOfLines={1} style={{ flex: 1 }}>{i.title}</T>
                    <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                  </Pressable>
                  {r.key === 'sheet' ? <View style={{ backgroundColor: '#FFF' }}><HandIn item={i} /></View> : null}
                </View>
              )) : null}
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

/** The lessons of a live course, for its course page. */
export function LiveLessonList({ c }: { c: CourseDetail }) {
  const base = useBase();
  const lessons = c.lessons ?? [];
  if (!lessons.length) return null;
  return (
    <View style={{ gap: 8, marginTop: 16 }}>
      <T v="h2">Lessons</T>
      {lessons.map((l, i) => {
        const done = l.items.length > 0 && l.items.every((x) => x.done);
        return (
          <Pressable key={l.id} accessibilityRole="button" accessibilityLabel={l.title} onPress={() => router.push(`${base}/courses/${c.id}/lesson/${l.id}` as any)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFF', borderRadius: 20, padding: 12, borderWidth: 1, borderColor: colors.line }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: done ? '#DCFCE7' : '#EDE9FE', alignItems: 'center', justifyContent: 'center' }}>
              {done ? <Ionicons name="checkmark" size={22} color="#16A34A" /> : <T style={{ fontFamily: fonts.semibold, color: '#6D28D9' }}>{String(i + 1).padStart(2, '0')}</T>}
            </View>
            <View style={{ flex: 1 }}><T style={{ fontFamily: fonts.semibold }} numberOfLines={1}>{l.title}</T><T v="small">{l.items.length} item{l.items.length === 1 ? '' : 's'} · textbook, worksheet, videos, activities</T></View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        );
      })}
    </View>
  );
}
