import React from 'react';
import { Image } from 'react-native';

const full = require('../../assets/logo.png');
const white = require('../../assets/logo-white.png');
const mark = require('../../assets/logo-mark.png');

/** Noon Learn logo (from the UI design). `compact` shows only the diamond mark; `light` is the all-white version for dark backgrounds. */
export function Logo({ compact = false, light = false, height = 36 }: { compact?: boolean; light?: boolean; height?: number }) {
  if (compact) {
    return <Image source={mark} accessibilityLabel="Noon Learn" style={{ width: height, height }} resizeMode="contain" />;
  }
  return <Image source={light ? white : full} accessibilityLabel="Noon Learn" style={{ width: height * (800 / 208), height }} resizeMode="contain" />;
}
