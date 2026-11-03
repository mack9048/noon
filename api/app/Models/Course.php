<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Course extends Model
{
    protected $fillable = ['title', 'category', 'level', 'cover', 'status', 'is_free', 'teacher_id'];

    protected $casts = ['is_free' => 'boolean'];

    public function items(): HasMany
    {
        return $this->hasMany(CourseItem::class)->orderBy('position')->orderBy('id');
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

    /** Courses a user may see: guests/super see all published; madrasa users only those their tenant enabled. */
    public function scopeVisibleTo(Builder $q, User $user): Builder
    {
        $q->where('status', 'published');
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
            'status' => $this->status,
            'is_free' => $this->is_free,
            'teacher_name' => $this->teacher?->name,
            'lessons_count' => $this->items->count(),
            'items_count' => $this->items->count(),
            'enrolled' => (bool) $pivot,
            'progress' => $pivot?->progress,
            'next_live_at' => $nextLive?->starts_at?->format('D g:i A'),
        ];
    }
}
