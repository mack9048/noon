<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\CourseItem;
use App\Models\Tenant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

/**
 * Noon Courses for all roles:
 *  - students/guests: list, detail, enrol
 *  - teachers: add content to courses they teach
 *  - institute admin: switch courses on/off for the institution
 *  - super admin: full CRUD (see super* methods)
 */
class CourseController extends Controller
{
    private const WITH = ['items', 'teacher', 'students', 'lessons'];

    /** Public catalogue for the sign-up page: published courses open to everyone (no institution-only ones). */
    public function catalog()
    {
        return Course::where('status', 'published')->where('visibility', 'all')->with(self::WITH)->latest()->get()
            ->map(fn (Course $c) => $c->toApp(null));
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $scope = $request->query('scope', 'all');

        $q = Course::visibleTo($user)->with(self::WITH)->latest();
        if ($scope === 'mine') {
            $q->whereHas('students', fn ($s) => $s->where('users.id', $user->id));
        }
        if ($scope === 'explore') {
            $q->whereDoesntHave('students', fn ($s) => $s->where('users.id', $user->id));
        }

        $courses = $q->get();
        if ($user->hasRole('admin')) {
            $enabled = $user->tenant?->courses()->wherePivot('enabled', true)->pluck('courses.id')->all() ?? [];

            return $courses->map(fn (Course $c) => $c->toApp($user) + ['enabled' => in_array($c->id, $enabled, true)]);
        }

        return $courses->map(fn (Course $c) => $c->toApp($user));
    }

    public function show(Request $request, Course $course)
    {
        $user = $request->user();
        // Drafts: super admin and the course's own teacher. Published courses: admins
        // (to decide whether to switch them on) and anyone the course is visible to.
        $canSee = $user->hasRole('super')
            || $course->teacher_id === $user->id
            || ($user->hasRole('admin') && $course->status === 'published')
            || Course::visibleTo($user)->whereKey($course->id)->exists();
        abort_unless($canSee, 404);
        $course->load([...self::WITH, 'lessons.items', 'subjects']);
        $done = $user->id ? DB::table('course_item_user')->where('user_id', $user->id)->pluck('course_item_id')->all() : [];
        $item = fn (CourseItem $i) => CourseBuilderController::itemData($i, $done);
        // Content in the order students follow it: older loose items first, then lesson by lesson.
        $flat = $course->items->whereNull('course_lesson_id')->values()
            ->concat($course->lessons->flatMap(fn ($l) => $l->items));

        return $course->toApp($user) + [
            'items' => $flat->map($item)->values(),
            'subjects' => $course->subjects->map(fn ($s) => ['id' => $s->id, 'title' => $s->title]),
            'lessons' => $course->lessons->map(fn ($l) => [
                'id' => $l->id,
                'subject_id' => $l->course_subject_id,
                'title' => $l->title,
                'description' => $l->description,
                'duration' => $l->duration,
                'free_preview' => $l->free_preview,
                'items' => $l->items->map($item)->values(),
            ]),
        ];
    }

    /**
     * "Continue learning": the course the student worked on last and the next lesson after the
     * last one they completed (lesson order as the course player shows it). Null when not enrolled.
     */
    public function continue(Request $request)
    {
        $user = $request->user();
        $courses = $user->courses()->whereIn('courses.id', Course::visibleTo($user)->select('courses.id'))
            ->when($request->integer('course'), fn ($q, $id) => $q->where('courses.id', $id))->get();
        if ($courses->isEmpty()) {
            return response()->json(null);
        }
        $last = DB::table('course_item_user')->join('course_items', 'course_items.id', '=', 'course_item_user.course_item_id')
            ->where('course_item_user.user_id', $user->id)->whereIn('course_items.course_id', $courses->pluck('id'))
            ->orderByDesc('course_item_user.completed_at')->orderByDesc('course_items.id')->first(['course_items.id', 'course_items.course_id']);
        // No lesson done yet: the course joined most recently.
        $course = $last ? $courses->firstWhere('id', $last->course_id) : $courses->sortByDesc(fn ($c) => $c->pivot->created_at)->first();
        $course->load([...self::WITH, 'lessons.items', 'subjects']);
        $done = DB::table('course_item_user')->where('user_id', $user->id)->pluck('course_item_id')->flip();

        // Player order: lessons outside a subject first, then subject by subject.
        $subjectPos = $course->subjects->pluck('id')->flip();
        $lessons = $course->lessons->sortBy(fn ($l) => [$l->course_subject_id && $subjectPos->has($l->course_subject_id) ? 1 + $subjectPos[$l->course_subject_id] : 0, $l->position, $l->id])->values();
        $flat = $lessons->flatMap(fn ($l) => $l->items->map(fn ($i) => [$l, $i]))->values();
        $total = $flat->count();
        $doneCount = $flat->filter(fn ($p) => $done->has($p[1]->id))->count();
        $after = $last ? $flat->search(fn ($p) => $p[1]->id === $last->id) : false;
        $next = ($after !== false ? $flat->slice($after + 1)->first(fn ($p) => ! $done->has($p[1]->id)) : null)
            ?? $flat->first(fn ($p) => ! $done->has($p[1]->id));
        [$lesson, $item] = $next ?? [$lessons->first(), null];

        return [
            'course' => $course->toApp($user),
            'lesson' => $lesson ? ['id' => $lesson->id, 'title' => $lesson->title, 'number' => $lessons->search(fn ($l) => $l->id === $lesson->id) + 1, 'duration' => $lesson->duration] : null,
            'item' => $item ? ['id' => $item->id, 'title' => $item->title, 'kind' => $item->kind] : null,
            'done' => $doneCount,
            'total' => $total,
            'lessons' => $lessons->count(),
            'finished' => $total > 0 && $doneCount === $total,
        ];
    }

