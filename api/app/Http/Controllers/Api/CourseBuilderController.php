<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\CourseCategory;
use App\Models\CourseItem;
use App\Models\CourseLesson;
use App\Models\CourseLiveSlot;
use App\Models\CourseSubject;
use App\Models\User;
use App\Support\LiveSchedule;
use App\Support\Review;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Super admin course builder: Course → (optional) Subjects → Lessons → content.
 * Every change is saved straight away, so nothing is lost when moving between screens.
 * Also: the course category list, and opening HTML lesson content in a sandbox.
 */
class CourseBuilderController extends Controller
{
    /* ---------- Categories ---------- */

    public function categories()
    {
        return CourseCategory::orderBy('position')->orderBy('id')->get(['id', 'name']);
    }

    public function storeCategory(Request $request)
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:60', 'unique:course_categories,name']]);

        return CourseCategory::create($data + ['position' => (int) CourseCategory::max('position') + 1])->only(['id', 'name']);
    }

    public function updateCategory(Request $request, CourseCategory $category)
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:60', Rule::unique('course_categories', 'name')->ignore($category->id)]]);
        DB::transaction(function () use ($category, $data) {
            // Courses keep the category by name, so rename them too.
            Course::where('category', $category->name)->update(['category' => $data['name']]);
            $category->update($data);
        });

        return $category->only(['id', 'name']);
    }

    public function destroyCategory(CourseCategory $category)
    {
        $used = Course::where('category', $category->name)->count();
        abort_if($used > 0, 422, "{$used} course".($used === 1 ? ' uses' : 's use').' this category. Move them to another category first.');
        $category->delete();

        return response()->noContent();
    }

    /* ---------- The whole course for the editor ---------- */

    public function show(Course $course)
    {
        $course->load(['items', 'teacher', 'students', 'lessons.items', 'subjects', 'liveSlots']);
        $ids = $course->tenants()->pluck('tenants.id')->all();

        return $course->toApp() + [
            'meet_url' => $course->meet_url, 'live_timezone' => $course->live_timezone,
            'live_slots' => $course->liveSlots->map(fn ($s) => $s->toApp())->values(),
            'live_classes' => $course->liveClasses()->get()->map(fn ($c) => $c->toApp())->values(),
            'manage_mode' => request()->attributes->get('manage_mode', 'full'),
            'pending_count' => CourseLesson::where('course_id', $course->id)->where(fn ($q) => $q->whereNotNull('review_state')->orWhereNotNull('pending'))->count()
                + CourseItem::where('course_id', $course->id)->whereNotNull('review_state')->count(),
            'live_upcoming' => $course->isLive() ? LiveSchedule::forApp(LiveSchedule::upcoming($course, 6)) : [],
            'tenant_ids' => $ids,
            'audience' => $course->visibility === 'madrasa' ? 'selected' : ($ids ? 'all' : 'guests'),
            'subjects' => $course->subjects->map(fn (CourseSubject $s) => $s->toApp()),
            'lessons' => $course->lessons->map(fn (CourseLesson $l) => self::lessonData($l)),
            // Content added before lessons existed (shown so it can be moved or removed).
            'loose_items' => $course->items->whereNull('course_lesson_id')->values()->map(fn (CourseItem $i) => self::itemData($i)),
        ];
    }

    /** A course subject's thumbnail (helps children find their subject). */
    public function subjectThumbnail(Request $request, CourseSubject $subject)
    {
        $this->adminOnly($request);
        $request->validate(['thumbnail' => ['nullable', 'file', 'max:2048', 'extensions:png,jpg,jpeg,webp,svg'], 'remove' => ['sometimes', 'boolean']]);
        $subject->thumbnail_path && Storage::disk('public')->delete($subject->thumbnail_path);
        $subject->update(['thumbnail_path' => $request->hasFile('thumbnail') ? $request->file('thumbnail')->store("courses/{$subject->course_id}/subjects", 'public') : null]);

        return $this->show(Course::findOrFail($subject->course_id));
    }

    /** A thumbnail for one piece of lesson content (shown instead of the type icon). */
    public function itemThumbnail(Request $request, CourseItem $item)
    {
        $this->adminOnly($request);
        $request->validate(['thumbnail' => ['nullable', 'file', 'max:2048', 'extensions:png,jpg,jpeg,webp'], 'remove' => ['sometimes', 'boolean']]);
        $item->thumbnail_path && Storage::disk('public')->delete($item->thumbnail_path);
        $item->update(['thumbnail_path' => $request->hasFile('thumbnail') ? $request->file('thumbnail')->store("courses/{$item->course_id}/items", 'public') : null]);

        return $this->show(Course::findOrFail($item->course_id));
    }

    /* ---------- Live course timetable ---------- */

    public function storeLiveSlot(Request $request, Course $course)
    {
        $data = $this->liveSlotRules($request);
        $course->liveSlots()->create($data + ['position' => (int) $course->liveSlots()->max('position') + 1]);

        return $this->show($course->fresh());
    }

    public function updateLiveSlot(Request $request, CourseLiveSlot $slot)
    {
        $slot->update($this->liveSlotRules($request, partial: true));

        return $this->show(Course::findOrFail($slot->course_id));
    }

    public function destroyLiveSlot(CourseLiveSlot $slot)
    {
        $course = Course::findOrFail($slot->course_id);
        $slot->delete();

        return $this->show($course);
    }

    private function liveSlotRules(Request $request, bool $partial = false): array
    {
        $req = $partial ? 'sometimes' : 'required';
        $data = $request->validate([
            'days' => [$req, 'array', 'min:1', 'max:7'],
            'days.*' => ['integer', 'between:0,6'],
            'start_time' => [$req, 'regex:/^([01][0-9]|2[0-3]):[0-5][0-9]$/'],
            'duration_min' => ['sometimes', 'integer', 'min:10', 'max:300'],
            'title' => ['nullable', 'string', 'max:80'],
        ], ['start_time.regex' => 'Enter the time like 19:00.']);
        if (isset($data['days'])) {
            $data['days'] = array_values(array_unique(array_map('intval', $data['days'])));
            sort($data['days']);
        }

        return $data;
    }

    public static function lessonData(CourseLesson $l): array
    {
        return [
            'id' => $l->id,
            'subject_id' => $l->course_subject_id,
            'title' => $l->title,
            'description' => $l->description,
            'duration' => $l->duration,
            'free_preview' => $l->free_preview,
            'review_state' => $l->review_state, 'pending' => $l->pending,
            'items' => $l->items->map(fn (CourseItem $i) => self::itemData($i))->values(),
        ];
    }

    public static function itemData(CourseItem $i, array $done = []): array
    {
        return [
            'id' => $i->id,
            'course_id' => $i->course_id,
            'lesson_id' => $i->course_lesson_id,
            'kind' => $i->kind,
            'title' => $i->title,
            'meta' => $i->meta ?? ($i->starts_at ? 'Live · '.$i->starts_at->format('D, j M g:i A') : null),
            'url' => $i->kind === 'html' ? null : $i->url,
            'body' => $i->kind === 'note' ? $i->body : null,
            'has_file' => (bool) $i->file_path,
            'file_size' => $i->file_size,
            'thumbnail_url' => $i->thumbnail_path ? Storage::disk('public')->url($i->thumbnail_path) : null,
            'starts_at' => $i->starts_at?->toIso8601String(),
            'done' => in_array($i->id, $done, true),
            'review_state' => $i->review_state, 'replaces_id' => $i->replaces_id,
        ];
    }

    /** Course Management by a teacher: changes wait for the admin's approval. */
    private function teacher(Request $request): bool
    {
        return $request->attributes->get('manage_mode') === 'review';
    }

    private function adminOnly(Request $request): void
    {
        abort_if($this->teacher($request), 403, 'Only the admin can change this. Ask your institution admin.');
    }

    /* ---------- Subjects ---------- */

    public function storeSubject(Request $request, Course $course)
    {
        $this->adminOnly($request);
        $data = $request->validate(['title' => ['required', 'string', 'max:160']]);
        $s = $course->subjects()->create($data + ['position' => (int) $course->subjects()->max('position') + 1]);

        return ['id' => $s->id, 'title' => $s->title];
    }

    public function updateSubject(Request $request, CourseSubject $subject)
    {
        $this->adminOnly($request);
        $subject->update($request->validate(['title' => ['required', 'string', 'max:160']]));

        return ['id' => $subject->id, 'title' => $subject->title];
    }

    /** Deleting a subject keeps its lessons: they move to the course itself. */
    public function destroySubject(Request $request, CourseSubject $subject)
    {
        $this->adminOnly($request);
        $subject->lessons()->update(['course_subject_id' => null]);
        $subject->delete();

        return response()->noContent();
    }

    /* ---------- Lessons ---------- */

    private function lessonRules(Course $course, bool $partial): array
    {
        return [
            'title' => [$partial ? 'sometimes' : 'required', 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:1000'],
            'duration' => ['nullable', 'string', 'max:20'],
            'free_preview' => ['sometimes', 'boolean'],
            'subject_id' => ['nullable', 'integer', Rule::exists('course_subjects', 'id')->where('course_id', $course->id)],
        ];
    }

    public function storeLesson(Request $request, Course $course)
    {
        $data = $request->validate($this->lessonRules($course, false));
        $lesson = $course->lessons()->create([
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'duration' => $data['duration'] ?? null,
            'free_preview' => $data['free_preview'] ?? false,
            'course_subject_id' => $data['subject_id'] ?? null,
            'position' => (int) $course->lessons()->max('position') + 1,
        ] + ($this->teacher($request) ? ['review_state' => 'new', 'submitted_by' => $request->user()->id] : []));

        return self::lessonData($lesson->load('items'));
    }

    public function showLesson(CourseLesson $lesson)
    {
        $course = $lesson->course;

        return self::lessonData($lesson->load('items')) + [
            'course' => ['id' => $course->id, 'title' => $course->title, 'status' => $course->status],
            'subject' => $lesson->subject?->only(['id', 'title']),
            'number' => $course->lessons()->pluck('id')->search($lesson->id) + 1,
        ];
    }

    public function updateLesson(Request $request, CourseLesson $lesson)
    {
        $data = $request->validate($this->lessonRules($lesson->course, true));
        if (array_key_exists('subject_id', $data)) {
            $data['course_subject_id'] = $data['subject_id'];
            unset($data['subject_id']);
        }
        if ($this->teacher($request) && $lesson->review_state !== 'new') {
            // A live lesson keeps showing until the admin approves the change.
            $lesson->update(['pending' => array_merge($lesson->pending ?? [], $data), 'submitted_by' => $request->user()->id]);

            return self::lessonData($lesson->load('items'));
        }
        $lesson->update($data);

        return self::lessonData($lesson->load('items'));
    }

    public function destroyLesson(Request $request, CourseLesson $lesson)
    {
        if ($this->teacher($request) && $lesson->review_state !== 'new') {
            $lesson->update(['review_state' => 'delete', 'submitted_by' => $request->user()->id]);

            return self::lessonData($lesson->load('items'));
        }
        $lesson->items->each(fn (CourseItem $i) => $this->deleteFile($i));
        $lesson->delete();

        return response()->noContent();
    }

    /** New order of subjects and lessons (a lesson can also move to another subject). */
    public function reorder(Request $request, Course $course)
    {
        $this->adminOnly($request);
        $data = $request->validate([
            'subjects' => ['sometimes', 'array', 'max:200'],
            'subjects.*' => ['integer'],
            'lessons' => ['sometimes', 'array', 'max:1000'],
            'lessons.*.id' => ['required', 'integer'],
            'lessons.*.subject_id' => ['nullable', 'integer'],
        ]);
        $subjectIds = $course->subjects()->pluck('id')->all();
        $lessonIds = $course->lessons()->pluck('id')->all();
        DB::transaction(function () use ($data, $course, $subjectIds, $lessonIds) {
            foreach (array_values($data['subjects'] ?? []) as $i => $id) {
                abort_unless(in_array($id, $subjectIds, true), 422, 'That subject is not in this course.');
                $course->subjects()->whereKey($id)->update(['position' => $i + 1]);
            }
            foreach (array_values($data['lessons'] ?? []) as $i => $row) {
                abort_unless(in_array($row['id'], $lessonIds, true), 422, 'That lesson is not in this course.');
                $sid = $row['subject_id'] ?? null;
                abort_unless($sid === null || in_array($sid, $subjectIds, true), 422, 'That subject is not in this course.');
                $course->lessons()->whereKey($row['id'])->update(['position' => $i + 1, 'course_subject_id' => $sid]);
            }
        });

        return $this->show($course->fresh());
    }

    /* ---------- Lesson content ---------- */

    public function storeItem(Request $request, CourseLesson $lesson)
    {
        $data = $this->itemInput($request, null);
        $item = $lesson->items()->create($data + [
            'course_id' => $lesson->course_id,
            'position' => (int) $lesson->items()->max('position') + 1,
        ] + ($this->teacher($request) ? ['review_state' => 'new', 'submitted_by' => $request->user()->id] : []));
        $this->attachFile($request, $item);

        return self::itemData($item->fresh());
    }

    /** Update the title/link/note/date, or replace the file (multipart, so POST). */
    public function updateItem(Request $request, CourseItem $item)
    {
        if ($this->teacher($request) && $item->review_state !== 'new') {
            // Edit a copy; the live item stays until the admin approves the copy.
            $copy = CourseItem::where('replaces_id', $item->id)->where('review_state', 'new')->first() ?? $item->replicate(['review_state', 'replaces_id', 'submitted_by']);
            $copy->forceFill(['review_state' => 'new', 'replaces_id' => $item->id, 'submitted_by' => $request->user()->id]);
            if (! $copy->exists && ($request->hasFile('file') || $request->filled('body'))) {
                // New content: never touch the live item's files.
                $copy->forceFill($item->kind === 'html' ? ['file_path' => null] : ['url' => null]);
            }
            $copy->fill($this->itemInput($request, $copy))->save();
            $this->attachFile($request, $copy);

            return self::itemData($copy->fresh());
        }
        $item->update($this->itemInput($request, $item));
        $this->attachFile($request, $item);

        return self::itemData($item->fresh());
    }

    public function reorderItems(Request $request, CourseLesson $lesson)
    {
        $this->adminOnly($request);
        $data = $request->validate(['items' => ['required', 'array', 'max:500'], 'items.*' => ['integer']]);
        $ids = $lesson->items()->pluck('id')->all();
        DB::transaction(function () use ($data, $lesson, $ids) {
            foreach (array_values($data['items']) as $i => $id) {
                abort_unless(in_array($id, $ids, true), 422, 'That item is not in this lesson.');
                $lesson->items()->whereKey($id)->update(['position' => $i + 1]);
            }
        });

        return self::lessonData($lesson->load('items'));
    }

    /** Move older content (added before lessons) into a lesson. */
    public function moveItem(Request $request, CourseItem $item)
    {
        $this->adminOnly($request);
        $data = $request->validate(['lesson_id' => ['required', 'integer', Rule::exists('course_lessons', 'id')->where('course_id', $item->course_id)]]);
        $lesson = CourseLesson::findOrFail($data['lesson_id']);
        $item->update(['course_lesson_id' => $lesson->id, 'position' => (int) $lesson->items()->max('position') + 1]);

        return self::itemData($item->fresh());
    }

    private function itemInput(Request $request, ?CourseItem $item): array
    {
        $kind = $item?->kind ?? $request->input('kind');
        $rules = [
            'title' => [$item ? 'sometimes' : 'required', 'string', 'max:160'],
            'meta' => ['nullable', 'string', 'max:160'],
            // Only web links: stops javascript: and other unsafe links opening in the app.
            'url' => ['nullable', 'string', 'max:500', 'url:http,https'],
            'starts_at' => ['nullable', 'date'],
            'body' => ['nullable', 'string', 'max:200000'],
            'file' => ['nullable', 'file', ...$this->fileRules((string) $kind)],
        ];
        if (! $item) {
            $rules['kind'] = ['required', Rule::in(CourseItem::KINDS)];
        }
        $data = $request->validate($rules, [
            'file.extensions' => $this->fileHint((string) $kind),
            'file.mimetypes' => $this->fileHint((string) $kind),
            'file.max' => 'That file is too big.',
        ]);
        unset($data['file']);
        if ($kind === 'html') {
            // HTML is pasted as text or uploaded as a file; both are kept privately.
            unset($data['url']);
            if (isset($data['body'])) {
                $this->deleteFile($item);
                $data['file_path'] = $this->storeHtmlString($data['body']);
                $data['file_size'] = strlen($data['body']);
                unset($data['body']);
            }
            if (! $item && ! isset($data['file_path']) && ! $request->hasFile('file')) {
                abort(422, 'Upload the .html file or paste the HTML code.');
            }
        }

        return $data;
    }

    private function fileRules(string $kind): array
    {
        return match ($kind) {
            'video' => ['max:512000', 'extensions:mp4,mov,m4v,webm'],
            'audio' => ['max:102400', 'extensions:mp3,m4a,aac,ogg,wav,opus'],
            'pdf' => ['max:51200', 'extensions:pdf'],
            'image' => ['max:10240', 'extensions:jpg,jpeg,png,webp,gif'],
            'html' => ['max:20480', 'extensions:html,htm', 'mimetypes:text/html,text/plain,application/xhtml+xml'],
            default => ['prohibited'],
        };
    }

    private function fileHint(string $kind): string
    {
        return match ($kind) {
            'video' => 'Choose an MP4, MOV or WEBM video.',
            'audio' => 'Choose an MP3, M4A, AAC, OGG or WAV audio file.',
            'pdf' => 'Choose a PDF file.',
            'image' => 'Choose a JPG, PNG, WEBP or GIF image.',
            'html' => 'Choose a .html file.',
            default => 'This kind of content does not take a file.',
        };
    }

    private function attachFile(Request $request, CourseItem $item): void
    {
        $file = $request->file('file');
        if (! $file instanceof UploadedFile) {
            return;
        }
        if ($item->kind === 'html') {
            $this->deleteFile($item);
            $item->update(['file_path' => $file->storeAs('course-html', Str::uuid().'.html', 'local'), 'file_size' => $file->getSize()]);

            return;
        }
        $this->deletePublicFile($item);
        $item->update([
            'url' => Storage::disk('public')->url($file->store("courses/{$item->course_id}", 'public')),
            'file_size' => $file->getSize(),
            'meta' => $item->meta ?? $file->getClientOriginalName(),
        ]);
    }

    private function storeHtmlString(string $html): string
    {
        $path = 'course-html/'.Str::uuid().'.html';
        Storage::disk('local')->put($path, $html);

        return $path;
    }

    public function destroyItem(Request $request, CourseItem $item)
    {
        if ($this->teacher($request) && $item->review_state !== 'new') {
            $item->update(['review_state' => 'delete', 'submitted_by' => $request->user()->id]);

            return response()->noContent();
        }
        if ($item->review_state === 'new' && $item->replaces_id) {
            $this->dropCopy($item);

            return response()->noContent();
        }
        $this->deleteFile($item);
        $this->deletePublicFile($item);
        $item->thumbnail_path && Storage::disk('public')->delete($item->thumbnail_path);
        $item->delete();

        return response()->noContent();
    }

    /** Remove an item's own files (used when a course is deleted for good). */
    public static function deleteFiles(CourseItem $item): void
    {
        $self = new self;
        $self->deleteFile($item);
        $self->deletePublicFile($item);
    }

    private function deleteFile(?CourseItem $item): void
    {
        if ($item?->file_path) {
            Storage::disk('local')->delete($item->file_path);
        }
    }

    /** Remove our own uploaded file (not an outside link) when it is replaced or deleted. */
    private function deletePublicFile(CourseItem $item): void
    {
        $prefix = rtrim(Storage::disk('public')->url(''), '/').'/';
        if ($item->url && str_starts_with($item->url, $prefix) && str_starts_with(substr($item->url, strlen($prefix)), "courses/{$item->course_id}/")) {
            Storage::disk('public')->delete(substr($item->url, strlen($prefix)));
        }
    }

    /* ---------- Teachers' changes waiting for approval ---------- */

    /** GET: what is waiting in one course (or every course the approver looks after). */
    public function reviews(Request $request)
    {
        $user = $request->user();
        $courseId = $request->integer('course_id') ?: null;
        $courses = Course::query()->when($courseId, fn ($q) => $q->whereKey($courseId))
            ->when(! $user->hasRole('super'), fn ($q) => $user->hasRole('admin') ? $q->where('tenant_id', $user->tenant_id) : $q->where('teacher_id', $user->id))
            ->pluck('title', 'id');
        $who = fn ($id) => $id ? User::find($id)?->name : null;
        $lessons = CourseLesson::whereIn('course_id', $courses->keys())->where(fn ($q) => $q->whereNotNull('review_state')->orWhereNotNull('pending'))->get()
            ->map(fn (CourseLesson $l) => ['type' => 'lesson', 'id' => $l->id, 'course_id' => $l->course_id, 'course' => $courses[$l->course_id],
                'change' => $l->review_state === 'new' ? 'new lesson' : ($l->review_state === 'delete' ? 'remove lesson' : 'edit lesson'),
                'title' => $l->title, 'details' => $l->pending, 'by' => $who($l->submitted_by), 'when' => $l->updated_at?->toIso8601String()]);
        $items = CourseItem::with('lesson')->whereIn('course_id', $courses->keys())->whereNotNull('review_state')->get()
            ->map(fn (CourseItem $i) => ['type' => 'item', 'id' => $i->id, 'course_id' => $i->course_id, 'course' => $courses[$i->course_id],
                'change' => $i->review_state === 'delete' ? 'remove content' : ($i->replaces_id ? 'edit content' : 'new content'),
                'title' => $i->title, 'kind' => $i->kind, 'lesson' => $i->lesson?->title, 'item' => self::itemData($i), 'by' => $who($i->submitted_by), 'when' => $i->updated_at?->toIso8601String()]);

        return $lessons->concat($items)->sortByDesc('when')->values();
    }

    /** POST {type: lesson|item, id, approve: bool} — or {course_id, approve: true} for everything in a course. */
    public function decide(Request $request)
    {
        $data = $request->validate(['type' => ['required_without:course_id', 'in:lesson,item'], 'id' => ['required_without:course_id', 'integer'],
            'course_id' => ['nullable', 'integer'], 'approve' => ['required', 'boolean']]);
        $rows = isset($data['course_id'])
            ? collect(CourseLesson::where('course_id', $data['course_id'])->where(fn ($q) => $q->whereNotNull('review_state')->orWhereNotNull('pending'))->get())
                ->concat(CourseItem::where('course_id', $data['course_id'])->whereNotNull('review_state')->get())
            : collect([$data['type'] === 'lesson' ? CourseLesson::findOrFail($data['id']) : CourseItem::findOrFail($data['id'])]);
        foreach ($rows as $row) {
            abort_unless(Review::canApprove($request->user(), Course::findOrFail($row->course_id)), 403);
            DB::transaction(fn () => $row instanceof CourseLesson ? $this->decideLesson($row, $data['approve']) : $this->decideItem($row, $data['approve']));
        }

        return ['ok' => true, 'done' => $rows->count()];
    }

    private function decideLesson(CourseLesson $l, bool $ok): void
    {
        if ($l->review_state === 'new') {
            $ok ? $l->update(['review_state' => null]) : $this->wipeLesson($l);
        } elseif ($l->review_state === 'delete') {
            $ok ? $this->wipeLesson($l) : $l->update(['review_state' => null]);
        }
        if ($l->exists && $l->pending) {
            $l->update(($ok ? $l->pending : []) + ['pending' => null]);
        }
    }

    private function wipeLesson(CourseLesson $l): void
    {
        CourseItem::where('course_lesson_id', $l->id)->get()->each(fn (CourseItem $i) => $this->dropItem($i));
        $l->delete();
    }

    private function decideItem(CourseItem $i, bool $ok): void
    {
        if ($i->review_state === 'delete') {
            $ok ? $this->dropItem($i) : $i->update(['review_state' => null]);

            return;
        }
        if (! $ok) {
            $i->replaces_id ? $this->dropCopy($i) : $this->dropItem($i);

            return;
        }
        if ($i->replaces_id && ($old = CourseItem::find($i->replaces_id))) {
            // The approved copy takes the old item's place; progress moves across.
            DB::table('course_item_user')->where('course_item_id', $old->id)->whereNotIn('user_id', DB::table('course_item_user')->where('course_item_id', $i->id)->pluck('user_id'))
                ->update(['course_item_id' => $i->id]);
            if ($old->file_path && $old->file_path !== $i->file_path) {
                $this->deleteFile($old);
            }
            if ($old->url !== $i->url) {
                $this->deletePublicFile($old);
            }
            $i->forceFill(['course_lesson_id' => $old->course_lesson_id, 'position' => $old->position])->save();
            $old->delete();
        }
        $i->update(['review_state' => null, 'replaces_id' => null]);
    }

    private function dropItem(CourseItem $i): void
    {
        $this->deleteFile($i);
        $this->deletePublicFile($i);
        $i->delete();
    }

    /** Throw away an edited copy without touching files the live item still uses. */
    private function dropCopy(CourseItem $copy): void
    {
        $old = CourseItem::find($copy->replaces_id);
        if ($copy->file_path && $copy->file_path !== $old?->file_path) {
            $this->deleteFile($copy);
        }
        if ($copy->url !== $old?->url) {
            $this->deletePublicFile($copy);
        }
        $copy->delete();
    }

    /* ---------- Opening HTML content (all roles) ---------- */

    /** A short-lived signed link to an HTML lesson item, for anyone allowed to open it. */
    public function open(Request $request, CourseItem $item)
    {
        abort_unless($item->kind === 'html' && $item->file_path, 404);
        $this->assertCanOpen($request->user(), $item);
        $path = URL::temporarySignedRoute('course-items.html', now()->addHours(3), ['id' => $item->id], absolute: false);

        return ['url' => rtrim(config('app.url'), '/').$path, 'title' => $item->title];
    }

    /** A lesson's PDF file through the API (so the app can draw its pages, e.g. in a live class). */
    public function pdf(Request $request, CourseItem $item)
    {
        abort_unless($item->kind === 'pdf' && $item->url, 404);
        $this->assertCanOpen($request->user(), $item);
        $prefix = rtrim(Storage::disk('public')->url(''), '/').'/';
        abort_unless(str_starts_with($item->url, $prefix), 404, 'This PDF is a link, not an uploaded file.');
        $path = substr($item->url, strlen($prefix));
        abort_unless(Storage::disk('public')->exists($path), 404);

        return Storage::disk('public')->response($path, null, ['Content-Type' => 'application/pdf', 'Cache-Control' => 'private, max-age=600', 'X-Content-Type-Options' => 'nosniff']);
    }

    public function assertCanOpenPublic($user, CourseItem $item): void
    {
        $this->assertCanOpen($user, $item);
    }

    /** Course staff, or a student allowed to open this lesson. */
    private function assertCanOpen($user, CourseItem $item): void
    {
        $course = $item->course;
        $staff = $user->hasRole('super') || $course->teacher_id === $user->id || ($user->hasRole('admin') && $course->status === 'published');
        if (! $staff) {
            abort_unless(Course::visibleTo($user)->whereKey($course->id)->exists(), 404);
            $enrolled = $user->courses()->whereKey($course->id)->exists();
            abort_unless($enrolled || $item->lesson?->free_preview, 403, 'Join the course to open this lesson.');
            $access = $course->access($user);
            abort_if($enrolled && ! $item->lesson?->free_preview && $access['unlocked'] !== null && ! in_array($item->course_lesson_id, $access['unlocked'], true),
                403, 'This lesson opens after the free trial. Please ask your institution or Noon Learn to continue.');
        }
    }

    /** The HTML itself (signed link only), locked in a sandbox like the HTML games. */
    public function html(int $id)
    {
        $item = CourseItem::findOrFail($id);
        abort_unless($item->file_path && Storage::disk('local')->exists($item->file_path), 404);

        return response(Storage::disk('local')->get($item->file_path), 200, [
            'Content-Type' => 'text/html; charset=utf-8',
            'Content-Security-Policy' => 'sandbox allow-scripts allow-pointer-lock allow-modals allow-forms',
            'X-Content-Type-Options' => 'nosniff',
            'Referrer-Policy' => 'no-referrer',
            'Cache-Control' => 'private, max-age=600',
        ]);
    }
}
