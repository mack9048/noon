<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class StudyTool extends Model
{
    protected $fillable = ['type', 'title', 'file_path', 'is_new', 'status', 'board_id', 'views'];
    protected $casts = ['is_new' => 'boolean'];
    protected $appends = ['file_url'];
    protected $hidden = ['file_path'];

    public function getFileUrlAttribute(): ?string
    {
        return $this->file_path ? Storage::disk('public')->url($this->file_path) : null;
    }
}
