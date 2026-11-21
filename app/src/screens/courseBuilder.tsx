// Super admin course builder: subjects (optional) → lessons as a grid of cards → each lesson's
// content (video, audios in order, PDF, HTML, note, image, link, live class). Saved as you go.
// Also: the course category list, and the viewer students use for HTML / notes / images.
import React, { useEffect, useState } from 'react';
import { Image, Linking, Modal, Platform, Pressable, ScrollView, Switch, View } from 'react-native';
import { appendFile, pickImage } from '@/lib/pickImage';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { Button, Card, ErrorBox, Grid, IconButton, Loading, Row, Screen, T, TypeIcon } from '@/components/ui';
import { demoNote, Tag } from '@/components/kit';
import { BottomActions, ChoiceChips, DateInput, Input, Panel, Select, TileRows } from '@/components/kit2';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { BCourse, BItem, BLesson, BSubject, Category, fileSize, KINDS, kindLabel, LessonDetail, LiveSlot, moved, Picked, saveItem } from '@/lib/courseBuilder';
import { colors, contentType, fonts, type ContentKind } from '@/theme/tokens';

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
const errText = (e: any, fallback: string) => (e instanceof ApiError ? e.friendly : e?.message ?? fallback);

/* ================= Categories ================= */

/** Category dropdown fed by the editable list; super admin gets a "Manage" button. */
export function CategoryField({ value, onChange, manage }: { value: string; onChange: (v: string) => void; manage: boolean }) {
  const list = useApi<Category[]>('/course-categories');
  const [open, setOpen] = useState(false);
  const names = (list.data ?? []).map((c) => c.name);
  const options = names.includes(value) || !value ? names : [value, ...names];
  useEffect(() => { if (!value && names.length) onChange(names[0]); }, [names.length]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View style={{ flex: 1, gap: 4 }}>
      {options.length ? <Select label="Category" value={value} options={options} onChange={onChange} /> : <Input label="Category" value={value} onChangeText={onChange} />}
      {manage ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Add or edit categories" onPress={() => setOpen(true)}
          style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#E6F4F4', marginTop: 2 }}>
          <Ionicons name="add-circle-outline" size={16} color={colors.teal} />
          <T style={{ fontSize: 13, color: colors.teal, fontFamily: fonts.semibold }}>Add / edit categories</T>
        </Pressable>
      ) : null}
      {open ? <CategoriesSheet list={list.data ?? []} onClose={() => setOpen(false)} onChanged={list.reload} onRenamed={(from, to) => { if (value === from) onChange(to); }} /> : null}
    </View>
  );
}

function CategoriesSheet({ list, onClose, onChanged, onRenamed }: { list: Category[]; onClose: () => void; onChanged: () => void; onRenamed: (from: string, to: string) => void }) {
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);
  const [err, setErr] = useState('');
  const run = async (fn: () => Promise<unknown>) => { setErr(''); try { await fn(); onChanged(); } catch (e) { setErr(errText(e, 'Could not save.')); } };
  return (
    <Sheet title="Course categories" onClose={onClose}>
      <T v="small">These show in the Category list when you create a course. Renaming one also renames it on its courses.</T>
      {list.map((c) => (
        <Row key={c.id} gap={8} style={{ borderRadius: 16, borderWidth: 1.5, borderColor: colors.line, paddingHorizontal: 10, minHeight: 50 }}>
          {editing?.id === c.id ? (
            <>
              <View style={{ flex: 1 }}><Input value={editing.name} onChangeText={(v) => setEditing({ id: c.id, name: v })} accessibilityLabel={`New name for ${c.name}`} /></View>
              <IconButton name="checkmark" label="Save name" tint={colors.mint[0]} color={colors.mint[1]} size={38}
                onPress={() => run(async () => { await api.put(`/super/course-categories/${c.id}`, { name: editing.name.trim() }); onRenamed(c.name, editing.name.trim()); setEditing(null); })} />
              <IconButton name="close" label="Cancel" tint={colors.bg} size={38} onPress={() => setEditing(null)} />
            </>
          ) : (
            <>
              <T style={{ flex: 1, fontFamily: fonts.medium }}>{c.name}</T>
              <IconButton name="create-outline" label={`Rename ${c.name}`} tint="transparent" color={colors.teal} size={38} onPress={() => setEditing({ id: c.id, name: c.name })} />
              <IconButton name="trash-outline" label={`Delete ${c.name}`} tint="transparent" color={colors.red} size={38} onPress={() => run(() => api.del(`/super/course-categories/${c.id}`))} />
            </>
          )}
        </Row>
      ))}
      <Row gap={8}>
        <View style={{ flex: 1 }}><Input value={name} onChangeText={setName} placeholder="New category, eg. Akhlaq" accessibilityLabel="New category" /></View>
        <Button title="Add" icon="add" style={{ height: 50 }} disabled={!name.trim()} onPress={() => run(async () => { await api.post('/super/course-categories', { name: name.trim() }); setName(''); })} />
      </Row>
      {err ? <T style={{ color: colors.red }}>{err}</T> : null}
    </Sheet>
  );
}

/* ================= Live-only course: weekly timetable ================= */

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DURATIONS = ['30', '45', '60', '90', '120'];
/** "Mon 23 Nov · 7:00 PM" in the viewer's own time. */
export const liveWhen = (iso: string) => new Date(iso).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).replace(',', ' ·');

