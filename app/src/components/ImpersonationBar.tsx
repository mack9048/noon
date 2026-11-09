import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { fonts } from '@/theme/tokens';

/** Shown on every screen while a super admin is signed in as someone else. */
export function ImpersonationBar() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  if (!user?.impersonated_by) return null;
  const back = async () => {
    setBusy(true);
    try { await logout(); router.replace('/super/users' as any); } finally { setBusy(false); }
  };
  return (
    <View accessibilityRole="alert" style={{ backgroundColor: '#2B1B6B', paddingTop: insets.top + 8, paddingBottom: 8, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <Ionicons name="eye-outline" size={18} color="#FFD84D" />
      <Text style={{ flex: 1, minWidth: 180, color: '#FFF', fontFamily: fonts.medium, fontSize: 13 }} numberOfLines={2}>
        Viewing as <Text style={{ fontFamily: fonts.semibold }}>{user.name}</Text> ({user.role}{user.tenant_name ? ` · ${user.tenant_name}` : ''})
      </Text>
      <Pressable accessibilityRole="button" onPress={back} disabled={busy}
        style={{ height: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: '#FFD84D', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {busy ? <ActivityIndicator size="small" color="#2B1B6B" /> : <Ionicons name="arrow-undo" size={16} color="#2B1B6B" />}
        <Text style={{ color: '#2B1B6B', fontFamily: fonts.semibold, fontSize: 13 }}>Back to super admin</Text>
      </Pressable>
    </View>
  );
}
