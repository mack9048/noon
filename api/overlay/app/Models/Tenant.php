<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tenant extends Model
{
    protected $fillable = ['name', 'code', 'plan', 'leave_quota', 'active'];
    protected $casts = ['active' => 'boolean'];

    public function users(): HasMany { return $this->hasMany(User::class); }

    public function courses(): BelongsToMany
    {
        return $this->belongsToMany(Course::class)->withPivot(['enabled', 'teacher_id', 'class_ids']);
    }
}
