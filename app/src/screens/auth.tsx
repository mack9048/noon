import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Card, Row, T, Header } from '@/components/ui';
import { NooniWelcome } from '@/components/NooniWelcome';
import { Logo } from '@/components/Logo';
import { InstallAppButton } from '@/components/InstallApp';
import { useAuth, homeFor } from '@/lib/auth';
import { api, ApiError, USE_MOCK } from '@/lib/api';
import { useLayout } from '@/lib/useLayout';
import { colors, fonts, radius } from '@/theme/tokens';

export function WelcomeScreen() {
  const { startGuest } = useAuth();
  const [busy, setBusy] = useState(false);
  // No sign-up needed: start a guest session straight away (design: Guest · Welcome).
  const explore = async () => {
    setBusy(true);
    try {
      await startGuest({ name: 'Guest' });
      router.replace('/guest' as any);
    } catch {
      router.push('/join');
    } finally { setBusy(false); }
  };
  const FEATURES: [keyof typeof Ionicons.glyphMap, string, readonly [string, string]][] = [
    ['videocam-outline', 'Live classes', colors.lav], ['book-outline', 'Quran & Hifz', colors.mint],
    ['game-controller-outline', 'Fun games', colors.butter], ['school-outline', 'Noon Courses', colors.sky],
  ];
  return (
    <AuthLayout title="Learn Islam, anytime, anywhere" subtitle="Explore every feature for free — courses, madrasa classes, games, Quran and more. No sign-up needed.">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {FEATURES.map(([icon, label, tint]) => (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 36, borderRadius: 18, backgroundColor: tint[0] }}>
            <Ionicons name={icon} size={16} color={tint[1]} />
            <T style={{ color: tint[1], fontFamily: fonts.semibold, fontSize: 13 }}>{label}</T>
          </View>
        ))}
      </View>
      <Button title="Explore as a guest" kind="yellow" icon="arrow-forward" loading={busy} onPress={explore} />
      <Button title="Log in" icon="log-in-outline" onPress={() => router.push('/login')} />
      <Divider text="New to Noon Learn?" />
      <Button title="Sign up" kind="ghost" icon="person-add-outline" onPress={() => router.push('/signup' as any)} />
      <InstallAppButton />
    </AuthLayout>
  );
}

