<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** One class of a live course. It can be created without a date and scheduled later. */
class CourseLiveClass extends Model
{
    protected $fillable = ['course_id', 'position', 'title', 'notes', 'starts_at', 'duration_min'];

    protected $casts = ['starts_at' => 'datetime', 'duration_min' => 'integer'];

    public function toApp(): array
    {
        $end = $this->starts_at?->copy()->addMinutes($this->duration_min);
        $state = ! $this->starts_at ? 'unscheduled' : (now()->gt($end) ? 'done' : (now()->gte($this->starts_at->copy()->subMinutes(\App\Support\LiveSchedule::OPEN_BEFORE)) ? 'live' : 'upcoming'));

        return ['id' => $this->id, 'position' => $this->position, 'title' => $this->title, 'notes' => $this->notes,
            'starts_at' => $this->starts_at?->toIso8601String(), 'duration_min' => $this->duration_min, 'state' => $state];
    }
}
