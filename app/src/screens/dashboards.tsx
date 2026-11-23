// Dashboards for the institution admin, super admin and teachers (students keep their own home).
import React from 'react';
import { Image, Linking, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { T } from '@/components/ui';
import { ActionTile, ago, AreaLine, Bars, BigStat, Chip, DashHeader, DashPage, DashRow, DG, Glass, HeadPill, Legend, Panel, RecentRow, SoftStat, TINT, TodoNotes } from '@/components/dash';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/lib/auth';
import { money } from '@/lib/money';
import { colors, fonts } from '@/theme/tokens';
import { joinSession } from './live';

const go = (href: string) => () => router.push(href as any);
const initials = (s?: string | null) => (s ?? 'N').split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
const n = (v?: number) => (v ?? 0).toLocaleString('en-IN');
const rs = (v?: number) => `₹${Math.round(v ?? 0).toLocaleString('en-IN')}`;
const Loading = () => <DashPage><Glass style={{ padding: 30, alignItems: 'center' }}><T v="small">Loading the dashboard…</T></Glass></DashPage>;

function Logo({ url, text }: { url?: string | null; text: string }) {
  if (!url) return undefined as any;
  return <Image source={{ uri: url }} style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: '#FFF' }} resizeMode="contain" accessibilityLabel={`${text} logo`} />;
}

