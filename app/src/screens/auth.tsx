import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Button, Card, T, Header } from '@/components/ui';
import { Logo } from '@/components/Logo';
import { useAuth, homeFor } from '@/lib/auth';
import { USE_MOCK } from '@/lib/api';
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

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      const u = await login(id.trim(), pw);
      router.replace(homeFor(u.role) as any);
    } catch (e: any) {
      setErr(e?.message ?? 'Login failed');
    } finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
        <View style={{ width: '100%', maxWidth: 440, alignSelf: 'center', gap: 14 }}>
          <Header title="Madrasa login" />
          <Card style={{ gap: 12, padding: 18 }}>
            <Field label="Phone, email or admission no." value={id} onChangeText={setId} autoCapitalize="none" />
            <Field label="Password" value={pw} onChangeText={setPw} secureTextEntry />
            {err ? <T style={{ color: colors.red }}>{err}</T> : null}
            <Button title="Log in" onPress={submit} loading={busy} disabled={!id || !pw} />
          </Card>
          {USE_MOCK ? (
            <T v="small" style={{ textAlign: 'center' }}>
              Demo mode: type student / teacher / admin / super (any password) to try each app.
            </T>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
