<?php

namespace Tests\Feature;

use App\Models\Batch;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AttendanceTest extends TestCase
{
    use RefreshDatabase;

    public function test_teacher_marks_a_batch_admin_sees_report_student_and_parent_see_their_own(): void
    {
        $t = $this->madrasa('NOON01');
        $admin = $this->member($t, 'admin');
        $teacher = $this->member($t, 'teacher');
        $parent = $this->member($t, 'parent', ['phone' => '919562651864']);
        $a = $this->member($t, 'student', ['name' => 'Ayisha', 'parent_id' => $parent->id]);
        $b = $this->member($t, 'student', ['name' => 'Rayan']);
        $batch = Batch::create(['tenant_id' => $t->id, 'name' => 'Class 5', 'board' => 'AP', 'class_label' => '5', 'days' => ['Mo'], 'start_time' => '16:30', 'class_teacher_id' => $teacher->id]);
        $batch->students()->attach([$a->id, $b->id]);

        // New school: empty report
        $this->as($admin)->getJson('/api/admin/attendance')->assertOk()->assertJsonPath('summary.marks', 0)->assertJsonPath('summary.percent', null);

        $this->as($teacher)->getJson("/api/staff/attendance?batch_id={$batch->id}")->assertOk()->assertJsonPath('marked', false)->assertJsonCount(2, 'students');
        $this->as($teacher)->postJson('/api/staff/attendance', ['batch_id' => $batch->id, 'date' => today()->toDateString(),
            'marks' => [['student_id' => $a->id, 'status' => 'present'], ['student_id' => $b->id, 'status' => 'absent']]])->assertOk()->assertJsonPath('saved', 2);
        // Re-saving replaces the mark
        $this->as($teacher)->postJson('/api/staff/attendance', ['batch_id' => $batch->id, 'date' => today()->toDateString(),
            'marks' => [['student_id' => $a->id, 'status' => 'late']]])->assertOk();
        $this->as($teacher)->getJson("/api/staff/attendance?batch_id={$batch->id}")->assertJsonPath('marked', true)->assertJsonPath('students.0.status', 'late');

        $r = $this->as($admin)->getJson('/api/admin/attendance?period=today')->assertOk();
        $r->assertJsonPath('summary.late', 1)->assertJsonPath('summary.absent', 1)->assertJsonPath('summary.percent', 50)
            ->assertJsonPath('absent.0.name', 'Rayan')->assertJsonPath('batches.0.marked_today', true);

        $this->as($a)->getJson('/api/attendance')->assertOk()->assertJsonPath('0.month.late', 1);
        $this->as($parent)->getJson('/api/attendance')->assertOk()->assertJsonPath('0.student.name', 'Ayisha');

        // No marking in the future, students cannot mark, other schools see nothing
        $this->as($teacher)->postJson('/api/staff/attendance', ['batch_id' => $batch->id, 'date' => today()->addDay()->toDateString(), 'marks' => [['student_id' => $a->id, 'status' => 'present']]])->assertStatus(422);
        $this->as($a)->postJson('/api/staff/attendance', ['batch_id' => $batch->id, 'date' => today()->toDateString(), 'marks' => [['student_id' => $a->id, 'status' => 'present']]])->assertForbidden();
        $other = $this->member($this->madrasa('OTHER2'), 'admin');
        $this->as($other)->getJson('/api/admin/attendance')->assertJsonPath('summary.marks', 0);
        $this->as($other)->getJson("/api/staff/attendance?batch_id={$batch->id}")->assertNotFound();
    }
}
