<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Super admin: find any user and sign in as them ("Log in as") for support.
 * The token lasts 2 hours, is named after the super admin who made it,
 * and every use of this endpoint is written to the log.
 */
class ImpersonationController extends Controller
{
    public const PREFIX = 'impersonated-by:';

    public function users(Request $request)
    {
        $data = $request->validate([
            'q' => ['nullable', 'string', 'max:80'],
            'tenant_id' => ['nullable', 'integer'],
            'role' => ['nullable', 'in:admin,teacher,student,parent,guest'],
        ]);

        return User::query()->with('tenant')
            ->where('role', '!=', 'super')
            ->when($data['tenant_id'] ?? null, fn ($q, $t) => $q->where('tenant_id', $t))
            ->when($data['role'] ?? null, fn ($q, $r) => $q->where('role', $r))
            ->when($data['q'] ?? null, fn ($q, $s) => $q->where(fn ($w) => $w
                ->where('name', 'like', "%{$s}%")->orWhere('email', 'like', "%{$s}%")
                ->orWhere('admission_no', 'like', "%{$s}%")->orWhere('phone', 'like', "%{$s}%")))
            ->orderByRaw("CASE role WHEN 'admin' THEN 1 WHEN 'teacher' THEN 2 WHEN 'parent' THEN 3 WHEN 'student' THEN 4 ELSE 5 END")->orderBy('name')
            ->limit(200)->get()
            ->map(fn (User $u) => [
                'id' => $u->id, 'name' => $u->name, 'role' => $u->role,
                'login' => $u->email ?? $u->admission_no ?? $u->phone,
                'admission_no' => $u->admission_no,
                'tenant_id' => $u->tenant_id, 'tenant_name' => $u->tenant?->name, 'tenant_code' => $u->tenant?->code,
                'blocked' => (bool) $u->blocked,
            ]);
    }

    public function start(Request $request, User $user)
    {
        $super = $request->user();
        abort_if($user->role === 'super', 422, 'You cannot log in as another super admin.');
        abort_if($user->blocked, 422, 'This account is blocked. Unblock it first.');

        Log::warning('Super admin logged in as a user', [
            'super_id' => $super->id, 'super_email' => $super->email,
            'user_id' => $user->id, 'role' => $user->role, 'tenant_id' => $user->tenant_id, 'ip' => $request->ip(),
        ]);

        return [
            'token' => $user->createToken(self::PREFIX.$super->id, [$user->role], now()->addHours(2))->plainTextToken,
            'user' => $user->load('tenant')->toApp() + ['impersonated_by' => $super->name],
        ];
    }
}
