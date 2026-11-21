<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MadrasaInstitutionTest extends TestCase
{
    use RefreshDatabase;

    private function boss(): User
    {
        return User::create(['name' => 'Boss', 'email' => 'boss@x.test', 'password' => 'secret123', 'role' => 'super']);
    }

    public function test_boards_syllabus_classes_and_subject_thumbnails(): void
    {
        Storage::fake('public');
        $boss = $this->boss();
        $ek = Board::create(['code' => 'EK', 'name' => 'SKIMVB (EK)', 'full_name' => 'Samastha Kerala Islam Matha Vidyabhyasa Board', 'position' => 1]);
        $ap = Board::create(['code' => 'AP', 'name' => 'SKSVB (AP)', 'full_name' => 'Samastha Kerala Sunni Vidyabhyasa Board', 'position' => 2]);
        Board::create(['code' => 'GEN', 'name' => 'General', 'active' => false]);

        // Logo upload; only active boards in order; both syllabi listed.
        $this->as($boss)->post("/api/super/madrasa/boards/{$ek->id}", ['logo' => UploadedFile::fake()->image('ek.png')], ['Accept' => 'application/json'])->assertOk()->assertJsonPath('name', 'SKIMVB (EK)');
        $this->getJson('/api/boards')->assertOk()->assertJsonCount(2)->assertJsonPath('0.code', 'EK')->assertJsonPath('1.code', 'AP')
            ->assertJsonPath('0.syllabi.0.label', 'General Madrasa Syllabus')->assertJsonPath('0.syllabi.1.label', 'English Medium Madrasa Syllabus');
        $this->assertNotNull($this->getJson('/api/boards')->json('0.logo_url'));

        // Classes per syllabus; the same class label can exist in both syllabi.
        $this->as($boss)->postJson("/api/super/madrasa/boards/{$ap->id}/classes", ['syllabus' => 'general', 'label' => '5'])->assertOk()->assertJsonCount(1);
        $this->as($boss)->postJson("/api/super/madrasa/boards/{$ap->id}/classes", ['syllabus' => 'general', 'label' => '5'])->assertUnprocessable();
        $cls = $this->as($boss)->getJson("/api/super/madrasa/boards/{$ap->id}/classes?syllabus=general")->json('0');
        $sub = $this->as($boss)->post("/api/super/madrasa/classes/{$cls['id']}/subjects", ['name' => 'Fiqh', 'name_ar' => 'فقه', 'thumbnail' => UploadedFile::fake()->image('fiqh.png')], ['Accept' => 'application/json'])->assertOk()->json();
        $this->assertNotNull($sub['thumbnail_url']);
        // Copy the General syllabus to English Medium to start it quickly.
        $this->as($boss)->postJson("/api/super/madrasa/boards/{$ap->id}/copy", ['from' => 'general', 'to' => 'english'])->assertOk()->assertJsonPath('0.syllabus', 'english')->assertJsonPath('0.subjects.0.name', 'Fiqh');
        $this->getJson("/api/boards/{$ap->id}/classes?syllabus=english")->assertJsonCount(1)->assertJsonPath('0.syllabus', 'english');
        $this->getJson("/api/classes/{$cls['id']}/subjects")->assertJsonPath('0.thumbnail_url', $sub['thumbnail_url']);
        // Removing the copy's thumbnail keeps the original's file.
        $eng = $this->getJson("/api/boards/{$ap->id}/classes?syllabus=english")->json('0');
        $engSub = $this->getJson("/api/classes/{$eng['id']}/subjects")->json('0');
        $this->as($boss)->postJson("/api/super/madrasa/subjects/{$engSub['id']}", ['remove_thumbnail' => true])->assertOk()->assertJsonPath('thumbnail_url', null);
        $this->getJson("/api/classes/{$cls['id']}/subjects")->assertJsonPath('0.thumbnail_url', $sub['thumbnail_url']);
        $this->assertCount(2, Storage::disk('public')->allFiles());

        // Madrasa Support course needs board / syllabus / class; other categories drop them.
        $base = ['title' => 'Class 5 Fiqh', 'category' => 'Madrasa Support', 'status' => 'published'];
        $this->as($boss)->postJson('/api/super/courses', $base)->assertUnprocessable();
        $this->as($boss)->postJson('/api/super/courses', $base + ['board_id' => $ek->id, 'syllabus' => 'general', 'class_id' => $cls['id']])->assertUnprocessable();
        $c = $this->as($boss)->postJson('/api/super/courses', $base + ['board_id' => $ap->id, 'syllabus' => 'general', 'class_id' => $cls['id']])->assertOk()
            ->assertJsonPath('madrasa_label', 'SKSVB (AP) · General Madrasa Syllabus · Class 5')->json();
        $this->as($boss)->postJson('/api/super/courses', ['title' => 'Arabic', 'category' => 'General', 'board_id' => $ap->id, 'syllabus' => 'general', 'class_id' => $cls['id']])->assertOk()->assertJsonPath('class_id', null);
        // Course thumbnail and course subject thumbnail.
        $this->as($boss)->post("/api/super/courses/{$c['id']}/thumbnail", ['thumbnail' => UploadedFile::fake()->image('t.jpg', 640, 360)], ['Accept' => 'application/json'])->assertOk()->assertJsonStructure(['thumbnail_url']);
        $cs = $this->as($boss)->postJson("/api/super/courses/{$c['id']}/subjects", ['title' => 'Wudu'])->json();
        $this->as($boss)->post("/api/super/course-subjects/{$cs['id']}/thumbnail", ['thumbnail' => UploadedFile::fake()->image('w.png')], ['Accept' => 'application/json'])->assertOk();
        $this->as($boss)->getJson("/api/super/courses/{$c['id']}")->assertJsonPath('subjects.0.title', 'Wudu');
        $this->assertNotNull($this->as($boss)->getJson("/api/super/courses/{$c['id']}")->json('subjects.0.thumbnail_url'));
    }

    public function test_institution_settings_currency_and_student_enrolments_with_free_trial(): void
    {
        Storage::fake('public');
        Storage::fake('local');
        $boss = $this->boss();
        $t = $this->madrasa('NOON01');
        $admin = $this->member($t, 'admin');
        $ap = Board::create(['code' => 'AP', 'name' => 'SKSVB (AP)', 'position' => 2]);
        $cls = $ap->classes()->create(['syllabus' => 'english', 'label' => '3', 'position' => 1]);

        // School details, logo, and country (fills currency, phone code, time zone).
        $this->as($admin)->putJson('/api/admin/institution', ['tagline' => 'Learn with love', 'principal' => 'Usthad Ali', 'registration_no' => 'REG-1', 'country' => 'AE'])->assertOk()
            ->assertJsonPath('currency', 'AED')->assertJsonPath('dial_code', '+971')->assertJsonPath('timezone', 'Asia/Dubai')->assertJsonPath('principal', 'Usthad Ali');
        $this->as($admin)->putJson('/api/admin/institution', ['currency' => 'SAR'])->assertJsonPath('currency', 'SAR');
        $this->as($admin)->putJson('/api/admin/institution', ['phone' => 'call me'])->assertUnprocessable();
        $this->as($admin)->post('/api/admin/institution/logo', ['logo' => UploadedFile::fake()->image('logo.png')], ['Accept' => 'application/json'])->assertOk();
        $this->assertNotNull($this->as($admin)->getJson('/api/auth/me')->json('tenant_logo_url'));
        $this->as($admin)->getJson('/api/auth/me')->assertJsonPath('currency', 'SAR');
        $this->as($boss)->post("/api/super/tenants/{$t->id}/logo", ['remove' => true], ['Accept' => 'application/json'])->assertOk()->assertJsonPath('logo_url', null);

        // Student without board / class; enrol in courses at once and later.
        $recorded = $this->as($boss)->postJson('/api/super/courses', ['title' => 'Arabic', 'category' => 'General', 'status' => 'published', 'audience' => 'all', 'trial_lessons' => 1])->json();
        $this->as($boss)->postJson('/api/super/courses', ['title' => 'Draft', 'category' => 'General', 'status' => 'draft']);
        $live = $this->as($boss)->postJson('/api/super/courses', ['title' => 'Live Quran', 'category' => 'General', 'format' => 'live', 'status' => 'published', 'audience' => 'all', 'meet_url' => 'https://meet.google.com/x', 'trial_days' => 0])->json();
        $s = $this->as($admin)->postJson('/api/admin/students', ['name' => 'Rayan', 'course_ids' => [$recorded['id']]])->assertCreated()->json('student');
        $this->assertNull($s['class_id']);
        $e = $this->as($admin)->getJson("/api/admin/students/{$s['id']}/enrollments")->assertOk()->assertJsonPath('madrasa', null)
            ->assertJsonPath('courses.0.title', 'Arabic')->assertJsonPath('courses.0.paid', true)->json();
        $this->assertSame(['Live Quran'], array_column($e['available'], 'title'));
        $this->as($admin)->postJson("/api/admin/students/{$s['id']}/courses", ['course_id' => $live['id']])->assertOk()->assertJsonCount(2, 'courses');
        $this->as($admin)->deleteJson("/api/admin/students/{$s['id']}/courses/{$live['id']}")->assertOk()->assertJsonCount(1, 'courses');
        // Madrasa Support placement only when chosen.
        $this->as($admin)->putJson("/api/admin/students/{$s['id']}/madrasa", ['board_id' => $ap->id, 'syllabus' => 'general', 'class_id' => $cls->id])->assertStatus(422);
        $this->as($admin)->putJson("/api/admin/students/{$s['id']}/madrasa", ['board_id' => $ap->id, 'syllabus' => 'english', 'class_id' => $cls->id])->assertOk()
            ->assertJsonPath('madrasa.syllabus_label', 'English Medium Madrasa Syllabus')->assertJsonPath('madrasa.class_label', '3');
        $this->as($admin)->putJson("/api/admin/students/{$s['id']}/madrasa", ['remove' => true])->assertJsonPath('madrasa', null);
        // Another institution's student can't be managed.
        $other = $this->member($this->madrasa('OTHER2'), 'student');
        $this->as($admin)->getJson("/api/admin/students/{$other->id}/enrollments")->assertNotFound();

        // Free trial: a self-enrolled student opens only the first lesson of the recorded course.
        $l1 = $this->as($boss)->postJson("/api/super/courses/{$recorded['id']}/lessons", ['title' => 'One'])->json();
        $l2 = $this->as($boss)->postJson("/api/super/courses/{$recorded['id']}/lessons", ['title' => 'Two'])->json();
        $this->as($boss)->postJson("/api/super/course-lessons/{$l2['id']}/items", ['kind' => 'html', 'title' => 'Game', 'body' => '<p>x</p>']);
        $guest = User::create(['name' => 'G', 'email' => 'g@x.test', 'password' => 'secret123', 'role' => 'guest']);
        $this->as($guest)->postJson("/api/courses/{$recorded['id']}/enroll")->assertOk();
        $d = $this->as($guest)->getJson("/api/courses/{$recorded['id']}")->assertJsonPath('access.paid', false)->assertJsonPath('access.trial_over', true)->json();
        $this->assertFalse($d['lessons'][0]['locked']);
        $this->assertTrue($d['lessons'][1]['locked']);
        $game = $d['lessons'][1]['items'][0]['id'];
        $this->as($guest)->getJson("/api/course-items/{$game}/open")->assertForbidden();
        // The institution's student (enrolled by the admin) opens everything.
        $student = User::find($s['id']);
        $this->as($student)->getJson("/api/courses/{$recorded['id']}")->assertJsonPath('access.paid', true)->assertJsonPath('lessons.1.locked', false);
        $this->as($student)->getJson("/api/course-items/{$game}/open")->assertOk();
        // Live course with no trial days: joining is blocked for a self-enrolled student.
        $this->as($guest)->postJson("/api/courses/{$live['id']}/enroll")->assertOk();
        $this->as($guest)->getJson("/api/courses/{$live['id']}")->assertJsonPath('access.trial_over', true);
    }
}
