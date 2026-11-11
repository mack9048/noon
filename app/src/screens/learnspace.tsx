// A student's "learning space": one class subject or one Noon Course they bought or picked.
// Materials, Syllabus, Assessment, Exam, Result and Report card show only that space's content.
import React, { useState } from 'react';
import { Linking, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Empty, ErrorBox, Grid, Header, Loading, Row, Screen, T, TypeIcon } from '@/components/ui';
import { Chips, pastel, Progress, Tag, Tile } from '@/components/kit';
import { useApi } from '@/lib/useApi';
import { useBase } from '@/lib/useBase';
import { LEARN_SECTIONS, LearnSection, setLearnSpace, useLearnSpaces } from '@/lib/learnSpace';
import type { LearnAssessment, LearnDetail, LearnSpace } from '@/lib/types';
import { colors, fonts } from '@/theme/tokens';

const shortDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

/** The six tiles. They open the given space's section. */
export function LearnTiles({ space }: { space: LearnSpace | null }) {
  const base = useBase();
  return (
    <Grid cols={{ phone: 3, tablet: 6, desktop: 6 }} gap={8}>
      {LEARN_SECTIONS.map((s) => (
        <Tile key={s.key} label={s.label} icon={s.icon as any} tint={pastel[s.tint]}
          onPress={() => (space
            ? (setLearnSpace(space.key), router.push(`${base}/learn/${s.key}?space=${space.key}` as any))
            : router.push(`${base}/courses` as any))} />
      ))}
    </Grid>
  );
}

/** Pill showing the selected subject/course; tap to pick another. */
export function SpacePicker({ spaces, selected, onSelect }: { spaces: LearnSpace[]; selected: LearnSpace | null; onSelect: (s: LearnSpace) => void }) {
  const base = useBase();
  const [open, setOpen] = useState(false);
  const subjects = spaces.filter((s) => s.type === 'subject');
  const courses = spaces.filter((s) => s.type === 'course');
  const pick = (s: LearnSpace) => { setOpen(false); onSelect(s); };
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={`Change subject or course, current ${selected?.title ?? 'none'}`} onPress={() => setOpen(true)}
        style={{ height: 48, maxWidth: 280, borderRadius: 24, borderWidth: 1.5, borderColor: colors.line, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, alignSelf: 'flex-start' }}>
        <Ionicons name={selected?.type === 'course' ? 'school-outline' : 'book-outline'} size={18} color={colors.teal} />
        <T numberOfLines={1} style={{ fontFamily: fonts.medium, flexShrink: 1 }}>{selected?.title ?? 'Pick a subject or course'}</T>
        <Ionicons name="chevron-down" size={18} color={colors.ink} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable accessibilityLabel="Close" onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(11,42,53,0.42)', justifyContent: 'flex-end', alignItems: 'center' }}>
          <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 560, maxHeight: '80%', backgroundColor: colors.bg, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 16 }}>
            <Row style={{ justifyContent: 'space-between', marginBottom: 8 }}>
              <T v="h2">Choose what to study</T>
              <Pressable accessibilityLabel="Close" onPress={() => setOpen(false)}><Ionicons name="close" size={26} color={colors.ink} /></Pressable>
            </Row>
            <ScrollView contentContainerStyle={{ gap: 8, paddingBottom: 24 }}>
              <T v="label" style={{ marginTop: 6 }}>MY NOON COURSES</T>
              {courses.map((s) => <SpaceRow key={s.key} s={s} on={s.key === selected?.key} onPress={() => pick(s)} />)}
              <Card onPress={() => { setOpen(false); router.push(`${base}/courses` as any); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Ionicons name="add-circle-outline" size={26} color={colors.violet} />
                <T v="h3" style={{ color: colors.violet }}>Get a new course</T>
              </Card>
              {subjects.length ? <T v="label" style={{ marginTop: 10 }}>MY CLASS SUBJECTS · {subjects[0].subtitle.toUpperCase()}</T> : null}
              {subjects.map((s) => <SpaceRow key={s.key} s={s} on={s.key === selected?.key} onPress={() => pick(s)} />)}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function SpaceRow({ s, on, onPress }: { s: LearnSpace; on: boolean; onPress: () => void }) {
  return (
    <Card onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 2, borderColor: on ? colors.teal : 'transparent' }}>
      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: s.cover ?? colors.sky[0], alignItems: 'center', justifyContent: 'center' }}>
        <T style={{ fontFamily: s.title_ar ? fonts.arabic : fonts.semibold, fontSize: s.title_ar ? 18 : 20, color: colors.ink }}>{s.title_ar ?? s.title[0]}</T>
      </View>
      <View style={{ flex: 1 }}><T v="h3" numberOfLines={1}>{s.title}</T><T v="small" numberOfLines={1}>{s.subtitle}</T></View>
      {on ? <Ionicons name="checkmark-circle" size={24} color={colors.teal} /> : null}
    </Card>
  );
}

