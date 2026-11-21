<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\CourseCategory;
use App\Models\CourseItem;
use App\Models\CourseLesson;
use App\Models\CourseSubject;
use App\Models\CourseLiveSlot;
use App\Support\LiveSchedule;
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
        $request->validate(['thumbnail' => ['nullable', 'file', 'max:2048', 'extensions:png,jpg,jpeg,webp,svg'], 'remove' => ['sometimes', 'boolean']]);
        $subject->thumbnail_path && Storage::disk('public')->delete($subject->thumbnail_path);
        $subject->update(['thumbnail_path' => $request->hasFile('thumbnail') ? $request->file('thumbnail')->store("courses/{$subject->course_id}/subjects", 'public') : null]);

        return $this->show(Course::findOrFail($subject->course_id));
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
            'starts_at' => $i->starts_at?->toIso8601String(),
            'done' => in_array($i->id, $done, true),
        ];
    }

    /* ---------- Subjects ---------- */

    public function storeSubject(Request $request, Course $course)
    {
        $data = $request->validate(['title' => ['required', 'string', 'max:160']]);
        $s = $course->subjects()->create($data + ['position' => (int) $course->subjects()->max('position') + 1]);

        return ['id' => $s->id, 'title' => $s->title];
    }

    public function updateSubject(Request $request, CourseSubject $subject)
    {
        $subject->update($request->validate(['title' => ['required', 'string', 'max:160']]));

        return ['id' => $subject->id, 'title' => $subject->title];
    }

    /** Deleting a subject keeps its lessons: they move to the course itself. */
    public function destroySubject(CourseSubject $subject)
    {
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
        ]);

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
        $lesson->update($data);

        return self::lessonData($lesson->load('items'));
    }

    public function destroyLesson(CourseLesson $lesson)
    {
        $lesson->items->each(fn (CourseItem $i) => $this->deleteFile($i));
        $lesson->delete();

        return response()->noContent();
    }

    /** New order of subjects and lessons (a lesson can also move to another subject). */
    public function reorder(Request $request, Course $course)
    {
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
        ]);
        $this->attachFile($request, $item);

        return self::itemData($item->fresh());
    }

    /** Update the title/link/note/date, or replace the file (multipart, so POST). */
    public function updateItem(Request $request, CourseItem $item)
    {
        $item->update($this->itemInput($request, $item));
        $this->attachFile($request, $item);

        return self::itemData($item->fresh());
    }

    public function reorderItems(Request $request, CourseLesson $lesson)
    {
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

    public function destroyItem(CourseItem $item)
    {
        $this->deleteFile($item);
        $this->deletePublicFile($item);
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

    /* ---------- Opening HTML content (all roles) ---------- */

    /** A short-lived signed link to an HTML lesson item, for anyone allowed to open it. */
    public function open(Request $request, CourseItem $item)
    {
        $user = $request->user();
        abort_unless($item->kind === 'html' && $item->file_path, 404);
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
        $path = URL::temporarySignedRoute('course-items.html', now()->addHours(3), ['id' => $item->id], absolute: false);

        return ['url' => rtrim(config('app.url'), '/').$path, 'title' => $item->title];
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
