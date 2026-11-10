<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Lead extends Model
{
    use BelongsToTenant;

    public const STATUSES = ['new', 'contacted', 'interested', 'visit', 'applied', 'admitted', 'lost'];
    public const SOURCES = ['portal', 'whatsapp', 'call', 'walk_in', 'referral', 'social', 'other'];

    protected $fillable = ['tenant_id', 'campaign_id', 'student_name', 'parent_name', 'phone', 'email', 'class_label', 'source', 'status', 'follow_up_on', 'notes', 'admission_id'];

    protected $casts = ['notes' => 'array', 'follow_up_on' => 'date'];

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(AdmissionCampaign::class, 'campaign_id');
    }

    public function addNote(string $text, ?string $by = null): void
    {
        $this->notes = [...($this->notes ?? []), ['text' => $text, 'by' => $by, 'at' => now()->format('j M, g:i A')]];
    }

    public function toApp(): array
    {
        return [
            'id' => $this->id, 'student' => $this->student_name, 'parent' => $this->parent_name,
            'phone' => $this->phone, 'email' => $this->email, 'cls' => $this->class_label,
            'source' => $this->source, 'status' => $this->status,
            'follow_up_on' => $this->follow_up_on?->toDateString(),
            'overdue' => $this->follow_up_on && $this->follow_up_on->lt(today()) && ! in_array($this->status, ['admitted', 'lost'], true),
            'notes' => $this->notes ?? [],
            'campaign' => $this->campaign ? ['id' => $this->campaign->id, 'title' => $this->campaign->title] : null,
            'admission' => $this->admission_id ? Admission::withoutGlobalScopes()->find($this->admission_id)?->ref : null,
            'when' => $this->created_at?->diffForHumans() ?? '',
        ];
    }
}
