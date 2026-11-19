import React, { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Switch, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Button, Card, ErrorBox, GradientCard, Grid, Header, IconButton, Loading, Pill, Row, Screen, Segmented, T, TypeIcon, Empty } from '@/components/ui';
import { Field } from './auth';
import { api, USE_MOCK } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/lib/auth';
import { useApprovals } from '@/lib/approvals';
import type { Course, CourseDetail, StudyTool, ToolType } from '@/lib/types';
import { colors, ContentKind, fonts, gradients, scriptFont } from '@/theme/tokens';

/* ================= Dashboards ================= */

export function StaffHome({ role }: { role: 'teacher' | 'admin' | 'super' }) {
  const { user } = useAuth();
  const stats = {
    teacher: [['Today\'s classes', '3', colors.lav], ['To review', '8', colors.pink], ['Students', '28', colors.mint], ['Leave requests', '2', colors.butter]],
    admin: [['Students', '412', colors.lav], ['Teachers', '18', colors.mint], ['Fees due', '₹ 42k', colors.butter], ['Attendance', '94%', colors.sky]],
    super: [['Tenants', '48', colors.lav], ['Active students', '9.2k', colors.mint], ['MRR', '₹ 3.1L', colors.butter], ['Courses', '24', colors.sky]],
  }[role];
  const links = {
    teacher: [['Course & live class', '/teacher/course/1', 'videocam'], ['Leave approvals', '/teacher/leave', 'calendar'], ['Chats', '/teacher/chat', 'chatbubbles']],
    admin: [['Courses for institution', '/admin/courses', 'school'], ['Leave approvals', '/admin/leave', 'calendar']],
    super: [['Manage courses', '/super/courses', 'school'], ['Study tools', '/super/tools', 'document-text']],
  }[role];
  return (
    <Screen>
      <Header title={`Assalamu alaikum, ${user?.name ?? ''}`} subtitle={role === 'super' ? 'Super admin' : user?.tenant_name ?? role} back={false} />
      <Grid cols={{ phone: 2, tablet: 4, desktop: 4 }}>
        {stats.map(([label, value, p]: any) => (
          <Card key={label} tint={p[0]}><T v="small" style={{ color: p[1] }}>{label}</T><T style={{ fontFamily: fonts.semibold, fontSize: 28, color: p[1] }}>{value}</T></Card>
        ))}
      </Grid>
      <T v="h2" style={{ marginVertical: 12 }}>Quick actions</T>
      <Grid cols={{ phone: 1, tablet: 2, desktop: 3 }}>
        {links.map(([label, href, icon]: any) => (
          <Card key={href} onPress={() => router.push(href)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.sky[0], alignItems: 'center', justifyContent: 'center' }}><Ionicons name={icon} size={22} color={colors.teal} /></View>
            <T v="h3" style={{ flex: 1 }}>{label}</T>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Card>
        ))}
      </Grid>
    </Screen>
  );
}

/* ================= Teacher: course content + live ================= */

