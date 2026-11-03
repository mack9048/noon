<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Board extends Model
{
    protected $fillable = ['code', 'name', 'meta'];

    public function classes(): HasMany
    {
        return $this->hasMany(SchoolClass::class)->orderBy('position');
    }
}
