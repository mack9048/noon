<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\CourseItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

/** Students hand in work for a lesson (e.g. a finished worksheet); the course's teachers see it. */
class CourseWorkController extends Controller
{
    private function row(object $w): array
    {
        return [
            'id' => $w->id, 'name' => $w->file_name, 'mime' => $w->mime, 'size' => (int) $w->size,
            'at' => \Illuminate\Support\Carbon::parse($w->created_at)->toIso8601String(),
            'url' => rtrim(config('app.url'), '/').URL::temporarySignedRoute('course-work.file', now()->addHours(2), ['id' => $w->id], absolute: false),
        ];
    }

    /** GET /course-items/{item}/work — what I handed in. */
    public function mine(Request $request, CourseItem $item, CourseBuilderController $builder)
    {
        $builder->assertCanOpenPublic($request->user(), $item);

        return DB::table('course_item_work')->where('course_item_id', $item->id)->where('user_id', $request->user()->id)->latest('id')->get()->map(fn ($w) => $this->row($w));
    }

    /** POST /course-items/{item}/work — hand in a photo or PDF. */
    public function store(Request $request, CourseItem $item, CourseBuilderController $builder)
    {
        $user = $request->user();
        $builder->assertCanOpenPublic($user, $item);
        abort_unless($user->courses()->whereKey($item->course_id)->exists(), 403, 'Join the course to hand in work.');
        $request->validate(['file' => ['required', 'file', 'mimes:jpg,jpeg,png,webp,heic,pdf', 'max:10240']]);
        abort_if(DB::table('course_item_work')->where('course_item_id', $item->id)->where('user_id', $user->id)->count() >= 10, 422, 'You have already sent 10 files for this.');
        $f = $request->file('file');
        $path = $f->storeAs("course-work/{$item->course_id}", Str::uuid().'.'.strtolower($f->getClientOriginalExtension() ?: $f->extension()), 'local');
        DB::table('course_item_work')->insert([
            'course_item_id' => $item->id, 'user_id' => $user->id, 'file_path' => $path,
            'file_name' => Str::limit($f->getClientOriginalName() ?: 'work', 150, ''), 'mime' => $f->getMimeType() ?? 'application/octet-stream', 'size' => $f->getSize(),
            'created_at' => now(), 'updated_at' => now(),
        ]);

        return $this->mine($request, $item, $builder);
    }

    /** DELETE /course-work/{id} — take back my own file. */
    public function destroy(Request $request, int $id)
    {
        $w = DB::table('course_item_work')->where('id', $id)->where('user_id', $request->user()->id)->first();
        abort_unless($w, 404);
        Storage::disk('local')->delete($w->file_path);
        DB::table('course_item_work')->where('id', $id)->delete();

        return response()->noContent();
    }

    /** The file itself (signed link only). */
    public function file(int $id)
    {
        $w = DB::table('course_item_work')->where('id', $id)->first();
        abort_unless($w && Storage::disk('local')->exists($w->file_path), 404);

        return Storage::disk('local')->response($w->file_path, $w->file_name, ['Content-Type' => $w->mime, 'X-Content-Type-Options' => 'nosniff', 'Cache-Control' => 'private, max-age=600']);
    }

    /** GET {manage}/courses/{course}/work — students' work for the course. Institution staff see their own students only. */
    public function staffIndex(Request $request, Course $course)
    {
        $user = $request->user();

        return DB::table('course_item_work as w')
            ->join('course_items as i', 'i.id', '=', 'w.course_item_id')
            ->leftJoin('course_lessons as l', 'l.id', '=', 'i.course_lesson_id')
            ->join('users as u', 'u.id', '=', 'w.user_id')
            ->where('i.course_id', $course->id)
            ->when(! $user->hasRole('super'), fn ($q) => $q->where('u.tenant_id', $user->tenant_id))
            ->orderByDesc('w.id')->limit(300)
            ->get(['w.*', 'i.title as item_title', 'l.title as lesson_title', 'u.name as student', 'u.admission_no'])
            ->map(fn ($w) => $this->row($w) + ['item' => $w->item_title, 'lesson' => $w->lesson_title, 'student' => $w->student, 'admission_no' => $w->admission_no]);
    }
}