export function TeacherCourseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const course = useApi<CourseDetail>(`/courses/${id}`);
  const add = async (kind: ContentKind, title: string) => {
    const it = await api.post<any>(`/teacher/courses/${id}/items`, { kind, title, meta: 'Just now' }).catch(() => api.post<any>(`/super/courses/${id}/items`, { kind, title, meta: 'Just now' }));
    if (course.data) course.setData({ ...course.data, items: [it, ...course.data.items] });
  };
  if (course.loading) return <Screen><Loading /></Screen>;
  if (!course.data) return <Screen><ErrorBox message={course.error ?? 'Not found'} /></Screen>;
  return (
    <Screen>
      <Header title={course.data.title} subtitle="Teacher · course" />
      <GradientCard colors={['#F3CFEA', '#E9B8DD']} style={{ gap: 10 }}>
        <T v="label" style={{ color: colors.pink[1] }}>● NEXT LIVE CLASS</T>
        <T v="h2">Lesson 6 · Letters with harakath</T>
        <Row><Button title="Live classes" icon="videocam" onPress={() => router.push('/teacher/live' as any)} /><Button title="Schedule new" kind="ghost" onPress={() => router.push('/teacher/live' as any)} /></Row>
      </GradientCard>
      <T v="h2" style={{ marginVertical: 12 }}>Add to this course</T>
      <Grid cols={{ phone: 4, tablet: 4, desktop: 4 }} gap={8}>
        {([['video', 'Video'], ['audio', 'Audio'], ['pdf', 'PDF'], ['test', 'Test']] as [ContentKind, string][]).map(([k, l]) => (
          <Card key={k} onPress={() => add(k, `New ${l.toLowerCase()}`)} style={{ alignItems: 'center', gap: 6 }}><TypeIcon kind={k} /><T v="small" style={{ color: colors.ink }}>{l}</T></Card>
        ))}
      </Grid>
      <View style={{ gap: 8, marginTop: 4 }}>
        {course.data.items.map((it) => (
          <Card key={it.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TypeIcon kind={it.kind} /><View style={{ flex: 1 }}><T v="h3">{it.title}</T><T v="small">{it.meta}</T></View>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

/* ================= Leave approvals (teacher / admin) ================= */

export function StaffLeaveScreen() {
  const list = useApi<any[]>('/staff/leave-requests');
  const decide = async (id: number, status: 'approved' | 'rejected') => {
    await api.patch(`/staff/leave-requests/${id}`, { status });
    list.reload();
  };
  return (
    <Screen>
      <Header title="Leave approvals" />
      {list.loading ? <Loading /> : list.error ? <ErrorBox message={USE_MOCK ? 'Connect the API to see real leave requests.' : list.error} /> : (
        <View style={{ gap: 8 }}>
          {(list.data ?? []).map((r) => (
            <Card key={r.id} style={{ gap: 8 }}>
              <Row><T v="h3" style={{ flex: 1 }}>{r.student_name} · {r.type}</T><Pill text={r.status} /></Row>
              <T v="small">{r.start_date} – {r.end_date} · {r.reason}</T>
              {r.status === 'pending' ? <Row><Button title="Approve" onPress={() => decide(r.id, 'approved')} /><Button title="Reject" kind="ghost" onPress={() => decide(r.id, 'rejected')} /></Row> : null}
            </Card>
          ))}
          {!list.data?.length ? <Empty text="No requests." /> : null}
        </View>
      )}
    </Screen>
  );
}

/* ================= Institute admin: enable courses ================= */

export function AdminCoursesScreen() {
  const list = useApi<(Course & { enabled?: boolean })[]>('/courses');
  const [on, setOn] = useState<Record<number, boolean>>({});
  useEffect(() => { if (list.data) setOn(Object.fromEntries(list.data.map((c) => [c.id, c.enabled ?? !!c.enrolled]))); }, [list.data]);
  const toggle = async (id: number) => {
    const v = !on[id];
    setOn({ ...on, [id]: v });
    await api.put(`/admin/courses/${id}`, { enabled: v }).catch(() => {});
  };
  return (
    <Screen>
      <Header title="Noon Courses" subtitle="Turn on courses · or create your own" back={false} right={(
        <Pressable accessibilityRole="button" onPress={() => router.push('/admin/courses/new' as any)} style={{ height: 42, paddingHorizontal: 14, borderRadius: 21, backgroundColor: colors.ink, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="add" size={16} color="#FFF" /><T style={{ color: '#FFF', fontFamily: fonts.semibold, fontSize: 13 }}>Create</T>
        </Pressable>
      )} />
      {list.loading ? <Loading /> : (
        <Grid cols={{ phone: 1, tablet: 2, desktop: 3 }}>
          {(list.data ?? []).map((c) => (
            <Card key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: c.cover, alignItems: 'center', justifyContent: 'center' }}><T style={{ fontFamily: fonts.fun, fontSize: 22 }}>{c.title[0]}</T></View>
              <View style={{ flex: 1 }}><T v="h3">{c.title}</T><T v="small">{c.lessons_count} lessons</T></View>
              <Switch value={!!on[c.id]} onValueChange={() => toggle(c.id)} trackColor={{ true: colors.teal, false: '#C3D3D8' }} thumbColor="#FFF" />
            </Card>
          ))}
        </Grid>
      )}
    </Screen>
  );
}

/* ================= Super admin: course CRUD ================= */

export function SuperCoursesScreen() {
  const waiting = useApprovals().filter((c) => c.status === 'waiting').length;
  const list = useApi<(Course & { items_count?: number })[]>('/super/courses');
  const [tab, setTab] = useState<'all' | 'published' | 'draft'>('all');
  const [confirm, setConfirm] = useState<number | null>(null);
  const rows = (list.data ?? []).filter((c) => tab === 'all' || c.status === tab);
  const remove = async (id: number) => { await api.del(`/super/courses/${id}`); setConfirm(null); list.reload(); };
  return (
    <Screen>
      <Header title="Noon Courses" back={false} right={<Button title="New" icon="add" onPress={() => router.push('/super/courses/new')} style={{ height: 46 }} />} />
      <Pressable accessibilityRole="link" onPress={() => router.push('/super/approvals' as any)} style={{ marginTop: -8, marginBottom: 8 }}>
        <T style={{ color: colors.red, fontFamily: fonts.semibold, fontSize: 13 }}>● {waiting} course{waiting === 1 ? '' : 's'} waiting approval →</T>
      </Pressable>
      <Segmented value={tab} onChange={setTab} options={[{ key: 'all', label: 'All' }, { key: 'published', label: 'Published' }, { key: 'draft', label: 'Drafts' }]} />
      <View style={{ marginTop: 12 }}>
        {list.loading ? <Loading /> : (
          <Grid cols={{ phone: 1, tablet: 2, desktop: 3 }}>
            {rows.map((c) => (
              <Card key={c.id} style={{ gap: 10 }}>
                <Row gap={12}>
                  <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: c.cover, alignItems: 'center', justifyContent: 'center' }}><T style={{ fontFamily: fonts.fun, fontSize: 22 }}>{c.title[0]}</T></View>
                  <View style={{ flex: 1 }}><T v="h3" numberOfLines={1}>{c.title}</T><T v="small">{c.category} · {c.items_count ?? 0} items</T></View>
                  <Pill text={c.status} tint={c.status === 'published' ? colors.mint[0] : colors.butter[0]} ink={c.status === 'published' ? colors.mint[1] : colors.butter[1]} />
                </Row>
                {confirm === c.id ? (
                  <Row><T v="small" style={{ flex: 1 }}>Delete this course?</T><Button title="Delete" kind="danger" style={{ height: 40 }} onPress={() => remove(c.id)} /><Button title="Keep" kind="ghost" style={{ height: 40 }} onPress={() => setConfirm(null)} /></Row>
                ) : (
                  <Row><Button title="Edit" kind="ghost" icon="create-outline" style={{ height: 40, flex: 1 }} onPress={() => router.push(`/super/courses/${c.id}` as any)} /><IconButton name="trash-outline" label="Delete" color={colors.red} tint={colors.bg} size={40} onPress={() => setConfirm(c.id)} /></Row>
                )}
              </Card>
            ))}
          </Grid>
        )}
      </View>
    </Screen>
  );
}

/* ================= Super admin: study tools CRUD ================= */

export const toolLabels: Record<ToolType, string> = { audio: 'Audio books', chart: 'Charts', adkar: 'Adkar', slide: 'Slides', form: 'Forms' };

export function SuperToolsScreen() {
  const list = useApi<StudyTool[]>('/super/study-tools');
  const [tab, setTab] = useState<ToolType>('chart');
  const [editing, setEditing] = useState<StudyTool | 'new' | null>(null);
  const [confirm, setConfirm] = useState<number | null>(null);
  const rows = (list.data ?? []).filter((t) => t.type === tab);
  const remove = async (id: number) => { await api.del(`/super/study-tools/${id}`); setConfirm(null); list.reload(); };

  return (
    <Screen>
      <Header title="Resources" subtitle="Audio books · Charts · Adkar · Slides · Forms" back={false} right={<Button title="Add" icon="add" style={{ height: 46 }} onPress={() => setEditing('new')} />} />
      <Grid cols={{ phone: 3, tablet: 5, desktop: 5 }} gap={8}>
        {(Object.keys(toolLabels) as ToolType[]).map((k) => (
          <Card key={k} onPress={() => setTab(k)} style={{ alignItems: 'center', borderWidth: 2, borderColor: k === tab ? '#F2B518' : 'transparent' }}>
            <T style={{ fontFamily: fonts.semibold, fontSize: 20 }}>{(list.data ?? []).filter((t) => t.type === k).length}</T>
            <T v="small" style={{ color: k === tab ? colors.ink : colors.muted }}>{toolLabels[k]}</T>
          </Card>
        ))}
      </Grid>
      {list.loading ? <Loading /> : (
        <Grid cols={{ phone: 1, tablet: 2, desktop: 3 }}>
          {rows.map((t) => (
            <Card key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFF1CC', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="document-text" size={20} color="#F2B518" /></View>
              <View style={{ flex: 1, gap: 2 }}>
                <T numberOfLines={1} style={{ fontFamily: scriptFont(t.title), fontSize: 15, color: colors.ink }}>{t.title}</T>
                <Row gap={4}><Pill text={t.status === 'live' ? 'Live' : 'Draft'} tint={t.status === 'live' ? colors.sky[0] : colors.butter[0]} ink={t.status === 'live' ? colors.sky[1] : colors.butter[1]} />{t.is_new ? <Pill text="NEW" /> : null}</Row>
              </View>
              {confirm === t.id ? (
                <Row gap={4}><Button title="Delete" kind="danger" style={{ height: 36, paddingHorizontal: 10 }} onPress={() => remove(t.id)} /><Button title="Keep" kind="ghost" style={{ height: 36, paddingHorizontal: 10 }} onPress={() => setConfirm(null)} /></Row>
              ) : (
                <Row gap={0}><IconButton name="create-outline" label="Edit" color={colors.teal} tint="transparent" size={38} onPress={() => setEditing(t)} /><IconButton name="trash-outline" label="Delete" color={colors.red} tint="transparent" size={38} onPress={() => setConfirm(t.id)} /></Row>
              )}
            </Card>
          ))}
        </Grid>
      )}
      {editing ? <ToolSheet tool={editing === 'new' ? null : editing} defaultType={tab} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); list.reload(); }} /> : null}
    </Screen>
  );
}

