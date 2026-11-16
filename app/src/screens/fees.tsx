// Fees: the admin adds fees, records payments (with receipt numbers) and reminds parents on WhatsApp;
// students and parents see their own dues and receipts.
import React, { useState } from 'react';
import { Linking, Modal, Platform, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Empty, Header, Loading, Row, Screen, Segmented, T } from '@/components/ui';
import { Avatar, ListRow, pastel, Section, SmallButton, Tag } from '@/components/kit';
import { ChoiceChips, DateInput, Input, Panel, Select } from '@/components/kit2';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/lib/auth';
import { colors, fonts } from '@/theme/tokens';

export type FeeRow = {
  id: number; title: string; month: string; amount: number; due_date: string; status: 'due' | 'paid' | 'waived'; overdue_days: number;
  paid_amount: number | null; paid_at: string | null; method: string | null; receipt_no: string | null; note: string | null;
  student: { id: number; name: string; admission_no: string | null; cls: string | null; parent: string | null; parent_phone: string | null } | null;
};
type MonthFees = { month: string; summary: { expected: number; collected: number; paid: number; due: number; overdue: number }; fees: FeeRow[] };

export const rupee = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
export const thisMonth = () => new Date().toISOString().slice(0, 7);
const shiftMonth = (m: string, by: number) => { const d = new Date(`${m}-01T00:00:00`); d.setMonth(d.getMonth() + by); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
export const monthLabel = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
const dateLabel = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const METHOD = { cash: 'Cash', upi: 'UPI', bank: 'Bank transfer', card: 'Card' } as Record<string, string>;
const say = (m: string) => (Platform.OS === 'web' ? (globalThis as any).alert?.(m) : null);
const errText = (e: unknown, f: string) => (e instanceof ApiError ? e.friendly : f);

function remind(f: FeeRow) {
  const phone = f.student?.parent_phone?.replace(/\D/g, '');
  if (!phone) return say(`No WhatsApp number for ${f.student?.name ?? 'this student'}'s parent. Add it in Students → Edit.`);
  const msg = `Assalamu alaikum${f.student?.parent ? ` ${f.student.parent}` : ''}. This is a reminder from the madrasa office: ${f.title} for ${f.student?.name} (${rupee(f.amount)}) was due on ${dateLabel(f.due_date)}. Jazakallah khair.`;
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  if (Platform.OS === 'web') (globalThis as any).open?.(url, '_blank', 'noopener'); else Linking.openURL(url);
}

function downloadCsv(month: string, fees: FeeRow[]) {
  const rows = [['Student', 'Admission no', 'Class', 'Fee', 'Amount', 'Due date', 'Status', 'Paid', 'Paid on', 'Method', 'Receipt'],
    ...fees.map((f) => [f.student?.name ?? '', f.student?.admission_no ?? '', f.student?.cls ?? '', f.title, String(f.amount), f.due_date, f.status,
      f.paid_amount != null ? String(f.paid_amount) : '', f.paid_at ?? '', f.method ? METHOD[f.method] ?? f.method : '', f.receipt_no ?? ''])];
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  if (Platform.OS !== 'web') return say('Download works on the web app.');
  const a = (globalThis as any).document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }));
  a.download = `fees-${month}.csv`; a.click();
}

