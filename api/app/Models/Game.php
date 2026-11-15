<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class Game extends Model
{
    public const MODES = ['solo', 'group'];
    public const AUDIENCES = ['all', 'students', 'guests'];

    protected $fillable = ['title', 'description', 'html_path', 'html_size', 'thumbnail_url', 'mode', 'audience', 'tenant_ids', 'age_group', 'status', 'position', 'plays', 'created_by'];

    protected function casts(): array
    {
        return ['tenant_ids' => 'array', 'position' => 'integer', 'plays' => 'integer', 'html_size' => 'integer'];
    }

    /** Live games this person may play, in display order. */
    public function scopeVisibleTo(Builder $q, User $user): Builder
    {
        $q->where('status', 'live')->orderBy('position')->orderBy('id');
        if ($user->hasRole('super')) {
            return $q;
        }
        if (! $user->tenant_id) {
            return $q->whereIn('audience', ['all', 'guests']);
        }

        return $q->whereIn('audience', ['all', 'students'])
            ->where(fn ($w) => $w->whereNull('tenant_ids')->orWhereJsonContains('tenant_ids', $user->tenant_id));
    }

    public function isVisibleTo(User $user): bool
    {
        return static::query()->whereKey($this->id)->visibleTo($user)->exists();
    }

    public function toApp(bool $admin = false): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'thumbnail_url' => $this->thumbnail_url,
            'mode' => $this->mode,
            'age_group' => $this->age_group,
            'plays' => $this->plays,
        ] + ($admin ? [
            'audience' => $this->audience,
            'tenant_ids' => $this->tenant_ids ?? [],
            'status' => $this->status,
            'position' => $this->position,
            'html_size' => $this->html_size,
            'updated' => $this->updated_at?->diffForHumans(),
        ] : []);
    }
}
