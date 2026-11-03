<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Lesson extends Model
{
    protected $fillable = [
        'subject_id', 'position', 'title', 'video_url', 'video_duration', 'audio_url', 'audio_duration', 'note_pdf_url',
    ];
}
