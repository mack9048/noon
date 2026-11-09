// Super admin screens from the design canvas.
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Grid, Header, Row, Screen, Segmented, T } from '@/components/ui';
import { Avatar, Band, Chips, demoNote, Glyph, ListRow, pastel, Progress, Section, SmallButton, Stat, Tabs, Tag } from '@/components/kit';
import { colors, fonts } from '@/theme/tokens';
import { useApi } from '@/lib/useApi';
import type { TenantRow } from '@/screens/superpeople';

const NEW_TENANTS = [['Jun', 2], ['Jul', 4], ['Aug', 3], ['Sep', 6], ['Oct', 5], ['Nov', 3]] as const;

/* ---------- Overview ---------- */
export function SuperOverviewScreen() {
  const { data: tenants } = useApi<TenantRow[]>('/super/tenants');
  const sum = (k: 'students_count' | 'teachers_count') => (tenants ? tenants.reduce((n, t) => n + (t[k] ?? 0), 0).toLocaleString() : '…');
  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}><T v="small">Super admin</T><T v="h1">Overview</T></View>
        <Pressable accessibilityLabel="Notifications, 5 new" style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="notifications-outline" size={22} color={colors.ink} /><View style={{ position: 'absolute', top: 10, right: 12, width: 9, height: 9, borderRadius: 5, backgroundColor: '#D6336C' }} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="My profile" onPress={() => router.push('/super/profile' as any)}
          style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.sky[0], alignItems: 'center', justifyContent: 'center', marginLeft: 8 }}>
          <T style={{ fontFamily: fonts.semibold, color: colors.sky[1] }}>SR</T>
        </Pressable>
      </Row>
      <View style={{ marginTop: 14 }}>
        <Grid cols={{ phone: 2, tablet: 4, desktop: 4 }} gap={8}>
          <Pressable onPress={() => router.push('/super/tenants' as any)}><Stat label="Tenants" value={tenants ? tenants.length : '…'} tint={pastel.lav} /></Pressable>
          <Pressable onPress={() => router.push('/super/users' as any)}><Stat label="Students" value={sum('students_count')} tint={pastel.sky} /></Pressable>
          <Pressable onPress={() => router.push('/super/users' as any)}><Stat label="Teachers" value={sum('teachers_count')} tint={pastel.mint} /></Pressable>
          <Pressable onPress={() => router.push('/super/billing' as any)}><Stat label="Monthly revenue" value="₹4.2L" tint={pastel.pink} /></Pressable>
        </Grid>
      </View>
      <Pressable accessibilityRole="button" onPress={() => router.push('/super/games' as any)} style={{ marginTop: 10 }}>
        <LinearGradient colors={['#6B4BF0', '#C2307E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 64, borderRadius: 22, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="game-controller-outline" size={20} color="#FFF" /></View>
          <View style={{ flex: 1 }}><T style={{ color: '#FFF', fontFamily: fonts.semibold }}>Games & puzzles</T><T style={{ color: '#F3E8FF', fontSize: 12 }}>24 live · create with AI or upload HTML</T></View>
          <Ionicons name="chevron-forward" size={20} color="#FFF" />
        </LinearGradient>
      </Pressable>
      <Section title="New tenants" action="Last 6 months" />
      <View accessibilityLabel="New tenants per month: June 2, July 4, August 3, September 6, October 5, November 3 so far" style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 120 }}>
        {NEW_TENANTS.map(([m, v], i) => (
          <View key={m} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
            {i === 3 ? <T style={{ fontSize: 11, fontFamily: fonts.semibold, color: colors.teal }}>{v}</T> : null}
            <View style={{ width: '100%', height: v * 15, borderRadius: 12, backgroundColor: i === 3 ? colors.teal : i === 5 ? '#E3ECEF' : '#CBD8DC', borderWidth: i === 5 ? 1.5 : 0, borderStyle: 'dashed', borderColor: '#9FB3BA' }} />
            <T style={{ fontSize: 11, color: i === 3 ? colors.teal : colors.muted }}>{m}</T>
          </View>
        ))}
      </View>
      <Section title="Needs attention" />
      <View style={{ gap: 8 }}>
        <ListRow left={<Glyph text="👤" size={44} tint={pastel.butter} />} title="Log in as a user" sub="See the app exactly as an admin, teacher, parent or student sees it" right={<SmallButton title="Users" filled tint={colors.ink} onPress={() => router.push('/super/users' as any)} />} />
        <ListRow left={<Glyph text="✓" size={44} tint={pastel.lav} />} title="3 items to review" sub="New games and an audio book" right={<SmallButton title="Review" filled tint={colors.ink} onPress={() => router.push('/super/content' as any)} />} />
      </View>
    </Screen>
  );
}

