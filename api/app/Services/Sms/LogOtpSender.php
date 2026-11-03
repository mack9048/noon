<?php

namespace App\Services\Sms;

use Illuminate\Support\Facades\Log;

/** Local driver: writes the OTP to storage/logs/laravel.log instead of sending an SMS. */
class LogOtpSender implements OtpSender
{
    public function send(string $phone, string $code): void
    {
        Log::info("OTP for {$phone}: {$code}");
    }
}
