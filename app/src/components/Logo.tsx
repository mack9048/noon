import React from 'react';
import { Image } from 'react-native';

const full = require('../../assets/logo.png');
const white = require('../../assets/logo-white.png');
const mark = require('../../assets/logo-mark.png');
const stackedWhite = require('../../assets/logo-stacked-white.png');

/** Noon Learn logo (from the UI design). `compact` shows only the diamond mark; `light` is the all-white version for dark backgrounds. */
export function Logo({ compact = false, light = false, height = 36, stacked = false }: { compact?: boolean; light?: boolean; height?: number; stacked?: boolean }) {
  // The stacked white logo (mark above "noon Learn") for purple and dark backgrounds.
  if (stacked) return <Image source={stackedWhite} accessibilityLabel="Noon Learn" style={{ width: height * (302 / 425), height }} resizeMode="contain" />;
  if (compact) {
    return <Image source={mark} accessibilityLabel="Noon Learn" style={{ width: height, height }} resizeMode="contain" />;
  }
  return <Image source={light ? white : full} accessibilityLabel="Noon Learn" style={{ width: height * (800 / 208), height }} resizeMode="contain" />;
}
