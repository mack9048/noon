<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Batch;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** Batches for the institute admin (always inside their own madrasa). */
class BatchController extends Controller
{
    public function index()
    {
        return Batch::with('classTeacher')->withCount('students')->orderBy('class_label')->get()->map(fn (Batch $b) => $b->toApp());
    }

    /** Teachers and students of this madrasa, for the Create batch form. */
    public function people(Request $request)
    {
        $tenant = $request->user()->tenant_id;

        return [
            'teachers' => User::where('tenant_id', $tenant)->where('role', 'teacher')->orderBy('name')->get(['id', 'name']),
            'students' => User::where('tenant_id', $tenant)->where('role', 'student')->orderBy('name')->get(['id', 'name']),
        ];
    }

    public function store(Request $request)
    {
        $tenant = $request->user()->tenant_id;
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'board' => ['required', 'string', 'max:10'],
            'cls' => ['required', 'string', 'max:4'],
            'days' => ['required', 'array', 'min:1'],
            'days.*' => [Rule::in(['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'])],
            'start_time' => ['required', 'string', 'max:10'],
            'seats' => ['required', 'integer', 'between:1,500'],
            'class_teacher_id' => ['nullable', 'integer'],
            'subject_teachers' => ['nullable', 'array'],
            'subject_teachers.*' => ['integer'],
            'student_ids' => ['nullable', 'array'],
            'student_ids.*' => ['integer', 'distinct'],
        ]);

        // Only this madrasa's own teachers and students.
        $teacherIds = collect($data['subject_teachers'] ?? [])->values()->push($data['class_teacher_id'] ?? null)->filter()->unique();
        if ($teacherIds->isNotEmpty() && User::whereIn('id', $teacherIds)->where('tenant_id', $tenant)->where('role', 'teacher')->count() !== $teacherIds->count()) {
            throw ValidationException::withMessages(['class_teacher_id' => 'Pick teachers from your madrasa.']);
        }
        $students = collect($data['student_ids'] ?? []);
        if ($students->count() > $data['seats']) {
            throw ValidationException::withMessages(['student_ids' => 'More students than seats.']);
        }
        if ($students->isNotEmpty() && User::whereIn('id', $students)->where('tenant_id', $tenant)->where('role', 'student')->count() !== $students->count()) {
            throw ValidationException::withMessages(['student_ids' => 'Some students are not in your madrasa.']);
        }

        $batch = Batch::create([
            'name' => $data['name'], 'board' => $data['board'], 'class_label' => $data['cls'], 'days' => $data['days'],
            'start_time' => $data['start_time'], 'seats' => $data['seats'], 'class_teacher_id' => $data['class_teacher_id'] ?? null,
            'subject_teachers' => $data['subject_teachers'] ?? [],
        ]);
        $batch->students()->sync($students->all());

        return response()->json($batch->load('classTeacher')->loadCount('students')->toApp(), 201);
    }
}
