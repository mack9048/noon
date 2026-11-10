// The full Quran from the free AlQuran Cloud service (api.alquran.cloud):
// 114 surahs, Uthmani text, English (Sahih International) and Malayalam translations,
// and verse-by-verse recitation from cdn.islamic.network. Results are cached in memory.
import { storage } from './storage';

const API = 'https://api.alquran.cloud/v1';

export type SurahMeta = { number: number; name: string; englishName: string; englishNameTranslation: string; numberOfAyahs: number; revelationType: 'Meccan' | 'Medinan' };
export type Ayah = { global: number; n: number; juz: number; ar: string; en: string; ml: string };
export type Surah = SurahMeta & { ayahs: Ayah[] };
export type Reciter = { id: string; name: string; style: string; bitrate: number };

export const RECITERS: Reciter[] = [
  { id: 'ar.alafasy', name: 'Mishary Rashid Alafasy', style: 'Murattal · clear and calm', bitrate: 128 },
  { id: 'ar.husary', name: 'Mahmoud Khalil Al-Husary', style: 'Murattal · slow, good for learning', bitrate: 128 },
  { id: 'ar.husarymujawwad', name: 'Al-Husary (Mujawwad)', style: 'Mujawwad · melodic', bitrate: 128 },
  { id: 'ar.abdulbasitmurattal', name: 'Abdul Basit Abdus Samad', style: 'Murattal', bitrate: 64 },
  { id: 'ar.minshawi', name: 'Mohamed Siddiq El-Minshawi', style: 'Murattal', bitrate: 128 },
  { id: 'ar.muhammadayyoub', name: 'Muhammad Ayyoub', style: 'Murattal', bitrate: 128 },
];

/** Where each juz starts: [juz, surah, ayah]. */
export const JUZ_START: [number, number, number][] = [
  [1, 1, 1], [2, 2, 142], [3, 2, 253], [4, 3, 93], [5, 4, 24], [6, 4, 148], [7, 5, 82], [8, 6, 111], [9, 7, 88], [10, 8, 41],
  [11, 9, 93], [12, 11, 6], [13, 12, 53], [14, 15, 1], [15, 17, 1], [16, 18, 75], [17, 21, 1], [18, 23, 1], [19, 25, 21], [20, 27, 56],
  [21, 29, 46], [22, 33, 31], [23, 36, 28], [24, 39, 32], [25, 41, 47], [26, 46, 1], [27, 51, 31], [28, 58, 1], [29, 67, 1], [30, 78, 1],
];

const BISMILLAH = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';

let list: SurahMeta[] | null = null;
const surahs = new Map<number, Surah>();

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error('The Quran could not be loaded. Check your internet connection.');
  const json = await res.json();
  if (json.code !== 200) throw new Error('The Quran could not be loaded.');
  return json.data as T;
}

export async function surahList(): Promise<SurahMeta[]> {
  if (!list) list = await get<SurahMeta[]>('/surah');
  return list;
}

export async function loadSurah(n: number): Promise<Surah> {
  const hit = surahs.get(n);
  if (hit) return hit;
  const eds = await get<(SurahMeta & { ayahs: { number: number; numberInSurah: number; juz: number; text: string }[] })[]>(`/surah/${n}/editions/quran-uthmani,en.sahih,ml.abdulhameed`);
  const [arE, enE, mlE] = eds;
  const s: Surah = {
    number: arE.number, name: arE.name, englishName: arE.englishName, englishNameTranslation: arE.englishNameTranslation,
    numberOfAyahs: arE.numberOfAyahs, revelationType: arE.revelationType,
    ayahs: arE.ayahs.map((a, i) => ({
      global: a.number, n: a.numberInSurah, juz: a.juz,
      // The first ayah of most surahs starts with the Bismillah; it is shown on its own line instead.
      ar: n !== 1 && n !== 9 && a.numberInSurah === 1 && a.text.startsWith(BISMILLAH) ? a.text.slice(BISMILLAH.length).trim() : a.text,
      en: enE?.ayahs[i]?.text ?? '', ml: mlE?.ayahs[i]?.text ?? '',
    })),
  };
  surahs.set(n, s);
  return s;
}

export const showBismillah = (n: number) => n !== 1 && n !== 9;
export const BISMILLAH_TEXT = BISMILLAH;

export function ayahAudio(reciter: Reciter, global: number) {
  return `https://cdn.islamic.network/quran/audio/${reciter.bitrate}/${reciter.id}/${global}.mp3`;
}

/* ---------- preferences, bookmarks and last read (saved on this device) ---------- */
type Prefs = { reciter: string; translation: 'en' | 'ml' | 'both' | 'none'; size: number };
const PREFS = 'noon.quran.prefs';
const MARKS = 'noon.quran.bookmarks';
const LAST = 'noon.quran.last';

export async function getPrefs(): Promise<Prefs> {
  try { return { reciter: 'ar.alafasy', translation: 'en', size: 1, ...JSON.parse((await storage.get(PREFS)) ?? '{}') }; } catch { return { reciter: 'ar.alafasy', translation: 'en', size: 1 }; }
}
export async function setPrefs(p: Partial<Prefs>) { await storage.set(PREFS, JSON.stringify({ ...(await getPrefs()), ...p })); }

export type Mark = { surah: number; ayah: number; name: string; at: string };
export async function getMarks(): Promise<Mark[]> { try { return JSON.parse((await storage.get(MARKS)) ?? '[]'); } catch { return []; } }
export async function toggleMark(m: Omit<Mark, 'at'>): Promise<Mark[]> {
  const all = await getMarks();
  const has = all.some((x) => x.surah === m.surah && x.ayah === m.ayah);
  const next = has ? all.filter((x) => !(x.surah === m.surah && x.ayah === m.ayah)) : [{ ...m, at: new Date().toISOString() }, ...all].slice(0, 50);
  await storage.set(MARKS, JSON.stringify(next));
  return next;
}
export async function getLast(): Promise<{ surah: number; ayah: number; name: string } | null> { try { return JSON.parse((await storage.get(LAST)) ?? 'null'); } catch { return null; } }
export async function setLast(v: { surah: number; ayah: number; name: string }) { await storage.set(LAST, JSON.stringify(v)); }
