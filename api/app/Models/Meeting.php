<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** An institution meeting on Noon Live: all students (or staff, or everyone) together. */
class Meeting extends Model
{
    use BelongsToTenant;

    public const AUDIENCES = ['students', 'staff', 'everyone'];

    protected $fillable = ['tenant_id', 'title', 'notes', 'audience', 'starts_at', 'duration_min', 'started_at', 'ended_at', 'created_by'];

    protected $casts = ['starts_at' => 'datetime', 'started_at' => 'datetime', 'ended_at' => 'datetime', 'duration_min' => 'integer'];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** live: started and not ended · open: joining opens (15 min before the time) · scheduled · ended */
    public function state(): string
    {
        if ($this->ended_at) {
            return 'ended';
        }
        if ($this->started_at) {
            return 'live';
        }
        if ($this->starts_at && now()->gte($this->starts_at->copy()->subMinutes(15)) && now()->lte($this->starts_at->copy()->addMinutes($this->duration_min))) {
            return 'open';
        }

        return 'scheduled';
    }

    public function isFor(User $user): bool
    {
        if (in_array($user->role, ['admin', 'teacher'], true)) {
            return true;
        }

        return $this->audience !== 'staff';
    }

    public function toApp(User $user): array
    {
        return [
            'id' => $this->id, 'title' => $this->title, 'notes' => $this->notes, 'audience' => $this->audience,
            'starts_at' => $this->starts_at?->toIso8601String(), 'duration_min' => $this->duration_min,
            'state' => $this->state(), 'host' => $this->creator?->name,
            'can_host' => in_array($user->role, ['admin', 'teacher'], true),
            'joined' => (int) \DB::table('meeting_attendance')->where('meeting_id', $this->id)->count(),
        ];
    }
}
