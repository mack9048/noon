<?php

namespace Tests\Feature;

use App\Models\Batch;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LiveSessionTest extends TestCase
{
    use RefreshDatabase;

    public function test_teacher_schedules_a_meet_and_only_that_batch_sees_it(): void
    {
        $t = $this->madrasa('NOON01');
        $teacher = $this->member($t, 'teacher');
        $inBatch = $this->member($t, 'student');
        $other = $this->member($t, 'student');
        $parent = $this->member($t, 'parent');
        $inBatch->forceFill(['parent_id' => $parent->id])->save();
        $batch = Batch::create(['tenant_id' => $t->id, 'name' => 'Class 5', 'board' => 'AP', 'class_label' => '5', 'days' => [], 'start_time' => '5 PM', 'seats' => 10]);
        $batch->students()->attach($inBatch->id);

        $this->as($teacher)->postJson('/api/staff/live-sessions', ['title' => 'Fiqh lesson 4', 'batch_id' => $batch->id, 'starts_at' => now()->addHour()->toIso8601String(), 'meet_url' => 'http://meet.google.com/abc'])->assertStatus(422);
        $id = $this->as($teacher)->postJson('/api/staff/live-sessions', ['title' => 'Fiqh lesson 4', 'batch_id' => $batch->id, 'starts_at' => now()->addMinutes(10)->toIso8601String(), 'meet_url' => 'https://meet.google.com/abc-defg-hij'])
            ->assertCreated()->assertJsonPath('state', 'live')->json('id');
        $this->as($teacher)->postJson('/api/staff/live-sessions', ['title' => 'Parents meeting', 'kind' => 'meeting', 'starts_at' => now()->addDay()->toIso8601String(), 'meet_url' => 'https://meet.google.com/xyz'])->assertCreated();

        $this->as($inBatch)->getJson('/api/live-sessions')->assertOk()->assertJsonCount(2);
        $this->as($parent)->getJson('/api/live-sessions')->assertOk()->assertJsonCount(2);
        $this->as($other)->getJson('/api/live-sessions')->assertOk()->assertJsonCount(1)->assertJsonPath('0.title', 'Parents meeting');
        $this->as($other)->getJson("/api/live-sessions/{$id}")->assertNotFound();
        $this->as($inBatch)->postJson('/api/staff/live-sessions', ['title' => 'x', 'starts_at' => now()->toIso8601String(), 'meet_url' => 'https://meet.google.com/x'])->assertForbidden();

        $other2 = $this->member($this->madrasa('OTHER1'), 'teacher');
        $this->as($other2)->deleteJson("/api/staff/live-sessions/{$id}")->assertNotFound();
        $this->as($teacher)->deleteJson("/api/staff/live-sessions/{$id}")->assertNoContent();
    }
}
