<?php

namespace App\Services\Sms;

use Illuminate\Support\Facades\Http;
use RuntimeException;

/** India: MSG91 OTP API with a DLT-approved template. */
class Msg91OtpSender implements OtpSender
{
    public function __construct(private string $authKey, private string $templateId) {}

    public function send(string $phone, string $code): void
    {
        $res = Http::timeout(10)->withHeaders(['authkey' => $this->authKey])
            ->post('https://control.msg91.com/api/v5/otp', ['template_id' => $this->templateId, 'mobile' => $phone, 'otp' => $code]);
        if ($res->failed() || $res->json('type') === 'error') {
            throw new RuntimeException('MSG91 OTP send failed: '.$res->body());
        }
    }
}
