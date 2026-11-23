// Animated welcome scene for the login pages: Nooni waves hello and blinks,
// a speech bubble pops in and stars twinkle.
import { NOONI } from './Nooni';

const BODY = require('../../assets/nooni/nooni-body.png');
const HAND = require('../../assets/nooni/nooni-hand.png');
const BODY_BLINK = require('../../assets/nooni/nooni-body-blink.png');
// The hand turns at the wrist: (370, 246) on the 512 × 768 picture.
const WRIST = `${(370 / 512) * 100}% ${(246 / 768) * 100}%`;
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, View } from 'react-native';
import { T } from './ui';
import { fonts } from '@/theme/tokens';

const GREETINGS = ['Assalamu alaikum!\nI am Nooni', 'Welcome back!', 'Ready to learn?'];

function useLoop(duration: number, delay = 0) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(v, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(v, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
    ]));
    anim.start();
    return () => anim.stop();
  }, [v, duration, delay]);
  return v;
}

function Star({ left, top, size, delay }: { left: string; top: string; size: number; delay: number }) {
  const t = useLoop(900, delay);
  return (
    <Animated.Image source={{ uri: '/art/star.svg' }} accessibilityElementsHidden importantForAccessibility="no"
      style={{ position: 'absolute', left: left as any, top: top as any, width: size, height: size,
        opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
        transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1.1] }) }, { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['-12deg', '12deg'] }) }] }} />
  );
}

export function NooniWelcome({ size = 220, compact = false }: { size?: number; compact?: boolean }) {
  const hand = useLoop(320);
  const [eyes, setEyes] = useState(true);
  // Nooni stands still: only his hand waves and his eyes blink every few seconds.
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const blink = () => {
      setEyes(false);
      timers.push(setTimeout(() => setEyes(true), 150));
      if (Math.random() < 0.3) timers.push(setTimeout(() => { setEyes(false); timers.push(setTimeout(() => setEyes(true), 130)); }, 320));
      timers.push(setTimeout(blink, 2600 + Math.random() * 2000));
    };
    timers.push(setTimeout(blink, 1500));
    return () => timers.forEach(clearTimeout);
  }, []);
  const pop = useRef(new Animated.Value(0)).current;
  const [g, setG] = useState(0);

  // Bubble pops in, then cycles through the greetings.
  useEffect(() => {
    const show = () => {
      pop.setValue(0);
      Animated.spring(pop, { toValue: 1, friction: 5, tension: 80, useNativeDriver: Platform.OS !== 'web' }).start();
    };
    show();
    const id = setInterval(() => { setG((x) => (x + 1) % GREETINGS.length); show(); }, 3200);
    return () => clearInterval(id);
  }, [pop]);

  const h = size * 1.5;
  const W = size * (compact ? 3 : 1.6);
  // Where Nooni's picture starts (he stands at the bottom, above his shadow).
  const nooniTop = (compact ? 10 : 40) - 4;
  return (
    <View accessibilityRole="image" accessibilityLabel="Nooni, the Noon Learn mascot, waving hello"
      style={{ width: W, height: h + (compact ? 10 : 40), alignItems: 'center', justifyContent: 'flex-end', alignSelf: 'center' }}>
      {/* soft glow behind Nooni */}
      <View style={{ position: 'absolute', bottom: 10, width: size * 1.15, height: size * 1.15, borderRadius: size, backgroundColor: 'rgba(255,255,255,0.14)' }} />
      <Star left="10%" top="40%" size={size * 0.16} delay={0} />
      <Star left="84%" top="30%" size={size * 0.12} delay={350} />
      <Star left="14%" top="62%" size={size * 0.1} delay={700} />

      {/* speech bubble: up by his raised hand, which waves in front of it */}
      <Animated.View style={{ position: 'absolute', top: nooniTop + h * 0.08 - (compact ? 14 : 44), left: W / 2 + size * 0.34, width: compact ? 124 : 190, alignItems: 'center', backgroundColor: '#FFF', borderRadius: 20, paddingHorizontal: compact ? 10 : 14, paddingVertical: 8,
        shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
        opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }}>
        <T style={{ fontFamily: fonts.fun, color: NOONI.deep, fontSize: compact ? 12 : 16, textAlign: 'center' }}>{GREETINGS[g]}</T>
        <View style={{ position: 'absolute', bottom: -6, left: 22, width: 14, height: 14, backgroundColor: '#FFF', transform: [{ rotate: '45deg' }] }} />
      </Animated.View>

      {/* Nooni (no background): his hand waves hello at the wrist and he blinks. */}
      <View>
        <View style={{ width: size, height: h }}>
          <Image source={BODY} accessibilityLabel="Nooni waving" style={{ position: 'absolute', width: size, height: h, opacity: eyes ? 1 : 0 }} resizeMode="contain" />
          <Image source={BODY_BLINK} accessibilityElementsHidden importantForAccessibility="no" style={{ position: 'absolute', width: size, height: h, opacity: eyes ? 0 : 1 }} resizeMode="contain" />
          <Animated.Image source={HAND} accessibilityElementsHidden importantForAccessibility="no" resizeMode="contain"
            style={{ position: 'absolute', width: size, height: h, transformOrigin: WRIST,
              transform: [{ rotate: hand.interpolate({ inputRange: [0, 1], outputRange: ['-14deg', '14deg'] }) }] } as any} />
        </View>
      </View>
      {/* his shadow on the ground */}
      <View style={{ width: size * 0.5, height: 10, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.18)', marginTop: -6 }} />
    </View>
  );
}
