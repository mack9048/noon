import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Grid, Header, Loading, Row, Screen, Segmented, T, Pill } from '@/components/ui';
import { Field } from './auth';
import { useApi } from '@/lib/useApi';
import { homeFor, useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api';
import type { Board, Course, SchoolClass } from '@/lib/types';
import { colors, fonts } from '@/theme/tokens';

/**
 * Guest onboarding in one screen with two steps:
 *  1. name / age / parent phone + choose Madrasa Support and/or Noon Courses
 *  2. pick board + class and/or courses → creates a guest account
 */
export function JoinScreen() {
  const { startGuest } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [age, setAge] = useState('10');
  const [phone, setPhone] = useState('');
  const [wantMadrasa, setWantMadrasa] = useState(true);
  const [wantCourses, setWantCourses] = useState(true);
  const [tab, setTab] = useState<'madrasa' | 'course'>('madrasa');
  const [boardId, setBoardId] = useState<number | null>(null);
  const [classId, setClassId] = useState<number | null>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Shown when the parent phone already has an account: the SMS code proves it is theirs.
  const [needOtp, setNeedOtp] = useState(false);
  const [otp, setOtp] = useState('');

  const boards = useApi<Board[]>('/boards');
  const classes = useApi<SchoolClass[]>(boardId ? `/boards/${boardId}/classes` : null);
  const courses = useApi<Course[]>('/courses');

  useEffect(() => { if (!boardId && boards.data?.length) setBoardId(boards.data[0].id); }, [boards.data, boardId]);
  useEffect(() => { setTab(wantMadrasa ? 'madrasa' : 'course'); }, [wantMadrasa]);

  const finish = async () => {
    setBusy(true); setErr(null);
    try {
      const u = await startGuest({
        name: name || 'Guest', age: Number(age) || undefined, parent_phone: phone || undefined,
        otp: needOtp ? otp : undefined,
        board_id: wantMadrasa ? boardId : null, class_id: wantMadrasa ? classId : null,
        course_ids: wantCourses ? picked : [],
      });
      // A verified number may belong to a madrasa account: open that app.
      router.replace(homeFor(u.role) as any);
    } catch (e: any) {
      if (e instanceof ApiError && e.code === 'otp_required') {
        setNeedOtp(true);
        setErr(e.message);
      } else {
        setErr(e instanceof ApiError ? e.friendly : 'Something went wrong. Please try again.');
      }
    } finally { setBusy(false); }
  };

  if (step === 1) {
    return (
      <Screen bottomSpace={40}>
        <View style={{ maxWidth: 640, width: '100%', alignSelf: 'center', gap: 14 }}>
          <Header title="Hi! What would you like to learn? 👋" subtitle="Step 1 of 2" />
          <Card style={{ gap: 12 }}>
            <Field label="Student name" value={name} onChangeText={setName} placeholder="eg. Hamdan" />
            <Row gap={10}>
              <View style={{ width: 90 }}><Field label="Age" value={age} onChangeText={setAge} keyboardType="number-pad" /></View>
              <View style={{ flex: 1 }}><Field label="Parent's phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+971…" /></View>
            </Row>
          </Card>
          <T v="label">CHOOSE ONE OR BOTH</T>
          <PathCard emoji="🕌" title="Madrasa Support" desc="Textbooks, video & audio classes for your board and class" on={wantMadrasa} onPress={() => setWantMadrasa(!wantMadrasa)} pastel={colors.sky} accent={colors.teal} />
          <PathCard emoji="🎓" title="Noon Courses" desc="Arabic, Thajweed, Fiqh and more with live classes" on={wantCourses} onPress={() => setWantCourses(!wantCourses)} pastel={colors.lav} accent={colors.violet} />
          <Button title="Next" icon="arrow-forward" disabled={!wantMadrasa && !wantCourses} onPress={() => setStep(2)} />
        </View>
      </Screen>
    );
  }

  const chosenBoard = boards.data?.find((b) => b.id === boardId);
  const chosenClass = classes.data?.find((c) => c.id === classId);
  return (
    <Screen bottomSpace={40}>
      <View style={{ maxWidth: 760, width: '100%', alignSelf: 'center', gap: 14 }}>
        <Header title="Pick your learning" subtitle="Step 2 of 2" />
        {wantMadrasa && wantCourses ? (
          <Segmented value={tab} onChange={setTab} options={[{ key: 'madrasa', label: 'Madrasa Support' }, { key: 'course', label: 'Noon Courses' }]} />
        ) : null}

        {tab === 'madrasa' && wantMadrasa ? (
          <View style={{ gap: 12 }}>
            <T v="fun" style={{ fontSize: 20 }}>Your board</T>
            {boards.loading ? <Loading /> : (
              <Grid cols={{ phone: 3, tablet: 3, desktop: 3 }} gap={8}>
                {(boards.data ?? []).map((b) => {
                  const on = b.id === boardId;
                  return (
                    <Card key={b.id} onPress={() => { setBoardId(b.id); setClassId(null); }} tint={on ? colors.mint[0] : '#FFF'} style={{ alignItems: 'center', borderWidth: 2.5, borderColor: on ? colors.mint[1] : 'transparent' }}>
                      <T v="h2">{b.code}</T><T v="small" numberOfLines={1}>{b.name}</T>
                    </Card>
                  );
                })}
              </Grid>
            )}
            <T v="fun" style={{ fontSize: 20 }}>Your class</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(classes.data ?? []).map((c) => {
                const on = c.id === classId;
                return (
                  <Pressable key={c.id} accessibilityRole="button" accessibilityLabel={`Class ${c.label}`} accessibilityState={{ selected: on }} onPress={() => setClassId(c.id)}
                    style={{ width: 54, height: 52, borderRadius: 16, backgroundColor: on ? colors.violet : '#FFF', alignItems: 'center', justifyContent: 'center' }}>
                    <T style={{ fontFamily: fonts.semibold, fontSize: 17, color: on ? '#FFF' : colors.ink }}>{c.label}</T>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {tab === 'course' && wantCourses ? (
          <View style={{ gap: 8 }}>
            <T v="fun" style={{ fontSize: 20 }}>Pick your courses</T>
            {courses.loading ? <Loading /> : (courses.data ?? []).map((c) => {
              const on = picked.includes(c.id);
              return (
                <Card key={c.id} onPress={() => setPicked(on ? picked.filter((x) => x !== c.id) : [...picked, c.id])} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 2.5, borderColor: on ? colors.violet : 'transparent' }}>
                  <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: c.cover, alignItems: 'center', justifyContent: 'center' }}>
                    <T style={{ fontFamily: fonts.arabic, fontSize: 24, color: colors.ink }}>{c.title[0]}</T>
                  </View>
                  <View style={{ flex: 1 }}><T v="h3">{c.title}</T><T v="small">{c.lessons_count} lessons · {c.category}</T></View>
                  <Pill text={c.is_free ? 'FREE' : '7-DAY TRIAL'} tint={c.is_free ? colors.mint[0] : colors.butter[0]} ink={c.is_free ? colors.mint[1] : colors.butter[1]} />
                  <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={on ? colors.violet : colors.line} />
                </Card>
              );
            })}
          </View>
        ) : null}

        <T v="small" style={{ textAlign: 'center' }}>
          {[wantMadrasa && chosenBoard ? `${chosenBoard.code} board${chosenClass ? ` · Class ${chosenClass.label}` : ''}` : null, wantCourses ? `${picked.length} course(s)` : null].filter(Boolean).join('  +  ')}
        </T>
        {needOtp ? (
          <Field label="SMS code" value={otp} onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" placeholder="6 digits" />
        ) : null}
        {err ? <T style={{ color: colors.red, textAlign: 'center' }}>{err}</T> : null}
        <Button title="Start learning 🚀" kind="yellow" loading={busy} disabled={(wantMadrasa && !classId && !picked.length) || (needOtp && otp.length !== 6)} onPress={finish} />
      </View>
    </Screen>
  );
}

function PathCard({ emoji, title, desc, on, onPress, pastel, accent }: { emoji: string; title: string; desc: string; on: boolean; onPress: () => void; pastel: readonly [string, string]; accent: string }) {
  return (
    <Card onPress={onPress} tint={on ? pastel[0] : '#FFF'} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 20, borderWidth: 3, borderColor: on ? accent : 'transparent' }}>
      <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: on ? '#FFF' : colors.bg, alignItems: 'center', justifyContent: 'center' }}><T style={{ fontSize: 36 }}>{emoji}</T></View>
      <View style={{ flex: 1 }}><T style={{ fontFamily: fonts.fun, fontSize: 20, color: pastel[1] }}>{title}</T><T v="small">{desc}</T></View>
      <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={30} color={on ? accent : colors.line} />
    </Card>
  );
}