/* ---------- Content library ---------- */
const CONTENT = {
  courses: [['Arabic Basics', '24 lessons · 38 tenants', 'Published', 'ع', 'lav'], ['Thajweed Level 1', '18 lessons · 41 tenants', 'Published', 'ت', 'mint'], ['Fiqh for Kids', '12 lessons · 22 tenants', 'Published', 'ف', 'sky'], ['Seerah Stories', '30 lessons · 19 tenants', 'Published', 'س', 'pink'], ['Akhlaq', '10 lessons · 0 tenants', 'Draft', 'أ', 'butter'], ['Hifz Planner', '6 lessons · 0 tenants', 'In review', 'ح', 'lav']],
  games: [['Harakath Game', 'All tenants', 'Published', 'بَا', 'lav'], ['Car with Harakath', '31 tenants', 'Published', 'تَ', 'butter'], ['Letter Game', '40 tenants', 'Published', 'أ ب', 'mint'], ['Word Game', '36 tenants', 'Published', 'كِتَاب', 'pink'], ['Sukoon Hunt', 'Not assigned', 'In review', 'نْ', 'sky'], ['Thajweed Tap', 'Not assigned', 'In review', 'تجويد', 'mint']],
  audio: [['Stories of the Prophets', '24 parts · Pro', 'Published', 'ق', 'sky'], ['Daily Duas', '40 tracks · All', 'Published', 'د', 'mint'], ['Juz Amma recitation', '37 tracks · All', 'Published', 'جزء', 'lav'], ['Akhlaq Tales', '12 parts · Pro', 'Published', 'خ', 'pink'], ['Arabic Phrases', '20 tracks', 'Draft', 'ع', 'butter'], ['Seerah for Kids', '18 parts', 'In review', 'س', 'sky']],
} as const;
const WAITING = { courses: '1 course waiting', games: '2 games waiting', audio: '1 audio book waiting' };

export function SuperContentScreen() {
  const [tab, setTab] = useState<keyof typeof CONTENT>('courses');
  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between', marginBottom: 4 }}>
        <T v="h1">Content</T>
        <Button title="Upload" icon="cloud-upload-outline" onPress={() => router.push((tab === 'courses' ? '/super/courses/new' : '/super/tools') as any)} style={{ height: 44 }} />
      </Row>
      <Tabs value={tab} onChange={setTab} options={[{ key: 'courses', label: 'Courses' }, { key: 'games', label: 'Games' }, { key: 'audio', label: 'Audio books' }]} />
      <Grid cols={{ phone: 2, tablet: 4, desktop: 4 }} gap={8}>
        <Pressable accessibilityRole="button" onPress={() => router.push('/super/tools' as any)} style={{ height: 70, borderRadius: 20, backgroundColor: '#F7A54A', padding: 10, justifyContent: 'center' }}>
          <T style={{ color: '#3F2500', fontFamily: fonts.semibold }}>Study tools</T><T style={{ color: '#3F2500', fontSize: 11 }}>Charts · Adkar · Slides · Forms</T>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => demoNote('Demo: the review queue opens here (step 5).')} style={{ height: 70, borderRadius: 20, backgroundColor: '#FFF', borderWidth: 1.5, borderColor: colors.line, padding: 10, justifyContent: 'center' }}>
          <T style={{ fontFamily: fonts.semibold }}>{WAITING[tab]}</T><T style={{ color: colors.teal, fontSize: 12 }}>Review now →</T>
        </Pressable>
        {CONTENT[tab].map(([name, meta, status, glyph, tint]) => (
          <Pressable key={name} accessibilityRole="button" onPress={() => (tab === 'courses' ? router.push('/super/courses' as any) : demoNote(`Demo: edit "${name}" (step 5).`))}
            style={{ height: 120, borderRadius: 22, backgroundColor: pastel[tint][0], padding: 10, justifyContent: 'space-between' }}>
            <View><T style={{ fontFamily: fonts.semibold, color: colors.ink }}>{name}</T><T style={{ fontSize: 11, color: colors.muted }}>{meta}</T></View>
            <Row style={{ justifyContent: 'space-between' }}>
              <Tag text={status} tone={status === 'Published' ? 'white' : status === 'Draft' ? 'butter' : 'lav'} />
              <T style={{ fontFamily: fonts.arabic, fontSize: 22, color: pastel[tint][1] }}>{glyph}</T>
            </Row>
          </Pressable>
        ))}
      </Grid>
    </Screen>
  );
}

