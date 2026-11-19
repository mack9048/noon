// Attendance: teachers/admins mark a batch for a day; the admin sees real reports and tells parents;
// students and parents see their own record.
import React, { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Empty, Header, Loading, Row, Screen, Segmented, T } from '@/components/ui';
import { Avatar, ListRow, pastel, Section, SmallButton, Tabs, Tag } from '@/components/kit';
import { DateInput, Select } from '@/components/kit2';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/lib/auth';
import { colors, fonts } from '@/theme/tokens';

type Status = 'present' | 'absent' | 'late' | 'leave';
const S: Record<Status, { short: string; label: string; color: string; tint: readonly [string, string] }> = {
  present: { short: 'P', label: 'Present', color: '#2E8B47', tint: pastel.mint },
  absent: { short: 'A', label: 'Absent', color: '#C2304F', tint: pastel.pink },
  late: { short: 'L', label: 'Late', color: '#B07A12', tint: pastel.butter },
  leave: { short: 'Lv', label: 'Leave', color: '#5B43E0', tint: pastel.lav },
};
const today = () => new Date().toISOString().slice(0, 10);
const dateLabel = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
const say = (m: string) => (Platform.OS === 'web' ? (globalThis as any).alert?.(m) : null);

function openWhatsApp(phone: string | null | undefined, msg: string, who: string) {
  const p = phone?.replace(/\D/g, '');
  if (!p) return say(`No WhatsApp number for ${who}'s parent. Add it in Students → Edit.`);
  const url = `https://wa.me/${p}?text=${encodeURIComponent(msg)}`;
  if (Platform.OS === 'web') (globalThis as any).open?.(url, '_blank', 'noopener'); else Linking.openURL(url);
}

/* ---------- Teacher / admin: mark a batch ---------- */
type Sheet = { batch: { id: number; name: string }; date: string; marked: boolean; students: { id: number; name: string; admission_no: string | null; status: Status | null }[] };

