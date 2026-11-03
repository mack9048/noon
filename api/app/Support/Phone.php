<?php

namespace App\Support;

class Phone
{
    /**
     * Digits with country code: "+971 50 123 4567" → "971501234567",
     * "98765 43210" → "919876543210" (default country code), "0091..." → "91...".
     */
    public static function normalize(?string $input, ?string $defaultCountryCode = null): ?string
    {
        if ($input === null) {
            return null;
        }
        $hasPlus = str_starts_with(ltrim($input), '+');
        $digits = preg_replace('/\D+/', '', $input);
        if ($digits === '') {
            return null;
        }
        if ($hasPlus) {
            return $digits;
        }
        if (str_starts_with($digits, '00')) {
            return substr($digits, 2);
        }
        $cc = $defaultCountryCode ?? (string) config('noon.default_country_code', '91');
        $local = ltrim($digits, '0');
        // A local number without its country code.
        if (strlen($local) <= 10 && ! str_starts_with($local, $cc)) {
            return $cc.$local;
        }

        return $local;
    }

    public static function looksLikePhone(string $input): bool
    {
        return ! str_contains($input, '@') && preg_match('/^\+?[\d\s\-()]{8,20}$/', $input) === 1;
    }
}