export function ToolSheet({ tool, defaultType, onClose, onSaved, onDelete }: { tool: StudyTool | null; defaultType: ToolType; onClose: () => void; onSaved: () => void; onDelete?: () => void }) {
  const [type, setType] = useState<ToolType>(tool?.type ?? defaultType);
  const [title, setTitle] = useState(tool?.title ?? '');
  const [author, setAuthor] = useState(tool?.author ?? '');
  const [err, setErr] = useState('');
  const audio = type === 'audio';
  const [isNew, setIsNew] = useState(tool?.is_new ?? true);
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [busy, setBusy] = useState(false);

  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: audio ? ['audio/*'] : ['application/pdf', 'image/*'], copyToCacheDirectory: true });
    if (!res.canceled) setFile(res.assets[0]);
  };
  const save = async (status: 'draft' | 'live') => {
    setBusy(true); setErr('');
    try {
      let body: any = { type, title, is_new: isNew, status, ...(audio ? { author } : {}) };
      if (file && !USE_MOCK) {
        const fd = new FormData();
        Object.entries(body).forEach(([k, v]) => fd.append(k, String(v === true ? 1 : v === false ? 0 : v)));
        if (Platform.OS === 'web' && (file as any).file) fd.append('file', (file as any).file);
        else fd.append('file', { uri: file.uri, name: file.name, type: file.mimeType ?? 'application/pdf' } as any);
        if (tool) fd.append('_method', 'PUT');
        body = fd;
        await api.post(tool ? `/super/study-tools/${tool.id}` : '/super/study-tools', body);
      } else if (tool) await api.put(`/super/study-tools/${tool.id}`, body);
      else await api.post('/super/study-tools', body);
      onSaved();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not save.'); } finally { setBusy(false); }
  };

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(16,48,58,0.35)' }} onPress={onClose} />
      <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, gap: 12, width: '100%', maxWidth: 640, alignSelf: 'center' }}>
        <Row><T v="h2" style={{ flex: 1 }}>{tool ? 'Edit resource' : 'Add resource'}</T><IconButton name="close" label="Close" tint={colors.bg} size={38} onPress={onClose} /></Row>
        <Segmented value={type} onChange={setType} activeColor="#F2B518" options={(Object.keys(toolLabels) as ToolType[]).map((k) => ({ key: k, label: toolLabels[k] }))} />
        <Field label="Title (Malayalam, Arabic or English)" value={title} onChangeText={setTitle} placeholder="eg. നിസ്കാരം" style={{ fontFamily: scriptFont(title || 'a') }} />
        {audio ? <Field label="Narrator / author (optional)" value={author} onChangeText={setAuthor} placeholder="eg. Usthad Ahmed" /> : null}
        <Card onPress={pick} tint={colors.surfaceSoft} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#9BB6BE' }}>
          <Ionicons name="cloud-upload-outline" size={24} color="#F2B518" />
          <View style={{ flex: 1 }}><T v="h3">{file ? file.name : tool ? 'Replace file' : 'Upload file'}</T><T v="small">{audio ? 'MP3, M4A, AAC, OGG or WAV · up to 100 MB' : 'PDF, JPG or PNG · up to 20 MB'}</T></View>
        </Card>
        <Row><T style={{ flex: 1 }}>Show “New” tag to students</T><Switch value={isNew} onValueChange={setIsNew} trackColor={{ true: colors.green, false: '#C3D3D8' }} thumbColor="#FFF" /></Row>
        {err ? <T style={{ color: colors.red }}>{err}</T> : null}
        <Row>
          {onDelete ? <Button title="Delete" kind="danger" style={{ paddingHorizontal: 14 }} onPress={onDelete} /> : null}
          <Button title="Save draft" kind="ghost" style={{ flex: 1 }} loading={busy} disabled={!title} onPress={() => save('draft')} />
          <Button title={tool ? 'Update' : 'Publish'} style={{ flex: 1 }} loading={busy} disabled={!title} onPress={() => save('live')} />
        </Row>
      </View>
    </Modal>
  );
}
