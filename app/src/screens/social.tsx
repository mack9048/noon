import React, { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Grid, Header, IconButton, Loading, Pill, Row, Screen, Segmented, T } from '@/components/ui';
import { Field } from './auth';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useBase } from '@/lib/useBase';
import { useLayout } from '@/lib/useLayout';
import type { Conversation, LeaveRequest, LeaveSummary, Message } from '@/lib/types';
import { colors, fonts } from '@/theme/tokens';

/* ================= Chat (WhatsApp-style) ================= */

const roleTint: Record<string, readonly [string, string]> = { Teacher: colors.lav, Group: colors.mint, Admin: colors.sky, Parent: colors.pink };

export function ChatListScreen() {
  const base = useBase();
  const { device } = useLayout();
  const list = useApi<Conversation[]>('/conversations');
  const [filter, setFilter] = useState<'all' | 'unread' | 'group'>('all');
  const [openId, setOpenId] = useState<number | null>(null);
  const rows = (list.data ?? []).filter((c) => filter === 'all' || (filter === 'unread' ? c.unread > 0 : c.kind === 'group'));

  const listView = (
    <View style={{ flex: 1 }}>
      <Header title="Chats" back={false} />
      <Segmented value={filter} onChange={setFilter} activeColor={colors.green} options={[{ key: 'all', label: 'All' }, { key: 'unread', label: 'Unread' }, { key: 'group', label: 'Groups' }]} />
      <Card style={{ marginTop: 12, padding: 0 }}>
        {list.loading ? <Loading /> : rows.map((c) => {
          const tint = roleTint[c.role_label] ?? colors.sky;
          return (
            <Pressable key={c.id} accessibilityRole="button" onPress={() => (device === 'phone' ? router.push(`${base}/chat/${c.id}` as any) : setOpenId(c.id))}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: openId === c.id ? colors.bg : 'transparent' }}>
              <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: tint[0], alignItems: 'center', justifyContent: 'center' }}>
                <T style={{ fontFamily: fonts.semibold, color: tint[1] }}>{c.title.split(' ').map((w) => w[0]).slice(0, 2).join('')}</T>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Row gap={6}><T v="h3" numberOfLines={1} style={{ flexShrink: 1 }}>{c.title}</T><Pill text={c.role_label} tint={tint[0]} ink={tint[1]} /></Row>
                <T v="small" numberOfLines={1}>{c.last_message}</T>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <T v="small" style={{ color: c.unread ? colors.green : colors.muted }}>{c.last_at}</T>
                {c.unread ? <View style={{ minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }}><T style={{ color: '#FFF', fontSize: 11, fontFamily: fonts.semibold }}>{c.unread}</T></View> : null}
              </View>
            </Pressable>
          );
        })}
      </Card>
    </View>
  );

  // Tablet/desktop: WhatsApp-web style split view
  if (device !== 'phone') {
    return (
      <Screen scroll={false} style={{ flex: 1, flexDirection: 'row', gap: 16, paddingTop: 12 }}>
        <View style={{ width: 360 }}>{listView}</View>
        <View style={{ flex: 1, borderRadius: 24, overflow: 'hidden', backgroundColor: '#E9EEF6' }}>
          {openId ? <ChatThread id={openId} embedded /> : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><T v="small">Select a chat</T></View>}
        </View>
      </Screen>
    );
  }
  return <Screen>{listView}</Screen>;
}

export function ChatRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: '#E9EEF6' }}><ChatThread id={Number(id)} /></SafeAreaView>;
}