function DayPicker({ value, onChange }: { value: number[]; onChange: (d: number[]) => void }) {
  const all = value.length === 7;
  return (
    <Row gap={6} style={{ flexWrap: 'wrap' }}>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: all }} onPress={() => onChange(all ? [] : [0, 1, 2, 3, 4, 5, 6])}
        style={{ height: 36, paddingHorizontal: 12, borderRadius: 18, justifyContent: 'center', backgroundColor: all ? colors.violet : '#FFF', borderWidth: 1.5, borderColor: all ? colors.violet : colors.line }}>
        <T style={{ fontSize: 13, fontFamily: fonts.semibold, color: all ? '#FFF' : colors.ink }}>Every day</T>
      </Pressable>
      {[1, 2, 3, 4, 5, 6, 0].map((d) => {
        const on = value.includes(d);
        return (
          <Pressable key={d} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={DAY_SHORT[d]} onPress={() => onChange(on ? value.filter((x) => x !== d) : [...value, d])}
            style={{ width: 46, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? '#EEEBFB' : '#FFF', borderWidth: 1.5, borderColor: on ? colors.violet : colors.line }}>
            <T style={{ fontSize: 13, fontFamily: fonts.semibold, color: on ? colors.violet : colors.muted }}>{DAY_SHORT[d]}</T>
          </Pressable>
        );
      })}
    </Row>
  );
}

