<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Assessment;
use App\Models\AssessmentResult;
use App\Models\Course;
use App\Models\CourseItem;
use App\Models\Lesson;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * "Learning spaces": every class subject and every Noon Course a student has.
 * Picking one shows only that subject's or course's materials, syllabus,
 * assessments, exams, results and report card.
 * A parent sees their child's spaces and marks.
 */
class LearnController extends Controller
{
    /** GET /learn: the student's class subjects and enrolled courses. */
    public function index(Request $request)
    {
        $learner = $this->learner($request->user());
        if (! $learner) {
            return [];
        }

        $subjects = $learner->class_id
            ? Subject::with('schoolClass.board')->where('class_id', $learner->class_id)->orderBy('position')->get()
                ->map(fn (Subject $s) => $this->subjectSpace($s))
            : collect();
        $courses = Course::visibleTo($learner)->with('teacher')
            ->whereHas('students', fn ($q) => $q->where('users.id', $learner->id))->orderBy('title')->get()
            ->map(fn (Course $c) => $this->courseSpace($c));

        return $subjects->concat($courses)->values();
    }

    /** GET /learn/{type}/{id}: everything for one subject or course. */
    public function show(Request $request, string $type, int $id)
    {
        $user = $request->user();
        $learner = $this->learner($user);

        if ($type === 'subject') {
            $subject = Subject::with(['lessons', 'schoolClass.board'])->findOrFail($id);
            $staff = $user->hasRole('teacher', 'admin', 'super');
            abort_unless($staff || ($learner && $learner->class_id === $subject->class_id), 403, 'This subject is not in your class.');

            $space = $this->subjectSpace($subject);
            $materials = $this->subjectMaterials($subject);
            $syllabus = $subject->lessons->map(fn (Lesson $l) => ['position' => $l->position, 'title' => $l->title, 'done' => false])->values();
            $assessments = Assessment::visibleTo($learner ?? $user)->where('subject_id', $subject->id);
        } elseif ($type === 'course') {
            $course = Course::with(['items', 'teacher'])->findOrFail($id);
            $enrolled = $learner && Course::visibleTo($learner)->whereKey($course->id)
                ->whereHas('students', fn ($q) => $q->where('users.id', $learner->id))->exists();
            abort_unless($enrolled || $user->hasRole('super') || $course->teacher_id === $user->id, 403, 'Enrol in this course to see its materials.');

            $done = $learner ? DB::table('course_item_user')->where('user_id', $learner->id)->pluck('course_item_id')->all() : [];
            $space = $this->courseSpace($course);
            $materials = $course->items->whereIn('kind', ['live', 'video', 'audio', 'pdf'])->map(fn (CourseItem $i) => [
                'id' => 'i'.$i->id, 'kind' => $i->kind, 'title' => $i->title,
                'meta' => $i->meta ?? ($i->starts_at ? 'Live · '.$i->starts_at->format('D, j M g:i A') : null),
                'url' => $i->url, 'item_id' => $i->id,
            ])->values();
            $syllabus = $course->items->values()->map(fn (CourseItem $i, int $n) => ['position' => $n + 1, 'title' => $i->title, 'done' => in_array($i->id, $done, true)]);
            $quizzes = $course->items->where('kind', 'test')->map(fn (CourseItem $i) => [
                'id' => 'q'.$i->id, 'title' => $i->title, 'meta' => $i->meta, 'due_at' => null, 'max_marks' => null,
                'status' => in_array($i->id, $done, true) ? 'done' : 'open', 'marks' => null, 'item_id' => $i->id,
            ])->values();
            $assessments = Assessment::visibleTo($learner ?? $user)->where('course_id', $course->id);
        } else {
            abort(404);
        }

        $list = $assessments->orderBy('due_at')->get();
        $marks = $learner
            ? AssessmentResult::whereIn('assessment_id', $list->pluck('id'))->where('student_id', $learner->id)->get()->keyBy('assessment_id')
            : collect();

        $row = fn (Assessment $a) => [
            'id' => 'a'.$a->id, 'title' => $a->title, 'meta' => $a->description,
            'due_at' => $a->due_at?->toIso8601String(), 'max_marks' => $a->max_marks,
            'status' => $marks->has($a->id) ? 'marked' : ($a->due_at && $a->due_at->isPast() ? 'awaiting' : 'upcoming'),
            'marks' => $marks->get($a->id)?->marks,
        ];
        $results = $list->filter(fn (Assessment $a) => $marks->has($a->id))->map(function (Assessment $a) use ($marks) {
            $r = $marks->get($a->id);
            $pct = $a->max_marks ? round($r->marks / $a->max_marks * 100) : 0;

            return [
                'id' => 'a'.$a->id, 'title' => $a->title, 'type' => $a->type, 'marks' => $r->marks, 'max_marks' => $a->max_marks,
                'percent' => $pct, 'grade' => self::grade($pct), 'remarks' => $r->remarks, 'date' => ($a->due_at ?? $r->created_at)->toDateString(),
            ];
        })->values();

        return [
            'space' => $space,
            'materials' => $materials,
            'syllabus' => $syllabus,
            'assessments' => ($quizzes ?? collect())->concat($list->where('type', 'assessment')->map($row))->values(),
            'exams' => $list->where('type', 'exam')->map($row)->values(),
            'results' => $results,
            'report' => $this->report($results, $learner),
        ];
    }

