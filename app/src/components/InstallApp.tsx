import React, { useEffect, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { T } from './ui';
import { colors, fonts } from '@/theme/tokens';

type Mode = 'hidden' | 'prompt' | 'ios';

/** Web only (PWA): "Install app" when the browser can install it, or an iPhone Add-to-Home-Screen hint. */
export function InstallAppButton({ light = false }: { light?: boolean }) {
  const [mode, setMode] = useState<Mode>('hidden');
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const w = window as any;
    const installed = w.matchMedia?.('(display-mode: standalone)').matches || w.navigator?.standalone;
    if (installed) return;
    const ios = /iphone|ipad|ipod/i.test(w.navigator?.userAgent ?? '');
    const update = () => setMode(w.__noonInstallPrompt ? 'prompt' : ios ? 'ios' : 'hidden');
    update();
    w.addEventListener('noon-install-ready', update);
    const done = () => setMode('hidden');
    w.addEventListener('appinstalled', done);
    return () => { w.removeEventListener('noon-install-ready', update); w.removeEventListener('appinstalled', done); };
  }, []);

  if (mode === 'hidden') return null;

  const install = async () => {
    const w = window as any;
    if (mode === 'ios') { setShowHelp(!showHelp); return; }
    const p = w.__noonInstallPrompt;
    if (!p) return;
    p.prompt();
    const choice = await p.userChoice.catch(() => null);
    if (choice?.outcome === 'accepted') { w.__noonInstallPrompt = null; setMode('hidden'); }
  };

  const fg = light ? '#FFF' : colors.teal;
  return (
    <View style={{ gap: 8 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Install the Noon Learn app" onPress={install}
        style={({ pressed }) => ({ height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: light ? 'rgba(255,255,255,0.6)' : colors.teal, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: pressed ? 0.8 : 1 })}>
        <Ionicons name="download-outline" size={20} color={fg} />
        <T style={{ color: fg, fontFamily: fonts.semibold }}>Install app</T>
      </Pressable>
      {showHelp ? (
        <T v="small" style={{ color: light ? '#E4DDFF' : colors.muted, textAlign: 'center' }}>
          On iPhone: tap the Share button in Safari, then “Add to Home Screen”.
        </T>
      ) : null}
    </View>
  );
}
