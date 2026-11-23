// Course Management (super admin, institution admins, teachers) and institution Meetings.
import React, { useEffect, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Card, Empty, Grid, Header, IconButton, Loading, Row, Screen, Segmented, T } from '@/components/ui';
import { ChoiceChips, DateInput, Input, Panel } from '@/components/kit2';
import { Tag } from '@/components/kit';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/lib/auth';
import { useManage } from '@/lib/manage';
import { confirmBox, say } from '@/lib/dialog';
import { appendFile, pickImage } from '@/lib/pickImage';
import { joinLiveCourse } from '@/lib/liveJoin';
import type { BCourse, BItem, LiveClassRow } from '@/lib/courseBuilder';
import { CourseStructure, LiveTimetable, ReviewTag } from './courseBuilder';
import { setLivePass, type LivePass } from './liveRoom';
import { colors, fonts } from '@/theme/tokens';

const fail = (e: unknown, f: string) => say(e instanceof ApiError ? e.friendly : f);

type ManageRow = {
  id: number; title: string; category: string; status: string; format: 'recorded' | 'live'; thumbnail_url: string | null; logo_url: string | null; cover: string | null;
  lessons_count: number; live_classes: number; mode: 'full' | 'review' | null; can_approve: boolean; pending: number; owner: 'institution' | 'noon';
};
const STATUS: Record<string, [string, 'mint' | 'butter' | 'pink' | 'sky']> = {
  published: ['Published', 'mint'], draft: ['Draft', 'sky'], pending: ['Waiting for Noon Learn', 'butter'], changes: ['Changes asked', 'pink'], rejected: ['Not approved', 'pink'],
};

