<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    public const ROLES = ['guest', 'student', 'parent', 'teacher', 'admin', 'super'];

    protected $fillable = [
        'tenant_id', 'name', 'role', 'email', 'phone', 'admission_no', 'age', 'board_id', 'class_id', 'password',
    ];

    /** Mirror column defaults so a new model behaves like a loaded one. */
    protected $attributes = ['role' => 'student', 'blocked' => false];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'phone_verified_at' => 'datetime',
            'password' => 'hashed',
            'blocked' => 'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function board(): BelongsTo
    {
        return $this->belongsTo(Board::class);
    }

    public function schoolClass(): BelongsTo
    {
        return $this->belongsTo(SchoolClass::class, 'class_id');
    }

    public function courses(): BelongsToMany
    {
        return $this->belongsToMany(Course::class)->withPivot(['progress', 'trial_ends_at'])->withTimestamps();
    }

    public function conversations(): BelongsToMany
    {
        return $this->belongsToMany(Conversation::class)->withPivot('last_read_message_id');
    }

    public function hasRole(string ...$roles): bool
    {
        return in_array($this->role, $roles, true);
    }

    /** Shape returned to the app (matches app/src/lib/types.ts → User). */
    public function toApp(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'role' => $this->role,
            'tenant_id' => $this->tenant_id,
            'tenant_name' => $this->tenant?->name,
            'board_id' => $this->board_id,
            'class_id' => $this->class_id,
            'avatar_initial' => mb_substr($this->name, 0, 1),
        ];
    }
}
