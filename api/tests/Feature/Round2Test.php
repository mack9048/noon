<?php

namespace Tests\Feature;

use App\Models\Course;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class Round2Test extends TestCase
{
    private function application(array $over = []): array
    {
        return $over + ['name' => 'Rayan Ahmed', 'gender' => 'Boy', 'dob' => '2016-03-14', 'board' => 'AP', 'cls' => '5', 'parent' => 'Abdul Rahman', 'phone' => '+971 50 123 4567', 'docs' => ['birth' => true]];
    }

    public function test_public_admission_form_and_admin_flow(): void
    {
        $t = $this->madrasa('NOON01');
        $other = $this->madrasa('OTHER1');
        $this->postJson('/api/apply/NOPE99', $this->application())->assertNotFound();
        $this->postJson('/api/apply/noon01', $this->application(['phone' => '12']))->assertUnprocessable();
        $ref = $this->postJson('/api/apply/noon01', $this->application())->assertCreated()->json('id');

        $admin = $this->member($t, 'admin');
        $this->as($admin)->getJson('/api/admin/admissions')->assertOk()->assertJsonCount(1)->assertJsonPath('0.name', 'Rayan Ahmed')->assertJsonPath('0.docs.birth', true);
        $this->as($admin)->patchJson("/api/admin/admissions/{$ref}", ['status' => 'admitted'])->assertOk()->assertJsonPath('status', 'admitted')->assertJsonCount(2, 'timeline');

        // Another madrasa's admin can't see or change it.
        $otherAdmin = $this->member($other, 'admin');
        $this->as($otherAdmin)->getJson('/api/admin/admissions')->assertOk()->assertJsonCount(0);
        $this->as($otherAdmin)->patchJson("/api/admin/admissions/{$ref}", ['status' => 'rejected'])->assertNotFound();
        // Teachers can't use admin routes.
        $this->as($this->member($t, 'teacher'))->getJson('/api/admin/admissions')->assertForbidden();
    }

    public function test_batches_only_use_own_people(): void
    {
        $t = $this->madrasa('NOON01');
        $other = $this->madrasa('OTHER1');
        $admin = $this->member($t, 'admin');
        $teacher = $this->member($t, 'teacher');
        $foreign = $this->member($other, 'teacher');
        $s1 = $this->member($t, 'student');
        $base = ['name' => 'Madrasa 5 · Evening', 'board' => 'AP', 'cls' => '5', 'days' => ['Mo', 'We'], 'start_time' => '6:00 PM', 'seats' => 30];

        $this->as($admin)->postJson('/api/admin/batches', $base + ['class_teacher_id' => $foreign->id])->assertUnprocessable();
        $this->as($admin)->postJson('/api/admin/batches', $base + ['class_teacher_id' => $teacher->id, 'subject_teachers' => ['Arabic' => $teacher->id], 'student_ids' => [$s1->id]])
            ->assertCreated()->assertJsonPath('students', 1)->assertJsonPath('ct', $teacher->name)->assertJsonPath('when', 'Mo–We 6:00 PM');
        $this->as($this->member($other, 'admin'))->getJson('/api/admin/batches')->assertOk()->assertJsonCount(0);
    }

    public function test_madrasa_course_needs_approval_and_stays_in_its_madrasa(): void
    {
        $t = $this->madrasa('NOON01');
        $other = $this->madrasa('OTHER1');
        $admin = $this->member($t, 'admin');
        $super = \App\Models\User::factory()->create(['role' => 'super']);
        $student = $this->member($t, 'student');
        $guest = \App\Models\User::factory()->create(['role' => 'guest']);

        $id = $this->as($admin)->postJson('/api/admin/courses', ['title' => 'Malayalam Duas', 'category' => 'Duas', 'visibility' => 'madrasa', 'lessons' => ['One', 'Two']])
            ->assertCreated()->assertJsonPath('status', 'waiting')->json('id');
        $this->as($student)->getJson('/api/courses')->assertOk()->assertJsonCount(0);

        $this->as($super)->getJson('/api/super/approvals')->assertOk()->assertJsonPath('0.status', 'waiting')->assertJsonPath('0.madrasa', $t->name);
        $this->as($super)->patchJson("/api/super/approvals/{$id}", ['status' => 'approved'])->assertOk()->assertJsonPath('status', 'approved');

        $this->as($student)->getJson('/api/courses')->assertOk()->assertJsonCount(1)->assertJsonPath('0.title', 'Malayalam Duas');
        $this->as($guest)->getJson('/api/courses')->assertOk()->assertJsonCount(0); // madrasa-only
        $this->as($this->member($other, 'student'))->getJson('/api/courses')->assertOk()->assertJsonCount(0);
        $this->as($admin)->patchJson("/api/super/approvals/{$id}", ['status' => 'approved'])->assertForbidden();
    }

    public function test_course_logo_upload(): void
    {
        Storage::fake('public');
        $t = $this->madrasa('NOON01');
        $super = \App\Models\User::factory()->create(['role' => 'super']);
        $course = Course::create(['title' => 'Arabic', 'category' => 'Arabic', 'status' => 'published']);
        $this->as($super)->post("/api/super/courses/{$course->id}/logo", ['logo' => UploadedFile::fake()->image('logo.png', 512, 512)], ['Accept' => 'application/json'])
            ->assertOk()->assertJsonStructure(['logo_url']);
        $this->as($super)->post("/api/super/courses/{$course->id}/logo", ['logo' => UploadedFile::fake()->create('x.php', 10, 'text/x-php')], ['Accept' => 'application/json'])->assertUnprocessable();
        // A madrasa admin can only change logos of their own madrasa's courses.
        $this->as($this->member($t, 'admin'))->post("/api/admin/courses/{$course->id}/logo", ['logo' => UploadedFile::fake()->image('l.png', 512, 512)], ['Accept' => 'application/json'])->assertForbidden();
        $this->assertNotNull($course->fresh()->logo_url);
    }
}
