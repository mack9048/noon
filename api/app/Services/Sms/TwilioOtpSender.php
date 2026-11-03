<?php

namespace App\Services\Sms;

use Illuminate\Support\Facades\Http;
use RuntimeException;

/** Gulf and international numbers: plain Twilio SMS with our own code. */
class TwilioOtpSender implements OtpSender
{
    public function __construct(private string $sid, private string $token, private string $from) {}

    public function send(string $phone, string $code): void
    {
        $res = Http::timeout(10)->asForm()->withBasicAuth($this->sid, $this->token)
            ->post("https://api.twilio.com/2010-04-01/Accounts/{$this->sid}/Messages.json", [
                'To' => '+'.$phone,
                'From' => $this->from,
                'Body' => "Your Noon Learn code is {$code}. It expires in 5 minutes.",
            ]);
        if ($res->failed()) {
            throw new RuntimeException('Twilio SMS failed: '.$res->body());
        }
    }
}
