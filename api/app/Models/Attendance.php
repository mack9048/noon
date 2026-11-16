<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Attendance extends Model
{
    use BelongsToTenant;

    public const STATUSES = ['present', 'absent', 'late', 'leave'];

    protected $table = 'attendance';

    protected $fillable = ['tenant_id', 'student_id', 'batch_id', 'date', 'status', 'note', 'marked_by'];

    protected function casts(): array
    {
        return ['date' => 'date'];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }
}
