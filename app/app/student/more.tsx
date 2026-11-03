import React from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { Card, Grid, Header, Screen, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { colors } from '@/theme/tokens';

const links: [string, string, keyof typeof Ionicons.glyphMap][] = [
  ['Leave request', '/student/leave', 'calendar'],
  ['Madrasa Support', '/student/support', 'library'],
  ['Study tools', '/student/tools/chart', 'document-text'],
  ['Live class', '/student/live/1', 'videocam'],
];

export default function More() {
  const { logout } = useAuth();
  return (
    <Screen>
      <Header title="More" back={false} />
      <Grid cols={{ phone: 2, tablet: 3, desktop: 4 }}>
        {links.map(([label, href, icon]) => (
          <Card key={href} onPress={() => router.push(href as any)} style={{ gap: 10, minHeight: 100 }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.lav[0], alignItems: 'center', justifyContent: 'center' }}><Ionicons name={icon} size={22} color={colors.lav[1]} /></View>
            <T v="h3">{label}</T>
          </Card>
        ))}
        <Card onPress={() => logout().then(() => router.replace('/'))} style={{ gap: 10, minHeight: 100 }}>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#FBD9DC', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="log-out" size={22} color={colors.red} /></View>
          <T v="h3">Log out</T>
        </Card>
      </Grid>
    </Screen>
  );
}
