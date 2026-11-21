// Super admin: Madrasa Support boards (logo, names), classes per syllabus, subjects with thumbnails.
import React, { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Empty, Header, Loading, Row, Screen, Segmented, T } from '@/components/ui';
import { Input } from '@/components/kit2';
import { SmallButton, Tag } from '@/components/kit';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { appendFile, pickImage } from '@/lib/pickImage';
import { confirmBox, say } from '@/lib/dialog';
import { colors, fonts } from '@/theme/tokens';

type Syllabus = 'general' | 'english';
type BoardRow = { id: number; code: string; name: string; full_name: string | null; logo_url: string | null; active: boolean; syllabi: { key: Syllabus; label: string; classes: number }[] };
type SubjectRow = { id: number; class_id: number; name: string; name_ar: string | null; thumbnail_url: string | null; lessons_count: number };
type ClassRow = { id: number; label: string; syllabus: Syllabus; subjects: SubjectRow[] };

const err = (e: unknown, fallback: string) => say(e instanceof ApiError ? e.friendly : e instanceof Error ? e.message : fallback);

/** A square picture with a fallback letter, tap to change. */
function Thumb({ url, letter, size = 56, onPress, busy }: { url: string | null; letter: string; size?: number; onPress?: () => void; busy?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Change picture" onPress={onPress} disabled={busy}
      style={{ width: size, height: size, borderRadius: size / 4, overflow: 'hidden', backgroundColor: url ? '#FFF' : colors.mint[0], alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, opacity: busy ? 0.5 : 1 }}>
      {url ? <Image source={{ uri: url }} style={{ width: size, height: size }} resizeMode="cover" /> : <T style={{ fontFamily: fonts.semibold, fontSize: size / 2.6, color: colors.mint[1] }}>{letter.slice(0, 2).toUpperCase()}</T>}
      <View style={{ position: 'absolute', right: 2, bottom: 2, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="camera" size={11} color="#FFF" />
      </View>
    </Pressable>
  );
}

function BoardCard({ b, onSaved, selected, onSelect }: { b: BoardRow; onSaved: () => void; selected: boolean; onSelect: () => void }) {
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(b.name);
  const [full, setFull] = useState(b.full_name ?? '');
  const [busy, setBusy] = useState(false);
  const send = async (fd: FormData) => {
    setBusy(true);
    try { await api.post(`/super/madrasa/boards/${b.id}`, fd); onSaved(); } catch (e) { err(e, 'Could not save.'); } finally { setBusy(false); }
  };
  const logo = async () => {
    try { const f = await pickImage(); if (!f) return; const fd = new FormData(); appendFile(fd, 'logo', f); await send(fd); } catch (e) { err(e, 'Could not upload.'); }
  };
  const save = async () => { const fd = new FormData(); fd.append('name', name.trim()); fd.append('full_name', full.trim()); await send(fd); setEdit(false); };
  return (
    <Card onPress={onSelect} style={{ gap: 10, borderWidth: 2, borderColor: selected ? colors.teal : 'transparent' }}>
      <Row gap={12} style={{ alignItems: 'center' }}>
        <Thumb url={b.logo_url} letter={b.code} size={64} onPress={logo} busy={busy} />
        <View style={{ flex: 1 }}>
          <Row gap={8} style={{ alignItems: 'center' }}><T style={{ fontFamily: fonts.semibold, fontSize: 16 }}>{b.name}</T>{b.active ? null : <Tag text="Hidden from students" tone="butter" />}</Row>
          <T v="small">{b.full_name || 'No full name yet'}</T>
          <Row gap={6} style={{ marginTop: 6, flexWrap: 'wrap' }}>
            {b.syllabi.map((s) => <Tag key={s.key} text={`${s.label.replace(' Madrasa Syllabus', '')}: ${s.classes} classes`} tone={s.classes ? 'mint' : 'pink'} />)}
          </Row>
        </View>
        <SmallButton title={edit ? 'Close' : '✎ Edit'} onPress={() => setEdit(!edit)} />
      </Row>
      {edit ? (
        <View style={{ gap: 10 }}>
          <Input label="Short name" value={name} onChangeText={setName} placeholder="SKSVB (AP)" />
          <Input label="Full name" value={full} onChangeText={setFull} placeholder="Samastha Kerala Sunni Vidyabhyasa Board" />
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            <Button title="Save" icon="checkmark-circle-outline" loading={busy} onPress={save} />
            {b.logo_url ? <Button title="Remove logo" kind="ghost" onPress={() => { const fd = new FormData(); fd.append('remove_logo', '1'); send(fd); }} /> : null}
            <Button title={b.active ? 'Hide from students' : 'Show to students'} kind="ghost" icon={b.active ? 'eye-off-outline' : 'eye-outline'} onPress={() => { const fd = new FormData(); fd.append('active', b.active ? '0' : '1'); send(fd); }} />
          </Row>
        </View>
      ) : null}
    </Card>
  );
}

function SubjectTile({ s, onChanged }: { s: SubjectRow; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const thumb = async () => {
    try {
      const f = await pickImage(); if (!f) return;
      setBusy(true); const fd = new FormData(); appendFile(fd, 'thumbnail', f);
      await api.post(`/super/madrasa/subjects/${s.id}`, fd); onChanged();
    } catch (e) { err(e, 'Could not upload.'); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!(await confirmBox(`Delete the subject ${s.name}?`))) return;
    try { await api.del(`/super/madrasa/subjects/${s.id}`); onChanged(); } catch (e) { err(e, 'Could not delete.'); }
  };
  return (
    <View style={{ width: 120, alignItems: 'center', gap: 6, padding: 8, borderRadius: 16, backgroundColor: colors.bg }}>
      <Thumb url={s.thumbnail_url} letter={s.name} size={72} onPress={thumb} busy={busy} />
      <T style={{ fontFamily: fonts.medium, textAlign: 'center' }} numberOfLines={2}>{s.name}</T>
      <T v="small">{s.lessons_count} lessons</T>
      {s.thumbnail_url ? <Pressable onPress={async () => { const fd = new FormData(); fd.append('remove_thumbnail', '1'); await api.post(`/super/madrasa/subjects/${s.id}`, fd).catch((e) => err(e, 'Could not save.')); onChanged(); }}><T v="small" style={{ color: colors.muted, textDecorationLine: 'underline' }}>Remove picture</T></Pressable> : null}
      {s.lessons_count === 0 ? <Pressable accessibilityLabel={`Delete ${s.name}`} onPress={remove}><T v="small" style={{ color: colors.red }}>Delete</T></Pressable> : null}
    </View>
  );
}

function ClassBlock({ c, onChanged }: { c: ClassRow; onChanged: () => void }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const add = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try { await api.post(`/super/madrasa/classes/${c.id}/subjects`, { name: name.trim() }); setName(''); onChanged(); } catch (e) { err(e, 'Could not add.'); } finally { setBusy(false); }
  };
  const removeClass = async () => {
    if (!(await confirmBox(`Delete Class ${c.label} and its empty subjects?`))) return;
    try { await api.del(`/super/madrasa/classes/${c.id}`); onChanged(); } catch (e) { err(e, 'Could not delete.'); }
  };
  return (
    <Card style={{ gap: 10 }}>
      <Row style={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <T style={{ fontFamily: fonts.semibold, fontSize: 16 }}>Class {c.label}</T>
        <Row gap={8} style={{ alignItems: 'center' }}>
          <T v="small">{c.subjects.length} subjects</T>
          {c.subjects.every((s) => s.lessons_count === 0) ? <SmallButton title="Delete class" tint={colors.red} onPress={removeClass} /> : null}
        </Row>
      </Row>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {c.subjects.map((s) => <SubjectTile key={s.id} s={s} onChanged={onChanged} />)}
      </View>
      <Row gap={8} style={{ alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}><Input value={name} onChangeText={setName} placeholder="New subject, e.g. Fiqh" accessibilityLabel={`New subject for class ${c.label}`} onSubmitEditing={add} /></View>
        <Button title="Add" icon="add" loading={busy} onPress={add} />
      </Row>
    </Card>
  );
}

export function MadrasaSupportAdminScreen() {
  const { data: boards, reload } = useApi<BoardRow[]>('/super/madrasa/boards');
  const [boardId, setBoardId] = useState<number | null>(null);
  const [syl, setSyl] = useState<Syllabus>('general');
  const board = boards?.find((b) => b.id === boardId) ?? boards?.[0];
  const { data: classes, reload: reloadClasses, setData } = useApi<ClassRow[]>(board ? `/super/madrasa/boards/${board.id}/classes?syllabus=${syl}` : null);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  if (!boards) return <Loading />;
  const changed = () => { reloadClasses(); reload(); };
  const addClass = async () => {
    if (!board || !label.trim()) return;
    setBusy(true);
    try { setData(await api.post<ClassRow[]>(`/super/madrasa/boards/${board.id}/classes`, { syllabus: syl, label: label.trim() })); setLabel(''); reload(); }
    catch (e) { err(e, 'Could not add.'); } finally { setBusy(false); }
  };
  const copy = async () => {
    if (!board) return;
    const from: Syllabus = syl === 'english' ? 'general' : 'english';
    if (!(await confirmBox(`Copy all classes and subjects from the ${from === 'general' ? 'General' : 'English Medium'} syllabus into this one? Existing ones are kept.`))) return;
    setBusy(true);
    try { setData(await api.post<ClassRow[]>(`/super/madrasa/boards/${board.id}/copy`, { from, to: syl })); reload(); }
    catch (e) { err(e, 'Could not copy.'); } finally { setBusy(false); }
  };
  return (
    <Screen>
      <Header title="Madrasa Support" subtitle="Boards, syllabus, classes and subject pictures that children see" />
      <View style={{ gap: 10 }}>
        {boards.map((b) => <BoardCard key={b.id} b={b} selected={b.id === board?.id} onSelect={() => setBoardId(b.id)} onSaved={reload} />)}
      </View>
      {board ? (
        <View style={{ marginTop: 18, gap: 12 }}>
          <T style={{ fontFamily: fonts.semibold, fontSize: 17 }}>{board.name} · classes</T>
          <Segmented value={syl} onChange={setSyl} options={[{ key: 'general', label: 'General Madrasa Syllabus' }, { key: 'english', label: 'English Medium Madrasa Syllabus' }]} />
          <T v="small">Tap a subject picture to change it. Square pictures look best.</T>
          {!classes ? <Loading /> : classes.length === 0 ? (
            <Card style={{ gap: 10 }}>
              <Empty text="No classes in this syllabus yet." />
              <Button title={`Copy from ${syl === 'english' ? 'General' : 'English Medium'} syllabus`} icon="copy-outline" kind="ghost" loading={busy} onPress={copy} />
            </Card>
          ) : classes.map((c) => <ClassBlock key={c.id} c={c} onChanged={changed} />)}
          <Row gap={8} style={{ alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}><Input label="Add a class" value={label} onChangeText={setLabel} placeholder="e.g. 1" maxLength={5} onSubmitEditing={addClass} /></View>
            <Button title="Add class" icon="add" loading={busy} onPress={addClass} />
          </Row>
          {classes && classes.length > 0 ? <Button title={`Copy missing classes from ${syl === 'english' ? 'General' : 'English Medium'}`} kind="ghost" icon="copy-outline" onPress={copy} /> : null}
        </View>
      ) : null}
    </Screen>
  );
}
