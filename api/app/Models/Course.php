<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Course extends Model
{
    use SoftDeletes;

    protected $fillable = ['title', 'description', 'category', 'board_id', 'syllabus', 'class_id', 'thumbnail_path', 'trial_lessons', 'format', 'live_provider', 'meet_url', 'live_timezone', 'level', 'cover', 'logo_url', 'status', 'is_free', 'price', 'offer_price', 'price_period', 'trial_days', 'free_for_subscribers', 'teacher_id', 'tenant_id', 'visibility', 'review_note'];

    protected $casts = ['is_free' => 'boolean', 'free_for_subscribers' => 'boolean'];

    public function liveSlots(): HasMany
    {
        return $this->hasMany(CourseLiveSlot::class)->orderBy('position')->orderBy('id');
    }

    public function board(): BelongsTo
    {
        return $this->belongsTo(Board::class);
    }

    public function schoolClass(): BelongsTo
    {
        return $this->belongsTo(SchoolClass::class, 'class_id');
    }

    /**
     * What a user may open: everything when the course is free, paid / given by the institution, or the user is staff;
     * otherwise the free trial: the first N lessons of a recorded course, or the first N days of a live course.
     *
     * @return array{paid: bool, trial_over: bool, unlocked: ?array<int>} unlocked = lesson ids open (null = all)
     */
    public function access(?User $user): array
    {
        if (! $user) {
            return ['paid' => false, 'trial_over' => false, 'unlocked' => []];
        }
        $pivot = $this->relationLoaded('students') ? $this->students->firstWhere('id', $user->id)?->pivot : $user->courses()->whereKey($this->id)->first()?->pivot;
        $staff = $user->hasRole('super') || $this->teacher_id === $user->id;
        $paid = $staff || $this->is_free || ($pivot && $pivot->paid_at);
        if ($paid) {
            return ['paid' => true, 'trial_over' => false, 'unlocked' => null];
        }
        if ($this->isLive()) {
            $over = ! $pivot || ($pivot->trial_ends_at && now()->gt($pivot->trial_ends_at));

            return ['paid' => false, 'trial_over' => (bool) $over, 'unlocked' => null];
        }
        // Lessons in the order students see them: outside a subject first, then subject by subject.
        $this->loadMissing(['lessons', 'subjects']);
        $pos = $this->subjects->pluck('id')->flip();
        $ordered = $this->lessons->sortBy(fn ($l) => [$l->course_subject_id && $pos->has($l->course_subject_id) ? 1 + $pos[$l->course_subject_id] : 0, $l->position, $l->id])->values();
        $free = $ordered->take(max(0, (int) ($this->trial_lessons ?? 2)))->pluck('id')
            ->merge($ordered->where('free_preview', true)->pluck('id'))->unique()->values()->all();

        return ['paid' => false, 'trial_over' => $pivot !== null && count($free) < $ordered->count(), 'unlocked' => $free];
    }

    public function isLive(): bool
    {
        return $this->format === 'live';
    }

    public function items(): HasMany
    {
        return $this->hasMany(CourseItem::class)->orderBy('position')->orderBy('id');
    }

    public function subjects(): HasMany
    {
        return $this->hasMany(CourseSubject::class)->orderBy('position')->orderBy('id');
    }

    public function lessons(): HasMany
    {
        return $this->hasMany(CourseLesson::class)->orderBy('position')->orderBy('id');
    }

    public function madrasa(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function students(): BelongsToMany
    {
        return $this->belongsToMany(User::class)->withPivot(['progress', 'trial_ends_at', 'paid_at', 'enrolled_by']);
    }

    public function tenants(): BelongsToMany
    {
        return $this->belongsToMany(Tenant::class)->withPivot(['enabled', 'teacher_id', 'class_ids']);
    }

    /** Courses a user may see: guests/super see all published; institution users only those their tenant enabled. */
    public function scopeVisibleTo(Builder $q, User $user): Builder
    {
        $q->where('status', 'published');
        if (! $user->tenant_id && ! $user->hasRole('super')) {
            // Guests never see a course an institution kept for its own students.
            $q->where('visibility', 'all');
        }
        if ($user->tenant_id && ! $user->hasRole('super')) {
            $q->whereHas('tenants', fn ($t) => $t->where('tenants.id', $user->tenant_id)->where('course_tenant.enabled', true));
        }

        return $q;
    }

    public function toApp(?User $user = null): array
    {
        $pivot = $user ? $this->students->firstWhere('id', $user->id)?->pivot : null;
        $nextLive = $this->items->where('kind', 'live')->filter(fn ($i) => $i->starts_at && $i->starts_at->isFuture())->sortBy('starts_at')->first();
        $live = $this->isLive() ? (\App\Support\LiveSchedule::upcoming($this, 1)[0] ?? null) : null;

        return [
            'id' => $this->id,
            'title' => $this->title,
            'category' => $this->category,
            'level' => $this->level,
            'cover' => $this->cover,
            'logo_url' => $this->logo_url,
            'thumbnail_url' => $this->thumbnail_path ? \Illuminate\Support\Facades\Storage::disk('public')->url($this->thumbnail_path) : null,
            // Madrasa Support courses are for one board / syllabus / class.
            'board_id' => $this->board_id, 'syllabus' => $this->syllabus, 'class_id' => $this->class_id,
            'madrasa_label' => $this->board_id ? trim(implode(' · ', array_filter([$this->board?->name, $this->syllabus ? (Board::SYLLABI[$this->syllabus] ?? null) : null, $this->schoolClass ? 'Class '.$this->schoolClass->label : null]))) : null,
            'trial_lessons' => (int) ($this->trial_lessons ?? 2),
            'description' => $this->description,
            'price' => $this->price,
            'offer_price' => $this->offer_price,
            'status' => $this->status,
            'is_free' => $this->is_free,
            'price_period' => $this->price_period ?? 'once',
            'trial_days' => $this->trial_days ?? 7,
            'free_for_subscribers' => (bool) ($this->free_for_subscribers ?? true),
            'teacher_name' => $this->teacher?->name,
            // Built with lessons: count lessons. Older courses: each item was a lesson.
            'lessons_count' => $this->relationLoaded('lessons') && $this->lessons->count() ? $this->lessons->count() : $this->items->count(),
            'items_count' => $this->items->count(),
            'enrolled' => (bool) $pivot,
            'progress' => $pivot?->progress,
            'next_live_at' => $this->isLive()
                ? ($live ? \Illuminate\Support\Carbon::parse($live['starts_at'])->format('D g:i A') : null)
                : $nextLive?->starts_at?->format('D g:i A'),
            // Live-only courses: regular live classes instead of lessons.
            'format' => $this->format ?? 'recorded',
            'live_provider' => $this->live_provider ?? 'meet',
            'live_summary' => $this->isLive() ? \App\Support\LiveSchedule::summary($this) : null,
            'live_now' => $live && $live['state'] === 'live',
        ];
    }
}
