<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Board extends Model
{
    protected $fillable = ['code', 'name', 'full_name', 'meta', 'logo_path', 'position', 'active'];

    protected $casts = ['active' => 'boolean'];

    public const SYLLABI = ['general' => 'General Madrasa Syllabus', 'english' => 'English Medium Madrasa Syllabus'];

    public function toApp(): array
    {
        return [
            'id' => $this->id, 'code' => $this->code, 'name' => $this->name, 'full_name' => $this->full_name, 'meta' => $this->meta,
            'logo_url' => $this->logo_path ? \Illuminate\Support\Facades\Storage::disk('public')->url($this->logo_path) : null,
            'active' => (bool) $this->active, 'position' => (int) $this->position,
        ];
    }

    public function classes(): HasMany
    {
        return $this->hasMany(SchoolClass::class)->orderBy('position');
    }
}
