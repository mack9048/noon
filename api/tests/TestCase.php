<?php

namespace Tests;

use App\Models\Tenant;
use App\Models\User;
use App\Services\Sms\OtpSender;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Laravel\Sanctum\Sanctum;
use Tests\Support\FakeOtpSender;

abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase;

    protected FakeOtpSender $sms;

    protected function setUp(): void
    {
        parent::setUp();
        $this->sms = new FakeOtpSender;
        $this->app->instance(OtpSender::class, $this->sms);
    }

    protected function madrasa(string $code = 'NOON01', array $attrs = []): Tenant
    {
        return Tenant::create($attrs + ['name' => "Madrasa {$code}", 'code' => $code, 'plan' => 'pro']);
    }

    protected function member(Tenant $tenant, string $role = 'student', array $attrs = []): User
    {
        return User::factory()->create($attrs + ['tenant_id' => $tenant->id, 'role' => $role]);
    }

    protected function as(User $user): static
    {
        Sanctum::actingAs($user, [$user->role]);

        return $this;
    }
}
