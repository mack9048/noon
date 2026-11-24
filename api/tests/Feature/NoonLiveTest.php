<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/** Noon Live (LiveKit): a room pass for enrolled students during class, teacher controls for staff. */
class NoonLiveTest extends TestCase
{
    use RefreshDatabase;

    private function claims(string $jwt): array
    {
        [$h, $p, $sig] = explode('.', $jwt);
        $this->assertSame($sig, rtrim(strtr(base64_encode(hash_hmac('sha256', "$h.$p", 'test-secret', true)), '+/', '-_'), '='));

        return json_decode(base64_decode(strtr($p, '-_', '+/')), true);
    }

    public function test_room_pass_and_teacher_controls(): void
    {
        config(['services.livekit' => ['url' => 'wss://noon.livekit.test', 'key' => 'APItest', 'secret' => 'test-secret']]);
        Carbon::setTestNow(Carbon::parse('2026-11-23 18:50', 'Asia/Kolkata'));
        $t = Tenant::create(['name' => 'Inst', 'code' => 'AAA111']);
        $s = User::create(['name' => 'Sara', 'email' => 's@x.test', 'password' => 'secret123', 'role' => 'student', 'tenant_id' => $t->id]);
        $other = User::create(['name' => 'O', 'email' => 'o@x.test', 'password' => 'secret123', 'role' => 'student', 'tenant_id' => $t->id]);
        $boss = User::create(['name' => 'Boss', 'email' => 'boss@x.test', 'password' => 'secret123', 'role' => 'super']);
        $c = $this->actingAs($boss)->postJson('/api/super/courses', ['title' => 'Daily Quran', 'category' => 'Quran', 'format' => 'live', 'live_provider' => 'livekit', 'status' => 'published', 'audience' => 'all'])
            ->assertOk()->assertJsonPath('live_provider', 'livekit')->json();
        $this->actingAs($boss)->postJson("/api/super/courses/{$c['id']}/live-slots", ['days' => [0, 1, 2, 3, 4, 5, 6], 'start_time' => '19:00', 'duration_min' => 45])->assertOk();

        // No Meet link needed. Not enrolled: no pass.
        $this->actingAs($other)->postJson("/api/courses/{$c['id']}/live/join")->assertForbidden();
        $this->actingAs($s)->postJson("/api/courses/{$c['id']}/enroll")->assertOk();
        $r = $this->actingAs($s)->postJson("/api/courses/{$c['id']}/live/join")->assertOk()
            ->assertJsonPath('provider', 'livekit')->assertJsonPath('url', 'wss://noon.livekit.test')->assertJsonPath('host', false)->json();
        $claims = $this->claims($r['token']);
        $this->assertSame('APItest', $claims['iss']);
        $this->assertSame("u{$s->id}", $claims['sub']);
        $this->assertSame('noon-course-'.$c['id'], $claims['video']['room']);
        $this->assertFalse($claims['video']['roomAdmin']);
        $this->assertGreaterThan(time(), $claims['exp']);
        $this->actingAs($s)->getJson("/api/courses/{$c['id']}")->assertJsonPath('live.attended', 1)->assertJsonPath('live.provider', 'livekit');

        // Children cannot use teacher controls; the super admin can.
        $this->actingAs($s)->postJson("/api/courses/{$c['id']}/live/moderate", ['action' => 'remove', 'identity' => 'u1'])->assertForbidden();
        $host = $this->actingAs($boss)->postJson("/api/courses/{$c['id']}/live/join")->assertOk()->assertJsonPath('host', true)->json();
        $this->assertTrue($this->claims($host['token'])['video']['roomAdmin']);
        Http::fake(['noon.livekit.test/twirp/livekit.RoomService/GetParticipant' => Http::response(['tracks' => [['sid' => 'TR_mic', 'type' => 'AUDIO'], ['sid' => 'TR_cam', 'type' => 'VIDEO']]]), '*' => Http::response([])]);
        $this->actingAs($boss)->postJson("/api/courses/{$c['id']}/live/moderate", ['action' => 'mute', 'identity' => "u{$s->id}"])->assertOk();
        Http::assertSent(fn ($req) => str_ends_with($req->url(), 'MutePublishedTrack') && $req['track_sid'] === 'TR_mic' && $req->url() === 'https://noon.livekit.test/twirp/livekit.RoomService/MutePublishedTrack');
        Http::assertNotSent(fn ($req) => str_ends_with($req->url(), 'MutePublishedTrack') && $req['track_sid'] === 'TR_cam');
        $this->actingAs($boss)->postJson("/api/courses/{$c['id']}/live/moderate", ['action' => 'end'])->assertOk();

        // Without LiveKit keys on the server it falls back to the Meet link.
        config(['services.livekit.secret' => null]);
        $this->actingAs($s)->postJson("/api/courses/{$c['id']}/live/join")->assertUnprocessable();
        Carbon::setTestNow();
    }

