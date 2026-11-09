<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Tenant;
use App\Models\User;
use App\Services\Auth\OtpService;
use App\Support\Phone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(private OtpService $otp) {}

    /**
     * Madrasa users log in with email, phone or admission number + password.
     * Admission numbers repeat across madrasas: if more than one account matches,
     * the app is asked to send the madrasa code too (409 tenant_required).
     */
    public function login(Request $request)
    {
        $data = $request->validate([
            'login' => ['required', 'string', 'max:120'],
            'password' => ['required', 'string', 'max:255'],
            'tenant_code' => ['nullable', 'string', 'max:20'],
            'device_name' => ['nullable', 'string', 'max:60'],
        ]);

        $login = trim($data['login']);
        $query = User::query()->with('tenant');
        if (str_contains($login, '@')) {
            $query->where('email', strtolower($login));
        } elseif (Phone::looksLikePhone($login)) {
            $query->where(fn ($q) => $q->where('phone', Phone::normalize($login))->orWhere('admission_no', $login));
        } else {
            $query->where('admission_no', $login);
        }
        if (! empty($data['tenant_code'])) {
            $query->whereHas('tenant', fn ($t) => $t->where('code', strtoupper($data['tenant_code'])));
        }

        $matches = $query->get()->filter(fn (User $u) => Hash::check($data['password'], $u->password))->values();

        return $this->signIn($matches, 'login', 'These details do not match our records.', $data['device_name'] ?? 'app');
    }

    /** Sends a 6-digit SMS code if the number has an account. The reply is the same either way. */
    public function otpRequest(Request $request)
    {
        $data = $request->validate(['phone' => ['required', 'string', 'max:30']]);
        $phone = Phone::normalize($data['phone']);
        if ($phone && User::where('phone', $phone)->exists()) {
            $this->otp->issue($phone, 'login');
        }

        return [
            'message' => 'If this number is registered, a code has been sent.',
            'expires_in' => (int) config('noon.otp.ttl_minutes') * 60,
            'resend_after' => (int) config('noon.otp.resend_after_seconds'),
        ];
    }

    public function otpVerify(Request $request)
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'max:30'],
            'otp' => ['required', 'digits:6'],
            'device_name' => ['nullable', 'string', 'max:60'],
        ]);
        $phone = (string) Phone::normalize($data['phone']);
        $this->otp->verify($phone, $data['otp'], 'login');

        $user = User::with('tenant')->where('phone', $phone)->first();
        $user?->forceFill(['phone_verified_at' => $user->phone_verified_at ?? now()])->save();

        return $this->signIn(collect(array_filter([$user])), 'phone', 'No account found for this number.', $data['device_name'] ?? 'app');
    }

    /**
     * Guest sign-up: pick board/class and/or Noon Courses, no madrasa needed.
     * If the parent phone already has an account, the owner must prove it with an
     * SMS code first (we send one and answer 409 otp_required).
     */
    public function guest(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'age' => ['nullable', 'integer', 'between:3,99'],
            'parent_phone' => ['nullable', 'string', 'max:30'],
            'otp' => ['nullable', 'digits:6'],
            'board_id' => ['nullable', 'exists:boards,id'],
            'class_id' => ['nullable', 'exists:school_classes,id'],
            'course_ids' => ['array'],
            'course_ids.*' => ['integer', 'exists:courses,id'],
            'device_name' => ['nullable', 'string', 'max:60'],
        ]);
        $phone = Phone::normalize($data['parent_phone'] ?? null);
        $existing = $phone ? User::where('phone', $phone)->first() : null;

        if ($existing) {
            if (empty($data['otp'])) {
                try {
                    $this->otp->issue($phone, 'guest');
                } catch (ValidationException) {
                    // A code was sent moments ago; the app can still use it.
                }

                return response()->json([
                    'message' => 'This number already has an account. Enter the code we sent by SMS.',
                    'code' => 'otp_required',
                ], 409);
            }
            $this->otp->verify($phone, $data['otp'], 'guest');
            $existing->forceFill(['phone_verified_at' => $existing->phone_verified_at ?? now()])->save();
        }

        // A verified returning guest keeps their progress; a madrasa account just signs in.
        $user = $existing ?? new User(['role' => 'guest', 'password' => Str::random(40), 'phone' => $phone]);
        if ($user->role === 'guest') {
            $user->fill([
                'name' => $data['name'],
                'age' => $data['age'] ?? null,
                'board_id' => $data['board_id'] ?? null,
                'class_id' => $data['class_id'] ?? null,
            ])->save();

            $courses = Course::whereIn('id', $data['course_ids'] ?? [])->where('status', 'published')->get();
            foreach ($courses as $course) {
                $user->courses()->syncWithoutDetaching([
                    $course->id => ['trial_ends_at' => $course->is_free ? null : now()->addDays(7)],
                ]);
            }
        }

        return $this->signIn(collect([$user->load('tenant')]), 'parent_phone', 'Could not sign in.', $data['device_name'] ?? 'app');
    }

    /** Guest enters a madrasa code → becomes a student of that madrasa. */
    public function joinTenant(Request $request)
    {
        $data = $request->validate(['code' => ['required', 'string', 'max:20']]);
        $user = $request->user();
        abort_unless($user->hasRole('guest'), 422, 'Only guest accounts can join a madrasa.');

        $tenant = Tenant::where('code', strtoupper(trim($data['code'])))->where('active', true)->first();
        if (! $tenant) {
            throw ValidationException::withMessages(['code' => 'This madrasa code is not valid.']);
        }
        $user->update(['tenant_id' => $tenant->id, 'role' => 'student']);

        return $user->fresh()->load('tenant')->toApp();
    }

    public function me(Request $request)
    {
        $user = $request->user()->load('tenant');
        $token = $user->currentAccessToken();
        $by = $token && str_starts_with((string) $token->name, ImpersonationController::PREFIX)
            ? User::find((int) substr($token->name, strlen(ImpersonationController::PREFIX)))?->name
            : null;

        return $user->toApp() + ($by ? ['impersonated_by' => $by] : []);
    }

    public function updateLearning(Request $request)
    {
        $data = $request->validate([
            'board_id' => ['nullable', 'exists:boards,id'],
            'class_id' => ['nullable', 'exists:school_classes,id'],
        ]);
        $request->user()->update($data);

        return $request->user()->fresh()->load('tenant')->toApp();
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->noContent();
    }

    /** @param Collection<int, User> $users */
    private function signIn(Collection $users, string $field, string $message, string $device): array|JsonResponse
    {
        if ($users->isEmpty()) {
            throw ValidationException::withMessages([$field => [$message]]);
        }
        if ($users->count() > 1) {
            return response()->json([
                'message' => 'Choose your madrasa.',
                'code' => 'tenant_required',
                'tenants' => $users->map(fn (User $u) => ['code' => $u->tenant?->code, 'name' => $u->tenant?->name ?? 'Noon Learn'])->values(),
            ], 409);
        }

        /** @var User $user */
        $user = $users->first();
        if ($user->blocked) {
            abort(403, 'This account is blocked. Please contact your madrasa.');
        }
        if ($user->tenant && ! $user->tenant->active) {
            throw ValidationException::withMessages([$field => ['Your madrasa account is not active.']]);
        }

        return [
            'token' => $user->createToken($device, [$user->role])->plainTextToken,
            'user' => $user->toApp(),
        ];
    }
}
