<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Batch extends Model
{
    use BelongsToTenant;

    protected $fillable = ['tenant_id', 'name', 'board', 'class_label', 'days', 'start_time', 'seats', 'class_teacher_id', 'subject_teachers'];

    protected $casts = ['days' => 'array', 'subject_teachers' => 'array'];

    public function students(): BelongsToMany
    {
        return $this->belongsToMany(User::class);
    }

    public function classTeacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'class_teacher_id');
    }

    public function toApp(): array
    {
        $order = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
        $days = collect($this->days ?? [])->sortBy(fn ($d) => array_search($d, $order, true))->values();

        return [
            'id' => $this->id,
            'cls' => $this->class_label,
            'name' => $this->name,
            'board' => $this->board,
            'when' => $days->isEmpty() ? $this->start_time : "{$days->first()}–{$days->last()} {$this->start_time}",
            'students' => $this->students_count ?? $this->students()->count(),
            'teachers' => collect($this->subject_teachers ?? [])->unique()->count(),
            'subjects' => count($this->subject_teachers ?? []),
            'ct' => $this->classTeacher?->name ?? '—',
        ];
    }
}
