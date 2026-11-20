<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SchoolClass extends Model
{
    /** Madrasa Support mediums: Malayalam and English. */
    public const MEDIUMS = ['ml', 'en'];

    protected $table = 'school_classes';

    protected $fillable = ['board_id', 'medium', 'label', 'position'];

    public function board(): BelongsTo
    {
        return $this->belongsTo(Board::class);
    }

    public function subjects(): HasMany
    {
        return $this->hasMany(Subject::class, 'class_id')->orderBy('position');
    }
}
