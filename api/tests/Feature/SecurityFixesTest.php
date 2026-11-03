<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\Course;
use App\Models\LeaveRequest;
use App\Models\StudyTool;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SecurityFixesTest extends TestCase
{
    public function test_chat_rejects_script_uploads(): void
    {
        Storage::fake('public');
        $t = $this->madrasa();
        $u = $this->member($t);
        $chat = Conversation::create(['tenant_id' => $t->id, 'kind' => 'group']);
        $chat->users()->attach($u->id);
        $this->as($u);

        $php = UploadedFile::fake()->createWithContent('shell.php', '<?php system($_GET["c"]);');
        $this->postJson("/api/conversations/{$chat->id}/messages", ['kind' => 'file', 'file' => $php])
            ->assertUnprocessable()->assertJsonValidationErrors('file');

        $pdf = UploadedFile::fake()->create('worksheet.pdf', 20, 'application/pdf');
        $this->postJson("/api/conversations/{$chat->id}/messages", ['kind' => 'file', 'file' => $pdf])->assertOk();
    }

    public function test_course_links_must_be_web_links(): void
    {
        $super = User::factory()->create(['role' => 'super']);
        $course = Course::create(['title' => 'Arabic', 'category' => 'Arabic', 'status' => 'published']);
        $this->as($super);

        $this->postJson("/api/super/courses/{$course->id}/items", ['kind' => 'live', 'title' => 'Live', 'url' => 'javascript:alert(1)'])
            ->assertJsonValidationErrors('url');
        $this->postJson("/api/super/courses/{$course->id}/items", ['kind' => 'live', 'title' => 'Live', 'url' => 'https://meet.jit.si/noon-1'])
            ->assertCreated();
    }

    public function test_cannot_complete_items_of_courses_you_are_not_in(): void
    {
        $course = Course::create(['title' => 'Arabic', 'category' => 'Arabic', 'status' => 'published']);
        $item = $course->items()->create(['kind' => 'video', 'title' => 'Lesson 1']);
        $guest = User::factory()->create(['role' => 'guest']);
        $this->as($guest);

        $this->postJson("/api/course-items/{$item->id}/complete")->assertNotFound();
        $this->postJson("/api/courses/{$course->id}/enroll")->assertOk();
        $this->postJson("/api/course-items/{$item->id}/complete")->assertNoContent();
    }

    public function test_draft_courses_and_study_tools_stay_hidden(): void
    {
        $draft = Course::create(['title' => 'Draft', 'category' => 'X', 'status' => 'draft']);
        $tool = StudyTool::create(['type' => 'chart', 'title' => 'Draft chart', 'status' => 'draft']);
        $this->as($this->member($this->madrasa(), 'admin'));

        $this->getJson("/api/courses/{$draft->id}")->assertNotFound();
        $this->postJson("/api/study-tools/{$tool->id}/open")->assertNotFound();
    }

    public function test_leave_rules(): void
    {
        $t = $this->madrasa('NOON01', ['leave_quota' => 3]);
        $student = $this->member($t);
        $this->as($student);
        $day = fn (int $n) => now()->addDays($n)->toDateString();

        $this->postJson('/api/leave-requests', ['type' => 'Sick', 'start_date' => $day(1), 'end_date' => $day(2)])->assertCreated();
        // Overlap
        $this->postJson('/api/leave-requests', ['type' => 'Sick', 'start_date' => $day(2), 'end_date' => $day(2)])
            ->assertJsonValidationErrors('start_date');
        // Only 1 day left once the pending 2 are counted
        $this->postJson('/api/leave-requests', ['type' => 'Sick', 'start_date' => $day(5), 'end_date' => $day(6)])
            ->assertJsonValidationErrors('end_date');
        $this->postJson('/api/leave-requests', ['type' => 'Sick', 'start_date' => $day(5), 'end_date' => $day(5)])->assertCreated();
    }

    public function test_staff_cannot_approve_their_own_leave_or_decide_twice(): void
    {
        $t = $this->madrasa();
        $teacher = $this->member($t, 'teacher');
        $own = LeaveRequest::create(['tenant_id' => $t->id, 'student_id' => $teacher->id, 'type' => 'Casual',
            'start_date' => now()->addDay()->toDateString(), 'end_date' => now()->addDay()->toDateString()]);
        $other = LeaveRequest::create(['tenant_id' => $t->id, 'student_id' => $this->member($t)->id, 'type' => 'Sick',
            'start_date' => now()->addDay()->toDateString(), 'end_date' => now()->addDay()->toDateString()]);
        $this->as($teacher);

        $this->patchJson("/api/staff/leave-requests/{$own->id}", ['status' => 'approved'])->assertForbidden();
        $this->patchJson("/api/staff/leave-requests/{$other->id}", ['status' => 'rejected'])->assertOk();
        $this->patchJson("/api/staff/leave-requests/{$other->id}", ['status' => 'approved'])->assertUnprocessable();
    }

    public function test_new_madrasa_codes_are_unique_and_readable(): void
    {
        $this->as(User::factory()->create(['role' => 'super']));
        $code = $this->postJson('/api/super/tenants', [
            'name' => 'Al Noor', 'admin_name' => 'Admin', 'admin_email' => 'ADMIN@alnoor.test', 'admin_password' => 'password1',
        ])->assertCreated()->json('code');

        $this->assertMatchesRegularExpression('/^[2-9A-HJ-NP-Z]{6}$/', $code);
        $this->assertTrue(User::where('email', 'admin@alnoor.test')->where('role', 'admin')->exists());
    }
}
