<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CourseTenantTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_picks_which_madrasas_get_a_course(): void
    {
        $boss = User::create(['name' => 'Boss', 'email' => 'boss@x.test', 'password' => 'secret123', 'role' => 'super']);
        $a = Tenant::create(['name' => 'Institution A', 'code' => 'AAA111']);
        $b = Tenant::create(['name' => 'Institution B', 'code' => 'BBB222']);
        $sa = User::create(['name' => 'Sa', 'email' => 'sa@x.test', 'password' => 'secret123', 'role' => 'student', 'tenant_id' => $a->id]);
        $sb = User::create(['name' => 'Sb', 'email' => 'sb@x.test', 'password' => 'secret123', 'role' => 'student', 'tenant_id' => $b->id]);
        $adminB = User::create(['name' => 'Ab', 'email' => 'ab@x.test', 'password' => 'secret123', 'role' => 'admin', 'tenant_id' => $b->id]);
        $guest = User::create(['name' => 'G', 'email' => 'g@x.test', 'password' => 'secret123', 'role' => 'guest']);

        $c = $this->as($boss)->postJson('/api/super/courses', ['title' => 'Arabic', 'category' => 'Arabic', 'status' => 'published',
            'audience' => 'selected', 'tenant_ids' => [$a->id]])->assertSuccessful()
            ->assertJsonPath('audience', 'selected')->assertJsonPath('tenant_ids', [$a->id])->json();

        $this->as($sa)->getJson('/api/courses')->assertJsonCount(1);
        $this->as($sb)->getJson('/api/courses')->assertJsonCount(0);
        $this->as($guest)->getJson('/api/courses')->assertJsonCount(0);
        $this->getJson('/api/catalog/courses')->assertJsonCount(0);
        // Institution B cannot switch on a course kept for institution A.
        $this->as($adminB)->putJson("/api/admin/courses/{$c['id']}", ['enabled' => true])->assertNotFound();

        // Selected must name at least one institution.
        $this->as($boss)->putJson("/api/super/courses/{$c['id']}", ['audience' => 'selected', 'tenant_ids' => []])->assertUnprocessable();

        // All institutions: both get it, and guests too.
        $this->as($boss)->putJson("/api/super/courses/{$c['id']}", ['audience' => 'all'])->assertOk()->assertJsonPath('audience', 'all');
        $this->as($sb)->getJson('/api/courses')->assertJsonCount(1);
        $this->as($guest)->getJson('/api/courses')->assertJsonCount(1);
    }
}
