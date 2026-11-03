// Design tokens taken from the Noon Learn design canvas.
export const colors = {
  bg: '#EAF2F4',
  surface: '#FFFFFF',
  surfaceSoft: '#F7FBFC',
  ink: '#10303A',
  muted: '#4F646C',
  faint: '#8A9BA1',
  line: '#D2E1E5',
  teal: '#0B5166',
  violet: '#5B43E0',
  yellow: '#F7C948',
  yellowDeep: '#D9A92A',
  green: '#22A86B',
  red: '#B4232B',
  // pastel pairs [background, ink]
  lav: ['#DAD3F6', '#46308A'],
  sky: ['#CDE6F1', '#0B5166'],
  mint: ['#D2F0D4', '#1E5A2C'],
  pink: ['#F3CFEA', '#74266A'],
  butter: ['#F7E9BC', '#6A4D00'],
} as const;

export type Pastel = readonly [string, string];

export const gradients = {
  brand: ['#0B5166', '#5B43E0'] as const,
  courses: ['#5B43E0', '#9B7BE8', '#D59BE0'] as const,
  support: ['#0B5166', '#1F8AA8', '#5CC7C9'] as const,
  quran: ['#0E7A50', '#22A86B'] as const,
  chart: ['#FFD25A', '#F08A24'] as const,
  adkar: ['#3DD9A8', '#0E7A50'] as const,
  slides: ['#FF7EC4', '#C2307E'] as const,
  forms: ['#7D9BFF', '#4255E0'] as const,
};

// Content-type colours (live, video, audio, pdf, test)
export const contentType = {
  live: colors.pink,
  video: colors.sky,
  audio: colors.mint,
  pdf: colors.butter,
  test: colors.lav,
} as const;
export type ContentKind = keyof typeof contentType;

export const radius = { sm: 12, md: 18, lg: 24, xl: 30, pill: 999 };
export const space = (n: number) => n * 4;

export const fonts = {
  regular: 'Jost_400Regular',
  medium: 'Jost_500Medium',
  semibold: 'Jost_600SemiBold',
  light: 'Jost_300Light',
  fun: 'Fredoka_600SemiBold',
  arabic: 'Amiri_700Bold',
  malayalam: 'NotoSansMalayalam_400Regular',
};

export const shadow = {
  card: {
    shadowColor: '#10303A',
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  lifted: {
    shadowColor: '#10303A',
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
};

/** Pick a font for mixed Arabic / Malayalam / Latin titles. */
export function scriptFont(text: string) {
  if (/[؀-ۿ]/.test(text)) return fonts.arabic;
  if (/[ഀ-ൿ]/.test(text)) return fonts.malayalam;
  return fonts.medium;
}
