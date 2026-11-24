<?php

namespace App\Models;

use App\Support\Review;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** One lesson of a course; holds its content (videos, audios, PDFs, HTML, notes…) in order. */
class CourseLesson extends Model
{
    /** Teachers' unapproved content is hidden from students (App\Support\Review). */
    protected static function booted(): void
    {
        static::addGlobalScope(new Review);
    }

    protected $fillable = ['course_id', 'course_subject_id', 'title', 'description', 'duration', 'free_preview', 'position', 'review_state', 'pending', 'submitted_by'];

    protected $casts = ['free_preview' => 'boolean', 'pending' => 'array'];

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