function SlotForm({ slot, onSave, onDelete, busy }: { slot?: LiveSlot; onSave: (s: { days: number[]; start_time: string; duration_min: number; title: string }) => void; onDelete?: () => void; busy: boolean }) {
  const [days, setDays] = useState<number[]>(slot?.days ?? [0, 1, 2, 3, 4, 5, 6]);
  const [time, setTime] = useState(slot?.start_time ?? '19:00');
  const [dur, setDur] = useState(String(slot?.duration_min ?? 60));
  const [title, setTitle] = useState(slot?.title ?? '');
  const changed = !slot || days.join() !== slot.days.join() || time !== slot.start_time || dur !== String(slot.duration_min) || title !== (slot.title ?? '');
  const ok = days.length > 0 && /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(time);
  return (
    <View style={{ gap: 10, borderRadius: 18, borderWidth: 1.5, borderColor: slot ? colors.line : colors.violet, borderStyle: slot ? 'solid' : 'dashed', padding: 12, backgroundColor: '#FFF' }}>
      <DayPicker value={days} onChange={setDays} />
      <Row gap={10} style={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <View style={{ width: 130 }}><Input label="Time (24 h)" value={time} onChangeText={(v) => setTime(v.replace(/[^0-9:]/g, '').slice(0, 5))} placeholder="19:00" accessibilityLabel="Start time" /></View>
        <View style={{ width: 150 }}><Select label="Length (minutes)" value={dur} options={DURATIONS.includes(dur) ? DURATIONS : [dur, ...DURATIONS]} onChange={setDur} /></View>
        <View style={{ flex: 1, minWidth: 180 }}><Input label="Name (optional)" value={title} onChangeText={setTitle} placeholder="eg. Weekend revision" /></View>
      </Row>
      <Row gap={8}>
        {changed ? <Button title={slot ? 'Save' : 'Add class time'} icon={slot ? 'checkmark' : 'add'} loading={busy} disabled={!ok} style={{ height: 42 }} onPress={() => onSave({ days, start_time: time, duration_min: parseInt(dur, 10), title })} /> : null}
        {onDelete ? <Button title="Remove" kind="ghost" icon="trash-outline" style={{ height: 42 }} onPress={onDelete} /> : null}
      </Row>
    </View>
  );
}

/** Super admin: class times of a live-only course and a preview of the next classes. */
export function LiveTimetable({ courseId }: { courseId: number }) {
  const data = useApi<BCourse>(`/super/courses/${courseId}`);
  const [c, setC] = useState<BCourse | null>(null);
  const [busy, setBusy] = useState<number | 'new' | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [err, setErr] = useState('');
  useEffect(() => { if (data.data) setC(data.data); }, [data.data]);
  if (!c) return <Panel title="Live class timetable"><Loading /></Panel>;
  const run = async (key: number | 'new', fn: () => Promise<BCourse>) => {
    setBusy(key); setErr('');
    try { setC(await fn()); if (key === 'new') setFormKey((k) => k + 1); } catch (e) { setErr(errText(e, 'Could not save.')); } finally { setBusy(null); }
  };
  return (
    <Panel title="Live class timetable" right={<T v="small">India time (IST)</T>} style={{ marginBottom: 100 }}>
      {c.live_summary ? <Card tint="#F1EDFF"><T style={{ fontFamily: fonts.semibold, color: colors.violet }}>{c.live_summary}</T></Card> : <T v="small">No class times yet. Add one below: every day, or the days you choose.</T>}
      {!c.meet_url ? <T v="small" style={{ color: colors.red }}>Add the meeting link above (Course details) and save, so students can join.</T> : null}
      {(c.live_slots ?? []).map((s) => (
        <SlotForm key={`${s.id}-${s.days.join()}-${s.start_time}-${s.duration_min}-${s.title}`} slot={s} busy={busy === s.id}
          onSave={(v) => run(s.id, () => api.put<BCourse>(`/super/course-live-slots/${s.id}`, v))}
          onDelete={() => run(s.id, () => api.del<BCourse>(`/super/course-live-slots/${s.id}`))} />
      ))}
      <T v="small" style={{ fontFamily: fonts.medium, marginTop: 4 }}>{c.live_slots?.length ? 'Add another class time' : 'Add a class time'}</T>
      <SlotForm key={`new-${formKey}`} busy={busy === 'new'} onSave={(v) => run('new', () => api.post<BCourse>(`/super/courses/${courseId}/live-slots`, v))} />
      {err ? <T style={{ color: colors.red }}>{err}</T> : null}
      {c.live_upcoming?.length ? (
        <View style={{ gap: 6, marginTop: 6 }}>
          <T v="h3">Next classes</T>
          {c.live_upcoming.map((u) => (
            <Row key={u.starts_at} gap={8}><Ionicons name={u.state === 'live' ? 'radio' : 'calendar-outline'} size={16} color={u.state === 'live' ? colors.red : colors.muted} />
              <T style={{ flex: 1 }}>{liveWhen(u.starts_at)}{u.title ? ` · ${u.title}` : ''}</T>{u.state === 'live' ? <Tag text="On now" tone="pink" /> : null}</Row>
          ))}
          <T v="small">Shown in your own time. Students in the Gulf see the same classes in their time.</T>
        </View>
      ) : null}
    </Panel>
  );
}

/* ================= Subjects & lessons (on the course page) ================= */

/** Lessons in the order students see them: lessons outside a subject first, then subject by subject. */
function groups(c: BCourse) {
  const loose = c.lessons.filter((l) => !l.subject_id || !c.subjects.some((s) => s.id === l.subject_id));
  return [{ subject: null as BSubject | null, lessons: loose }, ...c.subjects.map((s) => ({ subject: s as BSubject | null, lessons: c.lessons.filter((l) => l.subject_id === s.id) }))];
}

/** Subject picture so children recognise the subject; tap to upload or change. */
function SubjectThumb({ subject, onChange }: { subject: BSubject; onChange: (c: BCourse) => void }) {
  const [busy, setBusy] = useState(false);
  const pick = async () => {
    try {
      const f = await pickImage(); if (!f) return;
      setBusy(true); const fd = new FormData(); appendFile(fd, 'thumbnail', f);
      onChange(await api.post<BCourse>(`/super/course-subjects/${subject.id}/thumbnail`, fd));
    } catch (e) { demoNote(e instanceof ApiError ? e.friendly : e instanceof Error ? e.message : 'Could not upload.'); } finally { setBusy(false); }
  };
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${subject.thumbnail_url ? 'Change' : 'Add'} picture for ${subject.title}`} onPress={pick} disabled={busy}
      style={{ width: 44, height: 44, borderRadius: 12, overflow: 'hidden', backgroundColor: '#F1EDFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: subject.thumbnail_url ? colors.line : '#D9CCF7', borderStyle: subject.thumbnail_url ? 'solid' : 'dashed', opacity: busy ? 0.5 : 1 }}>
      {subject.thumbnail_url ? <Image source={{ uri: subject.thumbnail_url }} style={{ width: 44, height: 44 }} resizeMode="cover" /> : <Ionicons name="image-outline" size={20} color={colors.violet} />}
    </Pressable>
  );
}

export function CourseStructure({ course, onChange }: { course: BCourse; onChange: (c: BCourse) => void }) {
  const [newSubject, setNewSubject] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<BSubject | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const g = groups(course);
  const ordered = g.flatMap((x) => x.lessons);
  const number = (id: number) => ordered.findIndex((l) => l.id === id) + 1;
  const base = `/super/courses/${course.id}`;

  const reload = async () => onChange(await api.get<BCourse>(`/super/courses/${course.id}`));
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true); setErr('');
    try { await fn(); await reload(); } catch (e) { setErr(errText(e, 'Could not save.')); } finally { setBusy(false); }
  };
  const sendOrder = (lists: { subject: BSubject | null; lessons: BLesson[] }[], subjects = course.subjects) =>
    api.post<BCourse>(`/super/courses/${course.id}/order`, {
      subjects: subjects.map((s) => s.id),
      lessons: lists.flatMap((x) => x.lessons.map((l) => ({ id: l.id, subject_id: x.subject?.id ?? null }))),
    });
  const moveLesson = (gi: number, li: number, d: -1 | 1) => {
    const l = moved(g[gi].lessons, li, d);
    if (!l) return;
    run(() => sendOrder(g.map((x, k) => (k === gi ? { ...x, lessons: l } : x))));
  };
  const moveToSubject = (lesson: BLesson, sid: number | null) => run(() => api.put(`/super/course-lessons/${lesson.id}`, { subject_id: sid }));
  const moveSubject = (i: number, d: -1 | 1) => {
    const s = moved(course.subjects, i, d);
    if (s) run(() => sendOrder(g, s));
  };
  const addLesson = async (sid: number | null) => {
    setBusy(true); setErr('');
    try {
      const l = await api.post<BLesson>(`/super/courses/${course.id}/lessons`, { title: `Lesson ${course.lessons.length + 1}`, subject_id: sid });
      router.push(`${base}/lessons/${l.id}?new=1` as any);
      reload();
    } catch (e) { setErr(errText(e, 'Could not add the lesson.')); } finally { setBusy(false); }
  };
  const subjectOptions = [{ key: '0', label: course.subjects.length ? 'Not in a subject' : 'No subject' }, ...course.subjects.map((s) => ({ key: String(s.id), label: s.title }))];

  return (
    <Panel title="Subjects & lessons" right={<T v="small">{course.subjects.length ? `${plural(course.subjects.length, 'subject')} · ` : ''}{plural(course.lessons.length, 'lesson')}</T>} style={{ marginBottom: 100 }}>
      <T v="small">Subjects are optional. If the course has only one subject, just add lessons. Open a lesson to add its videos, audios, PDFs, HTML and notes.</T>
      <Row gap={8} style={{ flexWrap: 'wrap' }}>
        <Button title="Add lesson" icon="add" style={{ height: 44 }} loading={busy} onPress={() => addLesson(null)} />
        <Button title="Add subject" icon="folder-open-outline" kind="ghost" style={{ height: 44 }} onPress={() => setNewSubject('')} />
      </Row>
      {newSubject !== null ? (
        <Row gap={8}>
          <View style={{ flex: 1 }}><Input value={newSubject} onChangeText={setNewSubject} placeholder="Subject name, eg. Grammar" accessibilityLabel="Subject name" autoFocus /></View>
          <Button title="Save" style={{ height: 50 }} disabled={!newSubject.trim()} onPress={() => run(async () => { await api.post(`/super/courses/${course.id}/subjects`, { title: newSubject.trim() }); setNewSubject(null); })} />
          <IconButton name="close" label="Cancel" tint={colors.bg} size={44} onPress={() => setNewSubject(null)} />
        </Row>
      ) : null}
      {err ? <T style={{ color: colors.red }}>{err}</T> : null}

      {g.map((grp, gi) => {
        if (!grp.subject && !grp.lessons.length && course.subjects.length) return null;
        const si = grp.subject ? course.subjects.findIndex((s) => s.id === grp.subject!.id) : -1;
        return (
          <View key={grp.subject?.id ?? 'none'} style={{ gap: 10, ...(grp.subject ? { borderRadius: 22, backgroundColor: '#F6F3FF', padding: 12 } : null) }}>
            {grp.subject ? (
              renaming?.id === grp.subject.id ? (
                <Row gap={8}>
                  <View style={{ flex: 1 }}><Input value={renaming.title} onChangeText={(v) => setRenaming({ ...renaming, title: v })} accessibilityLabel="Subject name" /></View>
                  <IconButton name="checkmark" label="Save subject name" tint={colors.mint[0]} color={colors.mint[1]} size={40} onPress={() => run(async () => { await api.put(`/super/course-subjects/${renaming.id}`, { title: renaming.title.trim() }); setRenaming(null); })} />
                  <IconButton name="close" label="Cancel" tint="#FFF" size={40} onPress={() => setRenaming(null)} />
                </Row>
              ) : (
                <Row gap={6}>
                  <SubjectThumb subject={grp.subject} onChange={onChange} />
                  <T v="h3" style={{ flex: 1 }} numberOfLines={1}>{grp.subject.title}</T>
                  <T v="small">{plural(grp.lessons.length, 'lesson')}</T>
                  <IconButton name="chevron-up" label={`Move ${grp.subject.title} up`} tint="transparent" size={34} onPress={() => moveSubject(si, -1)} />
                  <IconButton name="chevron-down" label={`Move ${grp.subject.title} down`} tint="transparent" size={34} onPress={() => moveSubject(si, 1)} />
                  <IconButton name="create-outline" label={`Rename ${grp.subject.title}`} tint="transparent" color={colors.teal} size={34} onPress={() => setRenaming(grp.subject)} />
                  <IconButton name="trash-outline" label={`Delete ${grp.subject.title}`} tint="transparent" color={colors.red} size={34} onPress={() => setConfirm(`s${grp.subject!.id}`)} />
                </Row>
              )
            ) : course.subjects.length ? <T v="small" style={{ fontFamily: fonts.semibold }}>Not in a subject</T> : null}
            {grp.subject && confirm === `s${grp.subject.id}` ? (
              <Row gap={8} style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 10 }}>
                <T v="small" style={{ flex: 1 }}>Delete the subject “{grp.subject.title}”? Its lessons stay in the course.</T>
                <Button title="Delete" kind="danger" style={{ height: 38 }} onPress={() => { setConfirm(null); run(() => api.del(`/super/course-subjects/${grp.subject!.id}`)); }} />
                <Button title="Keep" kind="ghost" style={{ height: 38 }} onPress={() => setConfirm(null)} />
              </Row>
            ) : null}

            <Grid cols={{ phone: 1, tablet: 2, desktop: 3 }} gap={10}>
              {grp.lessons.map((l, li) => (
                <View key={l.id} style={{ backgroundColor: '#FFF', borderRadius: 20, borderWidth: 1.5, borderColor: '#D9CCF7', padding: 12, gap: 10, minHeight: 150 }}>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Open lesson ${number(l.id)}: ${l.title}`} onPress={() => router.push(`${base}/lessons/${l.id}` as any)} style={{ gap: 8, flex: 1 }}>
                    <Row gap={10}>
                      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.violet, alignItems: 'center', justifyContent: 'center' }}><T style={{ color: '#FFF', fontFamily: fonts.semibold }}>{number(l.id)}</T></View>
                      <T style={{ flex: 1, fontFamily: fonts.semibold }} numberOfLines={2}>{l.title}</T>
                    </Row>
                    <Row gap={4} style={{ flexWrap: 'wrap' }}>
                      {l.items.length ? l.items.slice(0, 10).map((it) => <TypeIcon key={it.id} kind={it.kind} size={26} />) : <T v="small" style={{ color: colors.red }}>No content yet · tap to add</T>}
                    </Row>
                    <Row gap={6}>
                      <T v="small" style={{ flex: 1 }}>{plural(l.items.length, 'item')}{l.duration ? ` · ${l.duration}` : ''}</T>
                      {l.free_preview ? <Tag text="Free preview" tone="mint" /> : null}
                    </Row>
                  </Pressable>
                  {confirm === `l${l.id}` ? (
                    <Row gap={6}>
                      <T v="small" style={{ flex: 1 }}>Delete this lesson and its content?</T>
                      <Button title="Delete" kind="danger" style={{ height: 36, paddingHorizontal: 10 }} onPress={() => { setConfirm(null); run(() => api.del(`/super/course-lessons/${l.id}`)); }} />
                      <Button title="Keep" kind="ghost" style={{ height: 36, paddingHorizontal: 10 }} onPress={() => setConfirm(null)} />
                    </Row>
                  ) : (
                    <Row gap={2} style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 6 }}>
                      <IconButton name="create-outline" label={`Edit ${l.title}`} tint="transparent" color={colors.teal} size={36} onPress={() => router.push(`${base}/lessons/${l.id}` as any)} />
                      <IconButton name="arrow-up" label={`Move ${l.title} up`} tint="transparent" size={36} onPress={() => moveLesson(gi, li, -1)} />
                      <IconButton name="arrow-down" label={`Move ${l.title} down`} tint="transparent" size={36} onPress={() => moveLesson(gi, li, 1)} />
                      <View style={{ flex: 1 }} />
                      {course.subjects.length ? <Select compact label={undefined} value={String(l.subject_id ?? 0)} options={subjectOptions} onChange={(v) => moveToSubject(l, Number(v) || null)} /> : null}
                      <IconButton name="trash-outline" label={`Delete ${l.title}`} tint="transparent" color={colors.red} size={36} onPress={() => setConfirm(`l${l.id}`)} />
                    </Row>
                  )}
                </View>
              ))}
              {grp.subject ? (
                <Pressable accessibilityRole="button" accessibilityLabel={`Add lesson to ${grp.subject.title}`} onPress={() => addLesson(grp.subject!.id)}
                  style={{ minHeight: 150, borderRadius: 20, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#B49CFF', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Ionicons name="add-circle-outline" size={26} color={colors.violet} /><T style={{ color: colors.violet, fontFamily: fonts.semibold }}>Add lesson</T>
                </Pressable>
              ) : null}
            </Grid>
          </View>
        );
      })}
      {!course.lessons.length && !course.subjects.length ? <T v="small" style={{ textAlign: 'center', paddingVertical: 12 }}>No lessons yet. Tap “Add lesson” to make the first one.</T> : null}

      {course.loose_items.length ? (
        <View style={{ gap: 8, borderRadius: 18, backgroundColor: '#FFF7E0', padding: 12 }}>
          <T style={{ fontFamily: fonts.semibold }}>Older content not in a lesson · {course.loose_items.length}</T>
          <T v="small">Move each one into a lesson, or remove it.</T>
          {course.loose_items.map((it) => (
            <Row key={it.id} gap={8}>
              <TypeIcon kind={it.kind} size={34} />
              <T style={{ flex: 1 }} numberOfLines={1}>{it.title}</T>
              {course.lessons.length ? <Select compact value={'0' as string} options={[{ key: '0', label: 'Move to…' }, ...ordered.map((l) => ({ key: String(l.id), label: `${number(l.id)}. ${l.title}` }))]}
                onChange={(v) => { if (+v) run(() => api.post(`/super/course-items/${it.id}/move`, { lesson_id: +v })); }} /> : null}
              <IconButton name="trash-outline" label={`Remove ${it.title}`} tint="transparent" color={colors.red} size={36} onPress={() => run(() => api.del(`/super/course-items/${it.id}`))} />
            </Row>
          ))}
        </View>
      ) : null}
    </Panel>
  );
}

