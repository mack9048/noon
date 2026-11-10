<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Staff set a new password for someone who forgot theirs.
 * Madrasa admins: people in their own madrasa. Super admins: anyone except another super admin.
 * The person is signed out everywhere and every change is logged.
 */
class PasswordAdminController extends Controller
{
    /** Admin: the people of my madrasa, for the People screen. */
    public function people(Request $request)
    {
        $data = $request->validate([
            'q' => ['nullable', 'string', 'max:80'],
            'role' => ['nullable', 'in:admin,teacher,student,parent'],
        ]);

        return User::query()->where('tenant_id', $request->user()->tenant_id)
            ->when($data['role'] ?? null, fn ($q, $r) => $q->where('role', $r))
            ->when($data['q'] ?? null, fn ($q, $s) => $q->where(fn ($w) => $w
                ->where('name', 'like', "%{$s}%")->orWhere('email', 'like', "%{$s}%")
                ->orWhere('admission_no', 'like', "%{$s}%")->orWhere('phone', 'like', "%{$s}%")))
            ->orderByRaw("CASE role WHEN 'admin' THEN 1 WHEN 'teacher' THEN 2 WHEN 'parent' THEN 3 ELSE 4 END")->orderBy('name')
            ->limit(300)->get()
            ->map(fn (User $u) => [
                'id' => $u->id, 'name' => $u->name, 'role' => $u->role,
                'login' => $u->email ?? $u->admission_no ?? $u->phone,
                'email' => $u->email, 'phone' => $u->phone, 'admission_no' => $u->admission_no,
                'tenant_id' => $u->tenant_id, 'blocked' => (bool) $u->blocked,
            ]);
    }

    public function adminSet(Request $request, User $user)
    {
        abort_unless($user->tenant_id && $user->tenant_id === $request->user()->tenant_id, 404);
        abort_if($user->role === 'super', 403);

        return $this->set($request, $user);
    }

    public function superSet(Request $request, User $user)
    {
        abort_if($user->role === 'super' && $user->id !== $request->user()->id, 403, 'You cannot change another super admin\'s password.');

        return $this->set($request, $user);
    }

    private function set(Request $request, User $user)
    {
        $data = $request->validate(['password' => ['required', 'string', 'min:8', 'max:255']]);
        $user->forceFill(['password' => $data['password']])->save();
        $user->tokens()->delete();
        Log::warning('Password set by staff', ['by' => $request->user()->id, 'by_role' => $request->user()->role, 'user_id' => $user->id, 'ip' => $request->ip()]);

        return ['message' => "New password saved for {$user->name}."];
    }
}
