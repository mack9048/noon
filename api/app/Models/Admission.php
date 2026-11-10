<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

class Admission extends Model
{
    use BelongsToTenant;

    protected $fillable = ['tenant_id', 'campaign_id', 'email', 'student_id', 'ref', 'student_name', 'gender', 'dob', 'board', 'class_label', 'parent_name', 'relation', 'phone', 'city', 'prev_madrasa', 'preferred_time', 'docs', 'status', 'timeline'];

    protected $casts = ['dob' => 'date', 'docs' => 'array', 'timeline' => 'array'];

    /** Shape the app uses (app/src/lib/admissions.ts → Application). */
    public function toApp(): array
    {
        return [
            'id' => $this->ref,
            'name' => $this->student_name,
            'gender' => $this->gender,
            'dob' => $this->dob?->format('j M Y') ?? '—',
            'age' => $this->dob ? (int) $this->dob->diffInYears(now()) : 0,
            'board' => $this->board,
            'cls' => $this->class_label,
            'parent' => $this->parent_name,
            'relation' => $this->relation,
            'phone' => $this->phone,
            'email' => $this->email,
            'city' => $this->city ?? '—',
            'prevMadrasa' => $this->prev_madrasa,
            'time' => $this->preferred_time,
            'docs' => array_merge(['birth' => false, 'tc' => false, 'photo' => false], $this->docs ?? []),
            'status' => $this->status,
            'when' => $this->created_at?->diffForHumans() ?? '',
            'timeline' => $this->timeline ?? [],
            'student_id' => $this->student_id,
            'campaign_id' => $this->campaign_id,
        ];
    }
}