export function MarkAttendanceScreen() {
  const batches = useApi<{ id: number; name: string }[]>('/staff/batches').data;
  const [batchId, setBatchId] = useState('');
  const [date, setDate] = useState(today());
  const [marks, setMarks] = useState<Record<number, Status>>({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (!batchId && batches?.length) setBatchId(String(batches[0].id)); }, [batches, batchId]);
  const { data: sheet, loading } = useApi<Sheet>(batchId ? `/staff/attendance?batch_id=${batchId}&date=${date}` : null);
  useEffect(() => {
    if (!sheet) return;
    setMarks(Object.fromEntries(sheet.students.map((s) => [s.id, s.status ?? 'present'])));
    setSaved(sheet.marked); setErr(null);
  }, [sheet]);
  const set = (id: number, st: Status) => { setMarks({ ...marks, [id]: st }); setSaved(false); };
  const count = (st: Status) => Object.values(marks).filter((x) => x === st).length;
  const save = async () => {
    if (!sheet) return;
    setBusy(true); setErr(null);
    try {
      await api.post('/staff/attendance', { batch_id: Number(batchId), date, marks: sheet.students.map((s) => ({ student_id: s.id, status: marks[s.id] ?? 'present' })) });
      setSaved(true);
    } catch (e) { setErr(e instanceof ApiError ? e.friendly : 'Could not save.'); } finally { setBusy(false); }
  };

  if (batches && !batches.length) {
    return <Screen><Header title="Mark attendance" /><Empty text="No batches yet. The office creates batches and adds students to them (More → Batches)." /></Screen>;
  }
  return (
    <Screen>
      <Header title="Mark attendance" subtitle={sheet ? `${sheet.batch.name} · ${dateLabel(date)}` : undefined}
        right={sheet?.students.length ? <SmallButton title="All present" onPress={() => { setMarks(Object.fromEntries(sheet.students.map((s) => [s.id, 'present']))); setSaved(false); }} /> : undefined} />
      <Row gap={10}>
        <View style={{ flex: 1.4 }}><Select label="Batch" value={batchId} options={(batches ?? []).map((b) => ({ key: String(b.id), label: b.name }))} onChange={setBatchId} /></View>
        <DateInput label="Date" value={date} onChange={(d) => setDate(d || today())} max={today()} />
      </Row>
      <Row gap={8} style={{ marginTop: 12 }}>
        {(['present', 'absent', 'late', 'leave'] as Status[]).map((st) => (
          <View key={st} style={{ flex: 1, backgroundColor: S[st].tint[0], borderRadius: 16, padding: 10 }}>
            <T v="small" style={{ color: S[st].tint[1] }}>{S[st].label}</T><T v="h3">{count(st)}</T>
          </View>
        ))}
      </Row>
      {loading && !sheet ? <Loading /> : !sheet ? null : !sheet.students.length ? <Empty text="No students in this batch yet. Add them in Batches or when editing a student." /> : (
        <View style={{ gap: 8, marginTop: 12 }}>
          {sheet.students.map((s) => (
            <ListRow key={s.id} title={s.name} sub={s.admission_no ?? undefined} right={
              <View accessibilityRole="radiogroup" accessibilityLabel={s.name} style={{ flexDirection: 'row', backgroundColor: colors.bg, borderRadius: 22, padding: 3, gap: 2 }}>
                {(['present', 'absent', 'late', 'leave'] as Status[]).map((st) => {
                  const on = marks[s.id] === st;
                  return (
                    <Pressable key={st} accessibilityRole="radio" accessibilityLabel={S[st].label} accessibilityState={{ checked: on }} onPress={() => set(s.id, st)}
                      style={{ minWidth: 38, height: 38, paddingHorizontal: 6, borderRadius: 19, backgroundColor: on ? S[st].color : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                      <T style={{ color: on ? '#FFF' : colors.muted, fontFamily: fonts.semibold, fontSize: 13 }}>{S[st].short}</T>
                    </Pressable>
                  );
                })}
              </View>
            } />
          ))}
        </View>
      )}
      {err ? <T style={{ color: colors.red, marginTop: 10 }}>{err}</T> : null}
      {sheet?.students.length ? (
        <View style={{ marginTop: 16 }}>
          <Button title={saved ? 'Attendance saved ✓' : sheet.marked ? 'Save changes' : 'Save attendance'} icon={saved ? undefined : 'checkmark-circle-outline'} kind={saved ? 'ghost' : 'primary'} loading={busy} onPress={save} />
        </View>
      ) : null}
    </Screen>
  );
}

/* ---------- Admin: report ---------- */
type Report = {
  period: 'today' | 'week' | 'month'; from: string; to: string; days: number; students: number;
  summary: { present: number; absent: number; late: number; leave: number; marks: number; percent: number | null };
  batches: { id: number; name: string; teacher: string | null; students: number; marks: number; percent: number | null; marked_today: boolean }[];
  absent: { id: number; name: string; cls: string | null; days: number; parent: string | null; parent_phone: string | null }[];
};

export function AttendanceReportScreen() {
  const [p, setP] = useState<'today' | 'week' | 'month'>('today');
  const [view, setView] = useState<'batch' | 'absent'>('batch');
  const { data: r, loading } = useApi<Report>(`/admin/attendance?period=${p}`);
  const s = r?.summary;
  const range = r ? (p === 'today' ? dateLabel(r.to) : `${dateLabel(r.from)} – ${dateLabel(r.to)} · ${r.days} class day${r.days === 1 ? '' : 's'}`) : '';
  const notMarked = (r?.batches ?? []).filter((b) => !b.marked_today && b.students > 0);
  return (
    <Screen>
      <Header title="Attendance report" right={<SmallButton title="Mark attendance" filled tint={colors.ink} onPress={() => router.push('/admin/attendance/mark' as any)} />} />
      <Segmented value={p} onChange={setP} activeColor={colors.pink[1]} options={[{ key: 'today', label: 'Today' }, { key: 'week', label: 'This week' }, { key: 'month', label: 'This month' }]} />
      {loading && !r ? <Loading /> : !r ? null : (
        <>
          <Card style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View accessibilityLabel={s?.percent == null ? 'No attendance yet' : `${s.percent} percent attendance`} style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 8, borderColor: s?.percent == null ? colors.line : '#2E8B47', alignItems: 'center', justifyContent: 'center' }}>
              <T style={{ fontFamily: fonts.semibold }}>{s?.percent == null ? '–' : `${s.percent}%`}</T>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Row style={{ justifyContent: 'space-between' }}>{(['present', 'absent', 'late', 'leave'] as Status[]).map((k) => <View key={k}><T v="small" style={{ color: S[k].color }}>{S[k].label}</T><T v="h3">{s?.[k] ?? 0}</T></View>)}</Row>
              <T v="small">{range}{r.students ? ` · ${r.students} students` : ''}</T>
            </View>
          </Card>
          {!s?.marks ? (
            <Card tint={colors.butter[0]} style={{ marginTop: 12, gap: 8 }}>
              <T v="h3">No attendance marked {p === 'today' ? 'today' : p === 'week' ? 'this week' : 'this month'} yet</T>
              <T v="small">Teachers mark attendance from their app (Attendance). You can also mark it here.</T>
              <Button title="Mark attendance" icon="checkbox-outline" onPress={() => router.push('/admin/attendance/mark' as any)} />
            </Card>
          ) : null}
          {p === 'today' && notMarked.length && s?.marks ? <T v="small" style={{ marginTop: 10, color: colors.red }}>Not marked yet today: {notMarked.map((b) => b.name).join(', ')}</T> : null}
          <Tabs value={view} onChange={setView} options={[{ key: 'batch', label: 'By batch' }, { key: 'absent', label: `Absent students · ${r.absent.length}` }]} />
          <View style={{ gap: 8 }}>
            {view === 'batch' ? (r.batches.length ? r.batches.map((b) => (
              <ListRow key={b.id} title={b.name} sub={[b.teacher, `${b.students} students`, p === 'today' ? (b.marked_today ? 'marked' : 'not marked') : null].filter(Boolean).join(' · ')}
                right={b.percent == null ? <Tag text="—" tone="white" /> : <View style={{ width: 120, gap: 4 }}>
                  <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.line }}><View style={{ width: `${b.percent}%`, height: 8, borderRadius: 4, backgroundColor: b.percent >= 85 ? colors.green : '#D9A92A' }} /></View>
                  <T style={{ textAlign: 'right', fontSize: 13, fontFamily: fonts.semibold }}>{b.percent}%</T></View>} />
            )) : <Empty text="No batches yet." />) : (r.absent.length ? r.absent.map((a) => (
              <ListRow key={a.id} left={<Avatar name={a.name} size={40} tint={pastel.pink} />} title={a.name}
                sub={[a.cls ? `Class ${a.cls}` : null, p === 'today' ? 'Absent today' : `Absent ${a.days} day${a.days > 1 ? 's' : ''}`].filter(Boolean).join(' · ')}
                right={<SmallButton title="Notify parent" onPress={() => openWhatsApp(a.parent_phone,
                  `Assalamu alaikum${a.parent ? ` ${a.parent}` : ''}. This is the institution office: ${a.name} was absent ${p === 'today' ? 'today' : `${a.days} day${a.days > 1 ? 's' : ''} ${p === 'week' ? 'this week' : 'this month'}`}. Please let us know if everything is all right. Jazakallah khair.`, a.name)} />} />
            )) : <Empty text="No absences. Alhamdulillah!" />)}
          </View>
        </>
      )}
    </Screen>
  );
}

