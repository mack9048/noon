// Institution admin: a student's enrolments — Madrasa Support (board / syllabus / class) and courses.
import React, { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Row, T } from '@/components/ui';
import { Panel } from '@/components/kit2';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { confirmBox, say } from '@/lib/dialog';
import type { Board, SchoolClass, SyllabusKey } from '@/lib/types';
import { colors, fonts } from '@/theme/tokens';

export type Placement = { board: Board | null; syllabus: SyllabusKey; cls: SchoolClass | null };

/** Board (with logo) → syllabus → class, from the Madrasa Support catalogue. */
export function MadrasaPicker({ value, onChange }: { value: Placement; onChange: (p: Placement) => void }) {
  const boards = useApi<Board[]>('/boards');
  const classes = useApi<SchoolClass[]>(value.board ? `/boards/${value.board.id}/classes?syllabus=${value.syllabus}` : null);
  const chip = (on: boolean) => ({ minHeight: 44, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1.5, borderColor: on ? colors.teal : colors.line, backgroundColor: on ? '#E6F4F1' : '#FFF', flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 });
  return (
    <View style={{ gap: 10 }}>
      <T v="small" style={{ fontFamily: fonts.medium }}>Board</T>
      <Row gap={8} style={{ flexWrap: 'wrap' }}>
        {(boards.data ?? []).map((b) => {
          const on = value.board?.id === b.id;
          return (
            <Pressable key={b.id} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={b.full_name ?? b.name} onPress={() => onChange({ ...value, board: b, cls: null })} style={chip(on)}>
              {b.logo_url ? <Image source={{ uri: b.logo_url }} style={{ width: 28, height: 28 }} resizeMode="contain" /> : null}
              <View><T style={{ fontFamily: fonts.semibold }}>{b.name}</T>{b.full_name ? <T v="small" numberOfLines={1} style={{ maxWidth: 220 }}>{b.full_name}</T> : null}</View>
            </Pressable>
          );
        })}
      </Row>
      <T v="small" style={{ fontFamily: fonts.medium }}>Syllabus</T>
      <Row gap={8} style={{ flexWrap: 'wrap' }}>
        {([['general', 'General Madrasa Syllabus'], ['english', 'English Medium Madrasa Syllabus']] as const).map(([k, label]) => (
          <Pressable key={k} accessibilityRole="button" accessibilityState={{ selected: value.syllabus === k }} onPress={() => onChange({ ...value, syllabus: k, cls: null })} style={chip(value.syllabus === k)}>
            <T style={{ fontFamily: fonts.medium }}>{label}</T>
          </Pressable>
        ))}
      </Row>
      {value.board ? (
        <>
          <T v="small" style={{ fontFamily: fonts.medium }}>Class</T>
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            {(classes.data ?? []).map((c) => {
              const on = value.cls?.id === c.id;
              return (
                <Pressable key={c.id} accessibilityRole="button" accessibilityLabel={`Class ${c.label}`} accessibilityState={{ selected: on }} onPress={() => onChange({ ...value, cls: c })}
                  style={{ minWidth: 46, height: 44, paddingHorizontal: 10, borderRadius: 14, backgroundColor: on ? colors.teal : '#FFF', borderWidth: 1.5, borderColor: on ? colors.teal : colors.line, alignItems: 'center', justifyContent: 'center' }}>
                  <T style={{ fontFamily: fonts.semibold, color: on ? '#FFF' : colors.ink }}>{c.label}</T>
                </Pressable>
              );
            })}
            {classes.data && !classes.data.length ? <T v="small">No classes in this syllabus yet.</T> : null}
          </Row>
        </>
      ) : null}
    </View>
  );
}

type CourseLite = { id: number; title: string; category: string; format: 'recorded' | 'live'; is_free: boolean };
export type Enrollments = {
  madrasa: { board_id: number; board: string; board_code: string; syllabus: SyllabusKey; syllabus_label: string; class_id: number; class_label: string } | null;
  courses: (CourseLite & { progress: number; paid: boolean; enrolled_at: string | null })[];
  available: CourseLite[];
};

const fail = (e: unknown) => say(e instanceof ApiError ? e.friendly : 'Could not save.');

