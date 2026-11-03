<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Assessment extends Model
{
    protected $fillable = ['tenant_id', 'course_id', 'subject_id', 'type', 'title', 'description', 'due_at', 'max_marks', 'created_by'];

    protected $casts = ['due_at' => 'datetime', 'max_marks' => 'integer'];

    public function results(): HasMany
    {
        return $this->hasMany(AssessmentResult::class);
    }

    /** Noon-made ones plus the ones the user's own madrasa made. */
    public function scopeVisibleTo(Builder $q, User $user): Builder
    {
        return $q->where(fn ($w) => $w->whereNull('tenant_id')->when($user->tenant_id, fn ($o) => $o->orWhere('tenant_id', $user->tenant_id)));
    }
}
