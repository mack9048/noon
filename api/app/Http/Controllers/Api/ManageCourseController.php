<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\CourseItem;
use App\Models\CourseLesson;
use App\Models\CourseLiveClass;
use App\Support\Review;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/** Course Management for super admin, institution admins and teachers: the course list, details, and live classes. */
class ManageCourseController extends Controller
{
    /** The "Courses" folder: every course this person can manage (admins also see their courses waiting for Noon Learn). */
    public function index(Request $request)
    {
        $user = $request->user();
        $q = Course::query()->with(['schoolClass.board'])->withCount('lessons')->latest('updated_at');
        if ($user->hasRole('admin')) {
            $q->where('tenant_id', $user->tenant_id);
        } elseif ($user->hasRole('teacher')) {
            $q->where('teacher_id', $user->id);
        }
        $courses = $q->limit(300)->get();
        $pending = fn (Course $c) => CourseLesson::where('course_id', $c->id)->where(fn ($x) => $x->whereNotNull('review_state')->orWhereNotNull('pending'))->count()
            + CourseItem::where('course_id', $c->id)->whereNotNull('review_state')->count();

        return $courses->map(fn (Course $c) => [
            'id' => $c->id, 'title' => $c->title, 'category' => $c->category, 'status' => $c->status, 'format' => $c->format ?? 'recorded',
            'thumbnail_url' => $c->toApp()['thumbnail_url'] ?? null, 'logo_url' => $c->logo_url, 'cover' => $c->cover,
            'lessons_count' => (int) $c->lessons_count, 'live_classes' => $c->liveClasses()->count(),
            'mode' => Review::mode($user, $c), 'can_approve' => Review::canApprove($user, $c), 'pending' => $pending($c),
            'owner' => $c->tenant_id ? 'institution' : 'noon',
        ])->values();
    }

    /** Course details an admin can change (Noon Learn decides who sees the course and its price). */
    public function update(Request $request, Course $course)
    {
        abort_unless($request->attributes->get('manage_mode') === 'full', 403, 'Only the admin can change the course details.');
        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:160'], 'description' => ['nullable', 'string', 'max:500'],
            'level' => ['sometimes', 'string', 'max:30'], 'trial_lessons' => ['sometimes', 'integer', 'min:0', 'max:50'],
            'live_provider' => ['sometimes', 'in:meet,livekit'], 'meet_url' => ['nullable', 'string', 'max:500', 'url:https'],
            'status' => ['sometimes', 'in:draft,published'],
        ]);
        $course->update($data);

        return app(CourseBuilderController::class)->show($course->fresh());
    }

    /* ---------- Live classes: create them first, give them a date later ---------- */

    /** POST {title} or {count, title}: "Class 1" … "Class 10" in one go. */
    public function storeLiveClasses(Request $request, Course $course)
    {
        $data = $request->validate(['title' => ['nullable', 'string', 'max:140'], 'count' => ['nullable', 'integer', 'min:1', 'max:100'],
            'starts_at' => ['nullable', 'date'], 'duration_min' => ['nullable', 'integer', 'min:10', 'max:300']]);
        $n = $data['count'] ?? 1;
        $pos = (int) $course->liveClasses()->max('position');
        $base = trim($data['title'] ?? '') ?: 'Class';
        DB::transaction(function () use ($course, $n, $pos, $base, $data) {
            for ($i = 1; $i <= $n; $i++) {
                $course->liveClasses()->create([
                    'position' => $pos + $i, 'title' => $n > 1 || ! isset($data['title']) ? $base.' '.($pos + $i) : $base,
                    'starts_at' => $n === 1 && ! empty($data['starts_at']) ? Carbon::parse($data['starts_at'])->setTimezone(config('app.timezone')) : null, 'duration_min' => $data['duration_min'] ?? 45,
                ]);
            }
        });

        return $this->classes($course);
    }

    /** Change the title, notes, date and time (or clear the date), length. */
    public function updateLiveClass(Request $request, CourseLiveClass $class)
    {
        $data = $request->validate(['title' => ['sometimes', 'string', 'max:160'], 'notes' => ['nullable', 'string', 'max:500'],
            'starts_at' => ['nullable', 'date'], 'duration_min' => ['sometimes', 'integer', 'min:10', 'max:300']]);
        if (! empty($data['starts_at'])) {
            $data['starts_at'] = Carbon::parse($data['starts_at'])->setTimezone(config('app.timezone'));
        }
        $class->update($data);

        return $this->classes(Course::findOrFail($class->course_id));
    }

    public function destroyLiveClass(CourseLiveClass $class)
    {
        $course = Course::findOrFail($class->course_id);
        $class->delete();

        return $this->classes($course);
    }

    /** New order of the classes: {ids: [..]}. */
    public function reorderLiveClasses(Request $request, Course $course)
    {
        $ids = $request->validate(['ids' => ['required', 'array', 'max:500'], 'ids.*' => ['integer']])['ids'];
        $mine = $course->liveClasses()->pluck('id')->all();
        foreach (array_values($ids) as $i => $id) {
            abort_unless(in_array($id, $mine, true), 422, 'That class is not in this course.');
            CourseLiveClass::whereKey($id)->update(['position' => $i + 1]);
        }

        return $this->classes($course);
    }

    private function classes(Course $course): array
    {
        return $course->liveClasses()->get()->map(fn ($c) => $c->toApp())->values()->all();
    }
}
