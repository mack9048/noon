<?php

namespace App\Services\Auth;

use App\Models\OtpCode;
use App\Services\Sms\OtpSender;
use Illuminate\Validation\ValidationException;

/** One-time SMS codes: hashed, 5-minute expiry, 5 tries, 30-second resend gap. */
class OtpService
{
    public const MAX_ATTEMPTS = 5;

    public function __construct(private OtpSender $sender) {}

    /** @param \Closure(string $code): void|null $deliver  send the code another way (e.g. email) instead of SMS */
    public function issue(string $phone, string $purpose = 'login', ?\Closure $deliver = null): void
    {
        $cooldown = (int) config('noon.otp.resend_after_seconds');
        $recent = OtpCode::where('phone', $phone)->where('purpose', $purpose)
            ->where('created_at', '>', now()->subSeconds($cooldown))->exists();
        if ($recent) {
            throw ValidationException::withMessages([
                'phone' => "Please wait {$cooldown} seconds before asking for a new code.",
            ])->status(429);
        }

        OtpCode::where('phone', $phone)->where('purpose', $purpose)->whereNull('consumed_at')
            ->update(['consumed_at' => now()]);

        $code = $this->generate();
        OtpCode::create([
            'phone' => $phone,
            'purpose' => $purpose,
            'code_hash' => $this->hash($phone, $code),
            'expires_at' => now()->addMinutes((int) config('noon.otp.ttl_minutes')),
        ]);
        $deliver ? $deliver($code) : $this->sender->send($phone, $code);
    }

    /** Checks the code and uses it up. */
    public function verify(string $phone, string $code, string $purpose = 'login'): void
    {
        $otp = OtpCode::where('phone', $phone)->where('purpose', $purpose)
            ->whereNull('consumed_at')->where('expires_at', '>', now())
            ->latest('id')->first();

        if (! $otp || $otp->attempts >= self::MAX_ATTEMPTS) {
            throw ValidationException::withMessages(['otp' => 'This code has expired. Please ask for a new one.']);
        }
        if (! hash_equals($otp->code_hash, $this->hash($phone, $code))) {
            $otp->increment('attempts');
            throw ValidationException::withMessages(['otp' => 'The code is not correct.']);
        }
        $otp->forceFill(['consumed_at' => now()])->save();
    }

    private function generate(): string
    {
        $fixed = config('noon.otp.fixed_code');
        if ($fixed && ! app()->isProduction()) {
            return (string) $fixed;
        }

        return str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    }

    private function hash(string $phone, string $code): string
    {
        return hash_hmac('sha256', $phone.'|'.$code, (string) config('app.key'));
    }
}
