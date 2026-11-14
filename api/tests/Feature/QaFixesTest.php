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
}
