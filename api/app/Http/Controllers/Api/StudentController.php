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

        return User::query()->with(['schoolClass.board', 'parent'])
            ->where('tenant_id', $request->user()->tenant_id)->where('role', 'student')
            ->when($data['class_id'] ?? null, fn ($q, $c) => $q->where('class_id', $c))
            ->when($data['q'] ?? null, fn ($q, $s) => $q->where(fn ($w) => $w->where('name', 'like', "%{$s}%")->orWhere('admission_no', 'like', "%{$s}%")))
            ->orderBy('name')->limit(1000)->get()
            ->map(fn (User $u) => $this->row($u));
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
        ];
    }

    /** POST /admin/students — admit one student by hand. */
    public function store(Request $request, Enrolment $enrolment)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:80'],
            'board' => ['required', 'string', 'max:10'],
            'cls' => ['required', 'string', 'max:4'],
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
                [$fill['board_id'], $fill['class_id']] = $enrolment->place($data['board'], $data['cls'] ?? null);
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
            'cls' => $u->schoolClass?->label, 'class_id' => $u->class_id, 'board' => $u->schoolClass?->board?->code,
            'parent' => $u->parent?->name, 'parent_phone' => $u->parent?->phone, 'blocked' => (bool) $u->blocked,
        ];
    }
}
