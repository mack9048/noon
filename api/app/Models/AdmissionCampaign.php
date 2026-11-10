<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AdmissionCampaign extends Model
{
    use BelongsToTenant;

    protected $fillable = ['tenant_id', 'code', 'title', 'academic_year', 'classes', 'seats', 'opens_on', 'closes_on', 'description', 'fee_note', 'status'];

    protected $casts = ['classes' => 'array', 'opens_on' => 'date', 'closes_on' => 'date'];

    public function leads(): HasMany
    {
        return $this->hasMany(Lead::class, 'campaign_id');
    }

    public function admissions(): HasMany
    {
        return $this->hasMany(Admission::class, 'campaign_id');
    }

    public function isOpen(): bool
    {
        return $this->status === 'open'
            && (! $this->opens_on || $this->opens_on->lte(today()))
            && (! $this->closes_on || $this->closes_on->gte(today()));
    }

    public function toApp(): array
    {
        $admitted = $this->admissions_admitted_count ?? $this->admissions()->where('status', 'admitted')->count();

        return [
            'id' => $this->id, 'code' => $this->code, 'title' => $this->title, 'year' => $this->academic_year,
            'classes' => $this->classes ?? [], 'seats' => $this->seats,
            'opens_on' => $this->opens_on?->toDateString(), 'closes_on' => $this->closes_on?->toDateString(),
            'description' => $this->description, 'fee_note' => $this->fee_note,
            'status' => $this->status, 'is_open' => $this->isOpen(),
            'leads' => $this->leads_count ?? $this->leads()->count(),
            'applications' => $this->admissions_count ?? $this->admissions()->count(),
            'admitted' => $admitted,
            'seats_left' => $this->seats ? max(0, $this->seats - $admitted) : null,
        ];
    }
}