    public function enroll(Request $request, Course $course)
    {
        $user = $request->user();
        abort_unless(Course::visibleTo($user)->whereKey($course->id)->exists(), 404);
        $user->courses()->syncWithoutDetaching([$course->id => ['trial_ends_at' => $course->is_free ? null : now()->addDays(7)]]);

        return $course->load(self::WITH)->toApp($user);
    }

    public function complete(Request $request, CourseItem $item)
    {
        $user = $request->user();
        $enrolled = $user->courses()->whereKey($item->course_id)->exists()
            && Course::visibleTo($user)->whereKey($item->course_id)->exists();
        abort_unless($enrolled, 404);
        DB::table('course_item_user')->insertOrIgnore(['course_item_id' => $item->id, 'user_id' => $request->user()->id]);
        $course = $item->course()->withCount('items')->first();
        $done = DB::table('course_item_user')->where('user_id', $request->user()->id)
            ->whereIn('course_item_id', $course->items()->pluck('id'))->count();
        $request->user()->courses()->updateExistingPivot($course->id, ['progress' => (int) round($done / max(1, $course->items_count) * 100)]);

        return response()->noContent();
    }

    /* ---------- Teacher ---------- */

    public function teacherAddItem(Request $request, Course $course)
    {
        $user = $request->user();
        $teaches = $course->teacher_id === $user->id
            || $course->tenants()->where('tenants.id', $user->tenant_id)->wherePivot('teacher_id', $user->id)->exists();
        abort_unless($teaches, 403, 'You do not teach this course.');

        return $this->storeItem($request, $course);
    }

    /* ---------- Institute admin ---------- */

    public function adminToggle(Request $request, Course $course)
    {
        $tenant = $request->user()->tenant;
        $data = $request->validate([
            'enabled' => ['required', 'boolean'],
            // Only a teacher of this institution can be put on the course.
            'teacher_id' => ['nullable', 'integer', Rule::exists('users', 'id')->where('tenant_id', $tenant?->id)->where('role', 'teacher')],
            'class_ids' => ['nullable', 'array', 'max:50'],
            'class_ids.*' => ['integer'],
        ]);
        abort_unless($tenant && $course->status === 'published', 422);
        // A course kept for chosen institutions can only be switched on by those institutions (or its owner).
        abort_unless($course->visibility === 'all' || $course->tenant_id === $tenant->id
            || $course->tenants()->where('tenants.id', $tenant->id)->exists(), 404);
        $tenant->courses()->syncWithoutDetaching([$course->id => [
            'enabled' => $data['enabled'],
            'teacher_id' => $data['teacher_id'] ?? null,
            'class_ids' => isset($data['class_ids']) ? json_encode($data['class_ids']) : null,
        ]]);

        return ['id' => $course->id, 'enabled' => $data['enabled']];
    }

    /* ---------- Super admin CRUD ---------- */

    public function superIndex(Request $request)
    {
        // ?deleted=1: the bin.
        $q = $request->boolean('deleted') ? Course::onlyTrashed()->latest('deleted_at') : Course::latest();

        return $q->with([...self::WITH, 'madrasa'])->get()->map(fn (Course $c) => $c->toApp() + [
            'institution' => $c->madrasa?->name, 'deleted_at' => $c->deleted_at?->toIso8601String(),
        ]);
    }

