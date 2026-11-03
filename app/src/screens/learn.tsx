import React, { useState } from 'react';
import { Linking, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, ErrorBox, GradientCard, Grid, Header, IconButton, Loading, Pill, Row, Screen, Segmented, T, TypeIcon, Empty } from '@/components/ui';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useBase } from '@/lib/useBase';
import type { Board, Course, CourseDetail, SchoolClass, Subject, SubjectDetail, StudyTool, ToolType } from '@/lib/types';
import { colors, ContentKind, fonts, gradients, scriptFont } from '@/theme/tokens';

const pastels = [colors.lav, colors.sky, colors.mint, colors.pink, colors.butter];
const open = (url?: string | null) => { if (url && url !== '#') Linking.openURL(url); };

/* ================= Noon Courses ================= */

export function CoursesScreen() {
  const base = useBase();
  const [scope, setScope] = useState<'mine' | 'explore'>('mine');
  const list = useApi<Course[]>(`/courses?scope=${scope}`);
  return (
    <Screen>
      <Header title="Noon Courses" />
      <Segmented value={scope} onChange={setScope} options={[{ key: 'mine', label: 'My courses' }, { key: 'explore', label: 'Explore' }]} activeColor={colors.violet} />
      <View style={{ marginTop: 12 }}>
        {list.loading ? <Loading /> : list.error ? <ErrorBox message={list.error} onRetry={list.reload} /> : (
          <Grid cols={{ phone: 1, tablet: 2, desktop: 3 }}>
            {(list.data ?? []).map((c) => (
              <Card key={c.id} onPress={() => router.push(`${base}/courses/${c.id}` as any)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 70, height: 70, borderRadius: 20, backgroundColor: c.cover, alignItems: 'center', justifyContent: 'center' }}>
                  <T style={{ fontFamily: fonts.fun, fontSize: 30, color: colors.ink }}>{c.title[0]}</T>
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <T v="h3" numberOfLines={1}>{c.title}</T>
                  <T v="small">{c.teacher_name ?? c.category} · {c.lessons_count} lessons</T>
                  {scope === 'mine' && c.progress != null ? <Progress value={c.progress} /> : <Pill text={c.is_free ? 'FREE' : 'Enrol'} />}
                </View>
              </Card>
            ))}
          </Grid>
        )}
        {!list.loading && !list.data?.length ? <Empty text="No courses here yet." /> : null}
      </View>
    </Screen>
  );
}

export function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const base = useBase();
  const course = useApi<CourseDetail>(`/courses/${id}`);
  const [filter, setFilter] = useState<'all' | ContentKind>('all');
  if (course.loading) return <Screen><Loading /></Screen>;
  if (!course.data) return <Screen><ErrorBox message={course.error ?? 'Not found'} onRetry={course.reload} /></Screen>;
  const c = course.data;
  const items = c.items.filter((i) => filter === 'all' || i.kind === filter);
  const live = c.items.find((i) => i.kind === 'live' && !i.done);
  const action: Record<ContentKind, string> = { live: 'Join', video: 'Watch', audio: 'Listen', pdf: 'Open', test: 'Start' };

  return (
    <Screen>
      <Header title={c.title} subtitle={`${c.teacher_name ?? c.category} · ${c.lessons_count} lessons`} />
      {c.progress != null ? <Progress value={c.progress} /> : null}
      {!c.enrolled ? <Button title="Enrol in this course" kind="yellow" style={{ marginTop: 12 }} onPress={async () => { await api.post(`/courses/${c.id}/enroll`); course.reload(); }} /> : null}
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
  const [tab, setTab] = useState<'video' | 'audio' | 'pdf'>('video');
  if (subject.loading) return <Screen><Loading /></Screen>;
  if (!subject.data) return <Screen><ErrorBox message={subject.error ?? 'Not found'} onRetry={subject.reload} /></Screen>;
  const s = subject.data;
  return (
    <Screen>
      <Header title={s.name} subtitle={`${s.board_name ?? ''} board · Class ${s.class_label ?? ''}`} />
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
    <Screen>
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
