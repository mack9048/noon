// In-memory demo backend so the app runs before the Laravel API is deployed.
// Mirrors the routes in api/routes/api.php.
import type {
  Board, SchoolClass, Subject, SubjectDetail, Course, CourseDetail, StudyTool,
  LeaveSummary, Conversation, Message, User, Role,
} from './types';

const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms));

let me: User | null = null;
let nextId = 1000;

const boards: Board[] = [
  { id: 1, code: 'AP', name: 'Sunni Vidyabhyasa Board', meta: 'AP syllabus' },
  { id: 2, code: 'EK', name: 'Sunni Board', meta: 'EK syllabus' },
  { id: 3, code: 'GEN', name: 'General', meta: 'Noon Learn syllabus' },
];
const classLabels = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '+1', '+2'];
const classes: SchoolClass[] = boards.flatMap((b) =>
  classLabels.map((label, i) => ({ id: b.id * 100 + i + 1, board_id: b.id, label, subjects_count: 8 })));
const subjectNames: [string, string][] = [
  ['Quran', 'قرآن'], ['Thajweed', 'تجويد'], ['Fiqh', 'فقه'], ['Thareekh', 'تاريخ'],
  ['Aqeedah', 'عقيدة'], ['Akhlaq', 'أخلاق'], ['Hadith', 'حديث'], ['Arabic', 'لغة'],
];
const lessonTitles = ['Thaharah — purity', 'Types of water', 'Najas and cleaning', 'Wudu — steps', 'What breaks wudu', 'Ghusl', 'Tayammum', 'Times of Salah'];

let courses: CourseDetail[] = [
  { id: 1, title: 'Arabic for Beginners', category: 'Arabic', level: 'Beginner', cover: '#DAD3F6', status: 'published', teacher_name: 'Ustad Ahmed', lessons_count: 24, progress: 40, enrolled: true, next_live_at: 'Today 5:00 PM',
    items: [
      { id: 11, course_id: 1, kind: 'live', title: 'Lesson 6 · Letters with harakath', meta: 'Live · Today 5:00 PM' },
      { id: 12, course_id: 1, kind: 'video', title: 'Lesson 5 · Joining letters', meta: 'Recorded video · 11:20', done: true },
      { id: 13, course_id: 1, kind: 'audio', title: 'Listen: ba, ta, tha', meta: 'Audio note · 3:05' },
      { id: 14, course_id: 1, kind: 'pdf', title: 'Worksheet 5', meta: 'PDF note · 2 pages' },
      { id: 15, course_id: 1, kind: 'test', title: 'Quiz 5 · Harakath', meta: 'Assessment · 10 questions' },
    ] },
  { id: 2, title: 'Thajweed Level 1', category: 'Quran', level: 'Beginner', cover: '#D2F0D4', status: 'published', teacher_name: 'Safwan Usthad', lessons_count: 18, progress: 65, enrolled: true, items: [] },
  { id: 3, title: 'Fiqh of Salah', category: 'Fiqh', level: 'Beginner', cover: '#CDE6F1', status: 'published', teacher_name: 'Ayisha Miss', lessons_count: 12, progress: 15, enrolled: true, items: [] },
  { id: 4, title: 'Seerah Stories', category: 'Seerah', level: 'All', cover: '#F3CFEA', status: 'published', lessons_count: 30, is_free: true, items: [] },
  { id: 5, title: 'Hifz Juz Amma', category: 'Quran', level: 'Middle', cover: '#F7E9BC', status: 'draft', lessons_count: 37, items: [] },
];

let tools: StudyTool[] = [
  ...['ഉപ പാഠപുസ്തകം മാർക്ക് ലിസ്റ്റ്', 'എഴുത്ത് പരിശീലനം', 'നിറം നൽകാം (1)', 'നിറം നൽകാം (2)'].map((t, i) => ({ id: 100 + i, type: 'chart' as const, title: t, is_new: i === 0, status: 'live' as const, views: 120 + i * 30 })),
  ...['നിസ്കാരം', 'അസ്മാഉൽ ഹുസ്ന', 'ഉറങ്ങുന്നതിനു മുൻപ്', 'ഓരോ വക്തിനും ശേഷമുള്ള ദുആ', 'ദൈനംദിന ദിക്റുകൾ'].map((t, i) => ({ id: 200 + i, type: 'adkar' as const, title: t, is_new: false, status: 'live' as const, views: 90 + i * 12 })),
  ...['ضَمَائِرُ الْمُنْفَصِلَةِ', 'طَلَعَ الْبَدْرُ', 'അറബി അക്ഷരമാല', 'ചോദ്യ പദങ്ങൾ'].map((t, i) => ({ id: 300 + i, type: 'slide' as const, title: t, is_new: false, status: 'live' as const, views: 60 + i * 9 })),
  ...['MSR പരിശ്കരണ ഫോം', 'ജോയിൻ ലെറ്റർ', 'മദ്റസയിൽ ചേർക്കാനുള്ള അപേക്ഷാ ഫോറം'].map((t, i) => ({ id: 400 + i, type: 'form' as const, title: t, is_new: i === 0, status: 'live' as const, views: 40 + i * 7 })),
];

