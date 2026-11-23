<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class MeetingTest extends TestCase
{
    use RefreshDatabase;

    public function test_institution_meeting_for_all_students(): void
    {
        config(['services.livekit' => ['url' => 'wss://noon.livekit.test', 'key' => 'APItest', 'secret' => 'test-secret']]);
        Http::fake(['*' => Http::response([])]);
        $t = Tenant::create(['name' => 'Inst', 'code' => 'AAA111']);
        $o = Tenant::create(['name' => 'Other', 'code' => 'BBB222']);
        $admin = User::create(['name' => 'Adm', 'email' => 'a@x.test', 'password' => 'secret123', 'role' => 'admin', 'tenant_id' => $t->id]);
        $s = User::create(['name' => 'S', 'email' => 's@x.test', 'password' => 'secret123', 'role' => 'student', 'tenant_id' => $t->id]);
        $x = User::create(['name' => 'X', 'email' => 'x@x.test', 'password' => 'secret123', 'role' => 'student', 'tenant_id' => $o->id]);

        // No date needed; students cannot create.
        $this->actingAs($s)->postJson('/api/meetings', ['title' => 'Nope'])->assertForbidden();
        $m = $this->actingAs($admin)->postJson('/api/meetings', ['title' => 'Parents and students meeting'])->assertCreated()->assertJsonPath('state', 'scheduled')->json();
        $staff = $this->actingAs($admin)->postJson('/api/meetings', ['title' => 'Staff meeting', 'audience' => 'staff'])->assertCreated()->json();

        // Students see it (not the staff one), and other institutions do not.
        $this->actingAs($s)->getJson('/api/meetings')->assertOk()->assertJsonCount(1)->assertJsonPath('0.title', 'Parents and students meeting');
        $this->actingAs($x)->getJson('/api/meetings')->assertOk()->assertJsonCount(0);
        $this->actingAs($x)->postJson("/api/meetings/{$m['id']}/join")->assertNotFound();
        $this->actingAs($s)->postJson("/api/meetings/{$staff['id']}/join")->assertNotFound();

        // Not started: wait. The host starts; then students join and attendance is counted.
        $this->actingAs($s)->postJson("/api/meetings/{$m['id']}/join")->assertUnprocessable();
        $this->actingAs($admin)->postJson("/api/meetings/{$m['id']}/join")->assertOk()->assertJsonPath('host', true)->assertJsonPath('room', "noon-meeting-{$m['id']}");
        $this->actingAs($s)->postJson("/api/meetings/{$m['id']}/join")->assertOk()->assertJsonPath('host', false);
        $this->actingAs($s)->getJson('/api/meetings')->assertJsonPath('0.state', 'live')->assertJsonPath('0.joined', 1);
        $this->actingAs($s)->postJson("/api/meetings/{$m['id']}/moderate", ['action' => 'end'])->assertForbidden();
        $this->actingAs($admin)->postJson("/api/meetings/{$m['id']}/moderate", ['action' => 'end'])->assertOk();
        $this->actingAs($s)->postJson("/api/meetings/{$m['id']}/join")->assertUnprocessable();
    }
}
