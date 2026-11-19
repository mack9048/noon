<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Course extends Model
{
    protected $fillable = ['title', 'description', 'category', 'level', 'cover', 'logo_url', 'status', 'is_free', 'price', 'offer_price', 'price_period', 'trial_days', 'free_for_subscribers', 'teacher_id', 'tenant_id', 'visibility', 'review_note'];

    protected $casts = ['is_free' => 'boolean', 'free_for_subscribers' => 'boolean'];

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
        return $this->belongsToMany(User::class)->withPivot(['progress', 'trial_ends_at']);
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

        return [
            'id' => $this->id,
            'title' => $this->title,
            'category' => $this->category,
            'level' => $this->level,
            'cover' => $this->cover,
            'logo_url' => $this->logo_url,
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
            'next_live_at' => $nextLive?->starts_at?->format('D g:i A'),
        ];
    }
}
