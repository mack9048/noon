<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CourseItem extends Model
{
    protected $fillable = ['course_id', 'kind', 'title', 'meta', 'url', 'starts_at', 'position'];
    protected $casts = ['starts_at' => 'datetime'];

    public function course(): BelongsTo { return $this->belongsTo(Course::class); }
}
