<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class LiveCourseTest extends TestCase
{
    use RefreshDatabase;

    public function test_live_only_course_with_a_weekly_timetable(): void
    {
        // Monday 18:30 in India.
        Carbon::setTestNow(Carbon::parse('2026-11-23 18:30', 'Asia/Kolkata'));
        $t = Tenant::create(['name' => 'Inst', 'code' => 'AAA111']);
        $s = User::create(['name' => 'S', 'email' => 's@x.test', 'password' => 'secret123', 'role' => 'student', 'tenant_id' => $t->id]);
        $boss = User::create(['name' => 'Boss', 'email' => 'boss@x.test', 'password' => 'secret123', 'role' => 'super']);
        $c = $this->as($boss)->postJson('/api/super/courses', ['title' => 'Daily Quran Class', 'category' => 'Quran', 'format' => 'live', 'status' => 'published', 'audience' => 'all', 'meet_url' => 'http://insecure.test'])->assertUnprocessable();
        $c = $this->as($boss)->postJson('/api/super/courses', ['title' => 'Daily Quran Class', 'category' => 'Quran', 'format' => 'live', 'status' => 'published', 'audience' => 'all', 'meet_url' => 'https://meet.google.com/abc-defg-hij'])->assertOk()->json();

        // Every day at 19:00 for 45 minutes, and Saturdays at 10:00 too.
        $this->as($boss)->postJson("/api/super/courses/{$c['id']}/live-slots", ['days' => [0, 1, 2, 3, 4, 5, 6], 'start_time' => '7pm'])->assertUnprocessable();
        $this->as($boss)->postJson("/api/super/courses/{$c['id']}/live-slots", ['days' => [6, 0, 1, 2, 3, 4, 5], 'start_time' => '19:00', 'duration_min' => 45])->assertOk();
        $tree = $this->as($boss)->postJson("/api/super/courses/{$c['id']}/live-slots", ['days' => [6], 'start_time' => '10:00', 'title' => 'Weekend revision'])->assertOk()->json();
        $this->assertSame('Every day · 7:00 PM · Sat · 10:00 AM', $tree['live_summary']);
        $this->assertSame([0, 1, 2, 3, 4, 5, 6], $tree['live_slots'][0]['days']);
        $this->assertSame('2026-11-23T19:00:00+05:30', $tree['live_upcoming'][0]['starts_at']);

        // Before joining: timetable shown, no link anywhere.
        $show = $this->as($s)->getJson("/api/courses/{$c['id']}")->assertOk()->assertJsonPath('format', 'live')->assertJsonPath('live.summary', 'Every day · 7:00 PM · Sat · 10:00 AM')
            ->assertJsonPath('live.upcoming.0.state', 'upcoming')->assertJsonCount(0, 'lessons')->json();
        $this->assertStringNotContainsString('meet.google', json_encode($show));
        $this->as($s)->postJson("/api/courses/{$c['id']}/live/join")->assertForbidden();
        $this->as($s)->postJson("/api/courses/{$c['id']}/enroll")->assertOk();

        // 18:30: too early; 18:50: open (15 minutes before); attendance counted once per class.
        $this->as($s)->postJson("/api/courses/{$c['id']}/live/join")->assertUnprocessable()->assertJsonPath('message', 'The next class starts Mon 23 Nov, 7:00 PM. You can join 15 minutes before.');
        $this->as($s)->getJson('/api/courses/continue')->assertJsonPath('live.state', 'upcoming')->assertJsonPath('lesson', null);
        Carbon::setTestNow(Carbon::parse('2026-11-23 18:50', 'Asia/Kolkata'));
        $this->as($s)->getJson('/api/courses/continue')->assertJsonPath('live.state', 'live')->assertJsonPath('course.live_now', true);
        $this->as($s)->postJson("/api/courses/{$c['id']}/live/join")->assertOk()->assertJsonPath('url', 'https://meet.google.com/abc-defg-hij');
        $this->as($s)->postJson("/api/courses/{$c['id']}/live/join")->assertOk();
        $this->as($s)->getJson("/api/courses/{$c['id']}")->assertJsonPath('live.attended', 1);

        // 19:30: still on. 19:50: over; next is tomorrow 19:00.
        Carbon::setTestNow(Carbon::parse('2026-11-23 19:50', 'Asia/Kolkata'));
        $this->as($s)->getJson("/api/courses/{$c['id']}")->assertJsonPath('live.upcoming.0.starts_at', '2026-11-24T19:00:00+05:30');
        // The super admin can open the link any time.
        $this->as($boss)->postJson("/api/courses/{$c['id']}/live/join")->assertOk();

        // Remove a time; recorded courses are not affected.
        $this->as($boss)->deleteJson("/api/super/course-live-slots/{$tree['live_slots'][1]['id']}")->assertOk()->assertJsonCount(1, 'live_slots');
        $r = $this->as($boss)->postJson('/api/super/courses', ['title' => 'Arabic', 'category' => 'Arabic', 'status' => 'published'])->json();
        $this->as($s)->postJson("/api/courses/{$r['id']}/live/join")->assertNotFound();
        Carbon::setTestNow();
    }
}