function ChatThread({ id, embedded = false }: { id: number; embedded?: boolean }) {
  const base = useBase();
  const msgs = useApi<Message[]>(`/conversations/${id}/messages`);
  const [text, setText] = useState('');
  const send = async (body: string) => {
    if (!body.trim()) return;
    setText('');
    const m = await api.post<Message>(`/conversations/${id}/messages`, { kind: 'text', body });
    msgs.setData([...(msgs.data ?? []), m]);
  };
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <Row gap={8} style={{ backgroundColor: '#FFF', padding: 10 }}>
        {!embedded ? <IconButton name="chevron-back" label="Back" onPress={() => router.back()} size={40} /> : null}
        <T v="h3" style={{ flex: 1 }}>Conversation</T>
        <IconButton name="videocam-outline" label="Video call" size={40} color={colors.teal} onPress={() => router.push(`${base}/live/0` as any)} />
        <IconButton name="call-outline" label="Voice call" size={40} color={colors.teal} />
      </Row>
      <FlatList
        data={msgs.data ?? []}
        keyExtractor={(m) => String(m.id)}
        contentContainerStyle={{ padding: 12, gap: 6 }}
        renderItem={({ item: m }) => (
          <View style={{ alignSelf: m.mine ? 'flex-end' : 'flex-start', maxWidth: '78%', backgroundColor: m.mine ? '#DCEBFF' : '#FFF', borderRadius: 16, borderTopRightRadius: m.mine ? 4 : 16, borderTopLeftRadius: m.mine ? 16 : 4, paddingHorizontal: 10, paddingVertical: 6 }}>
            {m.kind === 'file' ? <Row><Ionicons name="document" size={22} color="#E5484D" /><T>{m.body}</T></Row> : <T>{m.body}</T>}
            <Row gap={3} style={{ alignSelf: 'flex-end' }}>
              <T v="small" style={{ fontSize: 10 }}>{m.created_at}</T>
              {m.mine ? <Ionicons name="checkmark-done" size={14} color={m.seen ? '#2E8BEA' : colors.faint} /> : null}
            </Row>
          </View>
        )}
      />
      <Row gap={6} style={{ paddingHorizontal: 10, paddingBottom: 6 }}>
        {['JazakAllah khair', 'InshaAllah', 'Okay Ustad 👍'].map((q) => (
          <Pressable key={q} onPress={() => send(q)} style={{ borderRadius: 16, borderWidth: 1.5, borderColor: '#C9D7F0', backgroundColor: '#FFF', paddingHorizontal: 12, height: 32, justifyContent: 'center' }}><T v="small" style={{ color: colors.teal }}>{q}</T></Pressable>
        ))}
      </Row>
      <Row gap={8} style={{ padding: 10 }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 26, paddingHorizontal: 14, minHeight: 50 }}>
          <TextInput value={text} onChangeText={setText} placeholder="Message" placeholderTextColor={colors.faint} onSubmitEditing={() => send(text)} style={{ flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink, paddingVertical: 10 }} />
          <Ionicons name="attach" size={22} color={colors.muted} />
        </View>
        <IconButton name={text ? 'send' : 'mic'} label={text ? 'Send' : 'Record voice note'} tint={colors.teal} color="#FFF" size={50} onPress={() => send(text)} />
      </Row>
    </KeyboardAvoidingView>
  );
}

/* ================= Leave request ================= */

const statusTint: Record<LeaveRequest['status'], readonly [string, string]> = { approved: colors.mint, rejected: ['#FBD9DC', '#B4232B'], pending: colors.butter };
const leaveTypes = ['Sick leave', 'Casual leave', 'Family function', 'Travel', 'Other'];

