import React, { useState } from 'react';
import { Image, Pressable, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLayout } from '@/lib/useLayout';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { choiceReady, emptyChoice, InstitutionChoice, InstitutionPicker, joinInstitution, RequestSent } from '@/components/InstitutionPicker';
import { Button, Card, Grid, Header, Screen, T } from '@/components/ui';
import { Field } from './auth';
import { InstallAppButton } from '@/components/InstallApp';
import { api, ApiError } from '@/lib/api';
import { homeFor, useAuth } from '@/lib/auth';
import type { User } from '@/lib/types';
import { colors, fonts } from '@/theme/tokens';

const links: [string, string, keyof typeof Ionicons.glyphMap, readonly [string, string]][] = [
  ['Quran & Hifz', '/guest/quran', 'book', colors.mint],
  ['Study tools', '/guest/tools/chart', 'document-text', colors.butter],
  ['Our Courses', '/guest/courses', 'school', colors.sky],
  ['Shop', '/guest/shop', 'storefront', colors.butter],
  ['Change my class', '/join', 'swap-horizontal', colors.lav],
];

/** Guest "More" tab: join an institution with its code, other sections, log out. */
export function GuestMoreScreen() {
  const { user, logout, refresh } = useAuth();
  const [inst, setInst] = useState<InstitutionChoice>(emptyChoice);
  const [sent, setSent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const join = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await joinInstitution(inst);
      if (r.requested) { setSent(r.requested); return; }
      await refresh();
      router.replace(homeFor(r.user!.role) as any);
    } catch (e: any) {
      setErr(e instanceof ApiError ? e.friendly : e?.message ?? 'Could not join. Please try again.');
    } finally { setBusy(false); }
  };

  return (
    <Screen>
      <Header title="More" back={false} />

      <Card style={{ gap: 12, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.sky[0], alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="school" size={22} color={colors.sky[1]} />
          </View>
          <View style={{ flex: 1 }}>
            <T v="h3">Join your institution</T>
            <T v="small">Unlock class chat, attendance, fees, leave and report cards.</T>
          </View>
        </View>
        {sent ? <RequestSent name={sent} /> : <InstitutionPicker value={inst} onChange={(c) => { setInst(c); setErr(null); }} />}
        {err ? <T style={{ color: colors.red }}>{err}</T> : null}
        {sent ? null : <Button title={inst.picked ? 'Send join request' : 'Join institution'} icon="arrow-forward" onPress={join} loading={busy} disabled={!choiceReady(inst)} />}
        {sent ? null : <T v="small">Type the code from your institution office to join at once, or pick your institution from the list.</T>}
      </Card>

      <Grid cols={{ phone: 2, tablet: 3, desktop: 4 }}>
        {links.map(([label, href, icon, pastel]) => (
          <Card key={href} onPress={() => router.push(href as any)} style={{ gap: 10, minHeight: 100 }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: pastel[0], alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={icon} size={22} color={pastel[1]} />
            </View>
            <T v="h3">{label}</T>
          </Card>
        ))}
        <Card onPress={() => logout().then(() => router.replace('/login' as any))} style={{ gap: 10, minHeight: 100 }}>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#FBD9DC', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="log-out" size={22} color={colors.red} />
          </View>
          <T v="h3">Log out</T>
          {user ? <T v="small">Signed in as {user.name}</T> : null}
        </Card>
      </Grid>
    </Screen>
  );
}

export type MoreLink = [label: string, href: string, icon: keyof typeof Ionicons.glyphMap, pastel: readonly [string, string]];

const roleName: Record<string, string> = { student: 'Student', parent: 'Parent', teacher: 'Teacher', admin: 'Institute admin', super_admin: 'Super admin', guest: 'Guest' };

export const STUDENT_MORE: MoreLink[] = [
  ['Live classes', '/student/live', 'videocam-outline', colors.pink],
  ['Meetings', '/student/meetings', 'people-circle-outline', colors.sky],
  ['Profile', '/student/profile', 'person-outline', colors.lav],
  ['Fees', '/student/fees', 'card-outline', colors.mint],
  ['Attendance', '/student/attendance', 'calendar-outline', colors.butter],
  ['Audio Book', '/student/audio', 'headset-outline', colors.pink],
  ['Settings', '/student/settings', 'settings-outline', colors.sky],
  ['Help', '/student/help', 'help-circle-outline', ['#FFFFFF', colors.ink]],
];
export const TEACHER_MORE: MoreLink[] = [
  ['Live classes', '/teacher/live', 'videocam-outline', colors.pink],
  ['Course management', '/teacher/manage', 'folder-open-outline', colors.lav],
  ['Meetings', '/teacher/meetings', 'people-circle-outline', colors.sky],
  ['Review work', '/teacher/review', 'clipboard-outline', colors.sky],
  ['Assess Salah', '/teacher/assess', 'ribbon-outline', colors.mint],
  ['Leave', '/teacher/leave', 'calendar-outline', colors.lav],
];
export const ADMIN_MORE: MoreLink[] = [
  ['Shop', '/admin/shop', 'storefront-outline', colors.butter],
  ['Live classes', '/admin/live', 'videocam-outline', colors.pink],
  ['People & passwords', '/admin/people', 'key-outline', colors.butter],
  ['Admissions', '/admin/admissions', 'person-add-outline', colors.mint],
  ['Batches', '/admin/batches', 'people-outline', colors.sky],
  ['Course management', '/admin/manage', 'folder-open-outline', colors.lav],
  ['Meetings', '/admin/meetings', 'people-circle-outline', colors.mint],
  ['Courses', '/admin/courses', 'school-outline', colors.lav],
  ['Attendance', '/admin/attendance', 'stats-chart-outline', colors.butter],
  ['Bulk add', '/admin/bulk', 'cloud-upload-outline', colors.pink],
  ['Leave', '/admin/leave', 'calendar-outline', colors.sky],
  ['Profile', '/admin/profile', 'person-circle-outline', colors.lav],
  ['Settings', '/admin/settings', 'settings-outline', colors.mint],
];
export const SUPER_MORE: MoreLink[] = [
  ['Shop · orders', '/super/shop', 'storefront-outline', colors.butter],
  ['Website', '/super/website', 'globe-outline', colors.mint],
  ['Users · Log in as', '/super/users', 'people-outline', colors.sky],
  ['Course management', '/super/manage', 'folder-open-outline', colors.lav],
  ['Courses', '/super/courses', 'school-outline', colors.lav],
  ['Madrasa Support', '/super/madrasa', 'library-outline', colors.mint],
  ['Nooni', '/super/nooni', 'chatbubble-ellipses-outline', colors.sky],
  ['Approvals', '/super/approvals', 'checkmark-done-outline', colors.mint],
  ['Games', '/super/games', 'game-controller-outline', colors.pink],
  ['Study tools', '/super/tools', 'document-text-outline', colors.butter],
  ['Profile', '/super/profile', 'person-circle-outline', colors.sky],
  ['Settings', '/super/settings', 'settings-outline', colors.lav],
];

/** One line under each tile, so people know what is inside. */
const DESC: Record<string, string> = {
  'Shop · orders': 'Products, orders, payments', Shop: 'Books, charts and more', Website: 'Pages, pictures, publish',
  'Users · Log in as': 'Everyone, open their app', 'Course management': 'Lessons, content, approvals', Courses: 'All courses and status',
  'Madrasa Support': 'Boards, classes, subjects', Nooni: 'AI or free mode, answers', Approvals: 'Courses from institutions', Games: 'Upload and arrange games',
  'Study tools': 'Charts, adkar, slides, audio', Profile: 'Your details', Settings: 'App and account settings',
  Meetings: 'Meet everyone together', 'Live classes': 'Times and links', 'People & passwords': 'Logins and resets',
  Admissions: 'Enquiries and applications', Batches: 'Groups and timetables', Attendance: 'Daily marks and reports',
  'Bulk add': 'Add many students at once', Leave: 'Requests to approve', Fees: 'Dues and receipts', 'Audio Book': 'Listen and learn',
  Help: 'Questions and support', 'Review work': 'Marks and feedback', 'Assess Salah': 'Practical checks',
};

/** Which section each tile belongs to, in the order shown. */
const GROUPS: { key: string; title: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'learn', title: 'Teaching & learning', icon: 'school-outline' },
  { key: 'people', title: 'Students & people', icon: 'people-outline' },
  { key: 'money', title: 'Shop & website', icon: 'storefront-outline' },
  { key: 'account', title: 'Account', icon: 'person-circle-outline' },
];
const GROUP_OF: Record<string, string> = {
  'Course management': 'learn', Courses: 'learn', Nooni: 'learn', 'Madrasa Support': 'learn', Approvals: 'learn', Games: 'learn', 'Study tools': 'learn',
  'Live classes': 'learn', Meetings: 'learn', 'Review work': 'learn', 'Assess Salah': 'learn', 'Audio Book': 'learn',
  'Users · Log in as': 'people', 'People & passwords': 'people', Admissions: 'people', Batches: 'people', 'Bulk add': 'people',
  Attendance: 'people', Leave: 'people', Fees: 'people',
  'Shop · orders': 'money', Shop: 'money', Website: 'money',
  Profile: 'account', Settings: 'account', Help: 'account',
};

/**
 * The "More" menu: a profile banner, then tiles with an icon, a name and one line about them.
 * Used as the phone pop-up above the tab bar (compact), and as the More page on tablet/desktop.
 */
export function MoreMenu({ links, onNavigate, profileHref, logout: withLogout, page }: {
  links: MoreLink[]; onNavigate?: () => void; profileHref?: string; logout?: boolean; page?: boolean;
}) {
  const { user, logout } = useAuth();
  const { device } = useLayout();
  const [q, setQ] = useState('');
  const go = (href: string) => { onNavigate?.(); router.push(href as any); };
  const signOut = () => { onNavigate?.(); logout().then(() => router.replace('/login' as any)); };
  const name = user?.name ?? 'Me';
  const role = roleName[user?.role ?? ''] ?? (user?.role === 'super' ? 'Super admin' : '');
  const sub = [role, user?.tenant_name].filter(Boolean).join(' · ');
  const shown = links.filter(([label]) => label.toLowerCase().includes(q.trim().toLowerCase()));
  const cols = page ? (device === 'desktop' ? 4 : device === 'tablet' ? 3 : 2) : 3;
  const toRows = (list: MoreLink[]) => {
    const out: (MoreLink | null)[][] = [];
    for (let i = 0; i < list.length; i += cols) {
      const row: (MoreLink | null)[] = list.slice(i, i + cols);
      while (row.length < cols) row.push(null);
      out.push(row);
    }
    return out;
  };
  const flat = device === 'phone';
  const sections = GROUPS.map((g) => ({ ...g, list: shown.filter(([label]) => (GROUP_OF[label] ?? 'learn') === g.key) })).filter((g) => g.list.length);
  return (
    <View style={{ gap: page ? 16 : 12 }}>
      <LinearGradient colors={['#0B5166', '#14776E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ borderRadius: 24, padding: page ? 18 : 14, flexDirection: 'row', alignItems: 'center', gap: 14, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', right: -40, top: -50, width: 170, height: 170, borderRadius: 85, backgroundColor: 'rgba(255,255,255,0.08)' }} />
        <View style={{ position: 'absolute', right: 70, bottom: -60, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.06)' }} />
        {user?.tenant_logo_url && user.role !== 'student' ? (
          <Image source={{ uri: user.tenant_logo_url }} style={{ width: page ? 58 : 48, height: page ? 58 : 48, borderRadius: 18, backgroundColor: '#FFF' }} resizeMode="contain" />
        ) : (
          <View style={{ width: page ? 58 : 48, height: page ? 58 : 48, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center' }}>
            <T style={{ color: colors.teal, fontSize: page ? 22 : 19, fontFamily: fonts.semibold }}>{name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()}</T>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <T style={{ color: '#FFF', fontFamily: fonts.semibold, fontSize: page ? 19 : 16 }} numberOfLines={1}>{name}</T>
          <T style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }} numberOfLines={1}>{sub}</T>
        </View>
        {profileHref ? (
          <Pressable accessibilityRole="button" accessibilityLabel="My profile" onPress={() => go(profileHref)}
            style={{ height: 38, paddingHorizontal: 14, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.16)', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="person-outline" size={16} color="#FFF" />{page ? <T style={{ color: '#FFF', fontFamily: fonts.semibold, fontSize: 13 }}>Profile</T> : null}
          </Pressable>
        ) : null}
        {withLogout ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Log out" onPress={signOut}
            style={{ height: 38, paddingHorizontal: 14, borderRadius: 19, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="log-out-outline" size={16} color={colors.red} />{page || device !== 'phone' ? <T style={{ color: colors.red, fontFamily: fonts.semibold, fontSize: 13 }}>Log out</T> : null}
          </Pressable>
        ) : null}
      </LinearGradient>

      {page ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF', borderRadius: 22, borderWidth: 1, borderColor: '#DCE7EB', paddingHorizontal: 16, height: 46 }}>
          <Ionicons name="search" size={17} color={colors.muted} />
          <TextInput value={q} onChangeText={setQ} placeholder="Find a section…" placeholderTextColor={colors.faint} accessibilityLabel="Find a section"
            style={{ flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink, outlineStyle: 'none' } as any} />
          {q ? <Pressable onPress={() => setQ('')} accessibilityLabel="Clear"><Ionicons name="close-circle" size={18} color={colors.muted} /></Pressable> : null}
        </View>
      ) : null}

      {/* Phones: one flat grid of small icons, 4 in a row (no categories). */}
      {flat ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 14, backgroundColor: '#FFF', borderRadius: 22, paddingVertical: 14, paddingHorizontal: 4, borderWidth: 1, borderColor: '#E1EAEE' }}>
          {shown.map((t) => (
            <Pressable key={t[1]} accessibilityRole="button" accessibilityLabel={t[0]} onPress={() => go(t[1])}
              style={({ pressed }) => ({ width: '25%', alignItems: 'center', gap: 6, paddingHorizontal: 2, opacity: pressed ? 0.7 : 1 })}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: t[3][0], alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={t[2]} size={20} color={t[3][1]} />
              </View>
              <T numberOfLines={2} style={{ fontFamily: fonts.medium, fontSize: 11, lineHeight: 13, color: colors.ink, textAlign: 'center' }}>{t[0]}</T>
            </Pressable>
          ))}
        </View>
      ) : sections.map((sec) => (
        <View key={sec.key} style={{ gap: page ? 10 : 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: page ? 4 : 2 }}>
            <Ionicons name={sec.icon} size={page ? 17 : 15} color={colors.teal} />
            <T style={{ fontFamily: fonts.semibold, fontSize: page ? 13 : 12, letterSpacing: 0.8, color: colors.teal }}>{sec.title.toUpperCase()}</T>
            <View style={{ flex: 1, height: 1, backgroundColor: '#D5E3E8' }} />
            {page ? <T v="small">{sec.list.length}</T> : null}
          </View>
      {toRows(sec.list).map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', gap: page ? 12 : 8 }}>
          {row.map((t, c) => t ? (
            <Pressable key={t[1]} accessibilityRole="button" accessibilityLabel={t[0]} onPress={() => go(t[1])} style={{ flex: 1 }}>
              {({ pressed, hovered }: any) => (
                <View style={{
                  backgroundColor: '#FFF', borderRadius: 20, borderWidth: 1, borderColor: hovered ? t[3][1] + '55' : '#E1EAEE',
                  padding: page ? 14 : 10, gap: page ? 10 : 6, minHeight: page ? 120 : 88,
                  shadowColor: '#10303A', shadowOpacity: hovered ? 0.1 : 0.04, shadowRadius: hovered ? 16 : 8, shadowOffset: { width: 0, height: 4 },
                  transform: [{ translateY: hovered ? -2 : 0 }, { scale: pressed ? 0.98 : 1 }],
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ width: page ? 44 : 38, height: page ? 44 : 38, borderRadius: 14, backgroundColor: t[3][0], alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name={t[2]} size={page ? 21 : 19} color={t[3][1]} />
                    </View>
                    {page ? <Ionicons name="arrow-forward" size={16} color={hovered ? t[3][1] : '#B6C6CC'} /> : null}
                  </View>
                  <View style={{ marginTop: 'auto' }}>
                    <T numberOfLines={page ? 1 : 2} style={{ fontFamily: fonts.semibold, fontSize: page ? 15 : 12.5, lineHeight: page ? undefined : 16, color: colors.ink }}>{t[0]}</T>
                    {page && DESC[t[0]] ? <T v="small" numberOfLines={1}>{DESC[t[0]]}</T> : null}
                  </View>
                </View>
              )}
            </Pressable>
          ) : <View key={`e${c}`} style={{ flex: 1 }} />)}
        </View>
      ))}
        </View>
      ))}
      {!shown.length ? <T v="small" style={{ textAlign: 'center', padding: 12 }}>Nothing matches “{q}”.</T> : null}
      <InstallAppButton />
    </View>
  );
}

/** More page for tablet/desktop (on phones the tab opens the pop-up instead). */
export function MorePage(props: { links: MoreLink[]; profileHref?: string; logout?: boolean }) {
  return (
    <Screen>
      <View style={{ width: '100%', maxWidth: 1100, alignSelf: 'center' }}>
        <Header title="More" back={false} />
        <MoreMenu {...props} page />
      </View>
    </Screen>
  );
}

/** Kept for older imports. */
export function RoleMoreScreen({ links }: { links: MoreLink[] }) {
  return <MorePage links={links} logout />;
}

export function StudentMoreMenu({ onNavigate }: { onNavigate?: () => void }) {
  return <MoreMenu links={STUDENT_MORE} onNavigate={onNavigate} profileHref="/student/profile" />;
}