/* ================= The "Courses" folder ================= */
export function ManageCoursesScreen() {
  const M = useManage();
  const { data, loading, reload } = useApi<ManageRow[]>(`${M.api}/courses`);
  const [filter, setFilter] = useState<'all' | 'published' | 'draft' | 'waiting'>('all');
  useEffect(() => { reload(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = (data ?? []).filter((c) => filter === 'all' || (filter === 'waiting' ? c.pending > 0 || c.status === 'pending' : c.status === filter));
  const newHref = M.role === 'super' ? '/super/courses/new' : M.role === 'admin' ? '/admin/courses/new' : null;
  const open = (c: ManageRow) => (c.mode ? router.push(M.route(c.id) as any) : say(c.status === 'pending' ? 'Noon Learn is checking this course. You can add its content once it is approved.' : 'You cannot edit this course.'));
  return (
    <Screen>
      <Header title="Course management" subtitle={M.role === 'teacher' ? 'Courses you teach. Your changes go to the admin for approval.' : 'Open a course to add lessons, content and live classes'}
        right={newHref ? <Button title="New course" icon="add" style={{ height: 42 }} onPress={() => router.push(newHref as any)} /> : undefined} />
      <ChoiceChips value={filter} onChange={setFilter} options={[{ key: 'all', label: `All · ${data?.length ?? 0}` }, { key: 'published', label: 'Published' }, { key: 'draft', label: 'Drafts' }, { key: 'waiting', label: 'Waiting' }]} />
      <View style={{ marginTop: 14 }}>
        {loading && !data ? <Loading /> : !rows.length ? <Empty text={M.role === 'teacher' ? 'No courses yet. The admin adds you as the teacher of a course.' : 'No courses here yet.'} /> : (
          <Grid cols={{ phone: 1, tablet: 2, desktop: 3 }} gap={14}>
            {rows.map((c) => {
              const [label, tone] = STATUS[c.status] ?? [c.status, 'sky'];
              return (
                <Pressable key={c.id} accessibilityRole="button" accessibilityLabel={`Open ${c.title}`} onPress={() => open(c)} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
                  <View style={{ backgroundColor: '#FFF', borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: colors.line }}>
                    <LinearGradient colors={[c.cover || '#8B5CF6', '#B49CFF']} style={{ height: 120, padding: 12, justifyContent: 'space-between' }}>
                      {c.thumbnail_url ? <Image source={{ uri: c.thumbnail_url }} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} resizeMode="cover" /> : <Ionicons name="folder-open" size={44} color="rgba(255,255,255,0.85)" />}
                      <Row gap={6} style={{ flexWrap: 'wrap' }}>
                        <Tag text={label} tone={tone} />
                        {c.pending ? <Tag text={`${c.pending} change${c.pending > 1 ? 's' : ''} to review`} tone="butter" /> : null}
                      </Row>
                    </LinearGradient>
                    <View style={{ padding: 14, gap: 4 }}>
                      <T style={{ fontFamily: fonts.semibold, fontSize: 16 }} numberOfLines={1}>{c.title}</T>
                      <T v="small">{c.category} · {c.format === 'live' ? `${c.live_classes} live classes` : `${c.lessons_count} lessons`}{c.owner === 'noon' && M.role !== 'super' ? ' · Noon Learn course' : ''}</T>
                      <Row gap={6} style={{ marginTop: 6 }}>
                        <Ionicons name={c.mode === 'review' ? 'shield-checkmark-outline' : c.mode ? 'create-outline' : 'lock-closed-outline'} size={15} color={colors.muted} />
                        <T v="small">{c.mode === 'review' ? 'You edit · admin approves' : c.mode ? 'You can edit everything' : 'Not editable yet'}</T>
                      </Row>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </Grid>
        )}
      </View>
    </Screen>
  );
}

/* ================= One course ================= */
export function ManageCourseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const M = useManage();
  const { data, setData, reload, error } = useApi<BCourse>(`${M.api}/courses/${id}`);
  const [tab, setTab] = useState<'content' | 'classes' | 'timetable' | 'review' | 'details'>('content');
  useEffect(() => { if (data?.format === 'live' && tab === 'content') setTab('classes'); }, [data?.format]); // eslint-disable-line react-hooks/exhaustive-deps
  if (error) return <Screen><Header title="Course" /><Empty text={error} /></Screen>;
  if (!data) return <Screen><Loading /></Screen>;
  const full = data.manage_mode !== 'review';
  const live = data.format === 'live';
  const tabs = [
    ...(live ? [{ key: 'classes' as const, label: 'Live classes' }, { key: 'timetable' as const, label: 'Weekly times' }] : [{ key: 'content' as const, label: 'Lessons & content' }]),
    { key: 'review' as const, label: full ? `Approvals${data.pending_count ? ` · ${data.pending_count}` : ''}` : `My changes${data.pending_count ? ` · ${data.pending_count}` : ''}` },
    ...(full ? [{ key: 'details' as const, label: 'Details' }] : []),
  ];
  const [label, tone] = STATUS[data.status] ?? [data.status, 'sky'];
  return (
    <Screen>
      <Row gap={12} style={{ alignItems: 'center' }}>
        <View style={{ width: 54, height: 54, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.lav[0], alignItems: 'center', justifyContent: 'center' }}>
          {data.thumbnail_url ? <Image source={{ uri: data.thumbnail_url }} style={{ width: 54, height: 54 }} /> : <Ionicons name="school" size={24} color={colors.violet} />}
        </View>
        <View style={{ flex: 1 }}>
          <T v="h2" numberOfLines={1}>{data.title}</T>
          <Row gap={6}><Tag text={label} tone={tone} />{!full ? <Tag text="Changes need approval" tone="butter" /> : null}</Row>
        </View>
        {M.role === 'super' ? <Button title="Edit details & price" kind="ghost" icon="create-outline" style={{ height: 42 }} onPress={() => router.push(`/super/courses/${data.id}` as any)} /> : null}
      </Row>
      <View style={{ marginTop: 14 }}><Segmented value={tab} onChange={setTab} options={tabs} /></View>
      <View style={{ marginTop: 14 }}>
        {tab === 'content' ? <CourseStructure course={data} onChange={setData} />
          : tab === 'classes' ? <LiveClassList course={data} />
          : tab === 'timetable' ? <LiveTimetable courseId={data.id} />
          : tab === 'review' ? <ReviewPanel courseId={data.id} canApprove={full} onDone={reload} />
          : <CourseDetails course={data} onSaved={setData} />}
      </View>
    </Screen>
  );
}

/** Live classes: create them (one or many) first; give each a date and time later. */
export function LiveClassList({ course }: { course: BCourse }) {
  const M = useManage();
  const [list, setList] = useState<LiveClassRow[]>(course.live_classes ?? []);
  const [count, setCount] = useState('10');
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState<number | null>(null);
  const run = async (fn: () => Promise<LiveClassRow[]>) => { setBusy(true); try { setList(await fn()); } catch (e) { fail(e, 'Could not save.'); } finally { setBusy(false); } };
  const move = (i: number, d: -1 | 1) => {
    const j = i + d; if (j < 0 || j >= list.length) return;
    const ids = list.map((x) => x.id); [ids[i], ids[j]] = [ids[j], ids[i]];
    run(() => api.post<LiveClassRow[]>(`${M.api}/courses/${course.id}/live-classes/order`, { ids }));
  };
  const scheduled = list.filter((c) => c.starts_at).length;
  return (
    <Panel title="Live classes" right={<T v="small">{list.length} classes · {scheduled} dated</T>} style={{ marginBottom: 100 }}>
      <T v="small">Make all the classes of this course first. Give each one a date and time when you are ready. Students see the list; a class opens 15 minutes before its time.</T>
      <Row gap={8} style={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <Button title="Add a class" icon="add" loading={busy} onPress={() => run(() => api.post<LiveClassRow[]>(`${M.api}/courses/${course.id}/live-classes`, {}))} />
        <View style={{ width: 90 }}><Input label="How many" value={count} onChangeText={(v) => setCount(v.replace(/\D/g, '').slice(0, 3))} keyboardType="number-pad" /></View>
        <Button title={`Add ${Number(count) || 0} classes`} kind="ghost" icon="layers-outline" disabled={!Number(count)} onPress={() => run(() => api.post<LiveClassRow[]>(`${M.api}/courses/${course.id}/live-classes`, { count: Math.min(100, Number(count)) }))} />
      </Row>
      {course.live_provider === 'livekit' || course.meet_url ? (
        <Button title="Start class now" icon="videocam" kind="ghost" onPress={() => joinLiveCourse(course.id)} />
      ) : <T v="small" style={{ color: colors.red }}>Choose Noon Live or add a meeting link in the course details, so students can join.</T>}
      {!list.length ? <Empty text="No classes yet." /> : list.map((c, i) => (
        <View key={c.id} style={{ borderRadius: 18, borderWidth: 1.5, borderColor: c.state === 'live' ? '#DB2777' : '#D9CCF7', padding: 10, gap: 8 }}>
          <Row gap={10}>
            <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: colors.violet, alignItems: 'center', justifyContent: 'center' }}><T style={{ color: '#FFF', fontFamily: fonts.semibold }}>{i + 1}</T></View>
            <View style={{ flex: 1 }}>
              <T style={{ fontFamily: fonts.semibold }} numberOfLines={1}>{c.title}</T>
              <T v="small">{c.starts_at ? `${new Date(c.starts_at).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })} · ${c.duration_min} min` : 'No date yet'}</T>
            </View>
            <Tag text={c.state === 'unscheduled' ? 'Not scheduled' : c.state === 'live' ? '● Live now' : c.state === 'done' ? 'Done' : 'Scheduled'} tone={c.state === 'live' ? 'pink' : c.state === 'done' ? 'mint' : c.state === 'upcoming' ? 'sky' : 'butter'} />
            <IconButton name="chevron-up" label={`Move ${c.title} up`} tint="transparent" size={32} onPress={() => move(i, -1)} />
            <IconButton name="chevron-down" label={`Move ${c.title} down`} tint="transparent" size={32} onPress={() => move(i, 1)} />
            <IconButton name="create-outline" label={`Edit ${c.title}`} tint="transparent" color={colors.teal} size={32} onPress={() => setEdit(edit === c.id ? null : c.id)} />
            <IconButton name="trash-outline" label={`Delete ${c.title}`} tint="transparent" color={colors.red} size={32}
              onPress={async () => { if (await confirmBox(`Delete ${c.title}?`)) run(() => api.del<LiveClassRow[]>(`${M.api}/course-live-classes/${c.id}`)); }} />
          </Row>
          {edit === c.id ? <ClassForm c={c} onSave={(v) => run(async () => { const r = await api.put<LiveClassRow[]>(`${M.api}/course-live-classes/${c.id}`, v); setEdit(null); return r; })} /> : null}
        </View>
      ))}
    </Panel>
  );
}

function ClassForm({ c, onSave }: { c: LiveClassRow; onSave: (v: Record<string, unknown>) => void }) {
  const d = c.starts_at ? new Date(c.starts_at) : null;
  const pad = (n: number) => String(n).padStart(2, '0');
  const [title, setTitle] = useState(c.title);
  const [notes, setNotes] = useState(c.notes ?? '');
  const [date, setDate] = useState(d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : '');
  const [time, setTime] = useState(d ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : '');
  const [mins, setMins] = useState(String(c.duration_min));
  const save = () => {
    if (date && !time) return say('Add the time too, or clear the date.');
    onSave({ title: title.trim() || c.title, notes: notes.trim() || null, duration_min: Math.max(10, Number(mins) || 45), starts_at: date ? new Date(`${date}T${time}`).toISOString() : null });
  };
  return (
    <View style={{ gap: 8, backgroundColor: '#F8F6FF', borderRadius: 14, padding: 10 }}>
      <Input label="Title" value={title} onChangeText={setTitle} />
      <Input label="Notes for students (optional)" value={notes} onChangeText={setNotes} placeholder="What to bring, what we learn" />
      <Row gap={8} style={{ flexWrap: 'wrap' }}>
        <View style={{ flex: 1, minWidth: 150 }}><DateInput label="Date (optional)" value={date} onChange={setDate} /></View>
        <View style={{ flex: 1, minWidth: 120 }}><DateInput label="Time" mode="time" value={time} onChange={setTime} /></View>
        <View style={{ width: 110 }}><Input label="Minutes" value={mins} onChangeText={(v) => setMins(v.replace(/\D/g, '').slice(0, 3))} keyboardType="number-pad" /></View>
      </Row>
      <Row gap={8}>
        <Button title="Save" icon="checkmark" onPress={save} />
        {date ? <Button title="Clear date" kind="ghost" onPress={() => { setDate(''); setTime(''); }} /> : null}
      </Row>
    </View>
  );
}

type ReviewRow = { type: 'lesson' | 'item'; id: number; course: string; change: string; title: string; kind?: string; lesson?: string | null; details?: Record<string, any> | null; item?: BItem; by: string | null; when: string | null };

/** Teachers' changes: the admin approves or declines each one (or all). Teachers see what is waiting. */
export function ReviewPanel({ courseId, canApprove, onDone }: { courseId?: number; canApprove: boolean; onDone?: () => void }) {
  const M = useManage();
  const { data, reload } = useApi<ReviewRow[]>(`${M.api}/reviews${courseId ? `?course_id=${courseId}` : ''}`);
  const [busy, setBusy] = useState(false);
  const decide = async (body: Record<string, unknown>) => {
    setBusy(true);
    try { await api.post(`${M.api}/reviews`, body); reload(); onDone?.(); } catch (e) { fail(e, 'Could not save.'); } finally { setBusy(false); }
  };
  if (!data) return <Loading />;
  return (
    <Panel title={canApprove ? 'Changes to approve' : 'Waiting for the admin'} right={<T v="small">{data.length}</T>} style={{ marginBottom: 100 }}>
      {!data.length ? <Empty text={canApprove ? 'Nothing to approve. Teachers’ new lessons and changes show here.' : 'Nothing waiting. Your changes show here until the admin approves them.'} /> : null}
      {canApprove && data.length > 1 && courseId ? <Button title={`Approve all ${data.length}`} icon="checkmark-done" loading={busy} onPress={() => decide({ course_id: courseId, approve: true })} /> : null}
      {data.map((r) => (
        <View key={`${r.type}${r.id}`} style={{ borderRadius: 16, backgroundColor: '#FFF', borderWidth: 1, borderColor: colors.line, padding: 12, gap: 6 }}>
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            <Tag text={r.change} tone={r.change.startsWith('remove') ? 'pink' : r.change.startsWith('new') ? 'mint' : 'butter'} />
            <T v="small" style={{ flex: 1 }}>{r.by ? `by ${r.by}` : ''}{!courseId ? ` · ${r.course}` : ''}</T>
          </Row>
          <T style={{ fontFamily: fonts.semibold }}>{r.title}{r.kind ? ` · ${r.kind}` : ''}</T>
          {r.lesson ? <T v="small">In lesson: {r.lesson}</T> : null}
          {r.details ? <T v="small">New: {Object.entries(r.details).map(([k, v]) => `${k.replace('_', ' ')} “${v ?? '—'}”`).join(', ')}</T> : null}
          {r.item?.body ? <T v="small" numberOfLines={3}>“{r.item.body}”</T> : null}
          {r.item?.url ? <T v="small" numberOfLines={1} style={{ color: colors.teal }}>{r.item.url}</T> : null}
          {canApprove ? (
            <Row gap={8} style={{ marginTop: 4 }}>
              <Button title="Approve" icon="checkmark" style={{ height: 40 }} disabled={busy} onPress={() => decide({ type: r.type, id: r.id, approve: true })} />
              <Button title="Decline" kind="ghost" style={{ height: 40 }} disabled={busy} onPress={() => decide({ type: r.type, id: r.id, approve: false })} />
            </Row>
          ) : null}
        </View>
      ))}
    </Panel>
  );
}

/** What an institution admin can change once Noon Learn approved the course. */
function CourseDetails({ course, onSaved }: { course: BCourse; onSaved: (c: BCourse) => void }) {
  const M = useManage();
  const [f, setF] = useState({ title: course.title, description: course.description ?? '', level: course.level ?? 'Beginner', trial_lessons: String(course.trial_lessons ?? 2), live_provider: course.live_provider ?? 'meet', meet_url: course.meet_url ?? '' });
  const [busy, setBusy] = useState(false);
  const [thumb, setThumb] = useState(course.thumbnail_url ?? null);
  const save = async (status?: 'draft' | 'published') => {
    setBusy(true);
    try {
      onSaved(await api.put<BCourse>(`${M.api}/courses/${course.id}`, { title: f.title.trim(), description: f.description.trim() || null, level: f.level, trial_lessons: Number(f.trial_lessons) || 0,
        ...(course.format === 'live' ? { live_provider: f.live_provider, meet_url: f.live_provider === 'meet' ? f.meet_url.trim() || null : course.meet_url ?? null } : {}), ...(status ? { status } : {}) }));
      say(status === 'draft' ? 'Hidden from students.' : status === 'published' ? 'Published. Students can see it.' : 'Saved.');
    } catch (e) { fail(e, 'Could not save.'); } finally { setBusy(false); }
  };
  const upload = async () => {
    try {
      const file = await pickImage(4); if (!file) return;
      const fd = new FormData(); appendFile(fd, 'thumbnail', file);
      setThumb((await api.post<{ thumbnail_url: string | null }>(`${M.api}/courses/${course.id}/thumbnail`, fd)).thumbnail_url);
    } catch (e) { fail(e, 'Could not upload.'); }
  };
  return (
    <Panel title="Course details" style={{ marginBottom: 100 }}>
      <Row gap={12} style={{ alignItems: 'center' }}>
        <Pressable onPress={upload} accessibilityLabel="Change thumbnail" style={{ width: 160, aspectRatio: 16 / 9, borderRadius: 14, overflow: 'hidden', backgroundColor: '#F5FAFA', borderWidth: 1.5, borderStyle: thumb ? 'solid' : 'dashed', borderColor: colors.teal, alignItems: 'center', justifyContent: 'center' }}>
          {thumb ? <Image source={{ uri: thumb }} style={{ width: '100%', height: '100%' }} /> : <T style={{ color: colors.teal, fontFamily: fonts.semibold }}>Upload thumbnail</T>}
        </Pressable>
        <T v="small" style={{ flex: 1 }}>The picture on the course card. Tap to change.</T>
      </Row>
      <Input label="Course name" value={f.title} onChangeText={(v) => setF({ ...f, title: v })} />
      <Input label="Short description" value={f.description} onChangeText={(v) => setF({ ...f, description: v })} multiline />
      <ChoiceChips value={f.level} onChange={(v) => setF({ ...f, level: v })} options={['Beginner', 'Middle', 'Advanced'].map((k) => ({ key: k, label: k }))} />
      {course.format === 'live' ? (
        <>
          <ChoiceChips value={f.live_provider} onChange={(v) => setF({ ...f, live_provider: v })} options={[{ key: 'livekit', label: 'Noon Live (inside the app)' }, { key: 'meet', label: 'Google Meet link' }]} />
          {f.live_provider === 'meet' ? <Input label="Meeting link" value={f.meet_url} onChangeText={(v) => setF({ ...f, meet_url: v })} placeholder="https://meet.google.com/…" autoCapitalize="none" /> : null}
        </>
      ) : <Input label="Free lessons (trial)" value={f.trial_lessons} onChangeText={(v) => setF({ ...f, trial_lessons: v.replace(/\D/g, '').slice(0, 2) })} keyboardType="number-pad" />}
      <Row gap={8} style={{ flexWrap: 'wrap' }}>
        <Button title="Save" icon="checkmark-circle-outline" loading={busy} onPress={() => save()} />
        {course.status === 'published' ? <Button title="Hide from students" kind="ghost" onPress={() => save('draft')} /> : <Button title="Publish" kind="ghost" onPress={() => save('published')} />}
      </Row>
    </Panel>
  );
}

/* ================= Meetings ================= */
type Meeting = { id: number; title: string; notes: string | null; audience: 'students' | 'staff' | 'everyone'; starts_at: string | null; duration_min: number; state: 'scheduled' | 'open' | 'live' | 'ended'; host: string | null; can_host: boolean; joined: number };
const AUD = { students: 'All students', staff: 'Teachers and staff', everyone: 'Everyone' } as const;

export async function joinMeeting(id: number) {
  try {
    const p = await api.post<LivePass>(`/meetings/${id}/join`);
    setLivePass({ ...p, course: { ...p.course, id } });
    router.push(`/live/m/${id}` as any);
  } catch (e) { fail(e, 'Could not open the meeting.'); }
}

export function MeetingsScreen() {
  const { user } = useAuth();
  const host = user?.role === 'admin' || user?.role === 'teacher';
  const { data, reload } = useApi<Meeting[]>('/meetings');
  const [form, setForm] = useState<{ id?: number; title: string; notes: string; audience: Meeting['audience']; date: string; time: string; mins: string } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { const t = setInterval(reload, 30000); return () => clearInterval(t); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const save = async () => {
    if (!form || !form.title.trim()) return say('Give the meeting a title.');
    if (form.date && !form.time) return say('Add the time too, or leave the date empty.');
    setBusy(true);
    try {
      const body = { title: form.title.trim(), notes: form.notes.trim() || null, audience: form.audience, duration_min: Math.max(10, Number(form.mins) || 45), starts_at: form.date ? new Date(`${form.date}T${form.time}`).toISOString() : null };
      if (form.id) await api.put(`/meetings/${form.id}`, body); else await api.post('/meetings', body);
      setForm(null); reload();
    } catch (e) { fail(e, 'Could not save.'); } finally { setBusy(false); }
  };
  const when = (m: Meeting) => (m.starts_at ? new Date(m.starts_at).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : 'Any time the host starts it');
  return (
    <Screen>
      <Header title="Meetings" subtitle={host ? 'Meet all your students together on Noon Live' : 'Meetings from your institution'}
        right={host && !form ? <Button title="New meeting" icon="add" style={{ height: 42 }} onPress={() => setForm({ title: '', notes: '', audience: 'students', date: '', time: '', mins: '45' })} /> : undefined} />
      {form ? (
        <Panel title={form.id ? 'Edit meeting' : 'New meeting'}>
          <Input label="Title" value={form.title} onChangeText={(v) => setForm({ ...form, title: v })} placeholder="e.g. Parents and students meeting" />
          <Input label="Notes (optional)" value={form.notes} onChangeText={(v) => setForm({ ...form, notes: v })} />
          <T v="small" style={{ fontFamily: fonts.medium }}>Who joins</T>
          <ChoiceChips value={form.audience} onChange={(v) => setForm({ ...form, audience: v })} options={(Object.keys(AUD) as Meeting['audience'][]).map((k) => ({ key: k, label: AUD[k] }))} />
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            <View style={{ flex: 1, minWidth: 150 }}><DateInput label="Date (optional)" value={form.date} onChange={(v) => setForm({ ...form, date: v })} /></View>
            <View style={{ flex: 1, minWidth: 120 }}><DateInput label="Time" mode="time" value={form.time} onChange={(v) => setForm({ ...form, time: v })} /></View>
            <View style={{ width: 110 }}><Input label="Minutes" value={form.mins} onChangeText={(v) => setForm({ ...form, mins: v.replace(/\D/g, '').slice(0, 3) })} keyboardType="number-pad" /></View>
          </Row>
          <T v="small">No date? Start it whenever you are ready; it shows as live to everyone straight away.</T>
          <Row gap={8}><Button title="Save" icon="checkmark" loading={busy} onPress={save} /><Button title="Cancel" kind="ghost" onPress={() => setForm(null)} /></Row>
        </Panel>
      ) : null}
      <View style={{ marginTop: 12, gap: 10 }}>
        {!data ? <Loading /> : !data.length ? <Empty text={host ? 'No meetings yet. Tap New meeting.' : 'No meetings right now.'} /> : data.map((m) => (
          <Card key={m.id} tint={m.state === 'live' ? '#FDE7F1' : undefined} style={{ gap: 8 }}>
            <Row gap={12}>
              <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: m.state === 'live' ? '#DB2777' : colors.lav[0], alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="people" size={22} color={m.state === 'live' ? '#FFF' : colors.violet} />
              </View>
              <View style={{ flex: 1 }}>
                <T style={{ fontFamily: fonts.semibold, fontSize: 16 }}>{m.title}</T>
                <T v="small">{when(m)} · {AUD[m.audience]}{m.host ? ` · ${m.host}` : ''}</T>
              </View>
              <Tag text={m.state === 'live' ? '● Live now' : m.state === 'ended' ? 'Ended' : m.state === 'open' ? 'Opening' : 'Scheduled'} tone={m.state === 'live' ? 'pink' : m.state === 'ended' ? 'mint' : 'sky'} />
            </Row>
            {m.notes ? <T v="small">{m.notes}</T> : null}
            <Row gap={8} style={{ flexWrap: 'wrap' }}>
              {m.can_host ? (
                <>
                  <Button title={m.state === 'live' ? 'Rejoin as host' : 'Start meeting'} icon="videocam" style={{ height: 42 }} onPress={() => joinMeeting(m.id)} />
                  {m.state !== 'live' ? <Button title="Edit" kind="ghost" style={{ height: 42 }} onPress={() => { const d = m.starts_at ? new Date(m.starts_at) : null; const p = (n: number) => String(n).padStart(2, '0'); setForm({ id: m.id, title: m.title, notes: m.notes ?? '', audience: m.audience, date: d ? `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` : '', time: d ? `${p(d.getHours())}:${p(d.getMinutes())}` : '', mins: String(m.duration_min) }); }} /> : null}
                  <Button title="Delete" kind="ghost" style={{ height: 42 }} onPress={async () => { if (await confirmBox(`Delete ${m.title}?`)) { await api.del(`/meetings/${m.id}`).catch((e) => fail(e, 'Could not delete.')); reload(); } }} />
                  {m.joined ? <T v="small" style={{ alignSelf: 'center' }}>{m.joined} joined</T> : null}
                </>
              ) : m.state === 'live' || m.state === 'open' ? <Button title="Join meeting" icon="videocam" style={{ height: 42 }} onPress={() => joinMeeting(m.id)} />
                : m.state === 'scheduled' ? <T v="small">You can join when it starts.</T> : null}
            </Row>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
