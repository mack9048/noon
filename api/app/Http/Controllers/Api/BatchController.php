<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Batch;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** Batches for the institute admin (always inside their own institution). */
class BatchController extends Controller
{
    public function index()
    {
        return Batch::with('classTeacher')->withCount('students')->orderBy('class_label')->get()->map(fn (Batch $b) => $b->toApp());
    }

    /** Teachers and students of this institution, for the Create batch form. */
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
            // A batch for a course: board and class come from a Madrasa Support course, and are not needed otherwise.
            'course_id' => ['nullable', 'integer'],
            'board' => ['nullable', 'required_without:course_id', 'string', 'max:10'],
            'cls' => ['nullable', 'required_without:course_id', 'string', 'max:4'],
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

        // Only this institution's own teachers and students.
        $teacherIds = collect($data['subject_teachers'] ?? [])->values()->push($data['class_teacher_id'] ?? null)->filter()->unique();
        if ($teacherIds->isNotEmpty() && User::whereIn('id', $teacherIds)->where('tenant_id', $tenant)->where('role', 'teacher')->count() !== $teacherIds->count()) {
            throw ValidationException::withMessages(['class_teacher_id' => 'Pick teachers from your institution.']);
        }
        $students = collect($data['student_ids'] ?? []);
        if ($students->count() > $data['seats']) {
            throw ValidationException::withMessages(['student_ids' => 'More students than seats.']);
        }
        if ($students->isNotEmpty() && User::whereIn('id', $students)->where('tenant_id', $tenant)->where('role', 'student')->count() !== $students->count()) {
            throw ValidationException::withMessages(['student_ids' => 'Some students are not in your institution.']);
        }

        if (! empty($data['course_id'])) {
            $course = \App\Models\Course::visibleTo($request->user())->with(['board', 'schoolClass'])->find($data['course_id']);
            if (! $course) {
                throw ValidationException::withMessages(['course_id' => 'Pick a course that is switched on for your institution.']);
            }
            $data['board'] = $course->board?->code ?? '';
            $data['cls'] = $course->schoolClass?->label ?? '';
        }
        $batch = Batch::create([
            'course_id' => $data['course_id'] ?? null,
            'name' => $data['name'], 'board' => $data['board'], 'class_label' => $data['cls'], 'days' => $data['days'],
            'start_time' => $data['start_time'], 'seats' => $data['seats'], 'class_teacher_id' => $data['class_teacher_id'] ?? null,
            'subject_teachers' => $data['subject_teachers'] ?? [],
        ]);
        $batch->students()->sync($students->all());

        return response()->json($batch->load('classTeacher')->loadCount('students')->toApp(), 201);
    }

    /** DELETE /admin/batches/{id} — the students stay in the institution; attendance is kept; the batch's own live classes go. */
    public function destroy(Request $request, int $id)
    {
        $batch = Batch::where('tenant_id', $request->user()->tenant_id)->findOrFail($id);
        \Illuminate\Support\Facades\DB::transaction(function () use ($batch) {
            // A live class with no batch is for everyone in the institution, so remove this batch's ones.
            \App\Models\LiveSession::where('batch_id', $batch->id)->delete();
            $batch->students()->detach();
            $batch->delete();
        });

        return response()->noContent();
    }
}
