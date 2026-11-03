<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /** Madrasa users log in with email, phone or admission number. */
    public function login(Request $request)
    {
        $data = $request->validate([
            'login' => ['required', 'string', 'max:120'],
            'password' => ['required', 'string'],
            'device_name' => ['nullable', 'string', 'max:60'],
        ]);

        $user = User::query()
            ->where('email', $data['login'])
            ->orWhere('phone', $data['login'])
            ->orWhere('admission_no', $data['login'])
            ->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages(['login' => ['These details do not match our records.']]);
        }
        if ($user->tenant && ! $user->tenant->active) {
            throw ValidationException::withMessages(['login' => ['Your madrasa account is not active.']]);
        }

        return $this->issue($user, $data['device_name'] ?? 'app');
    }

    /** Guest sign-up: pick board/class and/or Noon Courses, no madrasa needed. */
    public function guest(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'age' => ['nullable', 'integer', 'between:3,99'],
            'parent_phone' => ['nullable', 'string', 'max:30'],
            'board_id' => ['nullable', 'exists:boards,id'],
            'class_id' => ['nullable', 'exists:school_classes,id'],
            'course_ids' => ['array'],
            'course_ids.*' => ['integer', 'exists:courses,id'],
            'device_name' => ['nullable', 'string', 'max:60'],
        ]);

        // Returning guest on the same phone keeps their progress.
        $user = ! empty($data['parent_phone']) ? User::where('phone', $data['parent_phone'])->where('role', 'guest')->first() : null;
        $user ??= new User(['role' => 'guest', 'password' => Str::random(32)]);
        $user->fill([
            'name' => $data['name'],
            'age' => $data['age'] ?? null,
            'phone' => $data['parent_phone'] ?? null,
            'board_id' => $data['board_id'] ?? null,
            'class_id' => $data['class_id'] ?? null,
        ])->save();

        $courses = Course::whereIn('id', $data['course_ids'] ?? [])->where('status', 'published')->get();
        foreach ($courses as $course) {
            $user->courses()->syncWithoutDetaching([
                $course->id => ['trial_ends_at' => $course->is_free ? null : now()->addDays(7)],
            ]);
        }

        return $this->issue($user, $data['device_name'] ?? 'app');
    }

    /** Guest enters a madrasa code → becomes a student of that tenant. */
    public function joinTenant(Request $request)
    {
        $data = $request->validate(['code' => ['required', 'string', 'exists:tenants,code']]);
        $user = $request->user();
        abort_unless($user->hasRole('guest'), 422, 'Only guest accounts can join a madrasa.');
        $tenant = Tenant::where('code', $data['code'])->where('active', true)->firstOrFail();
        $user->update(['tenant_id' => $tenant->id, 'role' => 'student']);
        return $user->fresh()->toApp();
    }

    public function me(Request $request)
    {
        return $request->user()->load('tenant')->toApp();
    }

    public function updateLearning(Request $request)
    {
        $data = $request->validate([
            'board_id' => ['nullable', 'exists:boards,id'],
            'class_id' => ['nullable', 'exists:school_classes,id'],
        ]);
        $request->user()->update($data);
        return $request->user()->fresh()->toApp();
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()?->delete();
        return response()->noContent();
    }

    private function issue(User $user, string $device): array
    {
        $user->load('tenant');
        return [
            'token' => $user->createToken($device, [$user->role])->plainTextToken,
            'user' => $user->toApp(),
        ];
    }
}
