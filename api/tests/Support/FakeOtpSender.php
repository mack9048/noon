<?php

namespace Tests\Support;

use App\Services\Sms\OtpSender;

class FakeOtpSender implements OtpSender
{
    /** @var array<string, string> phone => last code */
    public array $sent = [];

    public function send(string $phone, string $code): void
    {
        $this->sent[$phone] = $code;
    }
}