/* ================= One lesson: details + content ================= */

export function LessonBuilderScreen() {
  const { id, lessonId, new: isNew } = useLocalSearchParams<{ id: string; lessonId: string; new?: string }>();
  const lesson = useApi<LessonDetail>(/^\d+$/.test(String(lessonId)) ? `/super/course-lessons/${lessonId}` : null);
  const course = useApi<BCourse>(/^\d+$/.test(String(id)) ? `/super/courses/${id}` : null);
  const [form, setForm] = useState<{ title: string; description: string; duration: string; free_preview: boolean; subject: string } | null>(null);
  const [saved, setSaved] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [sheet, setSheet] = useState<{ kind: ContentKind; item: BItem | null } | null>(null);
  const [confirm, setConfirm] = useState<number | null>(null);
  const back = () => router.replace(`/super/courses/${id}` as any);

  useEffect(() => {
    const l = lesson.data;
    if (l && !form) setForm({ title: isNew && /^Lesson \d+$/.test(l.title) ? '' : l.title, description: l.description ?? '', duration: l.duration ?? '', free_preview: l.free_preview, subject: String(l.subject_id ?? 0) });
  }, [lesson.data]); // eslint-disable-line react-hooks/exhaustive-deps

  if (lesson.loading && !lesson.data) return <Screen><Loading /></Screen>;
  if (!lesson.data || !form) return <Screen><ErrorBox message={lesson.error ?? 'This lesson was not found.'} onRetry={lesson.reload} /></Screen>;
  const l = lesson.data;
  const items = l.items;
  const dirty = form.title !== l.title || form.description !== (l.description ?? '') || form.duration !== (l.duration ?? '') || form.free_preview !== l.free_preview || form.subject !== String(l.subject_id ?? 0);
  const subjects = course.data?.subjects ?? [];
  const set = (k: keyof NonNullable<typeof form>) => (v: any) => { setSaved(''); setForm({ ...form, [k]: v }); };

  const saveDetails = async (then?: () => void) => {
    if (!form.title.trim()) { setErr('Give the lesson a title.'); return; }
    setBusy(true); setErr('');
    try {
      await api.put(`/super/course-lessons/${l.id}`, { title: form.title.trim(), description: form.description.trim() || null, duration: form.duration.trim() || null, free_preview: form.free_preview, subject_id: Number(form.subject) || null });
      await lesson.reload();
      setSaved('Saved.');
      then?.();
    } catch (e) { setErr(errText(e, 'Could not save the lesson.')); } finally { setBusy(false); }
  };
  const reorder = async (i: number, d: -1 | 1) => {
    const list = moved(items, i, d);
    if (!list) return;
    lesson.setData({ ...l, items: list });
    try { await api.post(`/super/course-lessons/${l.id}/order`, { items: list.map((x) => x.id) }); } catch (e) { setErr(errText(e, 'Could not move it.')); lesson.reload(); }
  };
  const remove = async (itemId: number) => {
    setConfirm(null);
    try { await api.del(`/super/course-items/${itemId}`); lesson.reload(); } catch (e) { setErr(errText(e, 'Could not remove it.')); }
  };

  return (
    <Screen overlay={<BottomActions>
      <Pressable accessibilityRole="button" onPress={() => (dirty ? saveDetails(back) : back())} style={{ height: 56, paddingHorizontal: 20, borderRadius: 28, backgroundColor: '#FFF', borderWidth: 1.5, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons name="grid-outline" size={18} color={colors.ink} /><T style={{ fontFamily: fonts.semibold }}>All lessons</T>
      </Pressable>
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => saveDetails()} style={{ flex: 1, height: 56, borderRadius: 28, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.7 : 1 }}>
        <T style={{ color: '#FFF', fontFamily: fonts.semibold }}>{busy ? 'Saving…' : dirty ? 'Save lesson' : saved || 'Saved'}</T>
      </Pressable>
    </BottomActions>}>
      <Row gap={10}>
        <IconButton name="chevron-back" label="Back to the course" size={44} onPress={() => (dirty ? saveDetails(back) : back())} />
        <View style={{ flex: 1 }}>
          <T v="small" numberOfLines={1}>{l.course.title}{l.subject ? ` · ${l.subject.title}` : ''}</T>
          <T v="h1">Lesson {l.number}</T>
        </View>
        <Tag text={`${items.length} items`} tone="mint" />
      </Row>

      <Panel title="Lesson details">
        <Input label="Lesson title" value={form.title} onChangeText={set('title')} placeholder="eg. Letters ا to ح" autoFocus={!!isNew} />
        <Input label="What students will learn (optional)" value={form.description} onChangeText={set('description')} multiline />
        <Row gap={10}>
          <Input label="Duration (optional)" value={form.duration} onChangeText={set('duration')} placeholder="eg. 30 min" />
          {subjects.length ? <Select label="Subject" value={form.subject} options={[{ key: '0', label: 'Not in a subject' }, ...subjects.map((s) => ({ key: String(s.id), label: s.title }))]} onChange={set('subject')} /> : null}
        </Row>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}><T style={{ fontSize: 14 }}>Free preview</T><T v="small">Anyone can open this lesson before joining the course.</T></View>
          <Switch value={form.free_preview} onValueChange={set('free_preview')} trackColor={{ true: colors.green, false: '#C3D3D8' }} thumbColor="#FFF" accessibilityLabel="Free preview" />
        </Row>
        {err ? <T style={{ color: colors.red }}>{err}</T> : null}
      </Panel>

      <Panel title="Lesson content" right={<T v="small">students see it in this order</T>} style={{ marginBottom: 100 }}>
        {items.map((it, i) => (
          <View key={it.id} style={{ borderRadius: 18, borderWidth: 1.5, borderColor: '#D9CCF7', padding: 10, gap: 6 }}>
            <Row gap={10}>
              <T style={{ width: 20, textAlign: 'center', fontFamily: fonts.semibold, color: colors.muted }}>{i + 1}</T>
              <TypeIcon kind={it.kind} size={40} />
              <View style={{ flex: 1 }}>
                <T style={{ fontFamily: fonts.semibold }} numberOfLines={1}>{it.title}</T>
                <T v="small" numberOfLines={1}>{kindLabel(it.kind)}{itemSummary(it)}</T>
              </View>
              <IconButton name="arrow-up" label={`Move ${it.title} up`} tint="transparent" size={34} onPress={() => reorder(i, -1)} />
              <IconButton name="arrow-down" label={`Move ${it.title} down`} tint="transparent" size={34} onPress={() => reorder(i, 1)} />
            </Row>
            {confirm === it.id ? (
              <Row gap={6}><T v="small" style={{ flex: 1 }}>Remove “{it.title}”?</T><Button title="Remove" kind="danger" style={{ height: 36, paddingHorizontal: 10 }} onPress={() => remove(it.id)} /><Button title="Keep" kind="ghost" style={{ height: 36, paddingHorizontal: 10 }} onPress={() => setConfirm(null)} /></Row>
            ) : (
              <Row gap={2} style={{ paddingLeft: 30 }}>
                <IconButton name="create-outline" label={`Edit ${it.title}`} tint="transparent" color={colors.teal} size={34} onPress={() => setSheet({ kind: it.kind, item: it })} />
                {canOpen(it) ? <IconButton name="eye-outline" label={`Open ${it.title}`} tint="transparent" color={colors.violet} size={34} onPress={() => openContent(it)} /> : null}
                <View style={{ flex: 1 }} />
                <IconButton name="trash-outline" label={`Remove ${it.title}`} tint="transparent" color={colors.red} size={34} onPress={() => setConfirm(it.id)} />
              </Row>
            )}
          </View>
        ))}
        {!items.length ? <T v="small" style={{ textAlign: 'center', paddingVertical: 8 }}>Nothing here yet. Add the lesson's content below.</T> : null}
        <T v="small" style={{ fontFamily: fonts.medium }}>Add content</T>
        <TileRows cols={4} gap={8}>
          {KINDS.map(({ kind, label }) => {
            const [bg, ink] = contentType[kind];
            return (
              <Pressable key={kind} accessibilityRole="button" accessibilityLabel={`Add ${label}`} onPress={() => setSheet({ kind, item: null })} style={{ height: 68, borderRadius: 16, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <TypeIcon kind={kind} size={28} /><T style={{ fontSize: 12, fontFamily: fonts.semibold, color: ink }}>{label}</T>
              </Pressable>
            );
          })}
        </TileRows>
      </Panel>
      <ContentViewerHost />
      {sheet ? <ItemSheet lessonId={l.id} kind={sheet.kind} item={sheet.item} onClose={() => setSheet(null)} onSaved={(again) => { lesson.reload(); setSheet(again ? { kind: sheet.kind, item: null } : null); }} /> : null}
    </Screen>
  );
}

function itemSummary(it: BItem) {
  if (it.kind === 'live') return it.starts_at ? ` · ${new Date(it.starts_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}` : ' · no date yet';
  if (it.kind === 'note') return it.body ? ` · ${it.body.slice(0, 60)}` : '';
  if (it.kind === 'html') return it.has_file ? ` · ${fileSize(it.file_size) || 'saved'}` : '';
  if (it.file_size) return ` · ${fileSize(it.file_size)}`;
  return it.url ? ` · ${it.url.replace(/^https?:\/\//, '').slice(0, 40)}` : '';
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Add or edit one piece of content. Audios etc. can be added one after another. */
function ItemSheet({ lessonId, kind, item, onClose, onSaved }: { lessonId: number; kind: ContentKind; item: BItem | null; onClose: () => void; onSaved: (again: boolean) => void }) {
  const info = KINDS.find((k) => k.kind === kind) ?? { kind, label: kindLabel(kind), hint: '', link: true };
  const start = item?.starts_at ? new Date(item.starts_at) : null;
  const [title, setTitle] = useState(item?.title ?? '');
  const [url, setUrl] = useState(item?.url ?? '');
  const [body, setBody] = useState(item?.body ?? '');
  const [date, setDate] = useState(start ? `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}` : '');
  const [time, setTime] = useState(start ? `${pad(start.getHours())}:${pad(start.getMinutes())}` : '');
  const [file, setFile] = useState<Picked | null>(null);
  const [src, setSrc] = useState<'file' | 'link' | 'code'>(info.file ? 'file' : kind === 'note' ? 'code' : 'link');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const pick = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: info.accept ?? '*/*', copyToCacheDirectory: true });
    const f = r.canceled ? null : r.assets?.[0];
    if (!f) return;
    setFile(f as any);
    if (!title.trim()) setTitle((f.name ?? '').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 160));
  };
  const save = async (again: boolean) => {
    if (!title.trim()) return setErr('Give it a title.');
    if (kind === 'live' && (!date || !time)) return setErr('Pick the date and time of the live class.');
    if (!item) {
      if (src === 'file' && info.file && !file) return setErr('Choose the file to upload.');
      if (src === 'link' && info.link && kind !== 'live' && !url.trim()) return setErr('Paste the link.');
      if (src === 'code' && !body.trim()) return setErr(kind === 'note' ? 'Write the note.' : 'Paste the HTML code.');
    }
    setBusy(true); setErr('');
    try {
      await saveItem(lessonId, item?.id ?? null, {
        kind, title: title.trim(),
        url: src === 'link' ? url.trim() : undefined,
        body: src === 'code' ? body : undefined,
        starts_at: kind === 'live' ? new Date(`${date}T${time}`).toISOString() : undefined,
      }, src === 'file' ? file : null);
      if (again) { setTitle(''); setUrl(''); setBody(''); setFile(null); }
      onSaved(again);
    } catch (e) { setErr(errText(e, 'Could not save.')); } finally { setBusy(false); }
  };
  const sources: { key: 'file' | 'link' | 'code'; label: string }[] = [
    ...(info.file ? [{ key: 'file' as const, label: kind === 'html' ? 'Upload .html file' : 'Upload file' }] : []),
    ...(kind === 'html' ? [{ key: 'code' as const, label: 'Paste HTML code' }] : []),
    ...(info.link && kind !== 'live' && info.file ? [{ key: 'link' as const, label: 'Paste a link' }] : []),
  ];

  return (
    <Sheet title={`${item ? 'Edit' : 'Add'} ${info.label.toLowerCase()}`} onClose={onClose}>
      <Row gap={10}><TypeIcon kind={kind} size={40} /><T v="small" style={{ flex: 1 }}>{info.hint}</T></Row>
      <Input label="Title" value={title} onChangeText={setTitle} placeholder={kind === 'audio' ? 'eg. Listen and repeat: ba, ta, tha' : 'Title students see'} />
      {sources.length > 1 ? <ChoiceChips value={src} onChange={setSrc} options={sources} /> : null}
      {src === 'file' && info.file ? (
        <Pressable accessibilityRole="button" onPress={pick} style={{ minHeight: 64, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.teal, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 }}>
          <Ionicons name="cloud-upload-outline" size={24} color={colors.teal} />
          <View style={{ flex: 1 }}>
            <T style={{ fontFamily: fonts.semibold, color: colors.teal }} numberOfLines={1}>{file ? file.name : item?.has_file || item?.url ? 'Replace the file' : 'Choose file'}</T>
            <T v="small">{file ? fileSize(file.size) : kind === 'video' ? 'MP4, MOV or WEBM · large videos: a YouTube link is faster' : kind === 'audio' ? 'MP3, M4A, AAC, OGG or WAV' : kind === 'html' ? 'One .html file, up to 20 MB' : kind === 'pdf' ? 'PDF, up to 50 MB' : 'JPG, PNG or WEBP'}</T>
          </View>
        </Pressable>
      ) : null}
      {src === 'link' || kind === 'live' || (kind === 'link') ? (
        <Input label={kind === 'live' ? 'Meeting link (optional)' : kind === 'video' ? 'Video link (YouTube or other)' : 'Link'} value={url} onChangeText={setUrl} placeholder="https://" autoCapitalize="none" keyboardType="url" />
      ) : null}
      {src === 'code' ? (
        <Input label={kind === 'note' ? 'Note' : 'HTML code'} value={body} onChangeText={setBody} multiline placeholder={kind === 'note' ? 'Write the class note…' : item?.has_file ? 'Paste new code to replace the saved one' : '<!DOCTYPE html>…'}
          style={{ minHeight: kind === 'html' ? 200 : 140, fontFamily: kind === 'html' ? (Platform.OS === 'web' ? 'monospace' : undefined) : undefined, fontSize: kind === 'html' ? 13 : 15 }} />
      ) : null}
      {kind === 'live' ? <Row gap={10}><DateInput label="Date" value={date} onChange={setDate} /><DateInput label="Time" mode="time" value={time} onChange={setTime} /></Row> : null}
      {err ? <T style={{ color: colors.red }}>{err}</T> : null}
      <Row gap={8}>
        {!item && kind !== 'live' && kind !== 'note' ? <Button title="Save & add another" kind="ghost" style={{ flex: 1 }} loading={busy} onPress={() => save(true)} /> : null}
        <Button title={item ? 'Save changes' : 'Save'} style={{ flex: 1 }} loading={busy} onPress={() => save(false)} />
      </Row>
    </Sheet>
  );
}