/* ---------- Shared layout for login, forgot password and sign up ---------- */
function AuthLayout({ title, subtitle, children, onBack }: { title: string; subtitle?: string; children: React.ReactNode; onBack?: () => void }) {
  const { device } = useLayout();
  const wide = device !== 'phone';
  const scene = (
    <LinearGradient colors={['#5B43E0', '#7A4BE6', '#2F6FE4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={wide ? { flex: 1, borderRadius: 36, padding: 32, justifyContent: 'space-between' } : { paddingTop: 18, paddingHorizontal: 20, paddingBottom: 56, borderBottomLeftRadius: 36, borderBottomRightRadius: 36 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Pressable accessibilityRole="link" accessibilityLabel="Noon Learn website" onPress={() => { if (Platform.OS === 'web') window.location.href = '/'; }}
          style={{ backgroundColor: '#FFF', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Logo compact={!wide} />
        </Pressable>
        {onBack ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack}
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </Pressable>
        ) : null}
      </Row>
      <NooniWelcome size={wide ? 190 : 110} compact={!wide} />
      {wide ? (
        <View style={{ gap: 6 }}>
          <T style={{ fontFamily: fonts.fun, fontSize: 30, lineHeight: 36, color: '#FFF' }}>Where little hearts{'\n'}learn Deen with joy</T>
          <T style={{ color: '#E4DDFF' }}>Live madrasa classes, Quran, courses and games — in one safe app.</T>
        </View>
      ) : null}
    </LinearGradient>
  );
  const form = (
    <View style={{ gap: 14, width: '100%', maxWidth: 440, alignSelf: 'center' }}>
      <View style={{ gap: 4 }}>
        <T style={{ fontFamily: fonts.fun, fontSize: 28, lineHeight: 34, color: colors.ink }}>{title}</T>
        {subtitle ? <T v="small" style={{ fontSize: 14 }}>{subtitle}</T> : null}
      </View>
      {children}
    </View>
  );
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      {wide ? (
        <View style={{ flex: 1, flexDirection: 'row', padding: 20, gap: 32 }}>
          <View style={{ flex: 1, maxWidth: 560 }}>{scene}</View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>{form}</ScrollView>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}>
          {scene}
          <View style={{ marginTop: -36, marginHorizontal: 16, backgroundColor: '#FFF', borderRadius: 28, padding: 20, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } }}>{form}</View>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

/** Text box with an icon, and a show/hide eye for passwords. */
function IconField({ label, icon, secure, ...props }: React.ComponentProps<typeof TextInput> & { label: string; icon: keyof typeof Ionicons.glyphMap; secure?: boolean }) {
  const [show, setShow] = useState(false);
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <T v="label">{label}</T>
      <View style={[styles.iconInput, focus && { borderColor: colors.violet, backgroundColor: '#FFF' }]}>
        <Ionicons name={icon} size={19} color={focus ? colors.violet : colors.muted} />
        <TextInput placeholderTextColor={colors.faint} accessibilityLabel={label} secureTextEntry={secure && !show}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} {...props}
          style={{ flex: 1, height: '100%', fontFamily: fonts.regular, fontSize: 15, color: colors.ink, outlineStyle: 'none' } as any} />
        {secure ? (
          <Pressable accessibilityRole="button" accessibilityLabel={show ? 'Hide password' : 'Show password'} onPress={() => setShow(!show)} hitSlop={10}>
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function Notice({ text, tone }: { text: string; tone: 'error' | 'ok' }) {
  return (
    <View accessibilityRole="alert" style={{ flexDirection: 'row', gap: 8, alignItems: 'center', padding: 12, borderRadius: 14, backgroundColor: tone === 'error' ? '#FDECEC' : '#E3F7EC' }}>
      <Ionicons name={tone === 'error' ? 'alert-circle' : 'checkmark-circle'} size={18} color={tone === 'error' ? colors.red : '#14945A'} />
      <T style={{ flex: 1, color: tone === 'error' ? colors.red : '#0E6B41' }}>{text}</T>
    </View>
  );
}

function Divider({ text }: { text: string }) {
  return (
    <Row style={{ marginVertical: 4 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
      <T v="small" style={{ marginHorizontal: 10 }}>{text}</T>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
    </Row>
  );
}

export function LoginScreen() {
  const { login } = useAuth();
  const { done } = useLocalSearchParams<{ done?: string }>();
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Set when this login exists in more than one madrasa.
  const [choices, setChoices] = useState<{ code: string; name: string }[] | null>(null);

  const submit = (tenantCode?: string) => submitAs(id.trim(), pw, tenantCode);

  const submitAs = async (loginId: string, password: string, tenantCode?: string) => {
    setBusy(true); setErr(null);
    try {
      const u = await login(loginId, password, tenantCode);
      router.replace(homeFor(u.role) as any);
    } catch (e: any) {
      if (e instanceof ApiError && e.code === 'tenant_required') {
        setChoices(e.body?.tenants ?? []);
      } else {
        setErr(e instanceof ApiError ? e.friendly : e?.message ?? 'Login failed');
      }
    } finally { setBusy(false); }
  };

  if (choices) {
    return (
      <AuthLayout title="Choose your madrasa" subtitle="This login is used in more than one madrasa." onBack={() => setChoices(null)}>
        {choices.map((c) => (
          <Button key={c.code} title={c.name} kind="ghost" icon="school-outline" disabled={busy} onPress={() => submit(c.code)} />
        ))}
        {err ? <Notice text={err} tone="error" /> : null}
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Welcome back!" subtitle="Log in to your madrasa, classes and courses.">
      {done === 'reset' ? <Notice text="Your password was changed. Log in with your new password." tone="ok" /> : null}
      <IconField label="Phone, email or admission no." icon="person-outline" value={id} onChangeText={setId} autoCapitalize="none" autoComplete="username"
        placeholder="e.g. 9715XXXXXXX or DEMO-001" returnKeyType="next" />
      <IconField label="Password" icon="lock-closed-outline" value={pw} onChangeText={setPw} secure autoComplete="current-password"
        placeholder="Your password" returnKeyType="go" onSubmitEditing={() => id && pw && submit()} />
      <Pressable accessibilityRole="link" onPress={() => router.push('/forgot' as any)} style={{ alignSelf: 'flex-end', paddingVertical: 2 }}>
        <T style={{ color: colors.violet, fontFamily: fonts.semibold }}>Forgot password?</T>
      </Pressable>
      {err ? <Notice text={err} tone="error" /> : null}
      <Button title="Log in" icon="log-in-outline" onPress={() => submit()} loading={busy} disabled={!id || !pw} />
      <Divider text="New to Noon Learn?" />
      <Button title="Sign up" kind="ghost" icon="person-add-outline" onPress={() => router.push('/signup' as any)} />
      {DEMO_LOGINS ? <DemoLogins busy={busy} onPick={(l) => submitAs(l, DEMO_PASSWORD)} /> : null}
    </AuthLayout>
  );
}

/* ---------- Forgot password: SMS code, then a new password ---------- */
export function ForgotPasswordScreen() {
  const [via, setVia] = useState<'email' | 'phone'>('email');
  const [step, setStep] = useState<'ask' | 'code'>('ask');
  const [login, setLogin] = useState('');
  const [otp, setOtp] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const value = login.trim();
  const valid = via === 'email' ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) : value.replace(/\D/g, '').length >= 9;

  const send = async () => {
    setBusy(true); setErr(null);
    try {
      await api.post('/auth/password/forgot', { login: value });
      setInfo(via === 'email'
        ? `If ${value} is registered, we have emailed you a 6-digit code. Check your inbox and spam folder.`
        : `If ${value} is registered, we have sent a 6-digit code by SMS.`);
      setStep('code');
    } catch (e: any) { setErr(e instanceof ApiError ? e.friendly : 'Could not send the code.'); } finally { setBusy(false); }
  };
  const reset = async () => {
    if (pw.length < 8) return setErr('The new password needs at least 8 characters.');
    if (pw !== pw2) return setErr('The two passwords do not match.');
    setBusy(true); setErr(null);
    try {
      await api.post('/auth/password/reset', { login: value, otp: otp.trim(), password: pw });
      router.replace('/login?done=reset' as any);
    } catch (e: any) { setErr(e instanceof ApiError ? e.friendly : 'Could not change the password.'); } finally { setBusy(false); }
  };

  return (
    <AuthLayout title="Forgot password?" onBack={() => (step === 'code' ? setStep('ask') : router.replace('/login' as any))}
      subtitle={step === 'ask' ? 'We will send a code to your registered email or mobile number.' : 'Enter the code and choose a new password.'}>
      {step === 'ask' ? (
        <>
          <View accessibilityRole="tablist" style={{ flexDirection: 'row', backgroundColor: colors.bg, borderRadius: 18, padding: 4 }}>
            {([['email', 'Email', 'mail-outline'], ['phone', 'Mobile', 'call-outline']] as const).map(([k, label, icon]) => (
              <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: via === k }} onPress={() => { setVia(k); setLogin(''); setErr(null); }}
                style={{ flex: 1, height: 42, borderRadius: 14, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: via === k ? '#FFF' : 'transparent' }}>
                <Ionicons name={icon} size={17} color={via === k ? colors.violet : colors.muted} />
                <T style={{ fontFamily: fonts.semibold, color: via === k ? colors.violet : colors.muted }}>{label}</T>
              </Pressable>
            ))}
          </View>
          {via === 'email' ? (
            <IconField label="Registered email" icon="mail-outline" value={login} onChangeText={setLogin} keyboardType="email-address" autoCapitalize="none"
              autoComplete="email" placeholder="you@example.com" onSubmitEditing={() => valid && send()} />
          ) : (
            <IconField label="Registered mobile number" icon="call-outline" value={login} onChangeText={setLogin} keyboardType="phone-pad" autoComplete="tel"
              placeholder="+91 / +971 …" onSubmitEditing={() => valid && send()} />
          )}
          {err ? <Notice text={err} tone="error" /> : null}
          <Button title="Send code" icon="paper-plane-outline" onPress={send} loading={busy} disabled={!valid} />
          <T v="small" style={{ textAlign: 'center' }}>No email or mobile on your account? Ask your madrasa office to set a new password for you.</T>
        </>
      ) : (
        <>
          {info ? <Notice text={info} tone="ok" /> : null}
          <IconField label="6-digit code" icon="keypad-outline" value={otp} onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad"
            autoComplete="one-time-code" placeholder="••••••" />
          <IconField label="New password" icon="lock-closed-outline" value={pw} onChangeText={setPw} secure autoComplete="new-password" placeholder="At least 8 characters" />
          <IconField label="Repeat new password" icon="lock-closed-outline" value={pw2} onChangeText={setPw2} secure autoComplete="new-password" placeholder="Type it again" />
          {err ? <Notice text={err} tone="error" /> : null}
          <Button title="Change password" icon="checkmark-circle-outline" onPress={reset} loading={busy} disabled={otp.length !== 6 || !pw || !pw2} />
          <Pressable accessibilityRole="button" onPress={send} disabled={busy} style={{ alignSelf: 'center', padding: 6 }}>
            <T style={{ color: colors.violet, fontFamily: fonts.semibold }}>Send a new code</T>
          </Pressable>
        </>
      )}
    </AuthLayout>
  );
}

/* ---------- Sign up: choose how to join ---------- */
export function SignUpScreen() {
  const [code, setCode] = useState('');
  const [askCode, setAskCode] = useState(false);
  const Option = ({ icon, tint, title, text, onPress }: { icon: keyof typeof Ionicons.glyphMap; tint: readonly [string, string]; title: string; text: string; onPress: () => void }) => (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress}
      style={({ pressed, hovered }: any) => [styles.option, (pressed || hovered) && { borderColor: colors.violet, backgroundColor: '#FBFAFF' }]}>
      <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: tint[0], alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={24} color={tint[1]} />
      </View>
      <View style={{ flex: 1 }}>
        <T style={{ fontFamily: fonts.semibold, fontSize: 16 }}>{title}</T>
        <T v="small">{text}</T>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.muted} />
    </Pressable>
  );
  return (
    <AuthLayout title="Join Noon Learn" subtitle="Pick the option that fits you." onBack={() => router.replace('/login' as any)}>
      <Option icon="sparkles-outline" tint={colors.lav} title="Start learning free" text="For children and parents: courses, Quran, games. No madrasa needed."
        onPress={() => router.push('/join')} />
      <Option icon="school-outline" tint={colors.mint} title="Apply to a madrasa" text="Have a madrasa code? Send an admission form to your madrasa."
        onPress={() => setAskCode(true)} />
      {askCode ? (
        <View style={{ gap: 10, padding: 14, borderRadius: 18, backgroundColor: colors.bg }}>
          <IconField label="Madrasa code" icon="key-outline" value={code} onChangeText={(v) => setCode(v.toUpperCase())} autoCapitalize="characters" placeholder="e.g. DEMO01" />
          <Button title="Open admission form" icon="arrow-forward" disabled={code.trim().length < 4} onPress={() => router.push(`/apply/${code.trim()}` as any)} />
        </View>
      ) : null}
      <Option icon="business-outline" tint={colors.butter} title="Register your madrasa" text="Run your madrasa on Noon Learn. We set it up with you."
        onPress={() => { if (Platform.OS === 'web') window.location.href = '/contact'; }} />
      <Divider text="Already have an account?" />
      <Button title="Log in" kind="ghost" icon="log-in-outline" onPress={() => router.replace('/login' as any)} />
    </AuthLayout>
  );
}

/**
 * DEMO ONLY: one-tap logins for the seeded demo accounts.
 * Hidden when EXPO_PUBLIC_DEMO_LOGINS=0. Set that before launching the app.
 */
const DEMO_LOGINS = process.env.EXPO_PUBLIC_DEMO_LOGINS !== '0';
const DEMO_ACCOUNTS: [label: string, login: string, icon: keyof typeof Ionicons.glyphMap, pastel: readonly [string, string]][] = [
  ['Student', USE_MOCK ? 'student' : 'DEMO-001', 'school-outline', colors.sky],
  ['Parent', USE_MOCK ? 'parent' : 'parent1@demo.noonlearn.com', 'people-outline', colors.pink],
  ['Teacher', USE_MOCK ? 'teacher' : 'teacher1@demo.noonlearn.com', 'book-outline', colors.mint],
  ['Institute admin', USE_MOCK ? 'admin' : 'admin@demo.noonlearn.com', 'grid-outline', colors.butter],
  ...(USE_MOCK ? [['Super admin', 'super', 'shield-checkmark-outline', colors.lav] as (typeof DEMO_ACCOUNTS)[number]] : []),
];
/** Shared password of the demo madrasa logins (DEMO_PASSWORD on the server). */
const DEMO_PASSWORD = 'Demo@1234';

function DemoLogins({ busy, onPick }: { busy: boolean; onPick: (login: string) => void }) {
  return (
    <Card style={{ gap: 10, padding: 16, borderWidth: 2, borderColor: colors.yellow, borderStyle: 'dashed' }}>
      <T v="label">DEMO ONLY · log in as</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {DEMO_ACCOUNTS.map(([label, login, icon, pastel]) => (
          <Pressable key={label} accessibilityRole="button" accessibilityLabel={`Demo login as ${label}`} disabled={busy} onPress={() => onPick(login)}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: pastel[0], opacity: busy ? 0.5 : pressed ? 0.8 : 1 })}>
            <Ionicons name={icon} size={18} color={pastel[1]} />
            <T style={{ color: pastel[1], fontFamily: fonts.semibold }}>{label}</T>
          </Pressable>
        ))}
        <Pressable accessibilityRole="button" accessibilityLabel="Demo: start as a guest" onPress={() => router.push('/join')}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: colors.bg, opacity: pressed ? 0.8 : 1 })}>
          <Ionicons name="person-outline" size={18} color={colors.ink} />
          <T style={{ fontFamily: fonts.semibold }}>Guest</T>
        </Pressable>
      </View>
      <T v="small">Password for all demo accounts: password</T>
    </Card>
  );
}

export function Field({ label, ...props }: React.ComponentProps<typeof TextInput> & { label: string }) {
  return (
    <View style={{ gap: 6 }}>
      <T v="label">{label}</T>
      <TextInput placeholderTextColor={colors.faint} {...props} style={[styles.input, props.multiline && { height: 96, paddingTop: 12, textAlignVertical: 'top' }, props.style]} />
    </View>
  );
}

const styles = StyleSheet.create({
  iconInput: {
    height: 52, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.line, backgroundColor: '#F7F9FB',
    paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 20, borderWidth: 1.5, borderColor: colors.line, backgroundColor: '#FFF',
  },
  input: {
    height: 50, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.line, backgroundColor: '#FFF',
    paddingHorizontal: 14, fontFamily: fonts.regular, fontSize: 15, color: colors.ink,
  },
});