    /** POST /staff/assessments: a teacher or admin adds an assessment or exam for their madrasa. */
    public function store(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'type' => ['required', Rule::in(['assessment', 'exam'])],
            'title' => ['required', 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:1000'],
            'course_id' => ['nullable', 'required_without:subject_id', 'prohibits:subject_id', 'integer', 'exists:courses,id'],
            'subject_id' => ['nullable', 'required_without:course_id', 'integer', 'exists:subjects,id'],
            'due_at' => ['nullable', 'date'],
            'max_marks' => ['nullable', 'integer', 'between:1,1000'],
        ]);
        if (! empty($data['course_id'])) {
            $course = Course::findOrFail($data['course_id']);
            abort_unless($course->teacher_id === $user->id || Course::visibleTo($user)->whereKey($course->id)->exists(), 403, 'This course is not on in your madrasa.');
        }

        return Assessment::create($data + ['tenant_id' => $user->tenant_id, 'created_by' => $user->id, 'max_marks' => $data['max_marks'] ?? 100]);
    }

    /** POST /staff/assessments/{assessment}/results: enter marks for students of this madrasa. */
    public function storeResults(Request $request, Assessment $assessment)
    {
        $user = $request->user();
        // Madrasa-made: same madrasa only. Noon-made: only the course's own teacher.
        $allowed = $assessment->tenant_id
            ? $assessment->tenant_id === $user->tenant_id
            : $assessment->course_id && Course::whereKey($assessment->course_id)->where('teacher_id', $user->id)->exists();
        abort_unless($allowed, 403, 'You cannot mark this assessment.');

        $data = $request->validate([
            'results' => ['required', 'array', 'min:1', 'max:500'],
            'results.*.student_id' => ['required', 'integer', 'distinct'],
            'results.*.marks' => ['required', 'numeric', 'min:0', 'max:'.$assessment->max_marks],
            'results.*.remarks' => ['nullable', 'string', 'max:500'],
        ]);
        $ids = collect($data['results'])->pluck('student_id');
        $valid = User::whereIn('id', $ids)->where('role', 'student')->where('tenant_id', $user->tenant_id)->pluck('id');
        if ($valid->count() !== $ids->count()) {
            throw ValidationException::withMessages(['results' => 'Some students are not in your madrasa.']);
        }

        foreach ($data['results'] as $r) {
            AssessmentResult::updateOrCreate(
                ['assessment_id' => $assessment->id, 'student_id' => $r['student_id']],
                ['marks' => $r['marks'], 'remarks' => $r['remarks'] ?? null, 'marked_by' => $user->id],
            );
        }

        return ['saved' => count($data['results'])];
    }

    /** Whose classes we show: the user, or a parent's (first) child. */
    private function learner(User $user): ?User
    {
        if ($user->hasRole('parent')) {
            return User::where('parent_id', $user->id)->where('tenant_id', $user->tenant_id)->orderBy('id')->first();
        }

        return $user->hasRole('student', 'guest') ? $user : null;
    }

    private function subjectSpace(Subject $s): array
    {
        $cls = $s->schoolClass;

        return [
            'key' => 'subject-'.$s->id, 'type' => 'subject', 'id' => $s->id, 'title' => $s->name, 'title_ar' => $s->name_ar,
            'subtitle' => trim(($cls?->board?->code ? $cls->board->code.' board · ' : '').'Class '.($cls?->label ?? '')),
            'cover' => null,
        ];
    }

    private function courseSpace(Course $c): array
    {
        return [
            'key' => 'course-'.$c->id, 'type' => 'course', 'id' => $c->id, 'title' => $c->title, 'title_ar' => null,
            'subtitle' => 'Noon Course'.($c->teacher?->name ? ' · '.$c->teacher->name : ''), 'cover' => $c->cover,
        ];
    }

    private function subjectMaterials(Subject $s): Collection
    {
        $out = collect();
        if ($s->textbook_pdf_url) {
            $out->push(['id' => 't'.$s->id, 'kind' => 'pdf', 'title' => 'Textbook', 'meta' => 'Textbook · PDF', 'url' => $s->textbook_pdf_url]);
        }
        foreach ($s->lessons as $l) {
            $out->push(['id' => 'v'.$l->id, 'kind' => 'video', 'title' => "Lesson {$l->position} · {$l->title}", 'meta' => 'Video class'.($l->video_duration ? ' · '.$l->video_duration : ''), 'url' => $l->video_url]);
            $out->push(['id' => 'a'.$l->id, 'kind' => 'audio', 'title' => "Lesson {$l->position} · {$l->title}", 'meta' => 'Audio class'.($l->audio_duration ? ' · '.$l->audio_duration : ''), 'url' => $l->audio_url]);
            $out->push(['id' => 'n'.$l->id, 'kind' => 'pdf', 'title' => "Lesson {$l->position} · {$l->title}", 'meta' => 'Class note · PDF', 'url' => $l->note_pdf_url]);
        }

        return $out;
    }

    private function report(Collection $results, ?User $learner): array
    {
        $avg = $results->count() ? (int) round($results->avg('percent')) : null;

        return [
            'student' => $learner?->name,
            'average' => $avg,
            'grade' => $avg === null ? null : self::grade($avg),
            'count' => $results->count(),
            'exam_average' => ($e = $results->where('type', 'exam'))->count() ? (int) round($e->avg('percent')) : null,
            'assessment_average' => ($a = $results->where('type', 'assessment'))->count() ? (int) round($a->avg('percent')) : null,
        ];
    }

    public static function grade(int|float $pct): string
    {
        return match (true) {
            $pct >= 90 => 'A+', $pct >= 80 => 'A', $pct >= 70 => 'B+', $pct >= 60 => 'B', $pct >= 50 => 'C', $pct >= 40 => 'D', default => 'E',
        };
    }
}
