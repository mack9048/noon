import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Button, Card, T, Header } from '@/components/ui';
import { Logo } from '@/components/Logo';
import { useAuth, homeFor } from '@/lib/auth';
import { ApiError, USE_MOCK } from '@/lib/api';
import { useLayout } from '@/lib/useLayout';
import { colors, fonts, radius } from '@/theme/tokens';

export function WelcomeScreen() {
  const { device } = useLayout();
  const wide = device !== 'phone';
  return (
    <LinearGradient colors={['#0B5166', '#5B43E0', '#9B7BE8']} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
        <View style={{ width: '100%', maxWidth: wide ? 980 : 480, alignSelf: 'center', flexDirection: wide ? 'row' : 'column', gap: 32, alignItems: wide ? 'center' : 'stretch' }}>
          <View style={{ flex: wide ? 1 : undefined, gap: 16 }}>
            <View style={{ alignSelf: 'flex-start', backgroundColor: '#FFF', borderRadius: 18, padding: 10 }}><Logo /></View>
            <T style={{ fontFamily: fonts.fun, fontSize: wide ? 48 : 36, lineHeight: wide ? 54 : 42, color: '#FFF', marginTop: 12 }}>
              Learn Islam,{'\n'}anytime, anywhere
            </T>
            <T style={{ color: '#E4DDFF', fontSize: 16, lineHeight: 23 }}>
              Pick your madrasa syllabus or a Noon Course and start in under a minute — no madrasa account needed.
            </T>
          </View>
          <View style={{ flex: wide ? 0.8 : undefined, gap: 12 }}>
            <Button title="Start as a guest" kind="yellow" icon="arrow-forward" onPress={() => router.push('/join')} />
            <Button title="I have a madrasa login" kind="ghost" onPress={() => router.push('/login')} style={{ borderColor: 'rgba(255,255,255,0.6)' }} />
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

export function LoginScreen() {
  const { login } = useAuth();
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

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
        <View style={{ width: '100%', maxWidth: 440, alignSelf: 'center', gap: 14 }}>
          <Header title={choices ? 'Choose your madrasa' : 'Madrasa login'} />
          {choices ? (
            <Card style={{ gap: 10, padding: 18 }}>
              <T v="small">This login is used in more than one madrasa.</T>
              {choices.map((c) => (
                <Button key={c.code} title={c.name} kind="ghost" disabled={busy} onPress={() => submit(c.code)} />
              ))}
              {err ? <T style={{ color: colors.red }}>{err}</T> : null}
              <Button title="Back" kind="ghost" onPress={() => setChoices(null)} />
            </Card>
          ) : (
            <Card style={{ gap: 12, padding: 18 }}>
              <Field label="Phone, email or admission no." value={id} onChangeText={setId} autoCapitalize="none" />
              <Field label="Password" value={pw} onChangeText={setPw} secureTextEntry />
              {err ? <T style={{ color: colors.red }}>{err}</T> : null}
              <Button title="Log in" onPress={() => submit()} loading={busy} disabled={!id || !pw} />
            </Card>
          )}
          {DEMO_LOGINS && !choices ? <DemoLogins busy={busy} onPick={(login) => submitAs(login, 'password')} /> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/**
 * DEMO ONLY: one-tap logins for the seeded demo accounts.
 * Hidden when EXPO_PUBLIC_DEMO_LOGINS=0. Set that before launching the app.
 */
const DEMO_LOGINS = process.env.EXPO_PUBLIC_DEMO_LOGINS !== '0';
const DEMO_ACCOUNTS: [label: string, login: string, icon: keyof typeof Ionicons.glyphMap, pastel: readonly [string, string]][] = [
  ['Student', USE_MOCK ? 'student' : 'student@noon.test', 'school-outline', colors.sky],
  ['Parent', USE_MOCK ? 'parent' : 'parent@noon.test', 'people-outline', colors.pink],
  ['Teacher', USE_MOCK ? 'teacher' : 'teacher@noon.test', 'book-outline', colors.mint],
  ['Institute admin', USE_MOCK ? 'admin' : 'admin@noon.test', 'grid-outline', colors.butter],
  ['Super admin', USE_MOCK ? 'super' : 'super@noon.test', 'shield-checkmark-outline', colors.lav],
];

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
  input: {
    height: 50, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.line, backgroundColor: '#FFF',
    paddingHorizontal: 14, fontFamily: fonts.regular, fontSize: 15, color: colors.ink,
  },
});
