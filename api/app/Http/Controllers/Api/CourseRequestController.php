<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Course;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

/**
 * Courses made by madrasa admins go to Noon Learn (super admin) for approval.
 * Also: course logo upload for super admin and for the madrasa that owns a course.
 */
class CourseRequestController extends Controller
{
    /** POST /admin/courses — a madrasa admin creates a course; it waits for approval. */
    public function store(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'title' => ['required', 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:500'],
            'category' => ['required', 'string', 'max:60'],
            'level' => ['nullable', 'string', 'max:30'],
            'cover' => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'visibility' => ['required', Rule::in(['all', 'madrasa'])],
            'is_free' => ['boolean'],
            'price' => ['nullable', 'integer', 'min:0', 'max:1000000'],
            'offer_price' => ['nullable', 'integer', 'min:0', 'max:1000000'],
            'lessons' => ['nullable', 'array', 'max:200'],
            'lessons.*' => ['string', 'max:160'],
        ]);
        $course = Course::create(collect($data)->except('lessons')->all() + ['tenant_id' => $user->tenant_id, 'status' => 'pending', 'level' => $data['level'] ?? 'Beginner']);
        foreach ($data['lessons'] ?? [] as $i => $title) {
            $course->items()->create(['kind' => 'video', 'title' => $title, 'position' => $i + 1]);
        }

        return response()->json($this->row($course->load(['items', 'madrasa'])), 201);
    }

    /** GET /super/approvals — courses from madrasas (waiting first). */
    public function index()
    {
        return Course::with(['items', 'madrasa', 'teacher'])->whereNotNull('tenant_id')
            ->orderByRaw("case status when 'pending' then 0 when 'changes' then 1 else 2 end")->latest()->limit(200)->get()
            ->map(fn (Course $c) => $this->row($c));
    }

    /** PATCH /super/approvals/{course} — approve, ask for changes or reject. */
    public function decide(Request $request, Course $course)
    {
        abort_unless($course->tenant_id, 404);
        $data = $request->validate(['status' => ['required', Rule::in(['approved', 'changes', 'rejected'])], 'note' => ['nullable', 'string', 'max:500']]);
        $course->update(['status' => $data['status'] === 'approved' ? 'published' : $data['status'], 'review_note' => $data['note'] ?? null]);
        if ($data['status'] === 'approved') {
            // Switch it on for the madrasa that made it.
            $course->tenants()->syncWithoutDetaching([$course->tenant_id => ['enabled' => true]]);
        }

        return $this->row($course->load(['items', 'madrasa']));
    }

    /** POST /super/courses/{course}/logo and /admin/courses/{course}/logo (own courses only). */
    public function logo(Request $request, Course $course)
    {
        $user = $request->user();
        abort_unless($user->hasRole('super') || ($course->tenant_id && $course->tenant_id === $user->tenant_id), 403);
        $request->validate(['logo' => ['required', 'image', 'mimes:png,jpg,jpeg,webp', 'max:2048', 'dimensions:min_width=128,min_height=128']]);
        if ($course->logo_url && str_contains($course->logo_url, '/storage/')) {
            Storage::disk('public')->delete(str_replace(Storage::disk('public')->url(''), '', $course->logo_url));
        }
        $course->update(['logo_url' => Storage::disk('public')->url($request->file('logo')->store("courses/{$course->id}", 'public'))]);

        return ['logo_url' => $course->logo_url];
    }

    private function row(Course $c): array
    {
        $status = ['pending' => 'waiting', 'published' => 'approved'][$c->status] ?? $c->status;

        return [
            'id' => $c->id,
            'title' => $c->title,
            'category' => $c->category,
            'madrasa' => $c->madrasa?->name ?? 'Noon Learn',
            'when' => $c->created_at?->diffForHumans() ?? '',
            'tags' => array_values(array_filter([$c->category, $c->items->count().' items', $c->level, $c->visibility === 'madrasa' ? 'My madrasa only' : 'All Noon Learn'])),
            'status' => $status,
            'logo_url' => $c->logo_url,
            'note' => $c->review_note,
        ];
    }
}