const leave: LeaveSummary = {
  total: 15, used: 7, remaining: 8,
  requests: [
    { id: 1, type: 'Sick leave', start_date: '2026-02-03', end_date: '2026-02-04', status: 'approved' },
    { id: 2, type: 'Casual leave', start_date: '2026-01-28', end_date: '2026-01-28', status: 'rejected' },
  ],
};

const conversations: Conversation[] = [
  { id: 1, title: 'Ustad Ahmed', kind: 'direct', role_label: 'Teacher', last_message: 'Fatha — the mark is on top.', last_at: '4:23 PM', unread: 2 },
  { id: 2, title: 'Madrasa 5 · Class group', kind: 'group', role_label: 'Group', last_message: 'Fathima: Who has the Fiqh notes?', last_at: '4:12 PM', unread: 5 },
  { id: 3, title: 'Noon Learn office', kind: 'office', role_label: 'Admin', last_message: 'Classes are off on Friday.', last_at: '3:58 PM', unread: 0 },
];
const messages: Message[] = [
  { id: 1, conversation_id: 1, mine: false, sender_name: 'Ustad Ahmed', kind: 'text', body: 'Assalamu alaikum 🌙', created_at: '4:02 PM' },
  { id: 2, conversation_id: 1, mine: true, sender_name: 'Me', kind: 'text', body: 'Wa alaikum assalam Ustad', created_at: '4:03 PM', seen: true },
  { id: 3, conversation_id: 1, mine: false, sender_name: 'Ustad Ahmed', kind: 'file', body: 'Worksheet 7 – Harakath.pdf', created_at: '4:04 PM' },
  { id: 4, conversation_id: 1, mine: false, sender_name: 'Ustad Ahmed', kind: 'text', body: 'Fatha — the mark is on top. MashaAllah!', created_at: '4:23 PM' },
];

function demoUser(role: Role, name: string): User {
  return { id: 1, name, role, tenant_id: role === 'guest' || role === 'super' ? null : 1, tenant_name: 'Noon Madrasa', board_id: 1, class_id: 105, avatar_initial: name[0] };
}