/* ---------- Printable receipt (Noon Learn header) ---------- */
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
function words(n: number): string {
  n = Math.floor(n);
  if (n === 0) return 'Zero';
  const two = (x: number) => (x < 20 ? ONES[x] : `${TENS[Math.floor(x / 10)]}${x % 10 ? ` ${ONES[x % 10]}` : ''}`);
  const three = (x: number) => `${x >= 100 ? `${ONES[Math.floor(x / 100)]} Hundred${x % 100 ? ' ' : ''}` : ''}${x % 100 ? two(x % 100) : ''}`;
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000), lakh = Math.floor((n % 10000000) / 100000), thou = Math.floor((n % 100000) / 1000), rest = n % 1000;
  if (crore) parts.push(`${words(crore)} Crore`);
  if (lakh) parts.push(`${two(lakh)} Lakh`);
  if (thou) parts.push(`${two(thou)} Thousand`);
  if (rest) parts.push(three(rest));
  return parts.join(' ');
}
const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export function downloadReceipt(f: FeeRow, institution?: string | null, contact?: { phone?: string | null; address?: string | null }) {
  if (Platform.OS !== 'web') return say('Receipts download on the web app.');
  const paid = f.paid_amount ?? f.amount;
  const logo = `${(globalThis as any).location.origin}/icons/noon-logo.png`;
  const row = (k: string, v: unknown) => (v ? `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>` : '');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${esc(f.receipt_no)}</title>
<style>
  *{box-sizing:border-box} body{margin:0;background:#EEF3F5;font-family:'Segoe UI',Roboto,Arial,sans-serif;color:#0F2A47}
  .r{max-width:720px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(15,42,71,.12)}
  .h{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:22px 28px;border-bottom:4px solid #0E5E78;background:linear-gradient(120deg,#F3F8FF,#FFF7EE)}
  .h img{height:54px} .h .t{text-align:right} .h b{display:block;font-size:22px;letter-spacing:.08em;color:#0E5E78} .h small{color:#5D6B80}
  .inst{padding:14px 28px 0;font-size:18px;font-weight:700}
  .meta{display:flex;justify-content:space-between;padding:6px 28px 14px;color:#5D6B80;font-size:14px}
  table{width:calc(100% - 56px);margin:0 28px;border-collapse:collapse;font-size:15px}
  th{text-align:left;width:38%;color:#5D6B80;font-weight:500;padding:9px 0;border-bottom:1px solid #E3E9F2} td{padding:9px 0;border-bottom:1px solid #E3E9F2;font-weight:600}
  .amt{margin:18px 28px;padding:16px 20px;border-radius:12px;background:#E8F7F2;display:flex;justify-content:space-between;align-items:center}
  .amt b{font-size:28px;color:#0E7A50} .amt span{font-size:13px;color:#2C6B55;max-width:60%}
  .f{display:flex;justify-content:space-between;align-items:flex-end;padding:26px 28px 24px;color:#5D6B80;font-size:12px}
  .sig{text-align:center} .sig div{width:180px;border-top:1px solid #9AA8B8;margin-bottom:4px}
  .btn{display:block;margin:0 auto 24px;padding:12px 26px;border:0;border-radius:24px;background:#0E5E78;color:#fff;font-size:15px;cursor:pointer}
  @media print{body{background:#fff}.r{box-shadow:none;margin:0;max-width:none;border-radius:0}.btn{display:none}}
</style></head><body>
<div class="r">
  <div class="h"><img src="${logo}" alt="Noon Learn"><div class="t"><b>FEE RECEIPT</b><small>noonlearn.com</small></div></div>
  ${institution ? `<div class="inst">${esc(institution)}${contact?.address || contact?.phone ? `<div style="font-size:13px;font-weight:400;color:#5D6B80">${esc([contact?.address, contact?.phone].filter(Boolean).join(' · '))}</div>` : ''}</div>` : ''}
  <div class="meta"><span>Receipt no. <b>${esc(f.receipt_no)}</b></span><span>Date: <b>${esc(f.paid_at ? dateLabel(f.paid_at) : dateLabel(new Date().toISOString().slice(0, 10)))}</b></span></div>
  <table>
    ${row('Student', f.student?.name)}${row('Admission no.', f.student?.admission_no)}${row('Class', f.student?.cls ? `Class ${f.student.cls}` : '')}
    ${row('Parent', f.student?.parent)}${row('Fee', f.title)}${row('For month', monthLabel(f.month))}${row('Fee amount', rupee(f.amount))}
    ${row('Paid by', METHOD[f.method ?? ''] ?? f.method)}${row('Note', f.note)}
  </table>
  <div class="amt"><span>Rupees ${esc(words(paid))} only</span><b>${esc(rupee(paid))}</b></div>
  <div class="f"><span>This is a computer-generated receipt from Noon Learn.<br>Jazakallah khair.</span><span class="sig"><div></div>Office signature</span></div>
</div>
<button class="btn" onclick="window.print()">Download / Print</button>
<script>window.onload=function(){setTimeout(function(){window.print()},400)}</script>
</body></html>`;
  const w = (globalThis as any).open('', '_blank');
  if (!w) return say('Please allow pop-ups to download the receipt.');
  w.document.open(); w.document.write(html); w.document.close();
}

/* ---------- Admin: fees of a month ---------- */
export function AdminFeesScreen() {
  const [month, setMonth] = useState(thisMonth());
  const [tab, setTab] = useState<'pending' | 'paid' | 'all'>('pending');
  const [pick, setPick] = useState<FeeRow | null>(null);
  const { data, loading, error, reload } = useApi<MonthFees>(`/admin/fees?month=${month}`);
  const fees = data?.fees ?? [];
  const shown = fees.filter((f) => tab === 'all' || (tab === 'paid' ? f.status === 'paid' : f.status === 'due')).sort((a, b) => b.overdue_days - a.overdue_days);
  const s = data?.summary;
  const pct = s && s.expected ? Math.round((s.collected / s.expected) * 100) : 0;
  return (
    <Screen>
      <Header title="Fees" right={<Row gap={8}>
        <Pressable accessibilityRole="button" accessibilityLabel="Download this month as a spreadsheet" disabled={!fees.length} onPress={() => downloadCsv(month, fees)} style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', opacity: fees.length ? 1 : 0.4 }}><Ionicons name="download-outline" size={21} color={colors.ink} /></Pressable>
        <SmallButton title="+ Add fees" filled tint={colors.ink} onPress={() => router.push(`/admin/fees/new?month=${month}` as any)} />
      </Row>} />
      <Row gap={8}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => setMonth(shiftMonth(month, -1))} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="chevron-back" size={20} color={colors.ink} /></Pressable>
        <View style={{ flex: 1, height: 44, borderRadius: 22, backgroundColor: colors.pink[0], alignItems: 'center', justifyContent: 'center' }}><T style={{ fontFamily: fonts.medium }}>{monthLabel(month)}</T></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => setMonth(shiftMonth(month, 1))} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="chevron-forward" size={20} color={colors.ink} /></Pressable>
      </Row>
      <Card style={{ marginTop: 12, gap: 10 }}>
        <Row style={{ justifyContent: 'space-between' }}><T v="small">Collected</T>{s?.expected ? <T v="small">{pct}% collected</T> : null}</Row>
        <T style={{ fontSize: 28, fontFamily: fonts.semibold }}>{rupee(s?.collected ?? 0)} <T v="small">of {rupee(s?.expected ?? 0)}</T></T>
        <Row style={{ justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10 }}>
          {([['Paid', s?.paid ?? 0, colors.green], ['Due', s?.due ?? 0, '#D9A92A'], ['Overdue', s?.overdue ?? 0, '#D6336C']] as const).map(([k, v, c]) => (
            <View key={k}><Row gap={6}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c }} /><T v="small">{k}</T></Row><T v="h3">{v}</T></View>
          ))}
        </Row>
      </Card>
      <View style={{ height: 12 }} />
      <Segmented value={tab} onChange={setTab} options={[{ key: 'pending', label: `Pending · ${(s?.due ?? 0) + (s?.overdue ?? 0)}` }, { key: 'paid', label: `Paid · ${s?.paid ?? 0}` }, { key: 'all', label: 'All' }]} />
      <View style={{ height: 10 }} />
      {loading && !data ? <Loading /> : error ? <Empty text={error} /> : !fees.length ? (
        <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 26 }}>
          <Ionicons name="wallet-outline" size={32} color={colors.teal} />
          <T v="h3">No fees for {monthLabel(month)}</T>
          <T v="small" style={{ textAlign: 'center' }}>Add this month's fee for all students, a class or a batch.</T>
          <Button title="Add fees" icon="add" onPress={() => router.push(`/admin/fees/new?month=${month}` as any)} />
        </Card>
      ) : !shown.length ? <Empty text={tab === 'pending' ? 'No pending fees. Alhamdulillah!' : 'Nothing here yet.'} /> : (
        <View style={{ gap: 8 }}>
          {shown.map((f) => {
            const tone = f.status === 'paid' ? pastel.mint : f.status === 'waived' ? pastel.lav : f.overdue_days ? pastel.pink : pastel.butter;
            return (
              <ListRow key={f.id} onPress={() => setPick(f)}
                left={<View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: tone[0], alignItems: 'center', justifyContent: 'center' }}>
                  <T style={{ fontSize: 11, fontFamily: fonts.semibold, color: tone[1] }}>{f.status === 'paid' ? '✓' : f.status === 'waived' ? 'Waived' : f.overdue_days ? `${f.overdue_days}d` : dateLabel(f.due_date).split(' ').slice(0, 2).join(' ')}</T>
                </View>}
                title={f.student?.name ?? 'Student'}
                sub={[f.student?.cls ? `Class ${f.student.cls}` : null, f.title, rupee(f.amount), f.status === 'paid' ? `${f.receipt_no} · ${METHOD[f.method ?? ''] ?? ''}` : null].filter(Boolean).join(' · ')}
                right={f.status === 'due' ? (
                  <Row gap={6}>
                    <SmallButton title="Remind" onPress={() => remind(f)} />
                    <SmallButton title="Paid" filled tint={colors.ink} onPress={() => setPick(f)} />
                  </Row>
                ) : <Tag text={f.status === 'paid' ? rupee(f.paid_amount ?? f.amount) : 'Waived'} tone={f.status === 'paid' ? 'mint' : 'lav'} />} />
            );
          })}
        </View>
      )}
      <PaySheet fee={pick} onClose={() => setPick(null)} onSaved={() => { setPick(null); reload(); }} />
    </Screen>
  );
}

function PaySheet({ fee, onClose, onSaved }: { fee: FeeRow | null; onClose: () => void; onSaved: () => void }) {
  const me = useAuth().user; const institution = me?.tenant_name; const contact = { phone: me?.tenant_phone, address: me?.tenant_address };
  const [method, setMethod] = useState<'cash' | 'upi' | 'bank' | 'card'>('cash');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [key, setKey] = useState<number | null>(null);
  if (fee && key !== fee.id) { setKey(fee.id); setAmount(String(fee.amount)); setNote(fee.note ?? ''); setErr(null); setMethod('cash'); setDate(new Date().toISOString().slice(0, 10)); }
  if (!fee) return null;
  const act = async (fn: () => Promise<unknown>) => { setBusy(true); setErr(null); try { await fn(); onSaved(); } catch (e) { setErr(errText(e, 'Could not save.')); } finally { setBusy(false); } };
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(10,20,30,0.45)', justifyContent: 'center', padding: 16 }}>
        <Pressable onPress={() => {}} style={{ backgroundColor: colors.bg, borderRadius: 26, padding: 18, gap: 12, maxWidth: 520, width: '100%', alignSelf: 'center' }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}><T v="h2">{fee.student?.name}</T><T v="small">{fee.title} · {rupee(fee.amount)} · due {dateLabel(fee.due_date)}</T></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={{ padding: 8 }}><Ionicons name="close" size={22} color={colors.ink} /></Pressable>
          </Row>
          {fee.status === 'paid' ? (
            <>
              <Card tint={colors.mint[0]} style={{ gap: 4 }}>
                <T v="h3" style={{ color: colors.mint[1] }}>Paid {rupee(fee.paid_amount ?? fee.amount)}</T>
                <T style={{ color: colors.mint[1] }}>Receipt {fee.receipt_no} · {METHOD[fee.method ?? ''] ?? ''} · {fee.paid_at ? dateLabel(fee.paid_at) : ''}</T>
              </Card>
              <Button title="Download receipt" icon="download-outline" onPress={() => downloadReceipt(fee, institution, contact)} />
              <Button title="Undo payment" kind="ghost" icon="arrow-undo-outline" loading={busy} onPress={() => act(() => api.patch(`/admin/fees/${fee.id}`, { status: 'due' }))} />
            </>
          ) : fee.status === 'waived' ? (
            <Button title="Make it due again" kind="ghost" icon="arrow-undo-outline" loading={busy} onPress={() => act(() => api.patch(`/admin/fees/${fee.id}`, { status: 'due' }))} />
          ) : (
            <>
              <T v="small" style={{ fontFamily: fonts.medium }}>Paid by</T>
              <ChoiceChips value={method} onChange={setMethod} options={[{ key: 'cash', label: 'Cash' }, { key: 'upi', label: 'UPI' }, { key: 'bank', label: 'Bank' }, { key: 'card', label: 'Card' }]} />
              <Row gap={10}><Input label="Amount (₹)" value={amount} onChangeText={(v) => setAmount(v.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" /><DateInput label="Paid on" value={date} onChange={setDate} max={new Date().toISOString().slice(0, 10)} /></Row>
              <Input label="Note (optional)" value={note} onChangeText={setNote} placeholder="e.g. UPI ref no." />
              <Button title="Mark as paid" icon="checkmark-circle-outline" loading={busy} onPress={() => act(() => api.post(`/admin/fees/${fee.id}/pay`, { method, amount: Number(amount) || fee.amount, paid_on: date, note: note || null }))} />
              <Row gap={8}>
                <View style={{ flex: 1 }}><Button title="Remind" kind="ghost" icon="logo-whatsapp" onPress={() => remind(fee)} /></View>
                <View style={{ flex: 1 }}><Button title="Waive" kind="ghost" onPress={() => act(() => api.patch(`/admin/fees/${fee.id}`, { status: 'waived' }))} /></View>
              </Row>
            </>
          )}
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => { if (Platform.OS !== 'web' || (globalThis as any).confirm?.('Delete this fee?')) act(() => api.del(`/admin/fees/${fee.id}`)); }} style={{ alignSelf: 'center', padding: 6 }}>
            <T style={{ color: colors.red, fontFamily: fonts.semibold }}>Delete this fee</T>
          </Pressable>
          {err ? <T style={{ color: colors.red }}>{err}</T> : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ---------- Admin: add fees ---------- */
export function AddFeesScreen({ month: initial }: { month?: string }) {
  const m0 = initial && /^\d{4}-\d{2}$/.test(initial) ? initial : thisMonth();
  const [month, setMonth] = useState(m0);
  const [title, setTitle] = useState(`${monthLabel(m0)} fee`);
  const [amount, setAmount] = useState('');
  const [due, setDue] = useState(`${m0}-10`);
  const [scope, setScope] = useState<'all' | 'class' | 'batch'>('all');
  const [classId, setClassId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const students = useApi<{ class_id: number | null; cls: string | null }[]>('/admin/students').data ?? [];
  const defFee = useApi<{ default_fee: number | null }>('/admin/institution').data?.default_fee;
  React.useEffect(() => { if (defFee && !amount) setAmount(String(defFee)); }, [defFee]); // eslint-disable-line react-hooks/exhaustive-deps
  const batches = useApi<{ id: number; name: string }[]>('/admin/batches').data ?? [];
  const classes = Array.from(new Map(students.filter((s) => s.class_id).map((s) => [String(s.class_id), `Class ${s.cls}`])).entries())
    .sort((a, b) => a[1].localeCompare(b[1], undefined, { numeric: true })).map(([key, label]) => ({ key, label }));
  const months = Array.from({ length: 15 }, (_, i) => shiftMonth(thisMonth(), i - 3)).map((k) => ({ key: k, label: monthLabel(k) }));
  const changeMonth = (m: string) => { setMonth(m); if (/fee$/.test(title)) setTitle(`${monthLabel(m)} fee`); setDue(`${m}-10`); };

  const save = async () => {
    setErr(null);
    if (title.trim().length < 2) return setErr('Give the fee a name, e.g. "November fee".');
    if (!(Number(amount) > 0)) return setErr('Enter the amount.');
    if (!due) return setErr('Choose the due date.');
    if (scope === 'class' && !classId) return setErr('Choose the class.');
    if (scope === 'batch' && !batchId) return setErr('Choose the batch.');
    setBusy(true);
    try {
      const r = await api.post<{ created: number; skipped: number }>('/admin/fees', { title: title.trim(), month, amount: Number(amount), due_date: due, scope,
        class_id: scope === 'class' ? Number(classId) : null, batch_id: scope === 'batch' ? Number(batchId) : null });
      say(`Added for ${r.created} student${r.created === 1 ? '' : 's'}.${r.skipped ? ` ${r.skipped} already had this fee.` : ''}`);
      router.replace('/admin/fees' as any);
    } catch (e) { setErr(errText(e, 'Could not add the fees.')); } finally { setBusy(false); }
  };

  return (
    <Screen>
      <Header title="Add fees" subtitle="One fee for every student you choose. Students who already have it are skipped." />
      <Panel title="FEE">
        <Select label="Month" value={month} options={months} onChange={changeMonth} />
        <Input label="Fee name" value={title} onChangeText={setTitle} placeholder="e.g. November fee, Admission fee, Exam fee" />
        <Row gap={10}><Input label="Amount (₹)" value={amount} onChangeText={(v) => setAmount(v.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" placeholder="800" /><DateInput label="Due date" value={due} onChange={setDue} /></Row>
      </Panel>
      <Panel title="FOR" style={{ marginBottom: 12 }}>
        <ChoiceChips value={scope} onChange={setScope} options={[{ key: 'all', label: 'All students' }, { key: 'class', label: 'One class' }, { key: 'batch', label: 'One batch' }]} />
        {scope === 'class' ? (classes.length ? <Select label="Class" value={classId} options={[{ key: '', label: 'Choose a class' }, ...classes]} onChange={setClassId} /> : <T v="small">No students with a class yet.</T>) : null}
        {scope === 'batch' ? (batches.length ? <Select label="Batch" value={batchId} options={[{ key: '', label: 'Choose a batch' }, ...batches.map((b) => ({ key: String(b.id), label: b.name }))]} onChange={setBatchId} /> : <T v="small">No batches yet.</T>) : null}
      </Panel>
      {err ? <T style={{ color: colors.red, marginBottom: 10 }}>{err}</T> : null}
      <Button title="Add fees" icon="checkmark-circle-outline" onPress={save} loading={busy} />
    </Screen>
  );
}

/* ---------- Student / parent ---------- */
export function MyFeesScreen() {
  const me = useAuth().user; const institution = me?.tenant_name; const contact = { phone: me?.tenant_phone, address: me?.tenant_address };
  const { data, loading, error } = useApi<{ due_total: number; fees: FeeRow[] }>('/fees');
  const [view, setView] = useState<'due' | 'paid'>('due');
  const fees = data?.fees ?? [];
  const due = fees.filter((f) => f.status === 'due');
  const paid = fees.filter((f) => f.status === 'paid');
  const many = new Set(fees.map((f) => f.student?.id)).size > 1;
  return (
    <Screen>
      <Header title="Fees" />
      <Segmented value={view} onChange={setView} options={[{ key: 'due', label: `Due${due.length ? ` · ${due.length}` : ''}` }, { key: 'paid', label: 'Paid & receipts' }]} />
      {loading && !data ? <Loading /> : error ? <Empty text={error} /> : view === 'due' ? (
        <>
          <Card tint={colors.butter[0]} style={{ marginTop: 14 }}>
            <T v="small" style={{ color: colors.butter[1] }}>Total due</T>
            <T style={{ fontSize: 34, fontFamily: fonts.semibold, color: colors.ink }}>{rupee(data?.due_total ?? 0)}</T>
            {due.length ? <T v="small">Please pay at your madrasa office. Your receipt shows here once the office records it.</T> : null}
          </Card>
          <Section title="To pay" />
          {due.length ? due.map((f) => (
            <ListRow key={f.id} style={{ marginBottom: 8 }} left={<Avatar name="₹" size={44} tint={f.overdue_days ? pastel.pink : pastel.butter} />}
              title={f.title} sub={`${many ? `${f.student?.name} · ` : ''}${rupee(f.amount)} · due ${dateLabel(f.due_date)}${f.overdue_days ? ` · ${f.overdue_days} days late` : ''}`} />
          )) : <Card tint={colors.mint[0]}><T v="h3" style={{ color: colors.mint[1] }}>No fees due</T><T style={{ color: colors.mint[1] }}>Jazakallah khair!</T></Card>}
        </>
      ) : (
        <View style={{ marginTop: 14, gap: 8 }}>
          {paid.length ? paid.map((f) => (
            <ListRow key={f.id} left={<Avatar name="✓" size={44} tint={pastel.mint} />} title={f.title}
              sub={`${many ? `${f.student?.name} · ` : ''}Receipt ${f.receipt_no} · paid ${f.paid_at ? dateLabel(f.paid_at) : ''} · ${METHOD[f.method ?? ''] ?? ''}`}
              right={<Row gap={8}><T style={{ fontFamily: fonts.semibold }}>{rupee(f.paid_amount ?? f.amount)}</T>
                <Pressable accessibilityRole="button" accessibilityLabel={`Download receipt ${f.receipt_no}`} onPress={() => downloadReceipt(f, institution, contact)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#EAF2FF', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="download-outline" size={18} color={colors.teal} /></Pressable></Row>} />
          )) : <Empty text="No payments yet." />}
        </View>
      )}
    </Screen>
  );
}

/** Current month's fee totals for the admin dashboard. */
export function useMonthFees() {
  return useApi<MonthFees>(`/admin/fees?month=${thisMonth()}`).data;
}
