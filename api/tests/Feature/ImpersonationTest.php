<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ImpersonationTest extends TestCase
{
    use RefreshDatabase;

    private function people(): array
    {
        $t = Tenant::create(['name' => 'A', 'code' => 'AAA111']);
        return [
            User::create(['name' => 'Boss', 'email' => 'boss@x.test', 'password' => 'secret123', 'role' => 'super']),
            User::create(['tenant_id' => $t->id, 'name' => 'Office', 'email' => 'office@x.test', 'password' => 'secret123', 'role' => 'admin']),
            User::create(['tenant_id' => $t->id, 'name' => 'Kid', 'admission_no' => 'A-1', 'password' => 'secret123', 'role' => 'student']),
        ];
    }

    public function test_super_admin_can_list_users_and_log_in_as_one(): void
    {
        [$super, $admin] = $this->people();
        Sanctum::actingAs($super, ['super']);

        $this->getJson('/api/super/users?q=Off')->assertOk()->assertJsonCount(1)->assertJsonPath('0.name', 'Office');

        $res = $this->postJson("/api/super/users/{$admin->id}/impersonate")->assertOk()
            ->assertJsonPath('user.role', 'admin')->assertJsonPath('user.impersonated_by', 'Boss');

        $this->app['auth']->forgetGuards();
        $this->withToken($res->json('token'))->getJson('/api/auth/me')
            ->assertOk()->assertJsonPath('name', 'Office')->assertJsonPath('impersonated_by', 'Boss');
    }

    public function test_only_super_admins_can_impersonate_and_never_another_super(): void
    {
        [$super, $admin, $kid] = $this->people();
        Sanctum::actingAs($admin, ['admin']);
        $this->postJson("/api/super/users/{$kid->id}/impersonate")->assertForbidden();

        Sanctum::actingAs($super, ['super']);
        $this->postJson("/api/super/users/{$super->id}/impersonate")->assertStatus(422);
    }

    public function test_seeder_builds_catalogue_super_admin_and_demo_madrasa(): void
    {
        $this->seed(DatabaseSeeder::class);
        $this->assertSame(1, User::where('role', 'super')->count());
        $demo = Tenant::where('code', 'DEMO01')->firstOrFail();
        $this->assertSame(1, $demo->users()->where('role', 'admin')->count());
        $this->assertSame(3, $demo->users()->where('role', 'teacher')->count());
        $this->assertSame(6, $demo->users()->where('role', 'student')->count());

        $this->postJson('/api/auth/login', ['login' => 'DEMO-001', 'password' => 'Demo@1234'])->assertOk()->assertJsonPath('user.name', 'Ayisha');
        $this->postJson('/api/auth/login', ['login' => 'admin@demo.noonlearn.com', 'password' => 'Demo@1234'])->assertOk()->assertJsonPath('user.role', 'admin');
    }
}
