<?php

namespace App\Services\Sms;

interface OtpSender
{
    public function send(string $phone, string $code): void;
}
