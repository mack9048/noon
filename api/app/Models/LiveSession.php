<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LiveSession extends Model
{
    use BelongsToTenant;

    protected $fillable = ['tenant_id', 'batch_id', 'title', 'kind', 'starts_at', 'duration_min', 'meet_url', 'notes', 'created_by'];

    protected $casts = ['starts_at' => 'datetime'];

    public function batch(): BelongsTo
    {
        return $this->belongsTo(Batch::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function toApp(): array
    {
        $end = $this->starts_at->copy()->addMinutes($this->duration_min);
        $state = now()->gt($end) ? 'ended' : (now()->gte($this->starts_at->copy()->subMinutes(15)) ? 'live' : 'upcoming');

        return [
            'id' => $this->id, 'title' => $this->title, 'kind' => $this->kind,
            'starts_at' => $this->starts_at->toIso8601String(), 'ends_at' => $end->toIso8601String(),
            'duration_min' => $this->duration_min, 'meet_url' => $this->meet_url, 'notes' => $this->notes,
            'batch' => $this->batch ? ['id' => $this->batch->id, 'name' => $this->batch->name] : null,
            'host' => $this->creator?->name, 'state' => $state,
        ];
    }
}
