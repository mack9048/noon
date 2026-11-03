<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssessmentResult extends Model
{
    protected $fillable = ['assessment_id', 'student_id', 'marks', 'remarks', 'marked_by'];

    protected $casts = ['marks' => 'float'];

    public function assessment(): BelongsTo
    {
        return $this->belongsTo(Assessment::class);
    }
}
