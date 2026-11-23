<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Enrolment;
use Illuminate\Http\Request;

/** Institution admin: the student register and single-student admission. */
class StudentController extends Controller
{
    public function index(Request $request)
    {
        $data = $request->validate(['q' => ['nullable', 'string', 'max:80'], 'class_id' => ['nullable', 'integer']]);

        $rows = User::query()->with(['schoolClass.board', 'parent'])
            ->where('tenant_id', $request->user()->tenant_id)->where('role', 'student')
            ->when($data['class_id'] ?? null, fn ($q, $c) => $q->where('class_id', $c))
            ->when($data['q'] ?? null, fn ($q, $s) => $q->where(fn ($w) => $w->where('name', 'like', "%{$s}%")->orWhere('admission_no', 'like', "%{$s}%")))
            ->orderBy('name')->limit(1000)->get();
        $money = $this->money();
        $batches = $this->batchNames();

        return $rows->map(fn (User $u) => $this->row($u) + ($money[$u->id] ?? self::NO_FEES) + ['batch' => $batches[$u->id] ?? null]);
    }

    private const NO_FEES = ['fee_total' => 0.0, 'fee_paid' => 0.0, 'fee_due' => 0.0, 'fee_overdue' => 0.0, 'fee_status' => 'none'];

    /** Fee totals per student (this institution): total, paid, due, overdue and a status for the list. */
    private ?array $feeCache = null;

    private function money(): array
    {
        if ($this->feeCache !== null) {
            return $this->feeCache;
        }
        $today = now()->toDateString();
        $cache = [];
        foreach (\App\Models\Fee::where('status', '!=', 'waived')->get(['student_id', 'amount', 'paid_amount', 'status', 'due_date']) as $f) {
            $r = $cache[$f->student_id] ??= self::NO_FEES;
            $r['fee_total'] += (float) $f->amount;
            if ($f->status === 'paid') {
                $r['fee_paid'] += (float) ($f->paid_amount ?? $f->amount);
            } else {
                $r['fee_due'] += (float) $f->amount;
                if ($f->due_date && $f->due_date->toDateString() < $today) {
                    $r['fee_overdue'] += (float) $f->amount;
                }
            }
            $r['fee_status'] = $r['fee_overdue'] > 0 ? 'overdue' : ($r['fee_due'] > 0 ? 'due' : 'paid');
            $cache[$f->student_id] = $r;
        }

        return $this->feeCache = $cache;
    }

    /** First batch name of each student (shown as their class in the directory). */
    private function batchNames(): array
    {
        return \Illuminate\Support\Facades\DB::table('batch_user')->join('batches', 'batches.id', '=', 'batch_user.batch_id')
            ->where('batches.tenant_id', request()->user()->tenant_id)->orderBy('batches.name')->get(['batch_user.user_id', 'batches.name'])
            ->groupBy('user_id')->map(fn ($g) => $g->pluck('name')->implode(', '))->all();
    }

    public function show(Request $request, int $id)
    {
        $u = User::with(['schoolClass.board', 'parent'])->where('tenant_id', $request->user()->tenant_id)->where('role', 'student')->findOrFail($id);

        return $this->row($u) + [
            'email' => $u->email,
            'batch_ids' => $u->batches()->pluck('batches.id'),
            'batches' => $u->batches()->get(['batches.id', 'batches.name'])->map(fn ($b) => ['id' => $b->id, 'name' => $b->name]),
            'courses' => $u->courses()->get(['courses.id', 'courses.title'])->map(fn ($c) => ['id' => $c->id, 'title' => $c->title, 'progress' => (int) $c->pivot->progress]),
            'joined' => $u->created_at?->format('j M Y'),
            'age' => $u->age,
            // Payments tab: every fee of this student, oldest first, and the totals.
            'fees' => \App\Models\Fee::with('student')->where('student_id', $u->id)->orderBy('due_date')->get()->map->toApp()->values(),
            'fee_totals' => $this->money()[$u->id] ?? self::NO_FEES,
        ];
    }

