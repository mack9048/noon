<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Message extends Model
{
    protected $fillable = ['conversation_id', 'user_id', 'kind', 'body', 'file_path'];

    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}
