// Sample data from the design canvas, for screens whose backend comes in later steps.
// Each block notes the API that will replace it.

export const SALAH_STEPS = [
  'Niyyah (intention)', 'Takbeer', 'Surah Al-Fatihah', 'Surah', 'Ruku', 'Dhikr in Ruku', 'I‘tidal (standing after Ruku)',
  'Accuracy in Sujood', 'Dhikr in Sujood', 'Sitting between two Sujood', 'Dhikr between two Sujood', 'At-Tahiyyat (Tashahhud)',
  'Sitting for At-Tahiyyat', 'Salawat on the Prophet ﷺ', 'Du‘a after Tashahhud', 'Qunoot', 'Ending with Salam', 'Order of Salah steps',
];
// Scores for the October report (Surah Al-Fatihah and Qunoot need practice).
export const SALAH_SCORES = SALAH_STEPS.map((name, i) => ({ name, pct: i === 2 || i === 15 ? 75 : [4, 5, 7, 8, 9, 16].includes(i) ? 100 : 95 }));

export const CLASSROOM = {
  className: 'Madrasa 5',
  live: { title: 'Arabic Class', teacher: 'Ustad Ahmed', time: '4:30 – 5:15 PM', glyph: 'ع' },
  upcoming: [
    { glyph: 'ت', tint: 'mint', title: 'Thajweed', sub: 'Safwan Usthad', meta: 'Tue 5:00 PM', action: 'Remind' },
    { glyph: 'ف', tint: 'lav', title: 'Fiqh', sub: 'Ayisha Miss', meta: 'Wed 4:30 PM', action: 'Remind' },
  ],
  pending: [
    { glyph: 'ع', tint: 'butter', title: 'Arabic worksheet 7', sub: 'Ustad Ahmed', meta: 'Due tomorrow', action: 'Submit' },
    { glyph: 'ق', tint: 'pink', title: 'Surah Al-Mulk', sub: 'Recitation', meta: 'Due Fri', action: 'Record' },
  ],
  done: [
    { glyph: 'أ', tint: 'sky', title: 'Akhlaq', sub: 'Ustad Ahmed', meta: 'Sat 31 Oct', action: 'Replay' },
    { glyph: 'ت', tint: 'mint', title: 'Thajweed', sub: 'Safwan Usthad', meta: 'Fri 30 Oct', action: 'Replay' },
  ],
  counts: { up: 12, pend: 2, done: 52 },
} as const;

export const PROFILE = {
  first: 'Ayisha', last: 'Abdulla', line: 'Madrasa 5 · Roll 1 · Student',
  stats: { attendance: '96%', stars: 240, avg: '94%' },
  details: [['Date of birth', '12 Mar 2015'], ['Academic year', '2026–27'], ['Joined', 'June 2022'], ['Parent', 'Muhammed'], ['Parent phone', '[PARENT PHONE]']] as [string, string][],
};

// GET /fees (step 2)
export const FEES = {
  due: [
    { id: 'nov', title: 'November 2026 fee', amount: 800, due: 'Due 5 Nov' },
    { id: 'exam', title: 'Term 2 exam fee', amount: 300, due: 'Due 20 Nov' },
  ],
  paid: [
    { title: 'October 2026 fee', date: '2 Oct', method: 'UPI', amount: 800, receipt: 'RCP-1041' },
    { title: 'September 2026 fee', date: '3 Sep', method: 'Card', amount: 800, receipt: 'RCP-0987' },
    { title: 'August 2026 fee', date: '1 Aug', method: 'UPI', amount: 800, receipt: 'RCP-0932' },
    { title: 'Books & materials', date: '20 Jul', method: 'Cash', amount: 450, receipt: 'RCP-0901' },
    { title: 'July 2026 fee', date: '4 Jul', method: 'UPI', amount: 800, receipt: 'RCP-0877' },
  ],
};

// GET /attendance/summary (step 2)
export const ATTENDANCE = {
  today: 'Monday, 2 Nov 2026',
  week: { present: 3, absent: 0, half: 1, leave: 0, ontime: 3, late: 1 },
  month: { present: 1, absent: 0, half: 0, leave: 0, ontime: 1, late: 0 },
  year: { present: 82, absent: 3, half: 2, leave: 4, ontime: 78, late: 6 },
};

export const AUDIO_BOOKS = [
  { cat: 'stories', glyph: 'ق', tint: 'sky', title: 'Stories of the Prophets', meta: '24 parts · 6h 10m', part: 'Part 3 · Prophet Nuh', len: '9:00' },
  { cat: 'duas', glyph: 'د', tint: 'mint', title: 'Daily Duas', meta: '40 tracks · 1h 05m', part: 'Track 1 · Morning dua', len: '1:30' },
  { cat: 'quran', glyph: 'جزء', tint: 'lav', title: 'Juz Amma recitation', meta: '37 tracks · 2h 20m', part: 'Surah An-Naba', len: '4:32' },
  { cat: 'stories', glyph: 'خ', tint: 'pink', title: 'Akhlaq Tales', meta: '12 parts · 1h 50m', part: 'Part 1 · Honesty', len: '8:10' },
] as const;

