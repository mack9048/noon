// Live classes and meetings on Google Meet (or any https meeting link).
// Teachers and admins schedule them; students and parents join from the app.
import React, { useState } from 'react';
import { Linking, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Empty, Header, Loading, Row, Screen, T } from '@/components/ui';
import { Tag } from '@/components/kit';
import { ChoiceChips, DateInput, Input, Select } from '@/components/kit2';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/lib/auth';
import { useBase } from '@/lib/useBase';
import { colors, fonts } from '@/theme/tokens';

export type LiveSession = {
  id: number; title: string; kind: 'class' | 'meeting'; starts_at: string; ends_at: string; duration_min: number;
  meet_url: string; notes: string | null; batch: { id: number; name: string } | null; host: string | null; state: 'upcoming' | 'live' | 'ended';
};

const when = (iso: string) => {
  const d = new Date(iso);
  const today = new Date(); const tmr = new Date(); tmr.setDate(today.getDate() + 1);
  const day = d.toDateString() === today.toDateString() ? 'Today' : d.toDateString() === tmr.toDateString() ? 'Tomorrow'
    : d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  return `${day} · ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
};
const isMeet = (u: string) => /meet\.google\.com/i.test(u);
function openMeet(url: string) {
  if (Platform.OS === 'web') window.open(url, '_blank', 'noopener'); else Linking.openURL(url);
}
function say(msg: string) { if (Platform.OS === 'web') window.alert(msg); }

function SessionCard({ s, staff, onEdit }: { s: LiveSession; staff: boolean; onEdit?: () => void }) {
  const base = useBase();
  const live = s.state === 'live';
  return (
    <Card tint={live ? colors.pink[0] : undefined} onPress={() => router.push(`${base}/live/${s.id}` as any)} style={{ gap: 8 }}>
      <Row gap={12}>
        <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: live ? '#FFF' : colors.pink[0], alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={s.kind === 'meeting' ? 'people-outline' : 'videocam'} size={22} color={colors.pink[1]} />
        </View>
        <View style={{ flex: 1 }}>
          <T v="small" style={{ color: colors.pink[1], fontFamily: fonts.semibold }}>{live ? 'LIVE NOW · ' : ''}{when(s.starts_at)} · {s.duration_min} min</T>
          <T style={{ fontFamily: fonts.semibold, fontSize: 16 }}>{s.title}</T>
          <T v="small">{[s.batch?.name ?? 'Everyone', s.host ? `by ${s.host}` : null, isMeet(s.meet_url) ? 'Google Meet' : null].filter(Boolean).join(' · ')}</T>
        </View>
        {s.state === 'ended' ? <Tag text="Ended" tone="white" /> : null}
      </Row>
      <Row gap={8}>
        {s.state !== 'ended' ? (
          <View style={{ flex: 1 }}><Button title={live ? 'Join now' : 'Join link'} icon="videocam" kind={live ? 'primary' : 'ghost'} onPress={() => openMeet(s.meet_url)} /></View>
        ) : null}
        {staff && onEdit ? <Button title="Edit" kind="ghost" icon="create-outline" onPress={onEdit} /> : null}
      </Row>
    </Card>
  );
}

/* ---------- list: upcoming and recent ---------- */
export function LiveListScreen() {
  const { user } = useAuth();
  const staff = user?.role === 'teacher' || user?.role === 'admin';
  const { data, loading, error, reload } = useApi<LiveSession[]>('/live-sessions');
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [edit, setEdit] = useState<LiveSession | 'new' | null>(null);
  const list = (data ?? []).filter((s) => (tab === 'past' ? s.state === 'ended' : s.state !== 'ended'));
  if (tab === 'past') list.reverse();
  return (
    <Screen>
      <Header title="Live classes" subtitle={staff ? 'Schedule a class or meeting on Google Meet' : 'Join your classes and meetings'}
        right={staff ? <Button title="New" icon="add" style={{ height: 44, paddingHorizontal: 16 }} onPress={() => setEdit('new')} /> : undefined} />
      <ChoiceChips value={tab} onChange={setTab} options={[{ key: 'upcoming', label: 'Upcoming' }, { key: 'past', label: 'Past' }]} />
      {loading && !data ? <Loading /> : error ? <Empty text={error} /> : (
        <View style={{ gap: 10, marginTop: 10 }}>
          {list.map((s) => <SessionCard key={s.id} s={s} staff={staff} onEdit={() => setEdit(s)} />)}
          {!list.length ? (
            <Card style={{ alignItems: 'center', gap: 10, padding: 24 }}>
              <Ionicons name="videocam-outline" size={34} color={colors.muted} />
              <T style={{ textAlign: 'center' }}>{tab === 'upcoming' ? (staff ? 'No live classes scheduled yet.' : 'No live classes right now. Your teacher will add them here.') : 'No past classes this week.'}</T>
              {staff && tab === 'upcoming' ? <Button title="Schedule a live class" icon="add" onPress={() => setEdit('new')} /> : null}
            </Card>
          ) : null}
        </View>
      )}
      {staff ? <LiveForm value={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} /> : null}
    </Screen>
  );
}

/* ---------- one session ---------- */
export function LiveSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const base = useBase();
  const { user } = useAuth();
  const staff = user?.role === 'teacher' || user?.role === 'admin';
  const { data: s, loading, error, reload } = useApi<LiveSession>(/^\d+$/.test(String(id)) ? `/live-sessions/${id}` : null);
  const [edit, setEdit] = useState(false);
  if (loading && !s) return <Loading />;
  if (!s) {
    return (
      <Screen>
        <Header title="Live class" />
        <Empty text={error && !/not found/i.test(error) ? error : 'This live class is not available.'} />
        <Button title="See all live classes" icon="videocam-outline" onPress={() => router.replace(`${base}/live` as any)} />
      </Screen>
    );
  }
  const live = s.state === 'live';
  return (
    <Screen>
      <Header title={s.title} subtitle={`${s.kind === 'meeting' ? 'Meeting' : 'Live class'} · ${s.batch?.name ?? 'Everyone'}`} />
      <Card tint={live ? colors.pink[0] : colors.lav[0]} style={{ gap: 12, alignItems: 'center', padding: 24 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="videocam" size={34} color={colors.pink[1]} /></View>
        <T v="h2" style={{ textAlign: 'center' }}>{live ? 'Class is open — join now' : s.state === 'ended' ? 'This class has ended' : 'Starts ' + when(s.starts_at)}</T>
        <T v="small" style={{ textAlign: 'center' }}>{when(s.starts_at)} · {s.duration_min} minutes{s.host ? ` · with ${s.host}` : ''}</T>
        {s.state !== 'ended' ? <Button title={isMeet(s.meet_url) ? 'Join on Google Meet' : 'Join meeting'} icon="videocam" onPress={() => openMeet(s.meet_url)} style={{ alignSelf: 'stretch' }} /> : null}
        {s.state === 'upcoming' ? <T v="small" style={{ textAlign: 'center' }}>You can join 15 minutes before the start. The link opens Google Meet in a new tab or the Meet app.</T> : null}
      </Card>
      {s.notes ? <Card style={{ marginTop: 12 }}><T v="label">NOTES</T><T>{s.notes}</T></Card> : null}
      {staff ? (
        <Card style={{ marginTop: 12, gap: 8 }}>
          <T v="label">MEETING LINK</T>
          <T selectable style={{ color: colors.violet }}>{s.meet_url}</T>
          <Row gap={8}>
            <View style={{ flex: 1 }}><Button title="Copy link" kind="ghost" icon="copy-outline" onPress={async () => { try { await (globalThis as any).navigator?.clipboard?.writeText(s.meet_url); say('Copied.'); } catch { say(s.meet_url); } }} /></View>
            <View style={{ flex: 1 }}><Button title="Edit" kind="ghost" icon="create-outline" onPress={() => setEdit(true)} /></View>
          </Row>
        </Card>
      ) : null}
      {staff ? <LiveForm value={edit ? s : null} onClose={() => setEdit(false)} onSaved={(deleted) => { setEdit(false); if (deleted) router.replace(`${base}/live` as any); else reload(); }} /> : null}
    </Screen>
  );
}

/* ---------- create / edit ---------- */
const pad = (n: number) => String(n).padStart(2, '0');
function LiveForm({ value, onClose, onSaved }: { value: LiveSession | 'new' | null; onClose: () => void; onSaved: (deleted?: boolean) => void }) {
  const { data: batches } = useApi<{ id: number; name: string }[]>(value ? '/staff/batches' : null);
  const editing = value && value !== 'new' ? value : null;
  const init = () => {
    const d = editing ? new Date(editing.starts_at) : new Date(Date.now() + 60 * 60 * 1000);
    if (!editing) d.setMinutes(0, 0, 0);
    return {
      title: editing?.title ?? '', kind: editing?.kind ?? 'class', batch: editing?.batch ? String(editing.batch.id) : '',
      date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
      duration: String(editing?.duration_min ?? 45), url: editing?.meet_url ?? '', notes: editing?.notes ?? '',
    };
  };
  const [f, setF] = useState(init);
  const [key, setKey] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (value !== key) { setKey(value); setF(init()); setErr(null); }
  if (!value) return null;
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });
  const save = async () => {
    setErr(null);
    const start = new Date(`${f.date}T${f.time}:00`);
    if (f.title.trim().length < 2) return setErr('Enter a title.');
    if (isNaN(start.getTime())) return setErr('Choose the date and time.');
    if (!/^https:\/\//i.test(f.url.trim())) return setErr('Paste the meeting link (it starts with https://meet.google.com/…).');
    setBusy(true);
    const body = { title: f.title.trim(), kind: f.kind, batch_id: f.batch ? Number(f.batch) : null, starts_at: start.toISOString(), duration_min: Number(f.duration) || 45, meet_url: f.url.trim(), notes: f.notes.trim() || null };
    try {
      if (editing) await api.put(`/staff/live-sessions/${editing.id}`, body); else await api.post('/staff/live-sessions', body);
      onSaved();
    } catch (e) { setErr(e instanceof ApiError ? e.friendly : 'Could not save.'); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!editing) return;
    if (Platform.OS === 'web' && !window.confirm('Cancel and delete this live class?')) return;
    try { await api.del(`/staff/live-sessions/${editing.id}`); onSaved(true); } catch (e) { setErr(e instanceof ApiError ? e.friendly : 'Could not delete.'); }
  };
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close" onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(11,42,53,0.45)', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 520, maxHeight: '92%', backgroundColor: colors.bg, borderRadius: 26, overflow: 'hidden' }}>
          <ScrollView contentContainerStyle={{ padding: 18, gap: 12 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T v="h2">{editing ? 'Edit live class' : 'New live class'}</T>
              <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="close" size={20} color={colors.ink} /></Pressable>
            </Row>
            <Card style={{ gap: 12 }}>
              <Input label="Title" value={f.title} onChangeText={set('title')} placeholder="eg. Fiqh · Lesson 4" />
              <Row gap={10}>
                <Select label="Type" value={f.kind} options={[{ key: 'class', label: 'Class' }, { key: 'meeting', label: 'Meeting' }]} onChange={set('kind')} />
                <Select label="Who joins" value={f.batch} options={[{ key: '', label: 'Everyone' }, ...(batches ?? []).map((b) => ({ key: String(b.id), label: b.name }))]} onChange={set('batch')} />
              </Row>
              <Row gap={10}>
                <DateInput label="Date" value={f.date} onChange={set('date')} min={new Date().toISOString().slice(0, 10)} />
                <DateInput label="Time" mode="time" value={f.time} onChange={set('time')} />
                <Input label="Minutes" value={f.duration} onChangeText={set('duration')} keyboardType="number-pad" />
              </Row>
            </Card>
            <Card style={{ gap: 10 }}>
              <T v="h3">Google Meet link</T>
              <T v="small">1. Tap the button to open Google Meet and create a meeting. 2. Copy its link. 3. Paste it here.</T>
              <Button title="Create a Google Meet link" icon="open-outline" kind="ghost" onPress={() => openMeet('https://meet.google.com/new')} />
              <Input label="Meeting link" value={f.url} onChangeText={set('url')} placeholder="https://meet.google.com/abc-defg-hij" autoCapitalize="none" />
              <Input label="Notes for students (optional)" value={f.notes} onChangeText={set('notes')} multiline />
            </Card>
            {err ? <T style={{ color: colors.red }}>{err}</T> : null}
            <Button title={editing ? 'Save changes' : 'Schedule'} icon="checkmark-circle-outline" onPress={save} loading={busy} />
            {editing ? <Button title="Delete this live class" kind="danger" onPress={remove} /> : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
