<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeaveRequest extends Model
{
    protected $fillable = ['tenant_id', 'student_id', 'type', 'start_date', 'end_date', 'reason', 'status', 'reviewed_by', 'reviewed_at'];
    protected $casts = ['start_date' => 'date:Y-m-d', 'end_date' => 'date:Y-m-d', 'reviewed_at' => 'datetime'];

    public function student(): BelongsTo { return $this->belongsTo(User::class, 'student_id'); }

    public function days(): int { return $this->start_date->diffInDays($this->end_date) + 1; }
}
