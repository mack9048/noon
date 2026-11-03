import React from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts } from '@/theme/tokens';

/** Text logo. Swap for your PNG/SVG logo in assets/ when ready. */
export function Logo({ compact = false, light = false }: { compact?: boolean; light?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <LinearGradient colors={['#0B5166', '#5B43E0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: fonts.arabic, fontSize: 24, color: '#FFF', marginTop: -6 }}>ن</Text>
      </LinearGradient>
      {!compact && (
        <Text style={{ fontFamily: fonts.semibold, fontSize: 20, color: light ? '#FFF' : colors.ink }}>
          Noon <Text style={{ color: light ? '#E4DDFF' : colors.violet }}>Learn</Text>
        </Text>
      )}
    </View>
  );
}
