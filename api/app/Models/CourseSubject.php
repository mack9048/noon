<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

/** An optional group of lessons inside a course (eg. "Grammar", "Reading"). */
class CourseSubject extends Model
{
    protected $fillable = ['course_id', 'title', 'thumbnail_path', 'position'];

    public function toApp(): array
    {
        return ['id' => $this->id, 'title' => $this->title, 'thumbnail_url' => $this->thumbnail_path ? Storage::disk('public')->url($this->thumbnail_path) : null];
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function lessons(): HasMany
    {
        return $this->hasMany(CourseLesson::class)->orderBy('position')->orderBy('id');
    }
}
