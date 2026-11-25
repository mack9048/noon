<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\CourseLesson;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class CourseManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_full_control_and_teacher_changes_wait_for_approval(): void
    {
        $t = Tenant::create(['name' => 'Inst', 'code' => 'AAA111']);
        $other = Tenant::create(['name' => 'Other', 'code' => 'BBB222']);
        $admin = User::create(['name' => 'Adm', 'email' => 'a@x.test', 'password' => 'secret123', 'role' => 'admin', 'tenant_id' => $t->id]);
        $otherAdmin = User::create(['name' => 'Adm2', 'email' => 'a2@x.test', 'password' => 'secret123', 'role' => 'admin', 'tenant_id' => $other->id]);
        $teacher = User::create(['name' => 'Tea', 'email' => 't@x.test', 'password' => 'secret123', 'role' => 'teacher', 'tenant_id' => $t->id]);
        $student = User::create(['name' => 'Stu', 'email' => 's@x.test', 'password' => 'secret123', 'role' => 'student', 'tenant_id' => $t->id]);
        $course = Course::create(['title' => 'Inst Fiqh', 'category' => 'Fiqh', 'status' => 'pending', 'tenant_id' => $t->id, 'visibility' => 'madrasa', 'is_free' => true, 'teacher_id' => $teacher->id]);

        // Waiting for Noon Learn: the admin sees it in the folder but cannot edit yet.
        $this->actingAs($admin)->getJson('/api/manage/courses')->assertOk()->assertJsonPath('0.mode', null);
        $this->actingAs($admin)->getJson("/api/manage/courses/{$course->id}")->assertForbidden();
        $course->update(['status' => 'published']);
        $this->actingAs($otherAdmin)->getJson("/api/manage/courses/{$course->id}")->assertForbidden();

        // Approved: the admin edits directly.
        $this->actingAs($admin)->putJson("/api/manage/courses/{$course->id}", ['title' => 'Fiqh for Kids'])->assertOk()->assertJsonPath('title', 'Fiqh for Kids');
        $l1 = $this->actingAs($admin)->postJson("/api/manage/courses/{$course->id}/lessons", ['title' => 'Wudu'])->assertOk()->assertJsonPath('review_state', null)->json();
        $item = $this->actingAs($admin)->postJson("/api/manage/course-lessons/{$l1['id']}/items", ['kind' => 'note', 'title' => 'Steps', 'body' => 'Niyyah first'])->assertOk()->json();
        $student->courses()->attach($course->id);
        $t->courses()->attach($course->id, ['enabled' => true]);

        // The teacher: course details and order are for the admin only; content changes wait.
        $this->actingAs($teacher)->getJson('/api/manage/courses')->assertOk()->assertJsonPath('0.mode', 'review');
        $this->actingAs($teacher)->putJson("/api/manage/courses/{$course->id}", ['title' => 'X'])->assertForbidden();
        $this->actingAs($teacher)->postJson("/api/manage/courses/{$course->id}/subjects", ['title' => 'S'])->assertForbidden();
        $l2 = $this->actingAs($teacher)->postJson("/api/manage/courses/{$course->id}/lessons", ['title' => 'Salah'])->assertOk()->assertJsonPath('review_state', 'new')->json();
        $this->actingAs($teacher)->putJson("/api/manage/course-lessons/{$l1['id']}", ['title' => 'Wudu steps'])->assertOk()->assertJsonPath('title', 'Wudu')->assertJsonPath('pending.title', 'Wudu steps');
        $copy = $this->actingAs($teacher)->postJson("/api/manage/course-items/{$item['id']}", ['title' => 'Steps of wudu', 'body' => 'Niyyah, then hands'])->assertOk()
            ->assertJsonPath('review_state', 'new')->assertJsonPath('replaces_id', $item['id'])->json();
        $this->actingAs($teacher)->getJson("/api/manage/course-lessons/{$l2['id']}")->assertOk();

        // Students see only approved content.
        $show = $this->actingAs($student)->getJson("/api/courses/{$course->id}")->assertOk()->assertJsonCount(1, 'lessons')->assertJsonPath('lessons.0.title', 'Wudu')->json();
        $this->assertSame('Steps', $show['lessons'][0]['items'][0]['title']);

        // The admin sees 3 changes and approves them.
        $this->actingAs($admin)->getJson("/api/manage/reviews?course_id={$course->id}")->assertOk()->assertJsonCount(3);
        $this->actingAs($teacher)->postJson('/api/manage/reviews', ['type' => 'lesson', 'id' => $l2['id'], 'approve' => true])->assertForbidden();
        $this->actingAs($admin)->postJson('/api/manage/reviews', ['course_id' => $course->id, 'approve' => true])->assertOk()->assertJsonPath('done', 3);
        $show = $this->actingAs($student)->getJson("/api/courses/{$course->id}")->assertJsonCount(2, 'lessons')->json();
        $this->assertSame('Wudu steps', $show['lessons'][0]['title']);
        $this->assertSame('Steps of wudu', $show['lessons'][0]['items'][0]['title']);
        $this->assertSame($copy['id'], $show['lessons'][0]['items'][0]['id']);
        $this->assertCount(1, $show['lessons'][0]['items']);

        // A teacher's removal waits; rejecting it keeps the lesson.
        $this->actingAs($teacher)->deleteJson("/api/manage/course-lessons/{$l2['id']}")->assertOk()->assertJsonPath('review_state', 'delete');
        $this->actingAs($student)->getJson("/api/courses/{$course->id}")->assertJsonCount(2, 'lessons');
        $this->actingAs($admin)->postJson('/api/manage/reviews', ['type' => 'lesson', 'id' => $l2['id'], 'approve' => false])->assertOk();
        $this->actingAs($admin)->getJson("/api/manage/reviews?course_id={$course->id}")->assertJsonCount(0);
    }

    public function test_live_classes_without_dates_then_scheduled(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-11-23 18:00', 'Asia/Kolkata'));
        $boss = User::create(['name' => 'Boss', 'email' => 'b@x.test', 'password' => 'secret123', 'role' => 'super']);
        $s = User::create(['name' => 'S', 'email' => 's@x.test', 'password' => 'secret123', 'role' => 'guest']);
        $c = $this->actingAs($boss)->postJson('/api/super/courses', ['title' => 'Quran Live', 'category' => 'Quran', 'format' => 'live', 'status' => 'published', 'audience' => 'all', 'is_free' => true, 'meet_url' => 'https://meet.google.com/abc-defg-hij'])->json();

        // Ten classes, no dates needed.
        $list = $this->actingAs($boss)->postJson("/api/super/manage/courses/{$c['id']}/live-classes", ['count' => 10])->assertOk()->assertJsonCount(10)->json();
        $this->assertSame('Class 1', $list[0]['title']);
        $this->assertSame('unscheduled', $list[0]['state']);
        $this->actingAs($boss)->getJson("/api/courses/{$c['id']}")->assertJsonPath('live_summary', '10 live classes');

        // Date one later; students can join from 15 minutes before.
        $this->actingAs($boss)->putJson("/api/super/manage/course-live-classes/{$list[0]['id']}", ['title' => 'Makharij', 'starts_at' => '2026-11-23T18:10:00+05:30', 'duration_min' => 40])
            ->assertOk()->assertJsonPath('0.state', 'live');
        $this->actingAs($s)->postJson("/api/courses/{$c['id']}/enroll")->assertOk();
        $this->actingAs($s)->getJson("/api/courses/{$c['id']}")->assertJsonPath('live.classes.0.title', 'Makharij')->assertJsonPath('live.upcoming.0.title', 'Makharij');
        $this->actingAs($s)->postJson("/api/courses/{$c['id']}/live/join")->assertOk()->assertJsonPath('url', 'https://meet.google.com/abc-defg-hij');

        // Reorder and remove.
        $ids = array_reverse(array_column($list, 'id'));
        $this->actingAs($boss)->postJson("/api/super/manage/courses/{$c['id']}/live-classes/order", ['ids' => $ids])->assertOk()->assertJsonPath('0.title', 'Class 10');
        $this->actingAs($boss)->deleteJson("/api/super/manage/course-live-classes/{$ids[0]}")->assertOk()->assertJsonCount(9);
        Carbon::setTestNow();
    }

    public function test_next_lesson_waits_for_the_lesson_test_mark(): void
    {
        $t = Tenant::create(['name' => 'Inst', 'code' => 'TST111']);
        $teacher = User::create(['name' => 'Tea', 'email' => 'tt@x.test', 'password' => 'secret123', 'role' => 'teacher', 'tenant_id' => $t->id]);
        $student = User::create(['name' => 'Stu', 'email' => 'ss@x.test', 'password' => 'secret123', 'role' => 'student', 'tenant_id' => $t->id]);
        $course = Course::create(['title' => 'Little Muslim', 'category' => 'General', 'status' => 'published', 'tenant_id' => $t->id, 'visibility' => 'madrasa', 'is_free' => true, 'teacher_id' => $teacher->id]);
        $t->courses()->attach($course->id, ['enabled' => true]);
        $student->courses()->attach($course->id);
        $l1 = CourseLesson::create(['course_id' => $course->id, 'title' => 'Flower', 'position' => 1]);
        $l2 = CourseLesson::create(['course_id' => $course->id, 'title' => 'Tree', 'position' => 2]);

        $other = Course::create(['title' => 'Other', 'category' => 'General', 'status' => 'published', 'tenant_id' => $t->id, 'visibility' => 'madrasa', 'is_free' => true, 'teacher_id' => $teacher->id]);
        $this->actingAs($teacher)->postJson('/api/staff/assessments', ['type' => 'assessment', 'title' => 'Flower quiz', 'course_id' => $other->id, 'course_lesson_id' => $l1->id])->assertStatus(422);
        $a = $this->actingAs($teacher)->postJson('/api/staff/assessments', ['type' => 'assessment', 'title' => 'Flower quiz', 'course_id' => $course->id, 'course_lesson_id' => $l1->id, 'max_marks' => 5])->assertCreated()->json();

        $this->actingAs($student)->getJson("/api/courses/{$course->id}")->assertOk()
            ->assertJsonPath('lessons.0.tests.0.title', 'Flower quiz')->assertJsonPath('lessons.0.tests.0.done', false)->assertJsonPath('lessons.1.tests', []);
        $this->actingAs($teacher)->postJson("/api/staff/assessments/{$a['id']}/results", ['results' => [['student_id' => $student->id, 'marks' => 4]]])->assertOk();
        $this->actingAs($student)->getJson("/api/courses/{$course->id}")->assertOk()->assertJsonPath('lessons.0.tests.0.done', true);
    }

    public function test_content_item_thumbnail_admin_only(): void
    {
        \Illuminate\Support\Facades\Storage::fake('public');
        $t = Tenant::create(['name' => 'Inst', 'code' => 'THM111']);
        $admin = User::create(['name' => 'Adm', 'email' => 'ath@x.test', 'password' => 'secret123', 'role' => 'admin', 'tenant_id' => $t->id]);
        $teacher = User::create(['name' => 'Tea', 'email' => 'tth@x.test', 'password' => 'secret123', 'role' => 'teacher', 'tenant_id' => $t->id]);
        $course = Course::create(['title' => 'Little Muslim', 'category' => 'General', 'status' => 'published', 'tenant_id' => $t->id, 'visibility' => 'madrasa', 'is_free' => true, 'teacher_id' => $teacher->id]);
        $t->courses()->attach($course->id, ['enabled' => true]);
        $lesson = \App\Models\CourseLesson::create(['course_id' => $course->id, 'title' => 'Flower', 'position' => 1]);
        $item = \App\Models\CourseItem::create(['course_id' => $course->id, 'course_lesson_id' => $lesson->id, 'kind' => 'video', 'title' => 'Flower song', 'position' => 1]);
        $pic = \Illuminate\Http\UploadedFile::fake()->image('cover.png', 640, 360);

        $this->actingAs($teacher)->post("/api/manage/course-items/{$item->id}/thumbnail", ['thumbnail' => $pic], ['Accept' => 'application/json'])->assertForbidden();
        $this->actingAs($admin)->post("/api/manage/course-items/{$item->id}/thumbnail", ['thumbnail' => $pic], ['Accept' => 'application/json'])->assertOk();
        $url = $this->actingAs($admin)->getJson("/api/manage/courses/{$course->id}")->assertOk()->json('lessons.0.items.0.thumbnail_url');
        $this->assertNotNull($url);
        $this->actingAs($admin)->post("/api/manage/course-items/{$item->id}/thumbnail", ['remove' => 1], ['Accept' => 'application/json'])->assertOk();
        $this->assertNull($item->fresh()->thumbnail_path);
    }
}
