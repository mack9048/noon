<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** One lesson of a course; holds its content (videos, audios, PDFs, HTML, notes…) in order. */
class CourseLesson extends Model
{
    protected $fillable = ['course_id', 'course_subject_id', 'title', 'description', 'duration', 'free_preview', 'position'];

    protected $casts = ['free_preview' => 'boolean'];

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(CourseSubject::class, 'course_subject_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(CourseItem::class)->orderBy('position')->orderBy('id');
    }
}
