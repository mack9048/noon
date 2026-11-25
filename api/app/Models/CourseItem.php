<?php

namespace App\Models;

use App\Support\Review;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CourseItem extends Model
{
    /** Teachers' unapproved content is hidden from students (App\Support\Review). */
    protected static function booted(): void
    {
        static::addGlobalScope(new Review);
    }

    protected $fillable = ['course_id', 'course_lesson_id', 'kind', 'title', 'meta', 'url', 'body', 'file_path', 'file_size', 'thumbnail_path', 'starts_at', 'position', 'review_state', 'replaces_id', 'submitted_by'];

    protected $hidden = ['file_path'];

    protected $casts = ['starts_at' => 'datetime'];

    public const KINDS = ['live', 'video', 'audio', 'pdf', 'test', 'html', 'note', 'image', 'link'];

    public function lesson(): BelongsTo
    {
        return $this->belongsTo(CourseLesson::class, 'course_lesson_id');
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }
}
