<?php

namespace App\Services\Sms;

use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Sends the 6-digit code on WhatsApp through Meta's WhatsApp Business Cloud API.
 * Needs an approved "Authentication" message template (Meta Business Manager → WhatsApp → Message templates)
 * whose body has one {{1}} for the code and, usually, a "Copy code" button.
 */
class WhatsAppOtpSender implements OtpSender
{
    public function __construct(private string $token, private string $phoneNumberId, private string $template, private string $language, private bool $copyButton) {}

    public function send(string $phone, string $code): void
    {
        $components = [['type' => 'body', 'parameters' => [['type' => 'text', 'text' => $code]]]];
        if ($this->copyButton) {
            $components[] = ['type' => 'button', 'sub_type' => 'url', 'index' => '0', 'parameters' => [['type' => 'text', 'text' => $code]]];
        }
        $res = Http::timeout(10)->withToken($this->token)
            ->post("https://graph.facebook.com/v21.0/{$this->phoneNumberId}/messages", [
                'messaging_product' => 'whatsapp',
                'to' => $phone,
                'type' => 'template',
                'template' => ['name' => $this->template, 'language' => ['code' => $this->language], 'components' => $components],
            ]);
        if ($res->failed()) {
            throw new RuntimeException('WhatsApp code failed: '.$res->body());
        }
    }
}
