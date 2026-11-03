<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\CourseItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Noon Courses for all roles:
 *  - students/guests: list, detail, enrol
 *  - teachers: add content to courses they teach
 *  - institute admin: switch courses on/off for the madrasa
 *  - super admin: full CRUD (see super* methods)
 */
class CourseController extends Controller
{
    private const WITH = ['items', 'teacher', 'students'];

    public function index(Request $request)
    {
        $user = $request->user();
        $scope = $request->query('scope', 'all');

        $q = Course::visibleTo($user)->with(self::WITH)->latest();
        if ($scope === 'mine') $q->whereHas('students', fn ($s) => $s->where('users.id', $user->id));
        if ($scope === 'explore') $q->whereDoesntHave('students', fn ($s) => $s->where('users.id', $user->id));

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
        abort_unless($user->hasRole('super', 'admin', 'teacher') || Course::visibleTo($user)->whereKey($course->id)->exists(), 404);
        $course->load(self::WITH);
        $done = $user->id ? DB::table('course_item_user')->where('user_id', $user->id)->pluck('course_item_id')->all() : [];

        return $course->toApp($user) + [
            'items' => $course->items->map(fn (CourseItem $i) => [
                'id' => $i->id,
                'course_id' => $i->course_id,
                'kind' => $i->kind,
                'title' => $i->title,
                'meta' => $i->meta ?? ($i->starts_at ? 'Live · ' . $i->starts_at->format('D, j M g:i A') : null),
                'url' => $i->url,
                'starts_at' => $i->starts_at?->toIso8601String(),
                'done' => in_array($i->id, $done, true),
            ]),
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
        $data = $request->validate([
            'enabled' => ['required', 'boolean'],
            'teacher_id' => ['nullable', 'exists:users,id'],
            'class_ids' => ['nullable', 'array'],
        ]);
        $tenant = $request->user()->tenant;
        abort_unless($tenant && $course->status === 'published', 422);
        $tenant->courses()->syncWithoutDetaching([$course->id => [
            'enabled' => $data['enabled'],
            'teacher_id' => $data['teacher_id'] ?? null,
            'class_ids' => isset($data['class_ids']) ? json_encode($data['class_ids']) : null,
        ]]);
        return ['id' => $course->id, 'enabled' => $data['enabled']];
    }

    /* ---------- Super admin CRUD ---------- */

    public function superIndex()
    {
        return Course::with(self::WITH)->latest()->get()->map(fn (Course $c) => $c->toApp());
    }

    public function superStore(Request $request)
    {
        return Course::create($this->validated($request))->load(self::WITH)->toApp();
    }

    public function superUpdate(Request $request, Course $course)
    {
        $course->update($this->validated($request, partial: true));
        return $course->load(self::WITH)->toApp();
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

    public function superDeleteItem(CourseItem $item)
    {
        $item->delete();
        return response()->noContent();
    }

    private function storeItem(Request $request, Course $course): CourseItem
    {
        $data = $request->validate([
            'kind' => ['required', 'in:live,video,audio,pdf,test'],
            'title' => ['required', 'string', 'max:160'],
            'meta' => ['nullable', 'string', 'max:160'],
            'url' => ['nullable', 'string', 'max:500'],
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
            'is_free' => ['sometimes', 'boolean'],
            'teacher_id' => ['nullable', 'exists:users,id'],
        ]);
    }
}
