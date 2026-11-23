// Student home / classroom: shows meetings the institution has planned, with a Join button when one is open.
import React, { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { T } from '@/components/ui';
import { useApi } from '@/lib/useApi';
import { useBase } from '@/lib/useBase';
import { joinMeeting } from '@/screens/manage';
import { fonts } from '@/theme/tokens';

type M = { id: number; title: string; starts_at: string | null; state: 'scheduled' | 'open' | 'live' | 'ended'; host: string | null };

export function MeetingBanner({ style }: { style?: any }) {
  const base = useBase();
  const { data, reload } = useApi<M[]>('/meetings');
  useEffect(() => { const t = setInterval(reload, 30000); return () => clearInterval(t); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const list = (data ?? []).filter((m) => m.state !== 'ended');
  if (!list.length) return null;
  const m = list.find((x) => x.state === 'live') ?? list.find((x) => x.state === 'open') ?? list[0];
  const now = m.state === 'live' || m.state === 'open';
  const when = m.state === 'live' ? '● LIVE NOW' : m.state === 'open' ? 'STARTING SOON' : m.starts_at
    ? `MEETING · ${new Date(m.starts_at).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).toUpperCase()}`
    : 'MEETING · TIME TO BE ANNOUNCED';
  return (
    <LinearGradient colors={now ? ['#0F766E', '#14B8A6'] : ['#1E3A5F', '#3B6E9E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={[{ marginTop: 12, borderRadius: 24, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }, style]}>
      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="people" size={24} color="#FFF" />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T style={{ color: '#E0FFF8', fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 0.5 }} numberOfLines={1}>{when}</T>
        <T style={{ color: '#FFF', fontFamily: fonts.semibold, fontSize: 17 }} numberOfLines={1}>{m.title}</T>
        <T style={{ color: '#E0FFF8', fontSize: 12 }} numberOfLines={1}>{m.host ? `With ${m.host}` : 'Institution meeting'}{list.length > 1 ? ` · ${list.length} meetings` : ''}</T>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={now ? `Join ${m.title}` : 'See meetings'}
        onPress={() => (now ? joinMeeting(m.id) : router.push(`${base}/meetings` as any))}
        style={{ backgroundColor: '#FFF', borderRadius: 20, height: 40, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons name={now ? 'videocam' : 'calendar-outline'} size={16} color="#0F766E" />
        <T style={{ color: '#0F766E', fontFamily: fonts.semibold }}>{now ? 'Join' : 'View'}</T>
      </Pressable>
    </LinearGradient>
  );
}
