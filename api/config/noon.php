<?php

return [
    'version' => env('APP_VERSION', '0.2.0'),

    // true on hosting without Supervisor: cron (schedule:run) then also runs the queue.
    'queue_via_scheduler' => (bool) env('QUEUE_VIA_SCHEDULER', false),

    // Added to local numbers (10 digits for India, 9 for UAE) that arrive without a country code.
    'default_country_code' => env('DEFAULT_COUNTRY_CODE', '91'),

    'otp' => [
        'driver' => env('OTP_DRIVER', 'log'),      // log | msg91 | twilio
        'ttl_minutes' => (int) env('OTP_TTL_MINUTES', 5),
        'resend_after_seconds' => (int) env('OTP_RESEND_AFTER', 30),
        // Local demos only; ignored when APP_ENV=production.
        'fixed_code' => env('OTP_FIXED_CODE'),
    ],

    'msg91' => [
        'auth_key' => env('MSG91_AUTH_KEY'),
        'otp_template_id' => env('MSG91_OTP_TEMPLATE_ID'),
    ],

    'twilio' => [
        'sid' => env('TWILIO_SID'),
        'token' => env('TWILIO_TOKEN'),
        'verify_service' => env('TWILIO_VERIFY_SERVICE'),
        'from' => env('TWILIO_FROM'),
    ],
];