/* ================= Opening content (all roles) ================= */

const canOpen = (it: BItem) => (it.kind === 'html' ? !!it.has_file : it.kind === 'note' ? !!it.body : !!it.url);

let showViewer: ((v: Viewer) => void) | null = null;
type Viewer = { title: string; kind: 'html' | 'note' | 'image'; src: string };

/** Open a content item: HTML runs in a sandbox, notes and images show in the app, the rest open their link. */
export async function openContent(it: { id: number; kind: ContentKind; title: string; url?: string | null; body?: string | null }) {
  try {
    if (it.kind === 'html') {
      const r = await api.get<{ url: string }>(`/course-items/${it.id}/open`);
      if (Platform.OS === 'web' && showViewer) showViewer({ title: it.title, kind: 'html', src: r.url });
      else Linking.openURL(r.url);
      return;
    }
    if (it.kind === 'note') { if (showViewer && it.body) showViewer({ title: it.title, kind: 'note', src: it.body }); return; }
    if (it.kind === 'image' && it.url && showViewer) { showViewer({ title: it.title, kind: 'image', src: it.url }); return; }
    if (it.url && it.url !== '#') Linking.openURL(it.url);
  } catch (e) {
    demoNote(errText(e, 'This lesson can not be opened right now.'));
  }
}