/* ---------- Student / parent ---------- */
type Mine = { student: { id: number; name: string }; month: { present: number; absent: number; late: number; leave: number; percent: number | null }; days: { date: string; status: Status }[] }[];

export function MyAttendanceScreen() {
  const { user } = useAuth();
  const { data, loading, error } = useApi<Mine>('/attendance');
  return (
    <Screen>
      <Header title="Attendance" subtitle={new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} />
      {loading && !data ? <Loading /> : error ? <Empty text={error} /> : !data?.length ? <Empty text="No attendance yet." /> : data.map((k) => (
        <View key={k.student.id} style={{ marginBottom: 18 }}>
          {data.length > 1 || user?.role === 'parent' ? <Section title={k.student.name} /> : null}
          <Card tint={k.month.percent == null ? colors.line : colors.mint[0]} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Ionicons name={k.month.percent == null ? 'calendar-outline' : 'checkmark-circle'} size={30} color={colors.green} />
            <View style={{ flex: 1 }}>
              <T v="h3">{k.month.percent == null ? 'No attendance this month yet' : `${k.month.percent}% this month`}</T>
              <T v="small">{k.month.present} present · {k.month.absent} absent · {k.month.late} late · {k.month.leave} leave</T>
            </View>
          </Card>
          <Row gap={8} style={{ flexWrap: 'wrap', marginTop: 12 }}>
            {k.days.map((d) => (
              <View key={d.date} accessibilityLabel={`${dateLabel(d.date)}: ${S[d.status].label}`} style={{ width: 92, borderRadius: 14, padding: 8, backgroundColor: S[d.status].tint[0] }}>
                <T v="small" style={{ fontSize: 11 }}>{dateLabel(d.date)}</T>
                <T style={{ fontFamily: fonts.semibold, color: S[d.status].tint[1] }}>{S[d.status].label}</T>
              </View>
            ))}
          </Row>
          {!k.days.length ? <T v="small" style={{ marginTop: 8 }}>Your teacher marks attendance in class. It shows here.</T> : null}
        </View>
      ))}
    </Screen>
  );
}

/** This month's attendance percent for the signed-in student (profile stats). */
export function useMyAttendancePercent(): string {
  const d = useApi<Mine>('/attendance').data;
  const pct = d?.[0]?.month.percent;
  return pct == null ? '–' : `${pct}%`;
}
