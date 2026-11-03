<?php

namespace Tests\Unit;

use App\Support\Phone;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class PhoneTest extends TestCase
{
    public static function numbers(): array
    {
        return [
            ['+971 50 123 4567', '971', '971501234567'],
            ['050 123 4567', '971', '971501234567'],
            ['00971501234567', '971', '971501234567'],
            ['98765 43210', '91', '919876543210'],
            ['+91-98765-43210', '971', '919876543210'],
            ['', '91', null],
        ];
    }

    #[DataProvider('numbers')]
    public function test_normalize(string $in, string $cc, ?string $out): void
    {
        $this->assertSame($out, Phone::normalize($in, $cc));
    }
}