/** Mount once on a screen that opens content (full-screen viewer for HTML / notes / images). */
export function ContentViewerHost() {
  const [v, setV] = useState<Viewer | null>(null);
  useEffect(() => { showViewer = setV; return () => { if (showViewer === setV) showViewer = null; }; }, []);
  if (!v) return null;
  return (
    <Modal animationType="slide" onRequestClose={() => setV(null)}>
      <View style={{ flex: 1, backgroundColor: v.kind === 'html' ? '#0E1B33' : colors.bg }}>
        <Row gap={10} style={{ height: 60, paddingHorizontal: 12 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => setV(null)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: v.kind === 'html' ? 'rgba(255,255,255,0.12)' : '#FFF', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="close" size={22} color={v.kind === 'html' ? '#FFF' : colors.ink} />
          </Pressable>
          <T numberOfLines={1} style={{ flex: 1, fontFamily: fonts.semibold, fontSize: 17, color: v.kind === 'html' ? '#FFF' : colors.ink }}>{v.title}</T>
        </Row>
        {v.kind === 'html' ? (
          <View style={{ flex: 1 }}>{React.createElement('iframe', {
            src: v.src, title: v.title,
            // No allow-same-origin: the page gets its own blank origin and can't touch the app or its login.
            sandbox: 'allow-scripts allow-pointer-lock allow-modals allow-forms',
            allow: 'autoplay; fullscreen', allowFullScreen: true,
            style: { width: '100%', height: '100%', border: 0, background: '#FFF', display: 'block' },
          })}</View>
        ) : v.kind === 'image' ? (
          <View style={{ flex: 1, padding: 12 }}>{Platform.OS === 'web'
            ? React.createElement('img', { src: v.src, alt: v.title, style: { width: '100%', height: '100%', objectFit: 'contain' } })
            : <Button title="Open image" onPress={() => Linking.openURL(v.src)} />}</View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 20, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
            <Card><T style={{ fontSize: 16, lineHeight: 26 }}>{v.src}</T></Card>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

/* ================= Bottom sheet ================= */

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close" style={{ flex: 1, backgroundColor: 'rgba(16,48,58,0.35)' }} onPress={onClose} />
      <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, width: '100%', maxWidth: 640, alignSelf: 'center', maxHeight: '88%' }}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }} keyboardShouldPersistTaps="handled">
          <Row><T v="h2" style={{ flex: 1 }}>{title}</T><IconButton name="close" label="Close" tint={colors.bg} size={38} onPress={onClose} /></Row>
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

