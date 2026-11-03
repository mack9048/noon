<?php

namespace App\Providers;

use App\Services\Sms\LogOtpSender;
use App\Services\Sms\Msg91OtpSender;
use App\Services\Sms\OtpSender;
use App\Services\Sms\TwilioOtpSender;
use App\Support\Phone;
use App\Tenancy\TenantContext;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->scoped(TenantContext::class);

        $this->app->bind(OtpSender::class, fn () => match (config('noon.otp.driver')) {
            'msg91' => new Msg91OtpSender((string) config('noon.msg91.auth_key'), (string) config('noon.msg91.otp_template_id')),
            'twilio' => new TwilioOtpSender((string) config('noon.twilio.sid'), (string) config('noon.twilio.token'), (string) config('noon.twilio.from')),
            default => new LogOtpSender,
        });
    }

    public function boot(): void
    {
        // Login, OTP and guest sign-up: 10 a minute per IP, 5 per phone/login.
        RateLimiter::for('auth', function (Request $request) {
            $raw = (string) ($request->input('phone') ?? $request->input('parent_phone') ?? $request->input('login') ?? '');
            $who = Phone::looksLikePhone($raw) ? (string) Phone::normalize($raw) : strtolower(trim($raw));

            return [
                Limit::perMinute(10)->by('ip:'.$request->ip().'|'.$request->path()),
                Limit::perMinute(5)->by('id:'.$who.'|'.$request->path()),
            ];
        });

        // Madrasa codes are short, so slow down guessing.
        RateLimiter::for('join', fn (Request $request) => Limit::perMinute(5)->by('join:'.($request->user()?->id ?? $request->ip())));
    }
}