export const HELP_FAQ = [
  ['How do I join a live class?', 'Open My Classroom. When a class is live, tap Join now on the blue card. The button shows 5 minutes before class starts.'],
  ['How do I pay the monthly fee?', 'Go to More › Fees and tap Pay on the fee. You can pay by UPI, card or net banking.'],
  ['How do I request leave?', 'Go to More › Attendance and tap Request leave. Your Usthad will be told.'],
  ['I forgot my password', 'Go to More › Settings › Change password, or ask the madrasa office to reset it.'],
] as const;

export const GAMES = [
  { key: 'car', name: 'Car with Harakath', tag: 'NEW GAME', desc: 'Drive to the sign with the right harakah!', art: 'بَ', g: ['#FF9A3D', '#FF5E7E'], xp: 50, ready: true },
  { key: 'builder', name: 'Harakath Builder', tag: 'PUZZLE', desc: 'Stack letters, add nuqta and marks', art: 'بَا', g: ['#8A6CFF', '#5B43E0'], xp: 40, ready: true },
  { key: 'river', name: 'River of Letters', tag: 'ADVENTURE', desc: 'Help Froggy hop on the right letter', art: 'تِ', g: ['#3CC6F0', '#1F6FE0'], xp: 60, ready: true },
  { key: 'road', name: 'Town Road', tag: 'BOARD GAME', desc: 'Roll the dice and read your way home', art: 'ت ث', g: ['#4ED68A', '#14945A'], xp: 30, ready: true },
  { key: 'surah', name: 'Surah Quiz', tag: 'QUIZ', desc: 'Which surah is this?', art: 'سُورَة', g: ['#B05CF0', '#7B2FD8'], xp: 30, ready: false },
  { key: 'dua', name: 'Dua Builder', tag: 'PUZZLE', desc: 'Put the dua in order', art: 'دُعَاء', g: ['#7FD36A', '#2E9E57'], xp: 30, ready: false },
  { key: 'numbers', name: 'Arabic Numbers', tag: 'COUNTING', desc: 'Count with Arabic numbers', art: '١٢٣', g: ['#FF8A5B', '#E0533A'], xp: 20, ready: false },
  { key: 'sukoon', name: 'Sukoon Hunt', tag: 'FIND IT', desc: 'Find every letter with sukoon', art: 'نْ', g: ['#1FB5A8', '#0E7A70'], xp: 30, ready: false },
  { key: 'word', name: 'Word Game', tag: 'WORDS', desc: 'Join letters into words', art: 'كِتَاب', g: ['#F06292', '#C2307E'], xp: 40, ready: false },
] as const;

// Home "My classes" slider (design: Main). Sample data until classes come from the API.
// href is relative to the role base (/student …).
export const HOME_CLASSES = [
  { name: 'Arabic Class', teacher: 'Ustad Ahmed · Madrasa 5', time: 'Today, 4:30 PM · 45 min', tag: '● STARTS IN 25 MIN', hot: true, glyph: 'ع', cta: 'Join class', icon: 'videocam', src: 'Madrasa', g: ['#5B43E0', '#9B7BE8'], btn: '#5B43E0', href: '/live/1' },
  { name: 'Thajweed Level 1', teacher: 'Safwan Usthad · Noon Course', time: 'Today, 6:00 PM · 40 min', tag: 'LIVE TODAY', hot: false, glyph: 'ت', cta: 'Set reminder', icon: 'notifications', src: 'Noon Course', g: ['#14945A', '#4ED68A'], btn: '#14945A', href: '/courses/2' },
  { name: 'Fiqh · Lesson 4', teacher: 'Ayisha Miss · Madrasa 5', time: 'Tomorrow, 4:30 PM', tag: 'TOMORROW', hot: false, glyph: 'ف', cta: 'Prepare', icon: 'book', src: 'Madrasa', g: ['#0B5166', '#1F8AA8'], btn: '#0B5166', href: '/classroom' },
  { name: 'Hifz revision', teacher: 'Safwan Usthad · Surah Al-Mulk', time: 'Sat, 5:00 PM', tag: 'THIS WEEK', hot: false, glyph: 'ح', cta: 'Revise now', icon: 'repeat', src: 'Madrasa', g: ['#FF9A3D', '#FF5E7E'], btn: '#FF5E7E', href: '/quran/hifz' },
] as const;
