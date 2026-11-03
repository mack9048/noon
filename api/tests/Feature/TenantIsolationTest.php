<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\Course;
use App\Models\LeaveRequest;
use App\Models\User;
use App\Tenancy\TenantContext;
use Illuminate\Support\Facades\Route;
use LogicException;
use Tests\TestCase;

/** A madrasa must never reach another madrasa's data. */
class TenantIsolationTest extends TestCase
{
    private function leaveIn($tenant, $student): LeaveRequest
    {
        return LeaveRequest::create([
            'tenant_id' => $tenant->id, 'student_id' => $student->id, 'type' => 'Sick leave',
            'start_date' => now()->addDay()->toDateString(), 'end_date' => now()->addDays(2)->toDateString(),
        ]);
    }

    public function test_staff_only_see_and_decide_their_own_madrasas_leave(): void
    {
        $a = $this->madrasa('AAA111');
        $b = $this->madrasa('BBB222');
        $mine = $this->leaveIn($a, $this->member($a));
        $theirs = $this->leaveIn($b, $this->member($b));

        $this->as($this->member($a, 'teacher'));
        $ids = collect($this->getJson('/api/staff/leave-requests')->assertOk()->json())->pluck('id');
        $this->assertEquals([$mine->id], $ids->all());

        $this->patchJson("/api/staff/leave-requests/{$theirs->id}", ['status' => 'approved'])->assertNotFound();
        $this->assertSame('pending', $theirs->fresh()->status);
        $this->patchJson("/api/staff/leave-requests/{$mine->id}", ['status' => 'approved'])->assertOk();
    }

    public function test_cannot_read_or_post_in_another_madrasas_chat(): void
    {
        $a = $this->madrasa('AAA111');
        $b = $this->madrasa('BBB222');
        $outsider = $this->member($a);
        $chat = Conversation::create(['tenant_id' => $b->id, 'kind' => 'group', 'title' => 'Class 5']);
        // Even if someone was wrongly added to it, a chat from another madrasa stays hidden.
        $chat->users()->attach($outsider->id);

        $this->as($outsider);
        $this->getJson("/api/conversations/{$chat->id}/messages")->assertNotFound();
        $this->postJson("/api/conversations/{$chat->id}/messages", ['kind' => 'text', 'body' => 'hi'])->assertNotFound();
        $this->getJson('/api/conversations')->assertOk()->assertJsonCount(0);
    }

    public function test_non_member_of_a_chat_gets_not_found(): void
    {
        $a = $this->madrasa();
        $chat = Conversation::create(['tenant_id' => $a->id, 'kind' => 'direct']);
        $this->as($this->member($a));
        $this->getJson("/api/conversations/{$chat->id}/messages")->assertNotFound();
    }

    public function test_admin_cannot_put_another_madrasas_teacher_on_a_course(): void
    {
        $a = $this->madrasa('AAA111');
        $b = $this->madrasa('BBB222');
        $course = Course::create(['title' => 'Arabic', 'category' => 'Arabic', 'status' => 'published']);
        $this->as($this->member($a, 'admin'));

        $this->putJson("/api/admin/courses/{$course->id}", ['enabled' => true, 'teacher_id' => $this->member($b, 'teacher')->id])
            ->assertUnprocessable()->assertJsonValidationErrors('teacher_id');
        $this->putJson("/api/admin/courses/{$course->id}", ['enabled' => true, 'teacher_id' => $this->member($a, 'student')->id])
            ->assertJsonValidationErrors('teacher_id');
        $this->putJson("/api/admin/courses/{$course->id}", ['enabled' => true, 'teacher_id' => $this->member($a, 'teacher')->id])
            ->assertOk();
    }

    public function test_guests_and_super_admin_cannot_use_madrasa_routes(): void
    {
        $this->as(User::factory()->create(['role' => 'guest']));
        $this->getJson('/api/leave-requests')->assertForbidden();

        $this->as(User::factory()->create(['role' => 'super']));
        $this->getJson('/api/staff/leave-requests')->assertForbidden();
    }

    public function test_rows_cannot_be_saved_into_another_madrasa(): void
    {
        $a = $this->madrasa('AAA111');
        $b = $this->madrasa('BBB222');

        $this->expectException(LogicException::class);
        app(TenantContext::class)->runAs($a, fn () => Conversation::create(['tenant_id' => $b->id, 'kind' => 'group']));
    }

    /** Guard rail: madrasa routes must resolve the madrasa; super routes must be super-only. */
    public function test_every_member_route_runs_inside_a_madrasa(): void
    {
        foreach (Route::getRoutes() as $route) {
            $mw = $route->gatherMiddleware();
            if (! str_starts_with($route->uri(), 'api/')) {
                continue;
            }
            $memberRole = collect($mw)->first(fn ($m) => str_starts_with($m, 'role:') && $m !== 'role:super');
            if ($memberRole) {
                $this->assertContains('tenant', $mw, "{$route->uri()} must use the tenant middleware.");
            }
            if (str_starts_with($route->uri(), 'api/super/')) {
                $this->assertContains('role:super', $mw, $route->uri());
            }
            if (in_array('auth:sanctum', $mw, true)) {
                $this->assertContains('active', $mw, "{$route->uri()} must check for blocked accounts.");
            }
        }
    }
}