    /** Move a deleted course back out of the bin (it comes back as a draft). */
    public function superRestore(int $id)
    {
        $course = Course::onlyTrashed()->findOrFail($id);
        $course->restore();
        $course->update(['status' => $course->status === 'published' ? 'draft' : $course->status]);

        return $course->load(self::WITH)->toApp();
    }

    /** Delete a course from the bin for good, with its lessons and files. */
    public function superForceDelete(int $id)
    {
        $course = Course::onlyTrashed()->with('items')->findOrFail($id);
        foreach ($course->items as $item) {
            CourseBuilderController::deleteFiles($item);
        }
        $course->forceDelete();

        return response()->noContent();
    }

    public function superStore(Request $request)
    {
        $course = Course::create($this->validated($request));
        $this->assignTenants($request, $course);

        return $course->load(self::WITH)->toApp() + $this->audienceOf($course);
    }

    public function superUpdate(Request $request, Course $course)
    {
        $course->update($this->validated($request, partial: true));
        $this->assignTenants($request, $course);

        return $course->load(self::WITH)->toApp() + $this->audienceOf($course);
    }

    /**
     * Which institutions a course is for:
     *  - all: every institution gets it switched on, guests see it too
     *  - selected: only the chosen institutions (guests do not see it)
     *  - guests: only guests exploring the free app
     */
    private function assignTenants(Request $request, Course $course): void
    {
        if (! $request->has('audience')) {
            return;
        }
        $data = $request->validate([
            'audience' => ['required', 'in:all,selected,guests'],
            'tenant_ids' => ['required_if:audience,selected', 'array', 'max:500'],
            'tenant_ids.*' => ['integer', 'exists:tenants,id'],
        ]);
        $ids = match ($data['audience']) {
            'all' => Tenant::pluck('id')->all(),
            'selected' => array_values(array_unique($data['tenant_ids'])),
            'guests' => [],
        };
        $course->update(['visibility' => $data['audience'] === 'selected' ? 'madrasa' : 'all']);
        // Keep each institution's own teacher/class choices; add the new ones switched on.
        $keep = $course->tenants()->whereIn('tenants.id', $ids)->pluck('tenants.id')->all();
        $course->tenants()->detach(array_diff($course->tenants()->pluck('tenants.id')->all(), $ids));
        $course->tenants()->attach(array_fill_keys(array_diff($ids, $keep), ['enabled' => true]));
    }

    private function audienceOf(Course $course): array
    {
        $ids = $course->tenants()->pluck('tenants.id')->all();

        return ['tenant_ids' => $ids, 'audience' => $course->visibility === 'madrasa' ? 'selected' : ($ids ? 'all' : 'guests')];
    }

    public function superDestroy(Course $course)
    {
        $course->delete();

        return response()->noContent();
    }

    public function superAddItem(Request $request, Course $course)
    {
        return $this->storeItem($request, $course);
    }

    private function storeItem(Request $request, Course $course): CourseItem
    {
        $data = $request->validate([
            'kind' => ['required', 'in:live,video,audio,pdf,test'],
            'title' => ['required', 'string', 'max:160'],
            'meta' => ['nullable', 'string', 'max:160'],
            // Only web links: stops javascript: and other unsafe links opening in the app.
            'url' => ['nullable', 'string', 'max:500', 'url:http,https'],
            'starts_at' => ['nullable', 'date'],
            'file' => ['nullable', 'file', 'max:204800', 'mimes:pdf,mp4,mov,mp3,m4a,aac,ogg,wav,jpg,jpeg,png'],
        ]);
        if ($request->hasFile('file')) {
            $data['url'] = Storage::disk('public')->url($request->file('file')->store("courses/{$course->id}", 'public'));
        }
        unset($data['file']);

        return $course->items()->create($data + ['position' => $course->items()->max('position') + 1]);
    }

    private function validated(Request $request, bool $partial = false): array
    {
        $req = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'title' => [$req, 'string', 'max:160'],
            'category' => [$req, 'string', 'max:60'],
            'level' => ['sometimes', 'string', 'max:30'],
            'cover' => ['sometimes', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'status' => ['sometimes', 'in:draft,published'],
            'description' => ['nullable', 'string', 'max:500'],
            'price' => ['nullable', 'integer', 'min:0', 'max:1000000'],
            'offer_price' => ['nullable', 'integer', 'min:0', 'max:1000000'],
            'is_free' => ['sometimes', 'boolean'],
            'price_period' => ['sometimes', 'in:once,monthly'],
            'trial_days' => ['sometimes', 'integer', 'min:0', 'max:60'],
            'free_for_subscribers' => ['sometimes', 'boolean'],
            'teacher_id' => ['nullable', 'integer', Rule::exists('users', 'id')->where('role', 'teacher')],
        ]);
    }
}
