<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_forgot_password_with_sms_code(): void
    {
        $u = User::create(['name' => 'Parent', 'phone' => '971501234567', 'password' => 'oldpass123', 'role' => 'parent']);
        $u->createToken('app');

        $this->postJson('/api/auth/password/forgot', ['phone' => '971501234567'])->assertOk();
        $code = $this->sms->sent['971501234567'];
        // Unknown numbers get the same reply but no SMS, so accounts cannot be discovered
        $this->postJson('/api/auth/password/forgot', ['phone' => '971509999999'])->assertOk();
        $this->assertArrayNotHasKey('971509999999', $this->sms->sent);

        $this->postJson('/api/auth/password/reset', ['phone' => '971501234567', 'otp' => $code === '000000' ? '111111' : '000000', 'password' => 'newpass123'])->assertStatus(422);
        $this->postJson('/api/auth/password/reset', ['phone' => '971501234567', 'otp' => $code, 'password' => 'newpass123'])->assertOk();

        $this->assertTrue(Hash::check('newpass123', $u->fresh()->password));
        $this->assertSame(0, $u->tokens()->count());
        $this->postJson('/api/auth/login', ['login' => '971501234567', 'password' => 'newpass123'])->assertOk();
    }
}
