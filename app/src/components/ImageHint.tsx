// One place for "what size should this picture be?" hints, shown beside every picture upload.
import React from 'react';
import { T } from './ui';

const SPEC = {
  thumbnail: '16:9 wide picture, 1280 × 720 px (at least 640 × 360). JPG, PNG or WebP, up to 2 MB.',
  square: 'Square picture, 512 × 512 px (at least 256 × 256). JPG, PNG or WebP, up to 2 MB.',
  logo: 'Square logo, 512 × 512 px, PNG with a clear background works best. Up to 2 MB.',
  banner: 'Wide picture, 1600 × 900 px (16:9). JPG, PNG or WebP, up to 5 MB.',
  product: 'Square or 4:3 picture, 800 × 800 px. JPG, PNG or WebP, up to 2 MB.',
  qr: 'Clear square QR picture, 600 × 600 px or more. PNG or JPG.',
} as const;

export type HintKind = keyof typeof SPEC;
export const hintText = (k: HintKind) => SPEC[k];

export function ImageHint({ kind, style }: { kind: HintKind; style?: any }) {
  return <T v="small" style={[{ color: '#6B7280' }, style]}>Size: {SPEC[kind]}</T>;
}