    public function test_live_course_has_lessons_and_its_pdf_streams_to_enrolled_students(): void
    {
        \Illuminate\Support\Facades\Storage::fake('public');
        $t = Tenant::create(['name' => 'Inst', 'code' => 'PDF111']);
        $s = User::create(['name' => 'Sara', 'email' => 's2@x.test', 'password' => 'secret123', 'role' => 'student', 'tenant_id' => $t->id]);
        $other = User::create(['name' => 'O', 'email' => 'o2@x.test', 'password' => 'secret123', 'role' => 'student', 'tenant_id' => $t->id]);
        $boss = User::create(['name' => 'Boss', 'email' => 'boss2@x.test', 'password' => 'secret123', 'role' => 'super']);
        $c = $this->actingAs($boss)->postJson('/api/super/courses', ['title' => 'Pre Buds', 'category' => 'Quran', 'format' => 'live', 'live_provider' => 'livekit', 'status' => 'published', 'audience' => 'all'])->assertOk()->json();
        $lesson = \App\Models\CourseLesson::create(['course_id' => $c['id'], 'title' => 'Meet Nooni', 'position' => 1]);
        \Illuminate\Support\Facades\Storage::disk('public')->put("courses/{$c['id']}/book.pdf", '%PDF-1.4 test');
        $item = \App\Models\CourseItem::create(['course_id' => $c['id'], 'course_lesson_id' => $lesson->id, 'kind' => 'pdf', 'title' => 'Textbook',
            'url' => \Illuminate\Support\Facades\Storage::disk('public')->url("courses/{$c['id']}/book.pdf"), 'position' => 1]);

        $this->actingAs($s)->postJson("/api/courses/{$c['id']}/enroll")->assertOk();
        $this->actingAs($s)->getJson("/api/courses/{$c['id']}")->assertOk()->assertJsonPath('lessons.0.title', 'Meet Nooni')->assertJsonPath('lessons.0.items.0.title', 'Textbook');
        $this->actingAs($s)->get("/api/course-items/{$item->id}/pdf")->assertOk()->assertHeader('Content-Type', 'application/pdf');
        $this->actingAs($boss)->get("/api/course-items/{$item->id}/pdf")->assertOk();
        $this->actingAs($other)->get("/api/course-items/{$item->id}/pdf")->assertForbidden();

        // Hand in a finished worksheet; the teacher (super admin here) sees it, other institutions' staff do not.
        \Illuminate\Support\Facades\Storage::fake('local');
        $file = \Illuminate\Http\UploadedFile::fake()->image('my-work.jpg');
        $this->actingAs($other)->post("/api/course-items/{$item->id}/work", ['file' => $file], ['Accept' => 'application/json'])->assertForbidden();
        $this->actingAs($s)->post("/api/course-items/{$item->id}/work", ['file' => $file], ['Accept' => 'application/json'])->assertOk()->assertJsonPath('0.name', 'my-work.jpg');
        $this->actingAs($s)->getJson("/api/course-items/{$item->id}/work")->assertOk()->assertJsonCount(1);
        $this->actingAs($boss)->getJson("/api/super/manage/courses/{$c['id']}/work")->assertOk()->assertJsonPath('0.student', 'Sara')->assertJsonPath('0.lesson', 'Meet Nooni');
        $t2 = Tenant::create(['name' => 'Other', 'code' => 'OTH222']);
        $admin2 = User::create(['name' => 'A2', 'email' => 'a2@x.test', 'password' => 'secret123', 'role' => 'admin', 'tenant_id' => $t2->id]);
        $this->actingAs($admin2)->getJson("/api/manage/courses/{$c['id']}/work")->assertForbidden();
    }
}