/** The institution's enabled courses as checkboxes (for a new student). */
export function CoursePicker({ value, onChange }: { value: number[]; onChange: (ids: number[]) => void }) {
  const list = useApi<(CourseLite & { enabled?: boolean; status?: string })[]>('/courses');
  const courses = (list.data ?? []).filter((c) => c.enabled && c.status !== 'draft');
  if (list.loading) return <T v="small">Loading courses…</T>;
  if (!courses.length) return <T v="small">No courses switched on yet. Switch courses on in More → Courses, then add them here.</T>;
  return (
    <View style={{ gap: 8 }}>
      {courses.map((c) => {
        const on = value.includes(c.id);
        return (
          <Pressable key={c.id} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={c.title} onPress={() => onChange(on ? value.filter((x) => x !== c.id) : [...value, c.id])}
            style={{ minHeight: 48, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1.5, borderColor: on ? colors.violet : colors.line, backgroundColor: on ? '#F1EDFF' : '#FFF', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name={on ? 'checkbox' : 'square-outline'} size={20} color={on ? colors.violet : colors.muted} />
            <View style={{ flex: 1 }}><T style={{ fontFamily: fonts.medium }}>{c.title}</T><T v="small">{c.category}{c.format === 'live' ? ' · Live classes' : ''}</T></View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Student record: Madrasa Support placement and courses, with add / remove. */
export function EnrollmentsPanel({ studentId }: { studentId: number | string }) {
  const { data, setData } = useApi<Enrollments>(`/admin/students/${studentId}/enrollments`);
  const [editing, setEditing] = useState(false);
  const [pick, setPick] = useState<Placement>({ board: null, syllabus: 'general', cls: null });
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!data) return <Panel title="ENROLMENTS"><T v="small">Loading…</T></Panel>;
  const run = async (fn: () => Promise<Enrollments>) => { setBusy(true); try { setData(await fn()); } catch (e) { fail(e); } finally { setBusy(false); } };
  const savePlacement = () => {
    if (!pick.board || !pick.cls) return say('Choose the board, syllabus and class.');
    run(() => api.put<Enrollments>(`/admin/students/${studentId}/madrasa`, { board_id: pick.board!.id, syllabus: pick.syllabus, class_id: pick.cls!.id })).then(() => setEditing(false));
  };
  const leave = async () => {
    if (!(await confirmBox('Remove this student from Madrasa Support? Their courses stay.'))) return;
    run(() => api.put<Enrollments>(`/admin/students/${studentId}/madrasa`, { remove: true }));
  };
  const removeCourse = async (id: number, title: string) => {
    if (!(await confirmBox(`Remove ${title} from this student? Their progress in it is kept if you add it again later.`))) return;
    run(() => api.del<Enrollments>(`/admin/students/${studentId}/courses/${id}`));
  };
  const m = data.madrasa;
  return (
    <>
      <Panel title="MADRASA SUPPORT" right={!editing ? <Pressable onPress={() => setEditing(true)}><T v="small" style={{ color: colors.teal, fontFamily: fonts.semibold }}>{m ? 'Change' : 'Add'}</T></Pressable> : undefined}>
        {editing ? (
          <View style={{ gap: 12 }}>
            <MadrasaPicker value={pick} onChange={setPick} />
            <Row gap={8}>
              <Button title="Save" icon="checkmark-circle-outline" loading={busy} onPress={savePlacement} />
              <Button title="Cancel" kind="ghost" onPress={() => setEditing(false)} />
            </Row>
          </View>
        ) : m ? (
          <Row gap={10} style={{ alignItems: 'center' }}>
            <Ionicons name="school-outline" size={22} color={colors.teal} />
            <View style={{ flex: 1 }}><T style={{ fontFamily: fonts.semibold }}>{m.board} · Class {m.class_label}</T><T v="small">{m.syllabus_label}</T></View>
            <Pressable onPress={leave} disabled={busy}><T v="small" style={{ color: colors.red }}>Remove</T></Pressable>
          </Row>
        ) : <T v="small">Not in Madrasa Support. Add a board, syllabus and class only if this student follows the madrasa textbooks.</T>}
      </Panel>
      <Panel title="COURSES" right={<T v="small">{data.courses.length}</T>} style={{ marginBottom: 30 }}>
        {data.courses.map((c) => (
          <Row key={c.id} gap={10} style={{ alignItems: 'center' }}>
            <View style={{ flex: 1 }}><T style={{ fontFamily: fonts.medium }}>{c.title}</T><T v="small">{c.category} · {c.progress}% done{c.paid || c.is_free ? '' : ' · free trial'}</T></View>
            <Pressable accessibilityLabel={`Remove ${c.title}`} onPress={() => removeCourse(c.id, c.title)} disabled={busy}><Ionicons name="close-circle-outline" size={22} color={colors.red} /></Pressable>
          </Row>
        ))}
        {!data.courses.length ? <T v="small">No courses yet.</T> : null}
        {adding ? (
          <View style={{ gap: 8 }}>
            {data.available.length ? data.available.map((c) => (
              <Pressable key={c.id} accessibilityRole="button" accessibilityLabel={`Add ${c.title}`} disabled={busy} onPress={() => run(() => api.post<Enrollments>(`/admin/students/${studentId}/courses`, { course_id: c.id }))}
                style={{ minHeight: 46, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1.5, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="add-circle-outline" size={20} color={colors.teal} />
                <View style={{ flex: 1 }}><T style={{ fontFamily: fonts.medium }}>{c.title}</T><T v="small">{c.category}</T></View>
              </Pressable>
            )) : <T v="small">All courses switched on for your institution are added. Switch on more in More → Courses.</T>}
            <Button title="Done" kind="ghost" onPress={() => setAdding(false)} />
          </View>
        ) : <Button title="Add course" icon="add" kind="ghost" onPress={() => setAdding(true)} />}
      </Panel>
    </>
  );
}
