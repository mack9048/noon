<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** One question and answer for Nooni's free mode. */
class NooniFaq extends Model
{
    public const AUDIENCES = ['all', 'student', 'guest', 'teacher', 'admin'];

    protected $fillable = ['audience', 'question', 'keywords', 'answer', 'answer_ml', 'open', 'position', 'active'];

    protected $casts = ['active' => 'boolean'];
}