export function LeaveScreen() {
  const data = useApi<LeaveSummary>('/leave-requests');
  const [type, setType] = useState(leaveTypes[0]);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try { await api.post('/leave-requests', { type, start_date: start, end_date: end || start, reason }); setReason(''); data.reload(); }
    finally { setBusy(false); }
  };
  const d = data.data;
  return (
    <Screen>
      <Header title="Leave request" />
      <Grid cols={{ phone: 1, tablet: 2, desktop: 2 }} gap={14}>
        <View style={{ gap: 12 }}>
          <Card style={{ gap: 10 }}>
            <T v="h2">Leave status</T>
            <Row gap={8}>
              {[['Total leave', d?.total, colors.lav], ['Used leave', d?.used, colors.butter], ['Remaining', d?.remaining, colors.mint]].map(([l, n, p]: any) => (
                <View key={l} style={{ flex: 1, height: 84, borderRadius: 20, backgroundColor: p[0], alignItems: 'center', justifyContent: 'center' }}>
                  <T style={{ fontFamily: fonts.semibold, fontSize: 28, color: p[1] }}>{n ?? '–'}</T><T v="small" style={{ color: p[1] }}>{l}</T>
                </View>
              ))}
            </Row>
          </Card>
          <Card tint="#F4F1FF" style={{ gap: 10 }}>
            <T v="h2">Apply for a leave</T>
            <T v="label">LEAVE TYPE</T>
            <Row gap={6} style={{ flexWrap: 'wrap' }}>
              {leaveTypes.map((t) => <Pressable key={t} onPress={() => setType(t)}><Pill text={t} tint={t === type ? colors.violet : '#FFF'} ink={t === type ? '#FFF' : colors.ink} /></Pressable>)}
            </Row>
            <Row gap={10}>
              <View style={{ flex: 1 }}><Field label="Start date" value={start} onChangeText={setStart} placeholder="YYYY-MM-DD" /></View>
              <View style={{ flex: 1 }}><Field label="End date" value={end} onChangeText={setEnd} placeholder="YYYY-MM-DD" /></View>
            </Row>
            <Field label="Reason" value={reason} onChangeText={setReason} multiline placeholder="Write the reason for leave" />
            <Button title="Submit request" kind="yellow" icon="paper-plane" loading={busy} disabled={!start} onPress={submit} />
          </Card>
        </View>
        <View style={{ gap: 8 }}>
          <T v="h2">Leave request history</T>
          {data.loading ? <Loading /> : (d?.requests ?? []).map((r) => {
            const p = statusTint[r.status];
            return (
              <Card key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: p[0], alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={r.status === 'approved' ? 'checkmark' : r.status === 'rejected' ? 'close' : 'time'} size={22} color={p[1]} />
                </View>
                <View style={{ flex: 1 }}><T v="h3">{r.type}</T><T v="small">{r.start_date} – {r.end_date}</T></View>
                <Pill text={r.status[0].toUpperCase() + r.status.slice(1)} tint={p[0]} ink={p[1]} />
              </Card>
            );
          })}
        </View>
      </Grid>
    </Screen>
  );
}

/* ================= Live class (meet) ================= */

export function LiveMeetScreen() {
  const [mic, setMic] = useState(false);
  const [cam, setCam] = useState(false);
  const [hand, setHand] = useState(false);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0C2129' }}>
      <View style={{ flex: 1, padding: 16, gap: 12, maxWidth: 1100, width: '100%', alignSelf: 'center' }}>
        <Row>
          <IconButton name="chevron-down" label="Minimise" tint="#17363F" color="#FFF" onPress={() => router.back()} />
          <View style={{ flex: 1 }}><T v="h3" style={{ color: '#FFF' }}>Live class</T><T v="small" style={{ color: '#9FC0CA' }}>Noon Meet</T></View>
          <Pill text="● REC" tint="#D6336C" ink="#FFF" />
        </Row>
        <LinearGradient colors={['#1D4A57', '#2B2366']} style={{ flex: 1, borderRadius: 30, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 116, height: 116, borderRadius: 58, backgroundColor: colors.lav[0], alignItems: 'center', justifyContent: 'center' }}><T style={{ fontFamily: fonts.semibold, fontSize: 38, color: '#2A1A5E' }}>UA</T></View>
          <T v="small" style={{ color: '#CFE2E8', marginTop: 12 }}>Connect a video SDK (Jitsi / LiveKit / Agora) here — see README</T>
        </LinearGradient>
        <Row style={{ justifyContent: 'center', gap: 12 }}>
          <IconButton name={mic ? 'mic' : 'mic-off'} label="Microphone" tint={mic ? '#FFF' : '#24505C'} color={mic ? colors.ink : '#FFF'} size={56} onPress={() => setMic(!mic)} />
          <IconButton name={cam ? 'videocam' : 'videocam-off'} label="Camera" tint={cam ? '#FFF' : '#24505C'} color={cam ? colors.ink : '#FFF'} size={56} onPress={() => setCam(!cam)} />
          <IconButton name="hand-left" label="Raise hand" tint={hand ? colors.yellow : '#24505C'} color={hand ? colors.ink : '#FFF'} size={56} onPress={() => setHand(!hand)} />
          <Button title="Leave" kind="danger" onPress={() => router.back()} />
        </Row>
      </View>
    </SafeAreaView>
  );
}

/* ================= Placeholder for screens not built yet ================= */

export function ComingSoon({ title }: { title: string }) {
  return (
    <Screen>
      <Header title={title} />
      <Card style={{ alignItems: 'center', gap: 8, paddingVertical: 40 }}>
        <T style={{ fontSize: 40 }}>🛠️</T>
        <T v="h3">Coming soon</T>
        <T v="small">This screen is designed in the canvas — build it next.</T>
      </Card>
    </Screen>
  );
}
