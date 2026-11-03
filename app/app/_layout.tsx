import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Jost_300Light, Jost_400Regular, Jost_500Medium, Jost_600SemiBold } from '@expo-google-fonts/jost';
import { Fredoka_600SemiBold } from '@expo-google-fonts/fredoka';
import { Amiri_700Bold } from '@expo-google-fonts/amiri';
import { NotoSansMalayalam_400Regular } from '@expo-google-fonts/noto-sans-malayalam';
import { AuthProvider } from '@/lib/auth';
import { colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded] = useFonts({
    Jost_300Light, Jost_400Regular, Jost_500Medium, Jost_600SemiBold,
    Fredoka_600SemiBold, Amiri_700Bold, NotoSansMalayalam_400Regular,
  });

  useEffect(() => { if (loaded) SplashScreen.hideAsync().catch(() => {}); }, [loaded]);
  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
