// Animated welcome scene for the login pages: Nooni bobs and waves hello,
// a speech bubble pops in, stars twinkle and a little bird floats by.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, View } from 'react-native';
import { T } from './ui';
import { fonts } from '@/theme/tokens';

const GREETINGS = ['Assalamu alaikum!', 'Welcome back!', 'Ready to learn?'];

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
  const bob = useLoop(1400);
  const wave = useLoop(500, 200);
  const bird = useLoop(2600, 400);
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

  const h = size * 1.7;
  return (
    <View accessibilityRole="image" accessibilityLabel="Nooni, the Noon Learn mascot, waving hello"
      style={{ width: size * 1.6, height: h + (compact ? 10 : 40), alignItems: 'center', justifyContent: 'flex-end', alignSelf: 'center' }}>
      {/* soft glow behind Nooni */}
      <View style={{ position: 'absolute', bottom: 10, width: size * 1.15, height: size * 1.15, borderRadius: size, backgroundColor: 'rgba(255,255,255,0.14)' }} />
      <Star left="6%" top="18%" size={size * 0.16} delay={0} />
      <Star left="84%" top="30%" size={size * 0.12} delay={350} />
      <Star left="14%" top="62%" size={size * 0.1} delay={700} />
      {compact ? null : <Animated.Image source={{ uri: '/art/bird.svg' }} accessibilityElementsHidden importantForAccessibility="no"
        style={{ position: 'absolute', right: '2%', top: '4%', width: size * 0.3, height: size * 0.32,
          transform: [{ translateY: bird.interpolate({ inputRange: [0, 1], outputRange: [0, -14] }) }, { translateX: bird.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }] }} />}

      {/* speech bubble */}
      <Animated.View style={{ position: 'absolute', top: compact ? 0 : 8, left: '4%', backgroundColor: '#FFF', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
        shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
        opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }}>
        <T style={{ fontFamily: fonts.fun, color: '#2B1B6B', fontSize: compact ? 14 : 16 }}>{GREETINGS[g]}</T>
        <View style={{ position: 'absolute', bottom: -6, right: 26, width: 14, height: 14, backgroundColor: '#FFF', transform: [{ rotate: '45deg' }] }} />
      </Animated.View>

      {/* Nooni: gentle bounce plus a little waving sway */}
      <Animated.View style={{ transform: [
        { translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }) },
        { rotate: wave.interpolate({ inputRange: [0, 1], outputRange: ['-3deg', '4deg'] }) },
      ] }}>
        <Image source={{ uri: '/art/nooni-wave.svg' }} style={{ width: size, height: h }} resizeMode="contain" />
      </Animated.View>
      {/* shadow that shrinks as Nooni bounces up */}
      <Animated.View style={{ width: size * 0.5, height: 10, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.18)', marginTop: -6,
        transform: [{ scaleX: bob.interpolate({ inputRange: [0, 1], outputRange: [1, 0.75] }) }] }} />
    </View>
  );
}