/* ---------- /learn/[section]?space=course-1 ---------- */
export function LearnSectionScreen() {
  const params = useLocalSearchParams<{ section: string; space?: string }>();
  const base = useBase();
  const { spaces, selected, select } = useLearnSpaces();
  const [section, setSection] = useState<LearnSection>((LEARN_SECTIONS.find((s) => s.key === params.section)?.key ?? 'materials'));
  const key = params.space ?? selected?.key ?? null;
  const [type, id] = key ? key.split('-') : [null, null];
  const detail = useApi<LearnDetail>(type && id ? `/learn/${type}/${id}` : null);
  const space = detail.data?.space ?? spaces.find((s) => s.key === key) ?? null;
  const label = LEARN_SECTIONS.find((s) => s.key === section)!.label;

  const change = (s: LearnSpace) => { select(s.key); router.setParams({ space: s.key }); };
  const switchSection = (k: LearnSection) => { setSection(k); router.setParams({ section: k }); };

  return (
    <Screen>
      <Header title={label} subtitle={space ? `${space.title} · ${space.subtitle}` : undefined} />
      <SpacePicker spaces={spaces} selected={space} onSelect={change} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8, flexGrow: 0 }}>
        <Chips value={section} onChange={switchSection} options={LEARN_SECTIONS.map((s) => ({ key: s.key, label: s.label }))} />
      </ScrollView>

      {!key ? (
        <Card style={{ marginTop: 12, gap: 10 }}>
          <T v="h3">Pick a course first</T>
          <T v="small">Choose a Noon Course or your class to see its materials, syllabus, tests and results.</T>
          <Button title="Browse courses" onPress={() => router.push(`${base}/courses` as any)} />
        </Card>
      ) : detail.loading ? <Loading /> : detail.error || !detail.data ? (
        <View style={{ marginTop: 12, gap: 10 }}>
          <ErrorBox message={detail.error ?? 'Not found'} onRetry={detail.reload} />
          {type === 'course' ? <Button title="Open the course to enrol" onPress={() => router.push(`${base}/courses/${id}` as any)} /> : null}
        </View>
      ) : (
        <View style={{ marginTop: 8 }}>
          {section === 'materials' ? <Materials d={detail.data} /> : null}
          {section === 'syllabus' ? <Syllabus d={detail.data} /> : null}
          {section === 'assessment' ? <AssessList items={detail.data.assessments} empty="No assessments yet." /> : null}
          {section === 'exam' ? <AssessList items={detail.data.exams} empty="No exams scheduled yet." /> : null}
          {section === 'result' ? <Results d={detail.data} /> : null}
          {section === 'report' ? <ReportCard d={detail.data} /> : null}
        </View>
      )}
    </Screen>
  );
}