    /** GET /admin/teachers/{id}: a staff profile — contact, classes and subjects, and account history. */
    public function showTeacher(Request $request, int $id)
    {
        $tid = $request->user()->tenant_id;
        $u = User::where('tenant_id', $tid)->where('role', 'teacher')->findOrFail($id);
        $batches = \App\Models\Batch::where('tenant_id', $tid)->withCount('students')->get()
            ->filter(fn ($b) => $b->class_teacher_id === $u->id || in_array($u->id, array_map('intval', array_values($b->subject_teachers ?? [])), true));

        return [
            'id' => $u->id, 'name' => $u->name, 'phone' => $u->phone, 'email' => $u->email, 'blocked' => (bool) $u->blocked,
            'joined' => $u->created_at?->toIso8601String(),
            'classes' => $batches->map(fn ($b) => ['id' => $b->id, 'name' => $b->name, 'students' => (int) $b->students_count, 'class_teacher' => $b->class_teacher_id === $u->id,
                'subjects' => collect($b->subject_teachers ?? [])->filter(fn ($t) => (int) $t === $u->id)->keys()->values()])->values(),
            'students' => (int) $batches->sum('students_count'),
            'live_classes' => \App\Models\LiveSession::where('created_by', $u->id)->count(),
            'attendance_marked' => \App\Models\Attendance::where('marked_by', $u->id)->select('batch_id', 'date')->distinct()->get()->count(),
            'courses' => \App\Models\Course::where('teacher_id', $u->id)->get(['id', 'title', 'status'])->map(fn ($c) => ['id' => $c->id, 'title' => $c->title, 'status' => $c->status])->values(),
        ];
    }

    /** Batches a teacher teaches (class teacher, or teaches a subject). Admins see every batch. */
    private function myBatches(User $u)
    {
        return \App\Models\Batch::where('tenant_id', $u->tenant_id)->withCount('students')->orderBy('name')->get()
            ->filter(fn ($b) => $u->role === 'admin' || $b->class_teacher_id === $u->id || in_array($u->id, array_map('intval', array_values($b->subject_teachers ?? [])), true))->values();
    }

    /** GET /staff/classes — the signed-in teacher's own classes. */
    public function myClasses(Request $request)
    {
        $u = $request->user();

        return $this->myBatches($u)->map(fn ($b) => [
            'id' => $b->id, 'name' => $b->name, 'board' => $b->board, 'class_label' => $b->class_label,
            'days' => $b->days ?? [], 'start_time' => $b->start_time, 'students' => (int) $b->students_count,
            'class_teacher' => $b->class_teacher_id === $u->id,
            'subjects' => collect($b->subject_teachers ?? [])->filter(fn ($t) => $u->role === 'admin' || (int) $t === $u->id)->keys()->values(),
        ]);
    }

    /** GET /staff/classes/{id} — one of the teacher's classes, with its students and subject teachers. */
    public function myClass(Request $request, int $id)
    {
        $u = $request->user();
        $b = $this->myBatches($u)->firstWhere('id', $id);
        abort_unless($b, 404);
        $teachers = User::where('tenant_id', $u->tenant_id)->whereIn('id', array_merge([(int) $b->class_teacher_id], array_map('intval', array_values($b->subject_teachers ?? []))))->pluck('name', 'id');

        return [
            'id' => $b->id, 'name' => $b->name, 'board' => $b->board, 'class_label' => $b->class_label, 'days' => $b->days ?? [], 'start_time' => $b->start_time,
            'class_teacher' => $b->class_teacher_id === $u->id, 'class_teacher_name' => $teachers[$b->class_teacher_id] ?? null,
            'subjects' => collect($b->subject_teachers ?? [])->map(fn ($t, $s) => ['name' => $s, 'teacher' => $teachers[(int) $t] ?? null, 'mine' => (int) $t === $u->id])->values(),
            'students' => $b->students()->orderBy('name')->get(['users.id', 'users.name', 'users.admission_no'])->map(fn ($s) => ['id' => $s->id, 'name' => $s->name, 'admission_no' => $s->admission_no])->values(),
        ];
    }

