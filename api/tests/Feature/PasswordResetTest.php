<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\Tenant;
use Illuminate\Mail\Events\MessageSending;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
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

    public function test_forgot_password_by_registered_email(): void
    {
        $u = User::create(['name' => 'Teacher', 'email' => 't@x.test', 'password' => 'oldpass123', 'role' => 'teacher']);
        $sent = [];
        Event::listen(MessageSending::class, function ($e) use (&$sent) { $sent[] = $e->message; });

        $this->postJson('/api/auth/password/forgot', ['login' => 'T@X.test'])->assertOk()->assertJsonPath('message', 'If this email is registered, a code has been sent to it.');
        $this->assertCount(1, $sent);
        $this->assertSame('t@x.test', $sent[0]->getTo()[0]->getAddress());
        preg_match('/code is: (\d{6})/', $sent[0]->getTextBody(), $m);

        $this->postJson('/api/auth/password/forgot', ['login' => 'nobody@x.test'])->assertOk();
        $this->assertCount(1, $sent);

        $this->postJson('/api/auth/password/reset', ['login' => 't@x.test', 'otp' => $m[1], 'password' => 'newpass123'])->assertOk();
        $this->assertTrue(Hash::check('newpass123', $u->fresh()->password));
    }

    public function test_change_own_password_and_staff_resets(): void
    {
        $a = Tenant::create(['name' => 'A', 'code' => 'AAA111']);
        $b = Tenant::create(['name' => 'B', 'code' => 'BBB222']);
        $admin = User::create(['tenant_id' => $a->id, 'name' => 'Office', 'email' => 'o@a.test', 'password' => 'secret123', 'role' => 'admin']);
        $kid = User::create(['tenant_id' => $a->id, 'name' => 'Kid', 'admission_no' => 'A-1', 'password' => 'secret123', 'role' => 'student']);
        $other = User::create(['tenant_id' => $b->id, 'name' => 'Other', 'admission_no' => 'B-1', 'password' => 'secret123', 'role' => 'student']);
        $super = User::create(['name' => 'Boss', 'email' => 'boss@x.test', 'password' => 'secret123', 'role' => 'super']);

        Sanctum::actingAs($kid, ['student']);
        $this->putJson('/api/me/password', ['current_password' => 'wrong', 'password' => 'newpass123'])->assertStatus(422);
        $this->putJson('/api/me/password', ['current_password' => 'secret123', 'password' => 'kidpass123'])->assertOk();
        $this->assertTrue(Hash::check('kidpass123', $kid->fresh()->password));

        Sanctum::actingAs($admin, ['admin']);
        $this->getJson('/api/admin/people')->assertOk()->assertJsonCount(2);
        $this->putJson("/api/admin/users/{$kid->id}/password", ['password' => 'fromadmin1'])->assertOk();
        $this->assertTrue(Hash::check('fromadmin1', $kid->fresh()->password));
        $this->putJson("/api/admin/users/{$other->id}/password", ['password' => 'fromadmin1'])->assertNotFound();

        Sanctum::actingAs($super, ['super']);
        $this->putJson("/api/super/users/{$other->id}/password", ['password' => 'fromsuper1'])->assertOk();
        $this->assertTrue(Hash::check('fromsuper1', $other->fresh()->password));
    }
}
