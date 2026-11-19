<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** One repeating live class time of a live course, e.g. Mon–Fri at 19:00 for 60 minutes. */
class CourseLiveSlot extends Model
{
    protected $fillable = ['course_id', 'days', 'start_time', 'duration_min', 'title', 'position'];

    protected $casts = ['days' => 'array', 'duration_min' => 'integer'];

    public function toApp(): array
    {
        return ['id' => $this->id, 'days' => array_values(array_map('intval', $this->days ?? [])), 'start_time' => $this->start_time, 'duration_min' => $this->duration_min, 'title' => $this->title];
    }
}
