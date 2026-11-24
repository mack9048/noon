<?php

namespace Tests\Feature;

use App\Models\Batch;
use App\Models\Fee;
use App\Models\Tenant;
use App\Models\User;
use App\Tenancy\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboards_show_each_roles_own_numbers(): void
    {
        $a = Tenant::create(['name' => 'A', 'code' => 'AAA111']);
        $b = Tenant::create(['name' => 'B', 'code' => 'BBB222']);
        $admin = User::create(['name' => 'Adm', 'email' => 'a@x.test', 'password' => 'secret123', 'role' => 'admin', 'tenant_id' => $a->id]);
        $s1 = User::create(['name' => 'S1', 'email' => 's1@x.test', 'password' => 'secret123', 'role' => 'student', 'tenant_id' => $a->id]);
        User::create(['name' => 'S2', 'email' => 's2@x.test', 'password' => 'secret123', 'role' => 'student', 'tenant_id' => $b->id]);
        $teacher = User::create(['name' => 'T', 'email' => 't@x.test', 'password' => 'secret123', 'role' => 'teacher', 'tenant_id' => $a->id]);
        $super = User::create(['name' => 'Boss', 'email' => 'boss@x.test', 'password' => 'secret123', 'role' => 'super']);
        app(TenantContext::class)->set($a);
        Fee::create(['student_id' => $s1->id, 'title' => 'Monthly fee', 'month' => now()->format('Y-m'), 'amount' => 800, 'due_date' => now()->addDays(3)->toDateString(), 'status' => 'paid', 'paid_amount' => 800, 'paid_at' => now(), 'method' => 'cash']);
        Fee::create(['student_id' => $s1->id, 'title' => 'Books', 'month' => now()->format('Y-m'), 'amount' => 200, 'due_date' => now()->subDays(2)->toDateString(), 'status' => 'due']);
        app(TenantContext::class)->set(null);

        $this->actingAs($admin)->getJson('/api/admin/dashboard')->assertOk()
            ->assertJsonPath('students.total', 1)->assertJsonPath('students.with_dues', 1)->assertJsonPath('teachers', 1)
            ->assertJsonPath('fees.collected', 800)->assertJsonPath('fees.pending', 200)->assertJsonPath('fees.overdue', 1)
            ->assertJsonPath('recent_payments.0.name', 'S1')->assertJsonCount(6, 'fees.series');
        $this->actingAs($teacher)->getJson('/api/staff/dashboard')->assertOk()->assertJsonPath('students', 0)->assertJsonCount(7, 'attendance_week');
        $this->actingAs($super)->getJson('/api/super/dashboard')->assertOk()->assertJsonPath('tenants.total', 2)->assertJsonPath('students', 2)->assertJsonCount(6, 'new_tenants');
        $this->actingAs($admin)->getJson('/api/super/dashboard')->assertForbidden();

        // To-do list and note are per person.
        $this->actingAs($admin)->getJson('/api/me/board')->assertOk()->assertJsonPath('note', '');
        $this->actingAs($admin)->putJson('/api/me/board', ['todos' => [['id' => 'a1', 'text' => 'Fee collection', 'done' => false]], 'note' => 'Call the printer'])->assertOk();
        $this->actingAs($admin)->getJson('/api/me/board')->assertJsonPath('todos.0.text', 'Fee collection')->assertJsonPath('note', 'Call the printer');
        $this->actingAs($teacher)->getJson('/api/me/board')->assertJsonPath('note', '');
    }

    public function test_student_directory_fee_totals_and_staff_profile(): void
    {
        $a = Tenant::create(['name' => 'A', 'code' => 'AAA111']);
        $admin = User::create(['name' => 'Adm', 'email' => 'a@x.test', 'password' => 'secret123', 'role' => 'admin', 'tenant_id' => $a->id]);
        $s1 = User::create(['name' => 'S1', 'email' => 's1@x.test', 'password' => 'secret123', 'role' => 'student', 'tenant_id' => $a->id]);
        $t = User::create(['name' => 'Tea', 'email' => 't@x.test', 'password' => 'secret123', 'role' => 'teacher', 'tenant_id' => $a->id]);
        app(TenantContext::class)->set($a);
        Fee::create(['student_id' => $s1->id, 'title' => 'Term 1', 'month' => now()->format('Y-m'), 'amount' => 1500, 'due_date' => now()->subDays(3)->toDateString(), 'status' => 'due']);
        Fee::create(['student_id' => $s1->id, 'title' => 'Term 2', 'month' => now()->format('Y-m'), 'amount' => 500, 'due_date' => now()->addDays(3)->toDateString(), 'status' => 'paid', 'paid_amount' => 500, 'paid_at' => now(), 'method' => 'cash']);
        $b = Batch::create(['name' => 'Class 5 A', 'board' => 'AP', 'class_label' => '5', 'days' => [1, 3], 'start_time' => '16:30', 'class_teacher_id' => $t->id]);
        $b->students()->attach($s1->id);
        app(TenantContext::class)->set(null);

        $this->actingAs($admin)->getJson('/api/admin/students')->assertOk()->assertJsonPath('0.fee_total', 2000)->assertJsonPath('0.fee_overdue', 1500)
            ->assertJsonPath('0.fee_status', 'overdue')->assertJsonPath('0.batch', 'Class 5 A');
        $this->actingAs($admin)->getJson("/api/admin/students/{$s1->id}")->assertOk()->assertJsonCount(2, 'fees')->assertJsonPath('fee_totals.fee_paid', 500);
        $this->actingAs($admin)->getJson("/api/admin/teachers/{$t->id}")->assertOk()->assertJsonPath('classes.0.name', 'Class 5 A')->assertJsonPath('students', 1);
    }

    public function test_teacher_sees_only_their_own_classes(): void
    {
        $t = Tenant::create(['name' => 'Inst', 'code' => 'CLS111']);
        $mk = fn ($role, $name) => User::factory()->create(['tenant_id' => $t->id, 'role' => $role, 'name' => $name]);
        $zahra = $mk('teacher', 'Zahra Teacher');
        $other = $mk('teacher', 'Other');
        $kid = $mk('student', 'Kid One');
        $mine = Batch::create(['tenant_id' => $t->id, 'name' => 'Class 5 Morning', 'board' => 'AP', 'class_label' => '5', 'days' => ['Mon'], 'start_time' => '16:00', 'class_teacher_id' => $zahra->id, 'subject_teachers' => ['Fiqh' => $other->id]]);
        $mine->students()->attach($kid->id);
        $theirs = Batch::create(['tenant_id' => $t->id, 'name' => 'Class 3', 'board' => 'AP', 'class_label' => '3', 'days' => ['Tue'], 'start_time' => '17:00', 'class_teacher_id' => $other->id]);
        $this->actingAs($zahra)->getJson('/api/staff/classes')->assertOk()->assertJsonCount(1)->assertJsonPath('0.name', 'Class 5 Morning')->assertJsonPath('0.class_teacher', true);
        $this->actingAs($zahra)->getJson("/api/staff/classes/{$mine->id}")->assertOk()->assertJsonPath('students.0.name', 'Kid One')->assertJsonPath('subjects.0.teacher', 'Other');
        $this->actingAs($zahra)->getJson("/api/staff/classes/{$theirs->id}")->assertNotFound();
    }
}
