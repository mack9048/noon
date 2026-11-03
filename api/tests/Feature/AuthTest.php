<?php

namespace Tests\Feature;

use App\Models\User;
use Tests\TestCase;

class AuthTest extends TestCase
{
    public function test_login_with_email_phone_or_admission_number(): void
    {
        $t = $this->madrasa();
        $u = $this->member($t, 'student', ['email' => 'ayisha@noon.test', 'phone' => '971501234567', 'admission_no' => 'NM-14']);

        foreach (['AYISHA@noon.test', '+971 50 123 4567', 'NM-14'] as $login) {
            $this->postJson('/api/auth/login', ['login' => $login, 'password' => 'password'])
                ->assertOk()->assertJsonPath('user.id', $u->id)->assertJsonPath('user.tenant_name', $t->name);
        }
        $this->postJson('/api/auth/login', ['login' => 'NM-14', 'password' => 'wrong'])
            ->assertUnprocessable()->assertJsonValidationErrors('login');
    }

    public function test_same_admission_number_in_two_madrasas_asks_which_one(): void
    {
        $a = $this->madrasa('AAA111');
        $b = $this->madrasa('BBB222');
        $this->member($a, 'student', ['admission_no' => '101']);
        $second = $this->member($b, 'student', ['admission_no' => '101']);

        $this->postJson('/api/auth/login', ['login' => '101', 'password' => 'password'])
            ->assertStatus(409)->assertJsonPath('code', 'tenant_required')->assertJsonCount(2, 'tenants');
        $this->postJson('/api/auth/login', ['login' => '101', 'password' => 'password', 'tenant_code' => 'bbb222'])
            ->assertOk()->assertJsonPath('user.id', $second->id);
    }

    public function test_otp_login(): void
    {
        $u = $this->member($this->madrasa(), 'parent', ['phone' => '971501234567']);
        $this->postJson('/api/auth/otp/request', ['phone' => '+971 50 123 4567'])->assertOk();
        $code = $this->sms->sent['971501234567'];

        $this->postJson('/api/auth/otp/verify', ['phone' => '+971501234567', 'otp' => $code === '000000' ? '111111' : '000000'])
            ->assertUnprocessable()->assertJsonValidationErrors('otp');
        $this->postJson('/api/auth/otp/verify', ['phone' => '+971501234567', 'otp' => $code])
            ->assertOk()->assertJsonPath('user.id', $u->id);
        $this->assertNotNull($u->fresh()->phone_verified_at);
        // A code works once.
        $this->postJson('/api/auth/otp/verify', ['phone' => '+971501234567', 'otp' => $code])->assertUnprocessable();
    }

    public function test_otp_request_for_unknown_number_sends_nothing(): void
    {
        $this->postJson('/api/auth/otp/request', ['phone' => '+971500000000'])->assertOk();
        $this->assertSame([], $this->sms->sent);
    }

    public function test_new_guest_signs_up_without_code(): void
    {
        $this->postJson('/api/auth/guest', ['name' => 'Hamdan', 'age' => 8, 'parent_phone' => '+971 50 123 4567'])
            ->assertOk()->assertJsonPath('user.role', 'guest');
        $this->assertSame('971501234567', User::where('name', 'Hamdan')->value('phone'));
    }

    public function test_reusing_a_phone_needs_the_sms_code(): void
    {
        $owner = User::factory()->create(['role' => 'guest', 'name' => 'Hamdan', 'phone' => '971501234567']);

        // Before the fix, typing someone's phone number logged you into their account.
        $this->postJson('/api/auth/guest', ['name' => 'Intruder', 'parent_phone' => '+971501234567'])
            ->assertStatus(409)->assertJsonPath('code', 'otp_required');
        $this->assertSame('Hamdan', $owner->fresh()->name);

        $code = $this->sms->sent['971501234567'];
        $this->postJson('/api/auth/guest', ['name' => 'Hamdan', 'parent_phone' => '+971501234567', 'otp' => $code])
            ->assertOk()->assertJsonPath('user.id', $owner->id);
    }

    public function test_guest_joins_a_madrasa_with_its_code(): void
    {
        $t = $this->madrasa('NOON01');
        $guest = User::factory()->create(['role' => 'guest']);
        $this->as($guest);

        $this->postJson('/api/auth/join-tenant', ['code' => 'WRONG1'])->assertUnprocessable();
        $this->postJson('/api/auth/join-tenant', ['code' => 'noon01'])
            ->assertOk()->assertJsonPath('role', 'student')->assertJsonPath('tenant_id', $t->id);
    }

    public function test_blocked_user_and_inactive_madrasa_lose_access_at_once(): void
    {
        $t = $this->madrasa();
        $u = $this->member($t, 'teacher', ['email' => 't@noon.test']);
        $token = $u->createToken('app')->plainTextToken;
        $this->withToken($token)->getJson('/api/auth/me')->assertOk();

        $t->update(['active' => false]);
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/auth/me')->assertForbidden();
        $this->postJson('/api/auth/login', ['login' => 't@noon.test', 'password' => 'password'])->assertUnprocessable();

        $t->update(['active' => true]);
        $u->forceFill(['blocked' => true])->save();  // not mass-assignable on purpose
        $this->postJson('/api/auth/login', ['login' => 't@noon.test', 'password' => 'password'])->assertForbidden();
    }

    public function test_login_is_rate_limited(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/auth/login', ['login' => 'x@y.test', 'password' => 'nope'])->assertUnprocessable();
        }
        $this->postJson('/api/auth/login', ['login' => 'x@y.test', 'password' => 'nope'])->assertStatus(429);
    }
}