function Materials({ d }: { d: LearnDetail }) {
  const base = useBase();
  const [kind, setKind] = useState<'all' | 'live' | 'video' | 'audio' | 'pdf'>('all');
  const kinds = (['live', 'video', 'audio', 'pdf'] as const).filter((k) => d.materials.some((m) => m.kind === k));
  const list = d.materials.filter((m) => kind === 'all' || m.kind === kind);
  const openIt = (m: LearnDetail['materials'][number]) => {
    if (m.kind === 'live' && (!m.url || !/^https:\/\//.test(m.url) || /jit\.si/i.test(m.url))) return router.push(`${base}/live` as any);
    if (m.url && m.url !== '#') Linking.openURL(m.url);
  };
  const names = { all: 'All', live: 'Live', video: 'Video', audio: 'Audio', pdf: 'PDF' };
  return (
    <View style={{ gap: 8 }}>
      <Chips value={kind} onChange={setKind} options={(['all', ...kinds] as const).map((k) => ({ key: k, label: names[k] }))} />
      {list.map((m) => (
        <Card key={m.id} onPress={() => openIt(m)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TypeIcon kind={m.kind} />
          <View style={{ flex: 1 }}><T v="h3" numberOfLines={2}>{m.title}</T>{m.meta ? <T v="small">{m.meta}</T> : null}</View>
          <Ionicons name={m.kind === 'pdf' ? 'download-outline' : m.kind === 'live' ? 'videocam' : 'play-circle'} size={28} color={colors.teal} />
        </Card>
      ))}
      {!list.length ? <Empty text="No materials yet. Your teacher will add them here." /> : null}
    </View>
  );
}

function Syllabus({ d }: { d: LearnDetail }) {
  const done = d.syllabus.filter((s) => s.done).length;
  const pct = d.syllabus.length ? Math.round((done / d.syllabus.length) * 100) : 0;
  return (
    <View style={{ gap: 8 }}>
      {d.syllabus.length ? <Card tint={colors.mint[0]} style={{ gap: 8 }}>
        <Row style={{ justifyContent: 'space-between' }}><T v="h3" style={{ color: colors.mint[1] }}>{done} of {d.syllabus.length} covered</T><T v="h3" style={{ color: colors.mint[1] }}>{pct}%</T></Row>
        <Progress value={pct} color={colors.green} track="#FFFFFF" />
      </Card> : null}
      {d.syllabus.map((s) => (
        <Card key={s.position} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
          <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: s.done ? colors.mint[0] : colors.sky[0], alignItems: 'center', justifyContent: 'center' }}>
            {s.done ? <Ionicons name="checkmark" size={20} color={colors.mint[1]} /> : <T v="h3" style={{ color: colors.sky[1] }}>{s.position}</T>}
          </View>
          <T v="h3" style={{ flex: 1 }} numberOfLines={2}>{s.title}</T>
        </Card>
      ))}
      {!d.syllabus.length ? <Empty text="The syllabus will appear here." /> : null}
    </View>
  );
}

function AssessList({ items, empty }: { items: LearnAssessment[]; empty: string }) {
  const tag = (a: LearnAssessment) => ({
    marked: <Tag text={`${a.marks} / ${a.max_marks}`} tone="mint" />,
    awaiting: <Tag text="Awaiting marks" tone="butter" />,
    upcoming: <Tag text="Upcoming" tone="sky" />,
    open: <Tag text="Open" tone="lav" />,
    done: <Tag text="Done" tone="mint" />,
  })[a.status];
  return (
    <View style={{ gap: 8 }}>
      {items.map((a) => (
        <Card key={a.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.butter[0], alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={a.status === 'marked' || a.status === 'done' ? 'checkmark-done' : 'clipboard-outline'} size={22} color={colors.butter[1]} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <T v="h3" numberOfLines={1}>{a.title}</T>
            <T v="small">{[a.due_at ? shortDate(a.due_at) : null, a.max_marks ? `${a.max_marks} marks` : null, a.meta].filter(Boolean).join(' · ')}</T>
          </View>
          {tag(a)}
        </Card>
      ))}
      {!items.length ? <Empty text={empty} /> : null}
    </View>
  );
}

function Results({ d }: { d: LearnDetail }) {
  return (
    <View style={{ gap: 8 }}>
      {d.results.map((r) => (
        <Card key={r.id} style={{ gap: 8 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}><T v="h3">{r.title}</T><T v="small">{r.type === 'exam' ? 'Exam' : 'Assessment'} · {shortDate(r.date)}</T></View>
            <View style={{ alignItems: 'flex-end' }}><T style={{ fontFamily: fonts.semibold, fontSize: 22, color: colors.ink }}>{r.marks}<T v="small"> / {r.max_marks}</T></T><Tag text={`Grade ${r.grade}`} tone={r.percent >= 80 ? 'mint' : r.percent >= 60 ? 'sky' : 'butter'} /></View>
          </Row>
          <Progress value={r.percent} color={r.percent >= 80 ? colors.green : colors.teal} />
          {r.remarks ? <T v="small">Teacher: {r.remarks}</T> : null}
        </Card>
      ))}
      {!d.results.length ? <Empty text="No results yet. Marks show here once your teacher adds them." /> : null}
    </View>
  );
}

function ReportCard({ d }: { d: LearnDetail }) {
  const r = d.report;
  return (
    <View style={{ gap: 10 }}>
      <Card style={{ gap: 12 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <T v="label">REPORT CARD</T>
            <T v="h2">{r.student ?? 'Student'}</T>
            <T v="small">{d.space.title} · {d.space.subtitle}</T>
          </View>
          <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: colors.mint[0], alignItems: 'center', justifyContent: 'center' }}>
            <T style={{ fontFamily: fonts.semibold, fontSize: 28, color: colors.mint[1] }}>{r.grade ?? '–'}</T>
          </View>
        </Row>
        <Grid cols={{ phone: 3, tablet: 3, desktop: 3 }} gap={8}>
          {[['Overall', r.average], ['Exams', r.exam_average], ['Assessments', r.assessment_average]].map(([k, v]) => (
            <View key={k as string} style={{ borderRadius: 18, backgroundColor: colors.sky[0], padding: 10 }}>
              <T v="small" style={{ color: colors.sky[1] }}>{k}</T>
              <T style={{ fontFamily: fonts.semibold, fontSize: 22, color: colors.sky[1] }}>{v == null ? '–' : `${v}%`}</T>
            </View>
          ))}
        </Grid>
        {d.results.map((x) => (
          <Row key={x.id} style={{ justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 8 }}>
            <T style={{ flex: 1 }}>{x.title}</T><T style={{ width: 70, textAlign: 'right' }}>{x.marks}/{x.max_marks}</T><T style={{ width: 40, textAlign: 'right', fontFamily: fonts.semibold }}>{x.grade}</T>
          </Row>
        ))}
        {!r.count ? <T v="small">No marks yet for this {d.space.type === 'course' ? 'course' : 'subject'}.</T> : null}
      </Card>
      {Platform.OS === 'web' && r.count ? <Button title="Print or save as PDF" icon="download-outline" kind="ghost" onPress={() => (globalThis as any).print?.()} /> : null}
    </View>
  );
}
