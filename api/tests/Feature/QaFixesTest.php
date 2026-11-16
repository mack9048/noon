<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\Course;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QaFixesTest extends TestCase
{
    use RefreshDatabase;

    public function test_sign_up_page_can_list_public_courses_without_logging_in(): void
    {
        Course::create(['title' => 'Arabic', 'category' => 'Arabic', 'status' => 'published', 'visibility' => 'all']);
        Course::create(['title' => 'Own madrasa only', 'category' => 'Duas', 'status' => 'published', 'visibility' => 'madrasa']);
        Course::create(['title' => 'Draft', 'category' => 'Fiqh', 'status' => 'draft', 'visibility' => 'all']);

        $res = $this->getJson('/api/catalog/courses')->assertOk();
        $this->assertSame(['Arabic'], collect($res->json())->pluck('title')->all());
    }

    public function test_me_returns_real_profile_details(): void
    {
        $b = Board::create(['code' => 'AP', 'name' => 'Sunni Vidyabhyasa Board']);
        $c = $b->classes()->create(['label' => '5', 'position' => 4]);
        $t = $this->madrasa('NOON01');
        $parent = $this->member($t, 'parent', ['name' => 'Abdul', 'phone' => '+971501112222']);
        $student = $this->member($t, 'student', ['name' => 'Rayan K', 'admission_no' => 'NOON01-0001', 'board_id' => $b->id, 'class_id' => $c->id, 'parent_id' => $parent->id]);

        $this->as($student)->getJson('/api/auth/me')->assertOk()
            ->assertJsonPath('tenant_code', 'NOON01')
            ->assertJsonPath('admission_no', 'NOON01-0001')
            ->assertJsonPath('board_name', 'Sunni Vidyabhyasa Board')
            ->assertJsonPath('class_label', '5')
            ->assertJsonPath('parent.name', 'Abdul');
    }

    public function test_super_admin_login_can_be_set_by_command(): void
    {
        \App\Models\User::create(['name' => 'Super Admin', 'email' => 'old@x.test', 'password' => 'oldpass123', 'role' => 'super']);
        $this->artisan('noon:super-admin', ['email' => 'NoonElearn@Gmail.com', 'password' => 'Noon@977x'])->assertSuccessful();
        $this->assertSame(1, \App\Models\User::where('role', 'super')->count());
        $this->postJson('/api/auth/login', ['login' => 'noonelearn@gmail.com', 'password' => 'Noon@977x'])->assertOk()->assertJsonPath('user.role', 'super');
    }

    public function test_whatsapp_sender_sends_the_code_with_the_template(): void
    {
        \Illuminate\Support\Facades\Http::fake(['graph.facebook.com/*' => \Illuminate\Support\Facades\Http::response(['messages' => [['id' => 'x']]])]);
        (new \App\Services\Sms\WhatsAppOtpSender('t', '123', 'noon_login_code', 'en', true))->send('971501112222', '482913');
        \Illuminate\Support\Facades\Http::assertSent(fn ($r) => str_contains($r->url(), '/123/messages') && $r['to'] === '971501112222'
            && $r['template']['name'] === 'noon_login_code' && $r['template']['components'][0]['parameters'][0]['text'] === '482913'
            && $r->hasHeader('Authorization', 'Bearer t'));
    }

    public function test_people_lists_split_staff_and_students_and_hide_parents(): void
    {
        $t = $this->madrasa('NOON01');
        $admin = $this->member($t, 'admin', ['name' => 'Office']);
        $this->member($t, 'teacher', ['name' => 'Ustad']);
        $parent = $this->member($t, 'parent', ['name' => 'Abdul', 'phone' => '919562651864']);
        $this->member($t, 'student', ['name' => 'Rayan', 'parent_id' => $parent->id]);
        $boss = \App\Models\User::create(['name' => 'Boss', 'email' => 'boss@x.test', 'password' => 'secret123', 'role' => 'super']);

        $names = fn ($res) => collect($res->assertOk()->json())->pluck('name')->sort()->values()->all();
        $this->assertSame(['Office', 'Ustad'], $names($this->as($boss)->getJson('/api/super/users?group=staff')));
        $students = $this->as($boss)->getJson('/api/super/users?group=students')->assertOk()->json();
        $this->assertSame('Rayan', $students[0]['name']);
        $this->assertSame('Abdul', $students[0]['parent']['name']);
        $this->assertNotContains('Abdul', $names($this->as($boss)->getJson('/api/super/users')));
        $this->assertSame(['Office', 'Ustad'], $names($this->as($admin)->getJson('/api/admin/people?group=staff')));
        $this->assertSame(['Rayan'], $names($this->as($admin)->getJson('/api/admin/people?group=students')));
    }
}

