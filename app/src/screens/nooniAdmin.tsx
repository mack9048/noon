// Super admin: Nooni mode (AI / free / auto) and the free-mode questions and answers.
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Empty, Header, Loading, Row, Screen, T } from '@/components/ui';
import { ChoiceChips, Input, Panel, Select } from '@/components/kit2';
import { Tag } from '@/components/kit';
import { NooniAvatar } from '@/components/Nooni';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { confirmBox, say } from '@/lib/dialog';
import { NOONI_SCREENS } from '@/lib/nooni';
import { colors, fonts } from '@/theme/tokens';

type Faq = { id: number; audience: 'all' | 'student' | 'guest' | 'teacher' | 'admin'; question: string; keywords: string | null; answer: string; answer_ml: string | null; open: string | null; active: boolean };
type Data = { mode: 'ai' | 'free' | 'auto'; ai_ready: boolean; faqs: Faq[] };
const AUD: Record<Faq['audience'], string> = { all: 'Everyone', student: 'Students & parents', guest: 'Guests', teacher: 'Teachers', admin: 'Admins' };
const MODES = [
  { key: 'auto' as const, title: 'Auto (recommended)', text: 'Simple questions from your list are answered free. Other questions use the AI. If the AI is off or the daily limit is reached, the list answers.' },
  { key: 'free' as const, title: 'Free only', text: 'No AI at all, no cost. Nooni answers only from your list below and suggests questions when it does not understand.' },
  { key: 'ai' as const, title: 'AI only', text: 'Every question goes to the AI (the list is still used if the AI fails).' },
];
const screenOptions = () => {
  const seen = new Map<string, string>();
  Object.values(NOONI_SCREENS).flat().forEach((s) => { if (!seen.has(s.key)) seen.set(s.key, s.label); });
  return [{ key: '', label: 'Do not open a page' }, ...Array.from(seen, ([key, label]) => ({ key, label: `${label} (${key})` }))];
};
type Form = { id?: number; audience: Faq['audience']; question: string; keywords: string; answer: string; answer_ml: string; open: string; active: boolean };
const blank: Form = { audience: 'all', question: '', keywords: '', answer: '', answer_ml: '', open: '', active: true };

