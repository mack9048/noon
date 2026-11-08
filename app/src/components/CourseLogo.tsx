// A course's logo: the image uploaded when the course was created, or (until then)
// the course name drawn as a colourful text logo.
import React from 'react';
import { Image, Text, View } from 'react-native';
import { fonts } from '@/theme/tokens';

const LETTER_COLOURS = ['#F6A623', '#5BB59A', '#F07A62', '#5B43E0', '#3D8BFD'];

export function CourseLogo({ title, logo, category, size = 130 }: { title: string; logo?: string | null; category?: string; size?: number }) {
  if (logo) {
    return <Image source={{ uri: logo }} accessibilityLabel={`${title} logo`} resizeMode="contain" style={{ width: size * 0.86, height: size * 0.86 }} />;
  }
  const words = title.trim().split(/\s+/);
  const first = words[0] ?? '';
  const rest = words.slice(1).join(' ');
  // Shrink so the longest word fits the box (auto-fit text doesn't work in web browsers).
  const longest = Math.max(...words.map((w) => w.length), 1);
  const big = Math.min(size * 0.2, (size * 0.86) / (longest * 0.66));
  return (
    <View accessibilityLabel={`${title} logo`} style={{ width: size * 0.9, alignItems: 'center' }}>
      <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: fonts.fun, fontSize: big, color: '#0F5F6E', letterSpacing: 0.5 }}>{first.toUpperCase()}</Text>
      {rest ? (
        <Text numberOfLines={2} adjustsFontSizeToFit style={{ textAlign: 'center', lineHeight: big * 1.05 }}>
          {rest.toUpperCase().split('').map((ch, i) => (
            <Text key={i} style={{ fontFamily: fonts.fun, fontSize: big * 0.95, color: LETTER_COLOURS[i % LETTER_COLOURS.length] }}>{ch}</Text>
          ))}
        </Text>
      ) : null}
      {category ? <Text numberOfLines={1} style={{ fontFamily: fonts.medium, fontSize: size * 0.075, color: '#4F646C', marginTop: 4, letterSpacing: 1 }}>{category}</Text> : null}
    </View>
  );
}
