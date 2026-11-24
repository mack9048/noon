// Settings → My certificates: every finished course, with its certificate to view and download.
import React from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Empty, Header, Loading, Screen, T } from '@/components/ui';
import { useApi } from '@/lib/useApi';
import { useBase } from '@/lib/useBase';
import type { Course } from '@/lib/types';
import { colors, fonts } from '@/theme/tokens';

export function CertificatesScreen() {
  const base = useBase();
  const { data, loading } = useApi<Course[]>('/courses?scope=mine');
  const done = (data ?? []).filter((c) => c.format !== 'live' && (c.progress ?? 0) >= 100);
  return (
    <Screen>
      <Header title="My certificates" subtitle="Finished courses" />
      {loading && !data ? <Loading /> : !done.length ? <Empty text="Finish all the lessons of a course to get its certificate." /> : (
        <View style={{ gap: 10 }}>
          {done.map((c) => (
            <Pressable key={c.id} accessibilityRole="button" accessibilityLabel={`Certificate for ${c.title}`} onPress={() => router.push(`${base}/courses/${c.id}/certificate` as any)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFF', borderRadius: 20, padding: 14, borderWidth: 1, borderColor: colors.line }}>
              <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: colors.lav[0], alignItems: 'center', justifyContent: 'center' }}><Ionicons name="ribbon" size={22} color={colors.violet} /></View>
              <View style={{ flex: 1 }}><T style={{ fontFamily: fonts.semibold }} numberOfLines={1}>{c.title}</T><T v="small">Course complete · view and download</T></View>
              <Ionicons name="download-outline" size={20} color={colors.violet} />
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}
