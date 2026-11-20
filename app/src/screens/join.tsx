import { takeNextPath } from '@/lib/shop';
import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Header, Row, Screen, T } from '@/components/ui';
import { Field } from './auth';
import { homeFor, useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api';
import { colors } from '@/theme/tokens';

/**
 * Guest onboarding in one step: name / age / parent phone → straight to the guest dashboard.
 * Madrasa Support (board → class) and Noon Courses are both open from the dashboard,
 * so we no longer ask "choose one or both" or make the guest pick a board/class here.
 */

/** Home for the role, or the shop page a website visitor wanted before logging in. */
const afterLogin = (role: Parameters<typeof homeFor>[0]) => { const next = takeNextPath(); return next && role !== 'super' ? `${homeFor(role)}${next}` : homeFor(role); };
export function JoinScreen() {
  const { startGuest } = useAuth();
  const [name, setName] = useState('');
  const [age, setAge] = useState('10');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Shown when the parent phone already has an account: the SMS code proves it is theirs.
  const [needOtp, setNeedOtp] = useState(false);
  const [otp, setOtp] = useState('');

  const finish = async () => {
    setBusy(true); setErr(null);
    try {
      const u = await startGuest({
        name: name || 'Guest', age: Number(age) || undefined, parent_phone: phone || undefined,
        otp: needOtp ? otp : undefined,
        board_id: null, class_id: null, course_ids: [],
      });
      // A verified number may belong to an institution account: open that app.
      router.replace(afterLogin(u.role) as any);
    } catch (e: any) {
      if (e instanceof ApiError && e.code === 'otp_required') {
        setNeedOtp(true);
        setErr(e.message);
      } else {
        setErr(e instanceof ApiError ? e.friendly : 'Something went wrong. Please try again.');
      }
    } finally { setBusy(false); }
  };

  return (
    <Screen bottomSpace={40}>
      <View style={{ maxWidth: 640, width: '100%', alignSelf: 'center', gap: 14 }}>
        <Header title="Hi! Let's start learning 👋" subtitle="Tell us who is learning" />
        <Card style={{ gap: 12 }}>
          <Field label="Student name" value={name} onChangeText={setName} placeholder="eg. Hamdan" />
          <Row gap={10}>
            <View style={{ width: 90 }}><Field label="Age" value={age} onChangeText={setAge} keyboardType="number-pad" /></View>
            <View style={{ flex: 1 }}><Field label="Parent's phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+971…" /></View>
          </Row>
          {needOtp ? (
            <Field label="SMS code" value={otp} onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" placeholder="6 digits" />
          ) : null}
        </Card>
        {err ? <T style={{ color: colors.red, textAlign: 'center' }}>{err}</T> : null}
        <Button title="Start learning 🚀" kind="yellow" loading={busy} disabled={needOtp && otp.length !== 6} onPress={finish} />
      </View>
    </Screen>
  );
}
