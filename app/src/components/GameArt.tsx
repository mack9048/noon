// Cartoon pictures for the games (from the design's Play Area art), drawn as SVG so
// they stay sharp at any size. Use <GameArt kind="car" size={120} />.
import React from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { fonts } from '@/theme/tokens';

export type ArtKind = 'builder' | 'car' | 'river' | 'road' | 'ayah' | 'echo' | 'plants' | 'icecream' | 'bird' | 'space' | 'quiz';
const AR = fonts.arabic;

function Letter({ x, y, s, fill, children }: { x: number; y: number; s: number; fill: string; children: string }) {
  return <SvgText x={x} y={y} textAnchor="middle" fontFamily={AR} fontSize={s} fontWeight="700" fill={fill}>{children}</SvgText>;
}

export function GameArt({ kind, size = 120 }: { kind: ArtKind; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {ART[kind]}
    </Svg>
  );
}

const ART: Record<ArtKind, React.ReactNode> = {
  builder: (
    <>
      <G transform="rotate(-8 50 110)"><Rect x={18} y={80} width={62} height={62} rx={16} fill="#FFFFFF" /><Letter x={49} y={128} s={46} fill="#5B43E0">ب</Letter></G>
      <G transform="rotate(10 112 108)"><Rect x={84} y={78} width={62} height={62} rx={16} fill="#FFD25A" /><Letter x={115} y={126} s={46} fill="#5A3A00">ت</Letter></G>
      <G transform="rotate(-4 82 52)"><Rect x={52} y={18} width={62} height={62} rx={16} fill="#FF7EC4" /><Letter x={83} y={66} s={46} fill="#FFFFFF">ثَ</Letter></G>
      <Circle cx={140} cy={30} r={5} fill="#FFFFFF" /><Circle cx={24} cy={44} r={4} fill="#FFD25A" />
    </>
  ),
  car: (
    <>
      <Circle cx={122} cy={32} r={14} fill="#FFF3B0" />
      <Path d="M0 128 Q80 96 160 120 V160 H0z" fill="#3B3F5C" />
      <Path d="M10 140 Q80 112 150 132" stroke="#FFFFFF" strokeWidth={4} strokeDasharray="12 10" fill="none" />
      <Rect x={22} y={40} width={44} height={40} rx={12} fill="#FFFFFF" /><Letter x={44} y={70} s={30} fill="#E5484D">بَ</Letter>
      <Rect x={42} y={80} width={4} height={30} fill="#FFFFFF" />
      <G transform="translate(62 82)">
        <Path d="M6 30 Q4 14 22 12 L34 0 H64 L80 14 Q92 16 92 30 V38 H6z" fill="#E5484D" />
        <Path d="M38 4 H60 L72 16 H34z" fill="#BFF0FF" />
        <Rect x={6} y={26} width={86} height={8} rx={4} fill="#C2303A" />
        <Circle cx={26} cy={40} r={11} fill="#1F2235" /><Circle cx={26} cy={40} r={5} fill="#E9EEF6" />
        <Circle cx={72} cy={40} r={11} fill="#1F2235" /><Circle cx={72} cy={40} r={5} fill="#E9EEF6" />
        <Circle cx={88} cy={24} r={3} fill="#FFF3B0" />
      </G>
    </>
  ),
  river: (
    <>
      <Path d="M0 70 Q40 60 80 72 T160 70 V160 H0z" fill="#2B7FC4" />
      <Path d="M0 92 Q30 84 60 92 T120 92 T160 90" stroke="#9FE3FF" strokeWidth={4} fill="none" strokeLinecap="round" />
      <Path d="M0 120 Q30 112 60 120 T120 120 T160 118" stroke="#9FE3FF" strokeWidth={4} fill="none" strokeLinecap="round" />
      <Ellipse cx={34} cy={104} rx={22} ry={11} fill="#E9EEF6" /><Letter x={34} y={111} s={20} fill="#1F5FE0">ن</Letter>
      <Ellipse cx={82} cy={132} rx={22} ry={11} fill="#E9EEF6" /><Letter x={82} y={139} s={20} fill="#1F5FE0">م</Letter>
      <Ellipse cx={128} cy={100} rx={22} ry={11} fill="#FFD25A" /><Letter x={128} y={107} s={20} fill="#5A3A00">ر</Letter>
      <G transform="translate(108 40)">
        <Ellipse cx={20} cy={40} rx={20} ry={14} fill="#5ED17A" />
        <Circle cx={10} cy={26} r={8} fill="#5ED17A" /><Circle cx={30} cy={26} r={8} fill="#5ED17A" />
        <Circle cx={10} cy={26} r={4} fill="#FFFFFF" /><Circle cx={30} cy={26} r={4} fill="#FFFFFF" />
        <Circle cx={11} cy={27} r={2} fill="#1F2235" /><Circle cx={31} cy={27} r={2} fill="#1F2235" />
        <Path d="M12 44 Q20 50 28 44" stroke="#1F6B35" strokeWidth={2.5} fill="none" strokeLinecap="round" />
      </G>
    </>
  ),
  road: (
    <>
      <Path d="M20 140 Q20 100 60 100 H100 Q140 100 140 60 V30" stroke="#FFFFFF" strokeWidth={22} fill="none" strokeLinecap="round" />
      <Circle cx={20} cy={138} r={9} fill="#FFD25A" /><Circle cx={58} cy={100} r={9} fill="#FF7EC4" />
      <Circle cx={100} cy={100} r={9} fill="#7D9BFF" /><Circle cx={139} cy={64} r={9} fill="#FFD25A" />
      <Path d="M126 28 l14 -14 l14 14 v14 h-28z" fill="#E5484D" /><Rect x={134} y={32} width={10} height={10} fill="#FFF3B0" />
      <G transform="rotate(-14 52 52)">
        <Rect x={30} y={30} width={44} height={44} rx={11} fill="#FFFFFF" />
        <Circle cx={42} cy={42} r={4} fill="#1E8A4C" /><Circle cx={62} cy={62} r={4} fill="#1E8A4C" /><Circle cx={52} cy={52} r={4} fill="#1E8A4C" />
      </G>
    </>
  ),
  ayah: (
    <>
      <Rect x={14} y={30} width={132} height={44} rx={14} fill="rgba(255,255,255,0.25)" stroke="#FFFFFF" strokeWidth={3} strokeDasharray="10 8" />
      <G transform="rotate(-6 46 112)"><Rect x={14} y={88} width={62} height={46} rx={13} fill="#FFD84D" /><Letter x={45} y={122} s={28} fill="#2A1600">قُلْ</Letter></G>
      <G transform="rotate(7 114 112)"><Rect x={84} y={90} width={62} height={46} rx={13} fill="#7FE0C4" /><Letter x={115} y={124} s={28} fill="#2A1600">هُوَ</Letter></G>
      <Letter x={80} y={64} s={26} fill="#FFFFFF">اللَّهُ</Letter>
      <Circle cx={142} cy={20} r={5} fill="#FFD84D" /><Circle cx={18} cy={18} r={4} fill="#FFFFFF" />
    </>
  ),
  echo: (
    <>
      <Path d="M30 50 Q55 40 80 52 Q105 40 130 50 V120 Q105 110 80 122 Q55 110 30 120z" fill="#FFFFFF" />
      <Path d="M80 52 V122" stroke="#C9BEF5" strokeWidth={3} />
      <Letter x={56} y={96} s={30} fill="#5631B8">ق</Letter><Letter x={104} y={96} s={30} fill="#5631B8">ن</Letter>
      <Path d="M126 30 Q140 40 126 52" stroke="#FFD84D" strokeWidth={5} fill="none" strokeLinecap="round" />
      <Path d="M136 22 Q156 40 136 60" stroke="#FFD84D" strokeWidth={5} fill="none" strokeLinecap="round" />
      <Circle cx={24} cy={30} r={6} fill="#FFD84D" />
    </>
  ),
  plants: (
    <>
      <Circle cx={128} cy={30} r={14} fill="#FFF3B0" />
      <Path d="M80 98 V62" stroke="#2E7D32" strokeWidth={6} strokeLinecap="round" />
      <Path d="M80 74 Q56 52 50 70 Q62 84 80 74z" fill="#3E9B2F" /><Path d="M80 66 Q104 42 112 60 Q100 76 80 66z" fill="#56C23A" />
      <Path d="M52 98 H108 L100 140 H60z" fill="#E07A3A" /><Rect x={48} y={92} width={64} height={12} rx={6} fill="#C25A1F" />
      <Circle cx={36} cy={48} r={4} fill="#3CC6F0" /><Circle cx={28} cy={62} r={4} fill="#3CC6F0" /><Circle cx={40} cy={74} r={4} fill="#3CC6F0" />
    </>
  ),
  icecream: (
    <>
      <Path d="M58 86 L80 146 L102 86z" fill="#E8A65A" /><Path d="M64 96 L96 96 M68 110 L92 110 M72 124 L88 124" stroke="#C27A2C" strokeWidth={3} />
      <Circle cx={64} cy={80} r={20} fill="#FF9EC7" /><Circle cx={96} cy={80} r={20} fill="#BFF0FF" /><Circle cx={80} cy={56} r={22} fill="#FFF3B0" />
      <Circle cx={80} cy={32} r={7} fill="#E5484D" />
      <Circle cx={72} cy={58} r={3} fill="#2A1600" /><Circle cx={88} cy={58} r={3} fill="#2A1600" /><Path d="M74 66 Q80 71 86 66" stroke="#2A1600" strokeWidth={2.5} fill="none" strokeLinecap="round" />
    </>
  ),
  bird: (
    <>
      <Path d="M126 20 A22 22 0 1 0 146 50 A16 16 0 1 1 126 20z" fill="#FFF3B0" />
      <Ellipse cx={74} cy={96} rx={46} ry={38} fill="#FFB547" />
      <Path d="M52 96 Q74 120 96 96" fill="#FF8A3D" />
      <Path d="M116 92 L138 100 L116 106z" fill="#E5484D" />
      <Path d="M90 80 Q98 84 106 80" stroke="#2A1600" strokeWidth={3} fill="none" strokeLinecap="round" />
      <Path d="M34 70 Q40 52 56 60" fill="#FFB547" />
      <SvgText x={126} y={78} fontSize={16} fontWeight="700" fill="#FFFFFF">z</SvgText><SvgText x={138} y={64} fontSize={12} fontWeight="700" fill="#FFFFFF">z</SvgText>
    </>
  ),
  space: (
    <>
      <Circle cx={30} cy={30} r={3} fill="#FFFFFF" /><Circle cx={136} cy={40} r={2} fill="#FFFFFF" /><Circle cx={120} cy={130} r={3} fill="#FFFFFF" /><Circle cx={24} cy={120} r={2} fill="#FFFFFF" />
      <Circle cx={128} cy={110} r={16} fill="#7A4BE6" /><Ellipse cx={128} cy={110} rx={26} ry={6} fill="none" stroke="#FFD84D" strokeWidth={3} />
      <G transform="rotate(35 70 80)">
        <Path d="M70 20 Q92 44 90 100 H50 Q48 44 70 20z" fill="#FFFFFF" />
        <Circle cx={70} cy={62} r={12} fill="#3CC6F0" /><Letter x={70} y={70} s={18} fill="#FFFFFF">ن</Letter>
        <Path d="M50 84 L36 104 H52z M90 84 L104 104 H88z" fill="#E5484D" />
        <Path d="M58 100 Q70 130 82 100z" fill="#FFB547" />
      </G>
    </>
  ),
  quiz: (
    <>
      <Rect x={24} y={30} width={112} height={56} rx={16} fill="#FFFFFF" />
      <SvgText x={80} y={70} textAnchor="middle" fontSize={34} fontWeight="700" fill="#14945A">?</SvgText>
      {[0, 1, 2].map((i) => (
        <G key={i}><Rect x={24 + i * 40} y={100} width={32} height={34} rx={9} fill="#FFFFFF" /><SvgText x={40 + i * 40} y={124} textAnchor="middle" fontSize={20} fontWeight="700" fill="#2A1600">{i + 1}</SvgText></G>
      ))}
    </>
  ),
};