/* ---------- Subscriptions & billing ---------- */
const PLANS = [['basic', 'Basic', 14, 'Up to 100 students · Classes, chat, attendance', 2500, colors.teal], ['pro', 'Pro', 26, 'Up to 500 students · + AI tutor, games, audio books', 6000, colors.violet], ['ent', 'Enterprise', 0, 'Unlimited students · own branding · support line', 0, '#D6336C']] as const;
const INVOICES = [['Darul Huda Online', 'Pro', '₹6,000', 'Paid 1 Nov', 'Paid'], ['Noon Learn Academy', 'Pro', '₹6,000', 'Paid 1 Nov', 'Paid'], ['Hidaya Quran School', 'Basic', '₹2,500', 'Due 5 Nov', ''], ['Ar-Rahma Institute', 'Basic', '₹2,500', 'Overdue 21 days', ''], ['Baitul Ilm', 'Trial → Basic', '₹2,500', 'Starts 10 Nov', 'Scheduled']] as const;

export function SuperBillingScreen() {
  const [tab, setTab] = useState<'plans' | 'inv'>('plans');
  const [period, setPeriod] = useState<'month' | 'year'>('month');
  const [prices, setPrices] = useState<number[]>(PLANS.map((p) => p[4]));
  const [reminded, setReminded] = useState<string[]>([]);
  const money = (n: number) => '₹' + n.toLocaleString('en-IN');
  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <T v="h1">Subscriptions</T>
        <Pressable accessibilityLabel="Create plan" onPress={() => demoNote('Demo: plans are stored in the API from step 5.')} style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="add" size={26} color="#FFF" /></Pressable>
      </Row>
      <Grid cols={{ phone: 3, tablet: 3, desktop: 3 }} gap={8}>
        <Stat label="This month" value="₹4.2L" tint={pastel.lav} />
        <Stat label="Paying" value={40} tint={pastel.mint} />
        <Stat label="Overdue" value={3} tint={pastel.butter} />
      </Grid>
      <Tabs value={tab} onChange={setTab} options={[{ key: 'plans', label: 'Plans & fees' }, { key: 'inv', label: 'Invoices' }]} />
      {tab === 'plans' ? (
        <>
          <Segmented value={period} onChange={setPeriod} activeColor={colors.pink[1]} options={[{ key: 'month', label: 'Monthly' }, { key: 'year', label: 'Yearly · 2 months free' }]} />
          <View style={{ gap: 8, marginTop: 10 }}>
            {PLANS.map(([k, name, tenants, features, , dot], i) => (
              <Card key={k} style={{ gap: 6 }}>
                <Row style={{ justifyContent: 'space-between' }}><Row gap={6}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} /><T v="h3">{name}</T></Row><T v="small">{tenants} tenants</T></Row>
                <T v="small">{features}</T>
                {prices[i] ? (
                  <Row style={{ justifyContent: 'space-between' }}>
                    <T style={{ fontSize: 22, fontFamily: fonts.semibold }}>{money(period === 'month' ? prices[i] : prices[i] * 10)} <T v="small">{period === 'month' ? '/ month' : '/ year'}</T></T>
                    <Row gap={6}>
                      <Pressable accessibilityLabel={`Lower ${name} fee`} onPress={() => setPrices(prices.map((p, j) => (j === i ? Math.max(500, p - 500) : p)))} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}><T>−</T></Pressable>
                      <Pressable accessibilityLabel={`Raise ${name} fee`} onPress={() => setPrices(prices.map((p, j) => (j === i ? p + 500 : p)))} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}><T style={{ color: '#FFF' }}>+</T></Pressable>
                    </Row>
                  </Row>
                ) : (
                  <Row style={{ justifyContent: 'space-between' }}><T style={{ fontSize: 22, fontFamily: fonts.semibold }}>Custom <T v="small">quote per tenant</T></T><SmallButton title="Set quote" onPress={() => demoNote()} /></Row>
                )}
              </Card>
            ))}
          </View>
        </>
      ) : (
        <View style={{ gap: 8 }}>
          {INVOICES.map(([tenant, plan, amount, date, tag]) => (
            <ListRow key={tenant} left={<Avatar name={tenant} size={40} tint={pastel.sky} />} title={tenant} sub={`${plan} · ${amount} · ${date}`}
              right={tag ? <Tag text={tag} tone={tag === 'Paid' ? 'mint' : 'lav'} /> : reminded.includes(tenant) ? <Tag text="Reminded" tone="butter" /> : <SmallButton title="Remind" filled tint={colors.ink} onPress={() => setReminded([...reminded, tenant])} />} />
          ))}
        </View>
      )}
    </Screen>
  );
}