export function NooniAdminScreen() {
  const { data, setData } = useApi<Data>('/super/nooni');
  const [form, setForm] = useState<Form | null>(null);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  if (!data) return <Screen><Loading /></Screen>;
  const run = async (fn: () => Promise<Data>) => { setBusy(true); try { setData(await fn()); return true; } catch (e) { say(e instanceof ApiError ? e.friendly : 'Could not save.'); return false; } finally { setBusy(false); } };
  const save = async () => {
    if (!form) return;
    if (!form.question.trim() || !form.answer.trim()) return say('Write the question and the answer.');
    const body = { audience: form.audience, question: form.question.trim(), keywords: form.keywords.trim() || null, answer: form.answer.trim(), answer_ml: form.answer_ml.trim() || null, open: form.open || null, active: form.active };
    if (await run(() => (form.id ? api.put<Data>(`/super/nooni/faqs/${form.id}`, body) : api.post<Data>('/super/nooni/faqs', body)))) setForm(null);
  };
  const list = data.faqs.filter((f) => `${f.question} ${f.keywords ?? ''} ${f.answer}`.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <Screen>
      <Row gap={12} style={{ alignItems: 'center' }}>
        <NooniAvatar size={56} mood="smile" />
        <View style={{ flex: 1 }}><Header title="Nooni" subtitle="How Nooni answers, and the questions it knows without AI" /></View>
      </Row>
      <Panel title="Mode" right={<Tag text={data.ai_ready ? 'AI key set' : 'No AI key'} tone={data.ai_ready ? 'mint' : 'butter'} />}>
        {MODES.map((m) => {
          const on = data.mode === m.key;
          return (
            <Pressable key={m.key} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => run(() => api.put<Data>('/super/nooni/mode', { mode: m.key }))}
              style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', borderRadius: 16, borderWidth: 2, borderColor: on ? colors.teal : colors.line, backgroundColor: on ? '#E9F6F3' : '#FFF', padding: 12 }}>
              <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={22} color={on ? colors.teal : colors.muted} />
              <View style={{ flex: 1 }}><T style={{ fontFamily: fonts.semibold }}>{m.title}</T><T v="small">{m.text}</T></View>
            </Pressable>
          );
        })}
        {!data.ai_ready && data.mode !== 'free' ? <T v="small" style={{ color: '#9A6700' }}>There is no AI key on the server, so Nooni uses the free list for now.</T> : null}
        <T v="small">Voice (listening and talking) is free in every mode. It works best in Chrome.</T>
      </Panel>

      <Panel title="Questions and answers" right={<Button title="Add question" icon="add" style={{ height: 40 }} onPress={() => setForm({ ...blank })} />} style={{ marginTop: 14, marginBottom: 100 }}>
        <T v="small">Nooni picks the question that shares the most words with what was asked. Add other words people may use (English or Malayalam) in “Other words”.</T>
        <Input value={q} onChangeText={setQ} placeholder="Search the list…" accessibilityLabel="Search questions" />
        {form ? (
          <Card style={{ gap: 10, borderWidth: 2, borderColor: colors.teal }}>
            <T style={{ fontFamily: fonts.semibold }}>{form.id ? 'Edit question' : 'New question'}</T>
            <Input label="Question" value={form.question} onChangeText={(v) => setForm({ ...form, question: v })} placeholder="e.g. When is the Eid holiday?" />
            <Input label="Other words (optional, comma separated)" value={form.keywords} onChangeText={(v) => setForm({ ...form, keywords: v })} placeholder="eid, holiday, പെരുന്നാൾ, അവധി" />
            <Input label="Answer (English)" value={form.answer} onChangeText={(v) => setForm({ ...form, answer: v })} multiline />
            <Input label="Answer in Malayalam (optional)" value={form.answer_ml} onChangeText={(v) => setForm({ ...form, answer_ml: v })} multiline />
            <Row gap={10} style={{ flexWrap: 'wrap' }}>
              <View style={{ flex: 1, minWidth: 200 }}><Select label="Who sees it" value={form.audience} options={(Object.keys(AUD) as Faq['audience'][]).map((k) => ({ key: k, label: AUD[k] }))} onChange={(v) => setForm({ ...form, audience: v })} /></View>
              <View style={{ flex: 1, minWidth: 200 }}><Select label="Open this page after answering" value={form.open} options={screenOptions()} onChange={(v) => setForm({ ...form, open: v })} /></View>
            </Row>
            <ChoiceChips value={form.active ? 'on' : 'off'} onChange={(v) => setForm({ ...form, active: v === 'on' })} options={[{ key: 'on', label: 'In use' }, { key: 'off', label: 'Hidden' }]} />
            <Row gap={8}><Button title="Save" icon="checkmark" loading={busy} onPress={save} /><Button title="Cancel" kind="ghost" onPress={() => setForm(null)} /></Row>
          </Card>
        ) : null}
        {!list.length ? <Empty text="No questions yet." /> : list.map((f) => (
          <View key={f.id} style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: f.active ? '#FFF' : '#F4F6F8', padding: 12, gap: 6 }}>
            <Row gap={8} style={{ flexWrap: 'wrap' }}>
              <T style={{ flex: 1, fontFamily: fonts.semibold }}>{f.question}</T>
              <Tag text={AUD[f.audience]} tone="sky" />
              {f.open ? <Tag text={`opens ${f.open}`} tone="mint" /> : null}
              {!f.active ? <Tag text="Hidden" tone="pink" /> : null}
            </Row>
            <T v="small" numberOfLines={2}>{f.answer}</T>
            {f.answer_ml ? <T v="small" numberOfLines={1}>{f.answer_ml}</T> : null}
            <Row gap={8}>
              <Button title="Edit" kind="ghost" icon="create-outline" style={{ height: 36 }} onPress={() => setForm({ id: f.id, audience: f.audience, question: f.question, keywords: f.keywords ?? '', answer: f.answer, answer_ml: f.answer_ml ?? '', open: f.open ?? '', active: f.active })} />
              <Button title="Delete" kind="ghost" style={{ height: 36 }} onPress={async () => { if (await confirmBox(`Delete “${f.question}”?`)) run(() => api.del<Data>(`/super/nooni/faqs/${f.id}`)); }} />
            </Row>
          </View>
        ))}
      </Panel>
    </Screen>
  );
}