type Handler = (m: RegExpMatchArray, body: any) => unknown;
const routes: [string, RegExp, Handler][] = [
  ['POST', /^\/auth\/login$/, (_, b) => {
    const id = String(b?.login ?? '').toLowerCase();
    const role: Role = id.startsWith('super') ? 'super' : id.startsWith('admin') ? 'admin' : id.startsWith('teacher') ? 'teacher' : 'student';
    me = demoUser(role, role === 'student' ? 'Ayisha' : role[0].toUpperCase() + role.slice(1));
    return { token: 'demo-token', user: me };
  }],
  ['POST', /^\/auth\/guest$/, (_, b) => {
    me = { ...demoUser('guest', b?.name || 'Guest'), board_id: b?.board_id ?? null, class_id: b?.class_id ?? null };
    (b?.course_ids ?? []).forEach((cid: number) => { const c = courses.find((x) => x.id === cid); if (c) c.enrolled = true; });
    return { token: 'demo-guest', user: me };
  }],
  ['GET', /^\/auth\/me$/, () => me],
  ['POST', /^\/auth\/join-tenant$/, (_, b) => {
    if (String(b?.code ?? '').trim().toUpperCase() !== 'NOON01') throw new Error('This madrasa code is not valid.');
    me = { ...(me ?? demoUser('student', 'Guest')), role: 'student', tenant_id: 1, tenant_name: 'Noon Madrasa' };
    return me;
  }],
  ['POST', /^\/auth\/logout$/, () => { me = null; return {}; }],
  ['PUT', /^\/me\/learning$/, (_, b) => { if (me) Object.assign(me, { board_id: b.board_id, class_id: b.class_id }); return me; }],

  ['GET', /^\/boards$/, () => boards],
  ['GET', /^\/boards\/(\d+)\/classes$/, (m) => classes.filter((c) => c.board_id === +m[1])],
  ['GET', /^\/classes\/(\d+)\/subjects$/, (m) => subjectNames.map(([name, ar], i): Subject => ({ id: +m[1] * 10 + i, class_id: +m[1], name, name_ar: ar, lessons_count: 10 + i }))],
  ['GET', /^\/subjects\/(\d+)$/, (m): SubjectDetail => {
    const id = +m[1]; const cls = classes.find((c) => c.id === Math.floor(id / 10));
    const [name, ar] = subjectNames[id % 10] ?? subjectNames[2];
    return { id, class_id: cls?.id ?? 0, name, name_ar: ar, lessons_count: lessonTitles.length, textbook_pdf_url: '#',
      board_name: boards.find((b) => b.id === cls?.board_id)?.code, class_label: cls?.label,
      lessons: lessonTitles.map((t, i) => ({ id: id * 100 + i, subject_id: id, position: i + 1, title: t, video_url: '#', video_duration: `${6 + i}:1${i}`, audio_url: '#', audio_duration: `${4 + (i % 3)}:0${i}`, note_pdf_url: '#' })) };
  }],

  ['GET', /^\/courses(\?scope=(\w+))?$/, (m) => {
    const scope = m[2] ?? 'all';
    const list = courses.filter((c) => c.status === 'published');
    return (scope === 'mine' ? list.filter((c) => c.enrolled) : scope === 'explore' ? list.filter((c) => !c.enrolled) : list).map(({ items, ...c }) => c);
  }],
  ['GET', /^\/courses\/(\d+)$/, (m) => courses.find((c) => c.id === +m[1])],
  ['POST', /^\/courses\/(\d+)\/enroll$/, (m) => { const c = courses.find((x) => x.id === +m[1]); if (c) c.enrolled = true; return c; }],
  ['GET', /^\/super\/courses$/, () => courses.map(({ items, ...c }) => ({ ...c, items_count: items.length }))],
  ['POST', /^\/super\/courses$/, (_, b) => { const c: CourseDetail = { id: nextId++, title: b.title, category: b.category, level: b.level, cover: b.cover ?? '#DAD3F6', status: b.status ?? 'draft', lessons_count: 0, items: [] }; courses = [c, ...courses]; return c; }],
  ['PUT', /^\/super\/courses\/(\d+)$/, (m, b) => { courses = courses.map((c) => (c.id === +m[1] ? { ...c, ...b } : c)); return courses.find((c) => c.id === +m[1]); }],
  ['DELETE', /^\/super\/courses\/(\d+)$/, (m) => { courses = courses.filter((c) => c.id !== +m[1]); return {}; }],
  ['POST', /^\/super\/courses\/(\d+)\/items$/, (m, b) => { const c = courses.find((x) => x.id === +m[1]); const it = { id: nextId++, course_id: +m[1], kind: b.kind, title: b.title, meta: b.meta }; c?.items.push(it); return it; }],
  ['DELETE', /^\/super\/course-items\/(\d+)$/, (m) => { courses.forEach((c) => { c.items = c.items.filter((i) => i.id !== +m[1]); }); return {}; }],

  ['GET', /^\/study-tools\?type=(\w+)$/, (m) => tools.filter((t) => t.type === m[1] && t.status === 'live')],
  ['GET', /^\/super\/study-tools$/, () => tools],
  ['POST', /^\/super\/study-tools$/, (_, b) => { const t: StudyTool = { id: nextId++, type: b.type, title: b.title, is_new: !!b.is_new, status: b.status ?? 'draft', views: 0 }; tools = [t, ...tools]; return t; }],
  ['PUT', /^\/super\/study-tools\/(\d+)$/, (m, b) => { tools = tools.map((t) => (t.id === +m[1] ? { ...t, ...b } : t)); return tools.find((t) => t.id === +m[1]); }],
  ['DELETE', /^\/super\/study-tools\/(\d+)$/, (m) => { tools = tools.filter((t) => t.id !== +m[1]); return {}; }],

  ['GET', /^\/leave-requests$/, () => leave],
  ['POST', /^\/leave-requests$/, (_, b) => { const r = { id: nextId++, type: b.type, start_date: b.start_date, end_date: b.end_date, reason: b.reason, status: 'pending' as const }; leave.requests.unshift(r); return r; }],

  ['GET', /^\/staff\/leave-requests$/, () => [
    { id: 91, student_name: 'Rayan Ahmed', type: 'Sick leave', start_date: '2026-11-05', end_date: '2026-11-06', reason: 'Fever', status: 'pending' },
    { id: 92, student_name: 'Fathima N', type: 'Family function', start_date: '2026-11-10', end_date: '2026-11-10', reason: 'Wedding', status: 'approved' },
  ]],
  ['PATCH', /^\/staff\/leave-requests\/(\d+)$/, (m, b) => ({ id: +m[1], status: b.status })],
  ['PUT', /^\/admin\/courses\/(\d+)$/, (m, b) => ({ id: +m[1], enabled: !!b.enabled })],
  ['POST', /^\/teacher\/courses\/(\d+)\/items$/, (m, b) => { const c = courses.find((x) => x.id === +m[1]); const it = { id: nextId++, course_id: +m[1], kind: b.kind, title: b.title, meta: b.meta }; c?.items.unshift(it); return it; }],
  ['GET', /^\/conversations$/, () => conversations],
  ['GET', /^\/conversations\/(\d+)\/messages$/, (m) => messages.filter((x) => x.conversation_id === +m[1])],
  ['POST', /^\/conversations\/(\d+)\/messages$/, (m, b) => { const msg: Message = { id: nextId++, conversation_id: +m[1], mine: true, sender_name: 'Me', kind: b.kind ?? 'text', body: b.body, created_at: 'now', seen: false }; messages.push(msg); return msg; }],
];

export async function mockRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  await wait();
  for (const [verb, re, handler] of routes) {
    const m = path.match(re);
    if (verb === method && m) return JSON.parse(JSON.stringify(handler(m, body) ?? null)) as T;
  }
  throw new Error(`Mock: no handler for ${method} ${path}`);
}
