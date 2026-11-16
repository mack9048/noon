<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** One website page's edits: {fields: {key: value}, lists: {key: [{src, fields}]}}. Not tenant-scoped. */
class SitePage extends Model
{
    protected $fillable = ['page', 'draft', 'published', 'updated_by', 'published_at'];

    protected function casts(): array
    {
        return ['draft' => 'array', 'published' => 'array', 'published_at' => 'datetime'];
    }

    public function hasUnpublished(): bool
    {
        return json_encode($this->draft ?? []) !== json_encode($this->published ?? []);
    }
}