    /** POST /admin/students — admit one student by hand. */
    public function store(Request $request, Enrolment $enrolment)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:80'],
            // Only for students joining Madrasa Support.
            'board' => ['nullable', 'string', 'max:10'],
            'syllabus' => ['nullable', 'in:general,english'],
            'cls' => ['nullable', 'required_with:board', 'string', 'max:4'],
            // Courses to enrol in straight away (ones switched on for this institution).
            'course_ids' => ['nullable', 'array', 'max:20'],
            'course_ids.*' => ['integer'],
            'admission_no' => ['nullable', 'string', 'max:40'],
            'dob' => ['nullable', 'date', 'before:today'],
            'email' => ['nullable', 'email', 'max:255'],
            'parent_name' => ['nullable', 'string', 'max:80'],
            'parent_phone' => ['nullable', 'string', 'max:30'],
            'parent_email' => ['nullable', 'email', 'max:255'],
            'password' => ['nullable', 'string', 'min:8', 'max:255'],
            'batch_id' => ['nullable', 'integer'],
        ]);
        $r = $enrolment->admit($request->user()->tenant, $data);
        foreach ($data['course_ids'] ?? [] as $cid) {
            $this->enrol($request, $r['student'], (int) $cid);
        }

        return response()->json(['student' => $this->row($r['student']->load(['schoolClass.board', 'parent'])), 'credentials' => $r['credentials']], 201);
    }

    /** PUT /admin/students/{id} — the admin corrects a student's details, parent and batches. */
    public function update(Request $request, int $id, Enrolment $enrolment)
    {
        $tenantId = $request->user()->tenant_id;
        $u = User::where('tenant_id', $tenantId)->where('role', 'student')->findOrFail($id);
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'min:2', 'max:80'],
            'admission_no' => ['sometimes', 'string', 'min:1', 'max:40'],
            'email' => ['nullable', 'email', 'max:255'],
            'board' => ['nullable', 'string', 'max:10'],
            'syllabus' => ['nullable', 'in:general,english'],
            'cls' => ['nullable', 'string', 'max:4'],
            'parent_name' => ['nullable', 'string', 'max:80'],
            'parent_phone' => ['nullable', 'string', 'max:30'],
            'blocked' => ['sometimes', 'boolean'],
            'batch_ids' => ['sometimes', 'array'],
            'batch_ids.*' => ['integer'],
        ]);

        \Illuminate\Support\Facades\DB::transaction(function () use ($u, $data, $tenantId, $enrolment) {
            $fill = [];
            if (isset($data['name'])) $fill['name'] = trim($data['name']);
            if (isset($data['admission_no'])) {
                $no = trim($data['admission_no']);
                if (User::where('tenant_id', $tenantId)->where('admission_no', $no)->whereKeyNot($u->id)->exists()) {
                    throw \Illuminate\Validation\ValidationException::withMessages(['admission_no' => ["Admission no. {$no} is already used in this institution."]]);
                }
                $fill['admission_no'] = $no;
            }
            if (array_key_exists('email', $data)) {
                $email = $data['email'] ? strtolower($data['email']) : null;
                if ($email && User::where('email', $email)->whereKeyNot($u->id)->exists()) {
                    throw \Illuminate\Validation\ValidationException::withMessages(['email' => ['This email already has an account.']]);
                }
                $fill['email'] = $email;
            }
            if (! empty($data['board'])) {
                [$fill['board_id'], $fill['class_id']] = $enrolment->place($data['board'], $data['cls'] ?? null, $data['syllabus'] ?? $u->syllabus ?? 'general');
                $fill['syllabus'] = $data['syllabus'] ?? $u->syllabus ?? 'general';
            }
            if (array_key_exists('blocked', $data)) $fill['blocked'] = (bool) $data['blocked'];
            $u->forceFill($fill)->save();
            if (array_key_exists('blocked', $data) && $data['blocked']) $u->tokens()->delete();

            // Parent: parents use the student's login; we keep their name and number for contact and WhatsApp codes.
            if (array_key_exists('parent_name', $data) || array_key_exists('parent_phone', $data)) {
                $phone = ! empty($data['parent_phone']) ? \App\Support\Phone::normalize($data['parent_phone']) : null;
                if (! empty($data['parent_phone']) && ! $phone) {
                    throw \Illuminate\Validation\ValidationException::withMessages(['parent_phone' => ['Please enter a valid phone number.']]);
                }
                $parent = $u->parent;
                $owner = $phone ? User::where('phone', $phone)->first() : null;
                if ($owner && (! $parent || $owner->id !== $parent->id)) {
                    if ($owner->tenant_id === $tenantId && $owner->role === 'parent') {
                        $parent = $owner; // a sibling's parent: link to the same parent
                    } else {
                        throw \Illuminate\Validation\ValidationException::withMessages(['parent_phone' => ['This phone number is already used by another account.']]);
                    }
                }
                $name = trim((string) ($data['parent_name'] ?? '')) ?: ($parent?->name ?? 'Parent of '.$u->name);
                if ($parent) {
                    $parent->forceFill(['name' => $name] + (array_key_exists('parent_phone', $data) ? ['phone' => $phone] : []))->save();
                } elseif ($phone || ! empty($data['parent_name'])) {
                    $parent = User::create(['tenant_id' => $tenantId, 'name' => $name, 'role' => 'parent', 'phone' => $phone, 'password' => 'Noon-'.\Illuminate\Support\Str::password(12, symbols: false)]);
                }
                if ($parent) $u->forceFill(['parent_id' => $parent->id])->save();
            }

            if (array_key_exists('batch_ids', $data)) {
                $ids = \App\Models\Batch::where('tenant_id', $tenantId)->whereIn('id', $data['batch_ids'])->pluck('id');
                $u->batches()->sync($ids);
            }
        });

        return $this->show($request, $u->id);
    }

    /* ---------- Enrolments: Madrasa Support placement and courses ---------- */

    /** GET /admin/students/{id}/enrollments: Madrasa Support (board / syllabus / class), courses, and courses that can be added. */
    public function enrollments(Request $request, int $id)
    {
        $u = $this->student($request, $id)->load('schoolClass.board');
        $tenant = $request->user()->tenant;
        $mine = $u->courses()->get();
        $available = $tenant->courses()->wherePivot('enabled', true)->where('status', 'published')->whereNotIn('courses.id', $mine->pluck('id'))->orderBy('title')->get();
        $course = fn ($c) => ['id' => $c->id, 'title' => $c->title, 'category' => $c->category, 'format' => $c->format ?? 'recorded', 'is_free' => (bool) $c->is_free];

        return [
            'madrasa' => $u->class_id ? ['board_id' => $u->board_id, 'board' => $u->schoolClass?->board?->name, 'board_code' => $u->schoolClass?->board?->code,
                'syllabus' => $u->syllabus ?? 'general', 'syllabus_label' => \App\Models\Board::SYLLABI[$u->syllabus ?? 'general'], 'class_id' => $u->class_id, 'class_label' => $u->schoolClass?->label] : null,
            'courses' => $mine->map(fn ($c) => $course($c) + ['progress' => (int) $c->pivot->progress, 'paid' => (bool) $c->pivot->paid_at, 'enrolled_at' => $c->pivot->created_at?->toIso8601String()])->values(),
            'available' => $available->map($course)->values(),
        ];
    }

    /** PUT: join Madrasa Support with a board / syllabus / class, or leave it ({remove: true}). */
    public function madrasa(Request $request, int $id)
    {
        $u = $this->student($request, $id);
        if ($request->boolean('remove')) {
            $u->forceFill(['board_id' => null, 'class_id' => null, 'syllabus' => null])->save();

            return $this->enrollments($request, $id);
        }
        $data = $request->validate(['board_id' => ['required', 'integer', 'exists:boards,id'], 'syllabus' => ['required', 'in:general,english'], 'class_id' => ['required', 'integer', 'exists:school_classes,id']]);
        $class = \App\Models\SchoolClass::findOrFail($data['class_id']);
        abort_unless($class->board_id === (int) $data['board_id'] && $class->syllabus === $data['syllabus'], 422, 'That class is not in the chosen board and syllabus.');
        $u->forceFill(['board_id' => $data['board_id'], 'class_id' => $class->id, 'syllabus' => $data['syllabus']])->save();

        return $this->enrollments($request, $id);
    }

    public function addCourse(Request $request, int $id)
    {
        $data = $request->validate(['course_id' => ['required', 'integer']]);
        $this->enrol($request, $this->student($request, $id), $data['course_id']);

        return $this->enrollments($request, $id);
    }

    public function removeCourse(Request $request, int $id, int $courseId)
    {
        $this->student($request, $id)->courses()->detach($courseId);

        return $this->enrollments($request, $id);
    }

    /** Enrol a student in a course switched on for the institution; the institution's enrolments count as paid. */
    private function enrol(Request $request, User $u, int $courseId): void
    {
        $course = $request->user()->tenant->courses()->wherePivot('enabled', true)->where('status', 'published')->whereKey($courseId)->first();
        if (! $course) {
            throw \Illuminate\Validation\ValidationException::withMessages(['course_id' => 'Switch this course on for your institution first (Courses).']);
        }
        $u->courses()->syncWithoutDetaching([$course->id => ['paid_at' => now(), 'enrolled_by' => $request->user()->id, 'trial_ends_at' => null]]);
        // A Madrasa Support course for one class also places the student in that class (if not placed yet).
        if ($course->class_id && ! $u->class_id) {
            $u->forceFill(['board_id' => $course->board_id, 'class_id' => $course->class_id, 'syllabus' => $course->syllabus])->save();
        }
    }

    private function student(Request $request, int $id): User
    {
        return User::where('tenant_id', $request->user()->tenant_id)->where('role', 'student')->findOrFail($id);
    }

    /** GET /admin/teachers — teachers of this institution with their batches. */
    public function teachers(Request $request)
    {
        $tid = $request->user()->tenant_id;
        $batches = \App\Models\Batch::where('tenant_id', $tid)->get(['id', 'name', 'class_teacher_id', 'subject_teachers']);

        return User::where('tenant_id', $tid)->where('role', 'teacher')->orderBy('name')->get()
            ->map(function (User $u) use ($batches) {
                $mine = $batches->filter(fn ($b) => $b->class_teacher_id === $u->id || in_array($u->id, array_map('intval', array_values($b->subject_teachers ?? [])), true));
                $subjects = $batches->flatMap(fn ($b) => collect($b->subject_teachers ?? [])->filter(fn ($t) => (int) $t === $u->id)->keys())->unique()->values();

                return [
                    'id' => $u->id, 'name' => $u->name, 'login' => $u->email ?? $u->phone, 'phone' => $u->phone, 'email' => $u->email,
                    'blocked' => (bool) $u->blocked, 'batches' => $mine->pluck('name')->values(), 'subjects' => $subjects,
                ];
            });
    }

    /** POST /admin/teachers — add a teacher and create their login. */
    public function storeTeacher(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:80'],
            'email' => ['nullable', 'email', 'max:255', 'required_without:phone', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:30', 'required_without:email'],
            'password' => ['nullable', 'string', 'min:8', 'max:255'],
        ]);
        $phone = ! empty($data['phone']) ? \App\Support\Phone::normalize($data['phone']) : null;
        if (! empty($data['phone']) && ! $phone) {
            throw \Illuminate\Validation\ValidationException::withMessages(['phone' => ['Please enter a valid phone number.']]);
        }
        if ($phone && User::where('phone', $phone)->exists()) {
            throw \Illuminate\Validation\ValidationException::withMessages(['phone' => ['This phone number already has an account.']]);
        }
        $password = $data['password'] ?? 'Noon-'.\Illuminate\Support\Str::password(8, symbols: false);
        $u = User::create([
            'tenant_id' => $request->user()->tenant_id, 'name' => trim($data['name']), 'role' => 'teacher',
            'email' => isset($data['email']) ? strtolower($data['email']) : null, 'phone' => $phone, 'password' => $password,
        ]);

        return response()->json(['teacher' => ['id' => $u->id, 'name' => $u->name], 'credentials' => [['who' => 'teacher', 'name' => $u->name, 'login' => $u->email ?? $u->phone, 'password' => $password]]], 201);
    }

    private function row(User $u): array
    {
        return [
            'id' => $u->id, 'name' => $u->name, 'admission_no' => $u->admission_no,
            'cls' => $u->schoolClass?->label, 'class_id' => $u->class_id, 'board' => $u->schoolClass?->board?->code, 'syllabus' => $u->class_id ? ($u->syllabus ?? 'general') : null,
            'parent' => $u->parent?->name, 'parent_phone' => $u->parent?->phone, 'blocked' => (bool) $u->blocked,
        ];
    }
}
