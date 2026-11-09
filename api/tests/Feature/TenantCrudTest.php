<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TenantCrudTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_creates_edits_suspends_and_deletes_a_tenant(): void
    {
        Sanctum::actingAs(User::create(['name' => 'Boss', 'email' => 'boss@x.test', 'password' => 'secret123', 'role' => 'super']), ['super']);

        $id = $this->postJson('/api/super/tenants', [
            'name' => 'Al Noor', 'plan' => 'basic', 'admin_name' => 'Office', 'admin_email' => 'office@alnoor.test', 'admin_password' => 'firstpass1',
        ])->assertCreated()->assertJsonPath('name', 'Al Noor')->json('id');

        $this->putJson("/api/super/tenants/{$id}", ['name' => 'Al Noor Madrasa', 'plan' => 'pro', 'admin_password' => 'newpass123'])
            ->assertOk()->assertJsonPath('plan', 'pro');
        $this->assertTrue(Hash::check('newpass123', User::where('email', 'office@alnoor.test')->first()->password));

        $this->deleteJson("/api/super/tenants/{$id}")->assertNoContent();
        $this->assertFalse(Tenant::find($id)->active);

        $this->deleteJson("/api/super/tenants/{$id}?permanent=1")->assertNoContent();
        $this->assertNull(Tenant::find($id));
        $this->assertNull(User::where('email', 'office@alnoor.test')->first());
    }
}