/** A short line of "needs attention" items. */
function Attention({ items }: { items: { icon: keyof typeof Ionicons.glyphMap; text: string; sub: string; href: string; tone: string }[] }) {
  if (!items.length) return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Ionicons name="checkmark-circle" size={22} color="#0E9F7E" /><T>All good, alhamdulillah. Nothing needs you now.</T></View>;
  return (
    <View style={{ gap: 8 }}>
      {items.map((a) => (
        <Pressable key={a.text} accessibilityRole="button" onPress={go(a.href)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFF', borderRadius: 16, padding: 12 }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: a.tone, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={a.icon} size={17} color={colors.ink} /></View>
          <View style={{ flex: 1 }}><T style={{ fontFamily: fonts.semibold }}>{a.text}</T><T v="small">{a.sub}</T></View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>
      ))}
    </View>
  );
}

/* ================= Institution admin ================= */
type AdminDash = {
  students: { total: number; blocked: number; with_dues: number }; teachers: number;
  fees: { month: string; expected: number; collected: number; pending: number; receipts: number; overdue: number; due_upcoming?: number; overdue_total: number; series: { label: string; expected: number; collected: number }[] };
  recent_payments: { id: number; name: string; title: string; amount: number; method: string | null; when: string | null }[];
  admissions: { new: number; series: { label: string; value: number }[] };
  attendance_today: { present: number; absent: number; marked: number }; leave_pending: number;
  today_classes: { id: number; title: string; starts_at: string; batch: { name: string } | null; state: string }[];
};

export function AdminDashboard() {
  const { user } = useAuth();
  const { data: d, reload } = useApi<AdminDash>('/admin/dashboard');
  const inst = useApi<{ academic_year: string | null; tagline: string | null }>('/admin/institution').data;
  if (!d) return <Loading />;
  const pct = d.fees.expected ? Math.round((d.fees.collected / d.fees.expected) * 100) : 0;
  const att = d.attendance_today.marked ? Math.round((d.attendance_today.present / d.attendance_today.marked) * 100) : null;
  const month = new Date(`${d.fees.month}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  return (
    <DashPage>
      <DashHeader badge={initials(user?.tenant_name)} logo={Logo({ url: user?.tenant_logo_url, text: user?.tenant_name ?? '' })} title={user?.tenant_name ?? 'Institution'} sub={inst?.tagline || 'Institution administration workspace'}
        right={<>
          {inst?.academic_year ? <HeadPill icon="checkmark-circle-outline" label={`${inst.academic_year} active`} tone="green" onPress={go('/admin/settings')} /> : null}
          <HeadPill icon="refresh" label="" onPress={reload} />
          <HeadPill icon="notifications-outline" dot={d.leave_pending + d.admissions.new > 0} onPress={go('/admin/leave')} />
          <HeadPill icon="settings-outline" onPress={go('/admin/settings')} />
        </>} />

      <DashRow>
        <Panel icon="people-outline" title="School overview" tint={TINT.mint}>
          <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
            <BigStat label="Total students" value={n(d.students.total)} sub={`${n(d.students.total - d.students.with_dues)} paid up · ${n(d.students.with_dues)} with dues`} g={DG.green} icon="school-outline" onPress={go('/admin/students')} />
            <BigStat label="Total staff" value={n(d.teachers)} sub="teachers" g={DG.sky} icon="briefcase-outline" onPress={go('/admin/teachers')} />
          </View>
          <Pressable accessibilityRole="button" onPress={go('/admin/students/new')} style={{ height: 48, borderRadius: 24, backgroundColor: '#0B7C6E', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Ionicons name="add" size={18} color="#FFF" /><T style={{ color: '#FFF', fontFamily: fonts.semibold }}>Admit a student</T>
          </Pressable>
        </Panel>

        <Panel icon="wallet-outline" title="Fees this month" right={<Chip text={month} />}>
          <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
            <BigStat center label="Collected" value={money(d.fees.collected)} sub={`${n(d.fees.receipts)} receipts`} g={['#11A57D', '#0B7C6E']} onPress={go('/admin/fees')} />
            <BigStat center label="Pending" value={money(d.fees.pending)} sub={`${n(d.fees.overdue)} overdue`} g={DG.red} onPress={go('/admin/fees')} />
          </View>
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T v="small">{pct}% collected</T><T v="small">of {money(d.fees.expected)}</T></View>
            <View style={{ height: 10, borderRadius: 5, backgroundColor: '#E6EEF2', overflow: 'hidden' }}><View style={{ width: `${pct}%`, height: 10, backgroundColor: '#10B981' }} /></View>
          </View>
        </Panel>

        <View style={{ gap: 16 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <ActionTile icon="arrow-down" title="Receive payment" sub="Mark a fee as paid" tint={['#DDF7EC', '#BDEFD9']} ink="#0B6B50" onPress={go('/admin/fees')} />
            <ActionTile icon="add-circle-outline" title="Add fees" sub="Create this month's fees" tint={['#FFE4E6', '#FECDD3']} ink="#9F1239" onPress={go('/admin/fees')} />
          </View>
          <TodoNotes />
        </View>
      </DashRow>

      <DashRow>
        <Panel icon="cash-outline" title="Outstanding payments" tint={TINT.peach}>
          <SoftStat label="Fee outstanding" sub={`${n(d.students.with_dues)} student${d.students.with_dues === 1 ? '' : 's'} past the due date`} value={money(d.fees.overdue_total)} icon="alert-circle-outline" tint={['#FFF8EE', '#FFEBD6']} />
          <SoftStat label="Due this month" sub="not yet past the due date" value={money(d.fees.due_upcoming ?? 0)} icon="time-outline" tint={['#FFF8EE', '#FFEBD6']} iconTint="#D97706" />
        </Panel>

        <Panel icon="trending-up-outline" title="Fee collection" right={<Chip text="6 months" tone="red" />} tint={TINT.rose}>
          <Legend items={[['#10B981', 'Collected'], ['#FDA4AF', 'Expected']]} />
          <Bars data={d.fees.series} a={(x) => x.collected} b={(x) => x.expected} format={(v) => rs(v)} />
        </Panel>

        <Panel icon="arrow-down-circle-outline" title="Recent payments" right={<Pressable onPress={go('/admin/fees')}><T style={{ color: '#0B7C6E', fontFamily: fonts.semibold, fontSize: 13 }}>View all</T></Pressable>}>
          {d.recent_payments.length ? d.recent_payments.map((p) => (
            <RecentRow key={p.id} icon="arrow-down" title={p.name} sub={`${p.title}${p.method ? ` · ${p.method.toUpperCase()}` : ''}`} amount={money(p.amount)} when={ago(p.when)} />
          )) : <T v="small">No payments yet.</T>}
        </Panel>
      </DashRow>

      <DashRow>
        <Panel icon="school-outline" title="Student admissions" right={<Chip text={`${d.admissions.new} new`} tone="green" onPress={go('/admin/admissions')} />} tint={TINT.mint}>
          <AreaLine data={d.admissions.series} />
          <T v="small">New students each month</T>
        </Panel>

        <Panel icon="calendar-outline" title="Today" tint={TINT.sky}>
          <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
            <SoftStat label="Present" value={att == null ? 'Not marked' : `${att}%`} sub={att == null ? 'Attendance not marked yet' : `${d.attendance_today.present} present · ${d.attendance_today.absent} absent`} icon="checkmark-done-outline" tint={['#F2FAFF', '#DDEFFC']} iconTint="#2563EB" />
          </View>
          {d.today_classes.length ? d.today_classes.map((c) => (
            <RecentRow key={c.id} icon="videocam-outline" iconTint="#7C3AED" title={c.title} sub={c.batch?.name ?? 'All students'} when={new Date(c.starts_at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })} />
          )) : <T v="small">No live classes today.</T>}
        </Panel>

        <Panel icon="flag-outline" title="Needs attention" tint={TINT.lilac}>
          <Attention items={[
            ...(d.fees.overdue ? [{ icon: 'alert-circle-outline' as const, text: `${d.fees.overdue} fee${d.fees.overdue > 1 ? 's' : ''} overdue`, sub: 'Remind parents on WhatsApp', href: '/admin/fees', tone: '#FFE4E6' }] : []),
            ...(d.admissions.new ? [{ icon: 'person-add-outline' as const, text: `${d.admissions.new} new application${d.admissions.new > 1 ? 's' : ''}`, sub: 'Review and admit', href: '/admin/admissions', tone: '#DCFCE7' }] : []),
            ...(d.leave_pending ? [{ icon: 'airplane-outline' as const, text: `${d.leave_pending} leave request${d.leave_pending > 1 ? 's' : ''}`, sub: 'Approve or decline', href: '/admin/leave', tone: '#E0F2FE' }] : []),
            ...(!d.students.total ? [{ icon: 'people-outline' as const, text: 'No students yet', sub: 'Add students one by one or in bulk', href: '/admin/students/new', tone: '#FEF3C7' }] : []),
          ]} />
        </Panel>
      </DashRow>
    </DashPage>
  );
}

/* ================= Super admin ================= */
type SuperDash = {
  tenants: { total: number; active: number }; students: number; teachers: number; guests: number;
  shop: { month: number; total: number; orders_month: number; to_handle: number; verifying: number; series: { label: string; value: number }[] };
  courses: { published: number; pending: number }; games_live: number;
  new_tenants: { label: string; value: number }[]; new_learners: { label: string; value: number }[];
  recent_orders: { id: number; ref: string; name: string; total: number; status: string; payment_status: string; when: string | null }[];
  recent_tenants: { id: number; name: string; code: string; students: number; logo_url: string | null; when: string | null }[];
};

export function SuperDashboard() {
  const { user } = useAuth();
  const { data: d, reload } = useApi<SuperDash>('/super/dashboard');
  if (!d) return <Loading />;
  return (
    <DashPage>
      <DashHeader badge="NL" title="Noon Learn" sub={`Super admin workspace · ${user?.name ?? ''}`}
        right={<>
          <HeadPill icon="add" label="New tenant" tone="green" onPress={go('/super/tenants/new')} />
          <HeadPill icon="refresh" onPress={reload} />
          <HeadPill icon="notifications-outline" dot={d.courses.pending + d.shop.verifying > 0} onPress={go('/super/approvals')} />
          <HeadPill icon="settings-outline" onPress={go('/super/settings')} />
        </>} />

      <DashRow>
        <Panel icon="business-outline" title="Platform overview" tint={TINT.mint}>
          <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
            <BigStat label="Institutions" value={n(d.tenants.total)} sub={`${n(d.tenants.active)} active`} g={DG.green} icon="business-outline" onPress={go('/super/tenants')} />
            <BigStat label="Learners" value={n(d.students + d.guests)} sub={`${n(d.students)} students · ${n(d.guests)} guests`} g={DG.sky} icon="people-outline" onPress={go('/super/users')} />
          </View>
          <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
            <SoftStat label="Teachers" value={n(d.teachers)} icon="person-outline" tint={['#FFFFFF', '#F1FBF7']} iconTint="#0E9F7E" />
            <SoftStat label="Courses live" value={n(d.courses.published)} icon="school-outline" tint={['#FFFFFF', '#F1FBF7']} iconTint="#0E9F7E" />
            <SoftStat label="Games live" value={n(d.games_live)} icon="game-controller-outline" tint={['#FFFFFF', '#F1FBF7']} iconTint="#0E9F7E" />
          </View>
        </Panel>

        <Panel icon="storefront-outline" title="Shop summary" right={<Chip text="This month" />}>
          <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
            <BigStat center label="Paid sales" value={rs(d.shop.month)} sub={`${n(d.shop.orders_month)} orders · ${rs(d.shop.total)} all time`} g={['#11A57D', '#0B7C6E']} onPress={go('/super/shop')} />
            <BigStat center label="To handle" value={n(d.shop.to_handle)} sub={`${n(d.shop.verifying)} UPI payments to check`} g={DG.red} onPress={go('/super/shop')} />
          </View>
          <T v="small">Sales each month</T>
          <Bars data={d.shop.series} a={(x) => x.value} height={90} format={(v) => rs(v)} />
        </Panel>

        <View style={{ gap: 16 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <ActionTile icon="checkmark-done-outline" title={`${d.courses.pending} to approve`} sub="Courses from institutions" tint={['#DDF7EC', '#BDEFD9']} ink="#0B6B50" onPress={go('/super/approvals')} />
            <ActionTile icon="log-in-outline" title="Log in as" sub="See the app as any user" tint={['#EDE9FE', '#DDD6FE']} ink="#5B21B6" onPress={go('/super/users')} />
          </View>
          <TodoNotes />
        </View>
      </DashRow>

      <DashRow>
        <Panel icon="trending-up-outline" title="New learners" right={<Chip text="6 months" tone="green" />} tint={TINT.mint}>
          <AreaLine data={d.new_learners} />
          <T v="small">Students and guests who joined each month</T>
        </Panel>
        <Panel icon="bar-chart-outline" title="New institutions" right={<Chip text="6 months" />} tint={TINT.lilac}>
          <Bars data={d.new_tenants} a={(x) => x.value} colorsA={DG.violet} />
        </Panel>
        <Panel icon="receipt-outline" title="Recent orders" right={<Pressable onPress={go('/super/shop')}><T style={{ color: '#0B7C6E', fontFamily: fonts.semibold, fontSize: 13 }}>View all</T></Pressable>}>
          {d.recent_orders.length ? d.recent_orders.map((o) => (
            <RecentRow key={o.id} icon={o.payment_status === 'paid' ? 'checkmark' : 'time-outline'} iconTint={o.payment_status === 'paid' ? '#10B981' : '#D97706'} title={o.name} sub={`${o.ref} · ${o.status}`} amount={rs(o.total)} when={ago(o.when)} />
          )) : <T v="small">No orders yet.</T>}
        </Panel>
      </DashRow>

      <DashRow cols={2}>
        <Panel icon="business-outline" title="Newest institutions" tint={TINT.sky} right={<Pressable onPress={go('/super/tenants')}><T style={{ color: '#0B7C6E', fontFamily: fonts.semibold, fontSize: 13 }}>All</T></Pressable>}>
          {d.recent_tenants.map((t) => (
            <Pressable key={t.id} onPress={go(`/super/tenants/${t.id}`)}>
              <RecentRow icon="business-outline" iconTint="#2563EB" title={t.name} sub={`Code ${t.code} · ${n(t.students)} students`} when={ago(t.when)} />
            </Pressable>
          ))}
        </Panel>
        <Panel icon="flash-outline" title="Quick links" tint={TINT.peach}>
          <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
            <ActionTile icon="library-outline" title="Madrasa Support" sub="Boards, classes, pictures" tint={['#FFFFFF', '#FFF4E6']} ink="#9A3412" onPress={go('/super/madrasa')} />
            <ActionTile icon="school-outline" title="Courses" sub="Create and edit" tint={['#FFFFFF', '#FFF4E6']} ink="#9A3412" onPress={go('/super/courses')} />
            <ActionTile icon="game-controller-outline" title="Games" sub="Upload HTML games" tint={['#FFFFFF', '#FFF4E6']} ink="#9A3412" onPress={go('/super/games')} />
          </View>
        </Panel>
      </DashRow>
    </DashPage>
  );
}

/* ================= Teacher ================= */
type LiveRow = { id: number; title: string; starts_at: string; duration_min: number; meet_url: string | null; batch: { name: string } | null; state: 'live' | 'upcoming' | 'ended' };
type TeacherDash = {
  batches: { id: number; name: string; students: number; class_label: string | null; class_teacher: boolean; marked_today: boolean }[];
  students: number; today: LiveRow[]; upcoming: LiveRow[]; attendance_week: { label: string; value: number }[]; leave_pending: number;
};
const time = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

export function TeacherDashboard() {
  const { user } = useAuth();
  const { data: d, reload } = useApi<TeacherDash>('/staff/dashboard');
  if (!d) return <Loading />;
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const unmarked = d.batches.filter((b) => !b.marked_today);
  return (
    <DashPage>
      <DashHeader badge={initials(user?.name)} title={`Assalamu alaikum, ${user?.name?.split(' ')[0] ?? ''}`} sub={`${user?.tenant_name ?? ''} · ${today}`}
        right={<>
          <HeadPill icon="refresh" onPress={reload} />
          <HeadPill icon="notifications-outline" dot={d.leave_pending > 0} onPress={go('/teacher/leave')} />
          <HeadPill icon="chatbubbles-outline" onPress={go('/teacher/chat')} />
        </>} />

      <DashRow>
        <Panel icon="people-outline" title="My classes" tint={TINT.mint}>
          <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
            <BigStat label="My students" value={n(d.students)} sub={`in ${d.batches.length} batch${d.batches.length === 1 ? '' : 'es'}`} g={DG.green} icon="school-outline" onPress={go('/teacher/classes')} />
            <BigStat label="Classes today" value={n(d.today.length)} sub={d.today[0] ? `First at ${time(d.today[0].starts_at)}` : 'No live class today'} g={DG.sky} icon="videocam-outline" onPress={go('/teacher/live')} />
          </View>
          <Pressable accessibilityRole="button" onPress={go('/teacher/attendance')} style={{ height: 48, borderRadius: 24, backgroundColor: '#0B7C6E', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Ionicons name="checkmark-done" size={18} color="#FFF" /><T style={{ color: '#FFF', fontFamily: fonts.semibold }}>Mark attendance</T>
          </Pressable>
        </Panel>

        <Panel icon="videocam-outline" title="Today's live classes" right={<Chip text={`${d.today.length} today`} />} tint={TINT.sky}>
          {d.today.length ? d.today.map((c) => (
            <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFF', borderRadius: 16, padding: 12 }}>
              <View style={{ width: 52, alignItems: 'center' }}><T style={{ fontFamily: fonts.semibold, color: c.state === 'live' ? '#DB2777' : colors.ink }}>{time(c.starts_at)}</T><T v="small">{c.duration_min}m</T></View>
              <View style={{ flex: 1 }}><T style={{ fontFamily: fonts.semibold }} numberOfLines={1}>{c.title}</T><T v="small">{c.batch?.name ?? 'All students'}</T></View>
              {c.state !== 'ended' ? (
                <Pressable onPress={() => joinSession(c.id)} style={{ backgroundColor: '#DB2777', borderRadius: 16, height: 34, paddingHorizontal: 14, justifyContent: 'center' }}><T style={{ color: '#FFF', fontFamily: fonts.semibold }}>▶ Start</T></Pressable>
              ) : <Chip text={c.state === 'ended' ? 'Done' : 'Later'} tone={c.state === 'ended' ? 'green' : 'violet'} />}
            </View>
          )) : <T v="small">No live classes today. Plan one from Live classes.</T>}
          {d.upcoming.length ? <T v="small">Next: {d.upcoming.map((u) => `${u.title} (${new Date(u.starts_at).toLocaleDateString('en-IN', { weekday: 'short' })} ${time(u.starts_at)})`).join(' · ')}</T> : null}
        </Panel>

        <View style={{ gap: 16 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <ActionTile icon="create-outline" title="New assessment" sub="Quick test or exam" tint={['#EDE9FE', '#DDD6FE']} ink="#5B21B6" onPress={go('/teacher/assess')} />
            <ActionTile icon="clipboard-outline" title="Review work" sub="Marks and feedback" tint={['#FFE4E6', '#FECDD3']} ink="#9F1239" onPress={go('/teacher/review')} />
          </View>
          <TodoNotes />
        </View>
      </DashRow>

      <DashRow>
        <Panel icon="stats-chart-outline" title="Attendance this week" right={<Chip text="7 days" tone="green" />} tint={TINT.mint}>
          <Bars data={d.attendance_week} a={(x) => x.value} format={(v) => `${v}%`} height={120} />
          <T v="small">Present % in your batches each day</T>
        </Panel>
        <Panel icon="grid-outline" title="My batches" tint={TINT.lilac}>
          {d.batches.length ? d.batches.map((b) => (
            <Pressable key={b.id} onPress={go('/teacher/attendance')}>
              <RecentRow icon="people-outline" iconTint="#7C3AED" title={b.name} sub={`${b.students} students${b.class_teacher ? ' · class teacher' : ''}`} when={b.marked_today ? 'Marked ✓' : 'Not marked'} />
            </Pressable>
          )) : <T v="small">You are not in a batch yet. Ask the office to add you.</T>}
        </Panel>
        <Panel icon="flag-outline" title="Needs attention" tint={TINT.peach}>
          <Attention items={[
            ...(unmarked.length ? [{ icon: 'calendar-outline' as const, text: `Attendance for ${unmarked.length} batch${unmarked.length > 1 ? 'es' : ''}`, sub: unmarked.map((b) => b.name).join(', '), href: '/teacher/attendance', tone: '#DCFCE7' }] : []),
            ...(d.leave_pending ? [{ icon: 'airplane-outline' as const, text: `${d.leave_pending} leave request${d.leave_pending > 1 ? 's' : ''}`, sub: 'Approve or decline', href: '/teacher/leave', tone: '#E0F2FE' }] : []),
          ]} />
        </Panel>
      </DashRow>
    </DashPage>
  );
}
