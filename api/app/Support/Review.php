<?php

namespace App\Support;

use App\Models\Course;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

/**
 * Course editing rights and the approval of teachers' changes.
 *
 * - Super admin: every course, changes apply at once.
 * - Institution admin: their institution's courses once Noon Learn approved them, changes apply at once.
 * - Teacher: courses they teach; their new or changed lessons and content wait for the admin's approval.
 *
 * Students never see content that is still waiting ("new"); course editors do (see showAll()).
 */
class Review implements Scope
{
    private static bool $all = false;

    public static function showAll(bool $on): void
    {
        self::$all = $on;
    }

    public function apply(Builder $builder, Model $model): void
    {
        if (! self::$all) {
            $builder->where(fn ($q) => $q->whereNull($model->qualifyColumn('review_state'))->orWhere($model->qualifyColumn('review_state'), '!=', 'new'));
        }
    }

    /** full = edit directly · review = changes wait for approval · null = no access. */
    public static function mode(User $user, Course $course): ?string
    {
        if ($user->hasRole('super')) {
            return 'full';
        }
        if ($user->hasRole('admin') && $course->tenant_id && $course->tenant_id === $user->tenant_id) {
            return in_array($course->status, ['pending', 'changes', 'rejected'], true) ? null : 'full';
        }
        if ($user->hasRole('teacher') && $course->teacher_id === $user->id && (! $course->tenant_id || $course->tenant_id === $user->tenant_id)) {
            return 'review';
        }

        return null;
    }

    /** Who approves a teacher's changes: the super admin, or the admin of the institution that owns the course. */
    public static function canApprove(User $user, Course $course): bool
    {
        return $user->hasRole('super') || ($user->hasRole('admin') && $course->tenant_id && $course->tenant_id === $user->tenant_id);
    }
}
