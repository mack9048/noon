<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Fee extends Model
{
    use BelongsToTenant;

    public const METHODS = ['cash', 'upi', 'bank', 'card'];

    protected $fillable = ['tenant_id', 'student_id', 'title', 'month', 'amount', 'due_date', 'status', 'paid_amount', 'paid_at', 'method', 'receipt_no', 'note', 'created_by'];

    protected function casts(): array
    {
        return ['amount' => 'decimal:2', 'paid_amount' => 'decimal:2', 'due_date' => 'date', 'paid_at' => 'datetime'];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function overdueDays(): int
    {
        return $this->status === 'due' && $this->due_date->lt(today()) ? (int) $this->due_date->diffInDays(today()) : 0;
    }

    public function toApp(): array
    {
        $s = $this->student;

        return [
            'id' => $this->id, 'title' => $this->title, 'month' => $this->month,
            'amount' => (float) $this->amount, 'due_date' => $this->due_date->toDateString(),
            'status' => $this->status, 'overdue_days' => $this->overdueDays(),
            'paid_amount' => $this->paid_amount !== null ? (float) $this->paid_amount : null,
            'paid_at' => $this->paid_at?->toDateString(), 'method' => $this->method, 'receipt_no' => $this->receipt_no, 'note' => $this->note,
            'student' => $s ? [
                'id' => $s->id, 'name' => $s->name, 'admission_no' => $s->admission_no, 'cls' => $s->schoolClass?->label,
                'parent' => $s->parent?->name, 'parent_phone' => $s->parent?->phone,
            ] : null,
        ];
    }
}
