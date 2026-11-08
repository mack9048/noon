// In-memory demo backend so the app runs before the Laravel API is deployed.
// Mirrors the routes in api/routes/api.php.
import type {
  Board, SchoolClass, Subject, SubjectDetail, Course, CourseDetail, StudyTool,
  LeaveSummary, Conversation, Message, User, Role, LearnDetail, LearnSpace, LearnResult,
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

// ---- Batches ----
const BATCH_TEACHERS = [{ id: 2, name: 'Ustad Ahmed' }, { id: 3, name: 'Ayisha Miss' }, { id: 4, name: 'Safwan Usthad' }, { id: 5, name: 'Noushad K' }];
const BATCH_STUDENTS = ['Ayisha Rahman', 'Fathima Nasrin', 'Hamdan P', 'Muhammed Adil', 'Nihal T', 'Rayan Ahmed', 'Shifa K', 'Zayan M', 'Amna Sherin', 'Bilal K'].map((name, i) => ({ id: 100 + i, name }));
let batchRows = [
  { id: 1, cls: '5', name: 'Madrasa 5 · Morning', board: 'AP', when: 'Mo–Th 4:30 PM', students: 28, teachers: 3, subjects: 8, ct: 'Ustad Ahmed' },
  { id: 2, cls: '3', name: 'Madrasa 3 · Evening', board: 'AP', when: 'Mo–Th 6:00 PM', students: 22, teachers: 3, subjects: 7, ct: 'Ayisha Miss' },
  { id: 3, cls: '7', name: 'Madrasa 7', board: 'EK', when: 'Tu–Fr 5:00 PM', students: 25, teachers: 4, subjects: 8, ct: 'Safwan Usthad' },
  { id: 4, cls: '+1', name: 'Plus One · Girls', board: 'GEN', when: 'Sa–Su 10:00 AM', students: 14, teachers: 2, subjects: 6, ct: 'Ayisha Miss' },
];

// ---- Course approvals (madrasa-made courses) ----
let courseRequests: { id: number; title: string; category: string; madrasa: string; when: string; tags: string[]; status: string; logo_url?: string | null }[] = [
  { id: 901, title: 'Malayalam Duas for Kids', category: 'Duas', madrasa: 'Noon Madrasa', when: 'Just now', tags: ['Duas & Adkar', '3 items', 'Ayisha Miss', 'My madrasa only'], status: 'waiting' },
  { id: 902, title: 'Thajweed for Girls', category: 'Quran', madrasa: 'Al Noor Madrasa', when: '3h ago', tags: ['Quran', '12 items', 'Live weekly', 'All Noon Learn'], status: 'waiting' },
  { id: 903, title: 'Fiqh Q&A Live', category: 'Fiqh', madrasa: 'Darul Huda Online', when: 'Yesterday', tags: ['Fiqh', '6 items', 'Live monthly', 'My madrasa only'], status: 'waiting' },
];

// ---- Admissions (public form + admin list) ----
type MockApp = import('./admissions').Application;
let admissionRows: MockApp[] = [
  { id: 'APL-2026-0142', name: 'Rayan Ahmed', gender: 'Boy', dob: '14 Mar 2016', age: 10, board: 'AP', cls: '5', parent: 'Abdul Rahman K', relation: 'Father', phone: '+971 50 123 4567', city: 'Sharjah, UAE', prevMadrasa: 'Darul Huda, Kozhikode', time: 'Evening · 4:30 PM', docs: { birth: true, tc: true, photo: false }, status: 'new', when: '2h ago', timeline: [['Form submitted via WhatsApp link', 'Today, 9:42 AM'], ['Fee receipt uploaded', 'Today, 9:44 AM']] },
  { id: 'APL-2026-0141', name: 'Fathima Nasrin', gender: 'Girl', dob: '2 Jan 2018', age: 8, board: 'AP', cls: '3', parent: 'Nasrin P', relation: 'Mother', phone: '+971 52 765 1100', city: 'Dubai, UAE', docs: { birth: true, tc: false, photo: true }, status: 'new', when: '5h ago', timeline: [['Form submitted via WhatsApp link', 'Today, 6:10 AM']] },
  { id: 'APL-2026-0139', name: 'Muhammed Adil', gender: 'Boy', dob: '9 Jul 2014', age: 12, board: 'EK', cls: '7', parent: 'Adil K', relation: 'Father', phone: '+971 54 300 2211', city: 'Ajman, UAE', docs: { birth: true, tc: true, photo: true }, status: 'new', when: 'Yesterday', timeline: [['Form submitted at the office', 'Yesterday, 5:20 PM']] },
  { id: 'APL-2026-0131', name: 'Shifa K', gender: 'Girl', dob: '1 May 2017', age: 9, board: 'AP', cls: '4', parent: 'Kareem', relation: 'Father', phone: '+971 50 222 1188', city: 'Sharjah, UAE', docs: { birth: true, tc: true, photo: true }, status: 'review', when: '2 days ago', timeline: [['Form submitted', 'Mon'], ['Interview booked', 'Tue']] },
  { id: 'APL-2026-0128', name: 'Bilal K', gender: 'Boy', dob: '3 Feb 2015', age: 11, board: 'AP', cls: '6', parent: 'Khalid', relation: 'Father', phone: '+971 56 110 9090', city: 'Sharjah, UAE', docs: { birth: true, tc: false, photo: true }, status: 'review', when: '3 days ago', timeline: [['Form submitted', 'Sun']] },
  { id: 'APL-2026-0120', name: 'Amna Sherin', gender: 'Girl', dob: '20 Aug 2016', age: 10, board: 'AP', cls: '5', parent: 'Sherin', relation: 'Mother', phone: '+971 55 404 7788', city: 'Dubai, UAE', docs: { birth: true, tc: true, photo: true }, status: 'admitted', when: 'Last week', timeline: [['Admitted', 'Last week']] },
  { id: 'APL-2026-0117', name: 'Zayan M', gender: 'Boy', dob: '11 Nov 2018', age: 8, board: 'GEN', cls: '2', parent: 'Muneer', relation: 'Father', phone: '+971 50 909 1212', city: 'Sharjah, UAE', docs: { birth: true, tc: true, photo: true }, status: 'admitted', when: 'Last week', timeline: [['Admitted', 'Last week']] },
];
const nowStr = () => `Today, ${new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`;

// ---- Learning spaces (GET /learn, /learn/{type}/{id}) ----
const grade = (p: number) => (p >= 90 ? 'A+' : p >= 80 ? 'A' : p >= 70 ? 'B+' : p >= 60 ? 'B' : p >= 50 ? 'C' : p >= 40 ? 'D' : 'E');
const day = (d: number) => new Date(Date.now() + d * 86400000).toISOString();
function learnSpaces(): LearnSpace[] {
  if (!me || !['student', 'parent', 'guest'].includes(me.role)) return [];
  const cls = classes.find((c) => c.id === me!.class_id);
  const subs: LearnSpace[] = cls ? subjectNames.map(([name, ar], i) => ({ key: `subject-${cls.id * 10 + i}`, type: 'subject', id: cls.id * 10 + i, title: name, title_ar: ar,
    subtitle: `${boards.find((b) => b.id === cls.board_id)?.code} board · Class ${cls.label}`, cover: null })) : [];
  const crs: LearnSpace[] = courses.filter((c) => c.enrolled && c.status === 'published').map((c) => ({ key: `course-${c.id}`, type: 'course', id: c.id, title: c.title, subtitle: `Noon Course · ${c.teacher_name ?? c.category}`, cover: c.cover }));
  return [...subs, ...crs];
}
function learnDetail(type: string, id: number): LearnDetail {
  const space = learnSpaces().find((s) => s.key === `${type}-${id}`);
  if (!space) throw new Error(type === 'course' ? 'Enrol in this course to see its materials.' : 'This subject is not in your class.');
  const seed = id % 7;
  const mk = (kind: 'assessment' | 'exam', title: string, d: number, max: number, marks: number | null) =>
    ({ id: `a${id}${title}`, title, type: kind, due_at: day(d), max_marks: max, marks, status: marks != null ? 'marked' : d < 0 ? 'awaiting' : 'upcoming' } as const);
  const list = type === 'course'
    ? [mk('assessment', 'Unit 1 assessment', -20, 50, 36 + seed), mk('assessment', 'Unit 2 assessment', 4, 50, null), mk('exam', 'Term 1 exam', -10, 100, 70 + seed * 3), mk('exam', 'Term 2 exam', 30, 100, null)]
    : [mk('assessment', 'Weekly test 3', -6, 50, 35 + seed * 2), mk('assessment', 'Weekly test 4', 3, 50, null), mk('exam', 'Onam exam', -14, 100, 68 + seed * 4), mk('exam', 'Half-yearly exam', 40, 100, null)];
  const results: LearnResult[] = list.filter((a) => a.marks != null).map((a) => {
    const percent = Math.round((a.marks! / a.max_marks) * 100);
    return { id: a.id, title: a.title, type: a.type, marks: a.marks!, max_marks: a.max_marks, percent, grade: grade(percent), remarks: percent >= 80 ? 'Excellent, keep it up' : 'Good effort', date: a.due_at.slice(0, 10) };
  });
  const avg = (r: LearnResult[]) => (r.length ? Math.round(r.reduce((n, x) => n + x.percent, 0) / r.length) : null);
  const row = ({ type: _t, ...a }: (typeof list)[number]) => a;
  let materials: LearnDetail['materials']; let syllabus: LearnDetail['syllabus']; let quizzes: LearnDetail['assessments'] = [];
  if (type === 'course') {
    const c = courses.find((x) => x.id === id)!;
    materials = c.items.filter((i) => i.kind !== 'test').map((i) => ({ id: `i${i.id}`, kind: i.kind as any, title: i.title, meta: i.meta, url: i.url ?? (i.kind === 'pdf' ? '/samples/workbook.pdf' : null), item_id: i.id }));
    syllabus = c.items.map((i, n) => ({ position: n + 1, title: i.title, done: !!i.done }));
    quizzes = c.items.filter((i) => i.kind === 'test').map((i) => ({ id: `q${i.id}`, title: i.title, meta: i.meta, status: i.done ? 'done' : 'open', item_id: i.id }));
  } else {
    materials = [{ id: 't', kind: 'pdf', title: 'Textbook', meta: 'Textbook · PDF', url: '/samples/textbook.pdf' },
      { id: 'w', kind: 'pdf', title: 'Work book', meta: 'Work book · PDF', url: '/samples/workbook.pdf' },
      ...lessonTitles.flatMap((t, i) => [
        { id: `v${i}`, kind: 'video' as const, title: `Lesson ${i + 1} · ${t}`, meta: `Video class · ${6 + i}:10`, url: '#' },
        { id: `a${i}`, kind: 'audio' as const, title: `Lesson ${i + 1} · ${t}`, meta: `Audio class · ${4 + (i % 3)}:05`, url: '#' },
        { id: `n${i}`, kind: 'pdf' as const, title: `Lesson ${i + 1} · ${t}`, meta: 'Class note · PDF', url: '/samples/note.pdf' },
      ])];
    syllabus = lessonTitles.map((t, i) => ({ position: i + 1, title: t, done: i < 3 }));
  }
  const average = avg(results);
  return {
    space, materials, syllabus,
    assessments: [...quizzes, ...list.filter((a) => a.type === 'assessment').map(row)],
    exams: list.filter((a) => a.type === 'exam').map(row),
    results,
    report: { student: me?.role === 'parent' ? 'Ayisha' : me?.name, average, grade: average == null ? null : grade(average), count: results.length,
      exam_average: avg(results.filter((r) => r.type === 'exam')), assessment_average: avg(results.filter((r) => r.type === 'assessment')) },
  };
}

type Handler = (m: RegExpMatchArray, body: any) => unknown;
const routes: [string, RegExp, Handler][] = [
  ['POST', /^\/auth\/login$/, (_, b) => {
    const id = String(b?.login ?? '').toLowerCase();
    const role: Role = id.startsWith('super') ? 'super' : id.startsWith('admin') ? 'admin' : id.startsWith('teacher') ? 'teacher' : id.startsWith('parent') ? 'parent' : 'student';
    const names: Record<string, string> = { student: 'Ayisha', parent: 'Muhammed', teacher: 'Ustad Ahmed', admin: 'Office Admin', super: 'Super Admin' };
    me = demoUser(role, names[role] ?? 'Ayisha');
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
    return { id, class_id: cls?.id ?? 0, name, name_ar: ar, lessons_count: lessonTitles.length, textbook_pdf_url: '/samples/textbook.pdf',
      board_name: boards.find((b) => b.id === cls?.board_id)?.code, class_label: cls?.label,
      lessons: lessonTitles.map((t, i) => ({ id: id * 100 + i, subject_id: id, position: i + 1, title: t, video_url: '#', video_duration: `${6 + i}:1${i}`, audio_url: '#', audio_duration: `${4 + (i % 3)}:0${i}`, note_pdf_url: '#' })) };
  }],

  ['GET', /^\/admin\/batches$/, () => batchRows],
  ['GET', /^\/admin\/batches\/people$/, () => ({ teachers: BATCH_TEACHERS, students: BATCH_STUDENTS })],
  ['POST', /^\/admin\/batches$/, (_, b) => {
    if (!b?.name || !(b.days ?? []).length) throw new Error('Give the batch a name and pick its class days.');
    const order = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
    const days = [...b.days].sort((x: string, y: string) => order.indexOf(x) - order.indexOf(y));
    const row = { id: nextId++, cls: b.cls, name: b.name, board: b.board, when: `${days[0]}–${days[days.length - 1]} ${b.start_time}`, students: (b.student_ids ?? []).length,
      teachers: new Set(Object.values(b.subject_teachers ?? {})).size, subjects: Object.keys(b.subject_teachers ?? {}).length, ct: BATCH_TEACHERS.find((t) => t.id === b.class_teacher_id)?.name ?? '—' };
    batchRows = [...batchRows, row];
    return row;
  }],
  ['GET', /^\/super\/approvals$/, () => courseRequests],
  ['PATCH', /^\/super\/approvals\/(\d+)$/, (m, b) => {
    courseRequests = courseRequests.map((c) => (c.id === +m[1] ? { ...c, status: b.status } : c));
    const c = courseRequests.find((x) => x.id === +m[1])!;
    if (b.status === 'approved' && !courses.some((x) => x.title === c.title)) courses = [...courses, { id: nextId++, title: c.title, category: c.category, level: 'Beginner', cover: '#F7E9BC', status: 'published', lessons_count: 0, items: [], logo_url: c.logo_url ?? null }];
    return c;
  }],
  ['POST', /^\/admin\/courses$/, (_, b) => {
    const row = { id: nextId++, title: b.title, category: b.category, madrasa: 'Noon Madrasa', when: 'Just now', tags: [b.category, `${(b.lessons ?? []).length} items`, b.level, b.visibility === 'madrasa' ? 'My madrasa only' : 'All Noon Learn'], status: 'waiting', logo_url: b.logo_url ?? null };
    courseRequests = [row, ...courseRequests];
    return row;
  }],
  ['GET', /^\/admin\/admissions$/, () => admissionRows],
  ['PATCH', /^\/admin\/admissions\/([^/]+)$/, (m, b) => {
    const note = ({ review: 'Interview booked', admitted: 'Admitted', rejected: 'Application rejected', new: 'Moved back to new' } as Record<string, string>)[b.status];
    admissionRows = admissionRows.map((a) => (a.id === decodeURIComponent(m[1]) ? { ...a, status: b.status, timeline: [...a.timeline, [note, nowStr()]] } : a));
    return admissionRows.find((a) => a.id === decodeURIComponent(m[1]));
  }],
  ['POST', /^\/apply\/([^/]+)$/, (m, b) => {
    if (decodeURIComponent(m[1]).toUpperCase() !== 'NOON01') throw new Error('This admission link is not valid.');
    if (String(b.phone ?? '').replace(/\D/g, '').length < 9) throw new Error('Please enter a valid WhatsApp number.');
    const id = `APL-2026-${String(nextId++).slice(-4)}`;
    const age = b.dob ? Math.max(3, new Date().getFullYear() - new Date(b.dob).getFullYear()) : 0;
    admissionRows = [{ id, name: b.name, gender: b.gender, dob: b.dob ?? '—', age, board: b.board, cls: b.cls, parent: b.parent, relation: 'Parent', phone: b.phone, city: '—', docs: { birth: false, tc: false, photo: false, ...(b.docs ?? {}) }, status: 'new', when: 'Just now', timeline: [['Form submitted via the online form', nowStr()]] }, ...admissionRows];
    return { id, madrasa: 'Noon Madrasa' };
  }],
  ['GET', /^\/learn$/, () => learnSpaces()],
  ['GET', /^\/learn\/(subject|course)\/(\d+)$/, (m) => learnDetail(m[1], +m[2])],

  ['GET', /^\/courses(\?scope=(\w+))?$/, (m) => {
    const scope = m[2] ?? 'all';
    const list = courses.filter((c) => c.status === 'published');
    return (scope === 'mine' ? list.filter((c) => c.enrolled) : scope === 'explore' ? list.filter((c) => !c.enrolled) : list).map(({ items, ...c }) => c);
  }],
  ['GET', /^\/courses\/(\d+)$/, (m) => courses.find((c) => c.id === +m[1])],
  ['POST', /^\/courses\/(\d+)\/enroll$/, (m) => { const c = courses.find((x) => x.id === +m[1]); if (c) c.enrolled = true; return c; }],
  ['GET', /^\/super\/courses$/, () => courses.map(({ items, ...c }) => ({ ...c, items_count: items.length }))],
  ['POST', /^\/super\/courses$/, (_, b) => { const c: CourseDetail = { id: nextId++, title: b.title, category: b.category, level: b.level, cover: b.cover ?? '#DAD3F6', status: b.status ?? 'draft', lessons_count: 0, items: [], logo_url: b.logo_url ?? null }; courses = [c, ...courses]; return c; }],
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

  ['POST', /^\/staff\/assessments$/, (_, b) => {
    if (!b?.title || !(b.subject_id || b.course_id)) throw new Error('Give the test a name and a subject.');
    return { id: nextId++, ...b, tenant_id: 1 };
  }],
  ['POST', /^\/staff\/assessments\/(\d+)\/results$/, (_, b) => ({ saved: (b?.results ?? []).length })],
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
