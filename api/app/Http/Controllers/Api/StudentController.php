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

    private function row(User $u): array
    {
        return [
            'id' => $u->id, 'name' => $u->name, 'admission_no' => $u->admission_no,
            'cls' => $u->schoolClass?->label, 'class_id' => $u->class_id, 'board' => $u->schoolClass?->board?->code,
            'parent' => $u->parent?->name, 'parent_phone' => $u->parent?->phone, 'blocked' => (bool) $u->blocked,
        ];
    }
}
