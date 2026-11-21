<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tenant extends Model
{
    protected $fillable = ['name', 'logo_path', 'tagline', 'website', 'phone', 'email', 'address', 'registration_no', 'affiliation_no', 'principal', 'established',
        'academic_year', 'default_fee', 'currency', 'country', 'dial_code', 'timezone', 'code', 'plan', 'leave_quota', 'active'];

    /** Countries an institution can be in (fees currency, phone code, time zone); India and the GCC first. */
    public const COUNTRIES = [
        'IN' => ['India', 'INR', '+91', 'Asia/Kolkata'],
        'AE' => ['United Arab Emirates', 'AED', '+971', 'Asia/Dubai'],
        'SA' => ['Saudi Arabia', 'SAR', '+966', 'Asia/Riyadh'],
        'QA' => ['Qatar', 'QAR', '+974', 'Asia/Qatar'],
        'KW' => ['Kuwait', 'KWD', '+965', 'Asia/Kuwait'],
        'OM' => ['Oman', 'OMR', '+968', 'Asia/Muscat'],
        'BH' => ['Bahrain', 'BHD', '+973', 'Asia/Bahrain'],
        'GB' => ['United Kingdom', 'GBP', '+44', 'Europe/London'],
        'US' => ['United States', 'USD', '+1', 'America/New_York'],
    ];

    public const CURRENCIES = ['INR' => '₹', 'AED' => 'AED', 'SAR' => 'SAR', 'QAR' => 'QAR', 'KWD' => 'KWD', 'OMR' => 'OMR', 'BHD' => 'BHD', 'GBP' => '£', 'USD' => '$'];

    public function logoUrl(): ?string
    {
        return $this->logo_path ? \Illuminate\Support\Facades\Storage::disk('public')->url($this->logo_path) : null;
    }

    protected $casts = ['active' => 'boolean'];

    protected $appends = ['logo_url'];

    protected $hidden = ['logo_path'];

    public function getLogoUrlAttribute(): ?string
    {
        return $this->logoUrl();
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function courses(): BelongsToMany
    {
        return $this->belongsToMany(Course::class)->withPivot(['enabled', 'teacher_id', 'class_ids']);
    }
}
