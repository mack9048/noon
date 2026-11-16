<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\Fee;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FeeTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_adds_fees_records_payment_and_students_and_parents_see_their_own(): void
    {
        $b = Board::create(['code' => 'AP', 'name' => 'Sunni Vidyabhyasa Board']);
        $c5 = $b->classes()->create(['label' => '5', 'position' => 4]);
        $c3 = $b->classes()->create(['label' => '3', 'position' => 2]);
        $t = $this->madrasa('NOON01');
        $admin = $this->member($t, 'admin');
        $parent = $this->member($t, 'parent');
        $s1 = $this->member($t, 'student', ['class_id' => $c5->id, 'parent_id' => $parent->id]);
        $s2 = $this->member($t, 'student', ['class_id' => $c5->id]);
        $s3 = $this->member($t, 'student', ['class_id' => $c3->id]);

        // A brand-new school starts with nothing
        $this->as($admin)->getJson('/api/admin/fees?month=2026-11')->assertOk()->assertJsonPath('summary.expected', 0)->assertJsonCount(0, 'fees');

        $this->as($admin)->postJson('/api/admin/fees', ['title' => 'November fee', 'month' => '2026-11', 'amount' => 800, 'due_date' => '2026-11-10', 'scope' => 'class', 'class_id' => $c5->id])
            ->assertCreated()->assertJsonPath('created', 2);
        // Adding again skips students who already have it
        $this->as($admin)->postJson('/api/admin/fees', ['title' => 'November fee', 'month' => '2026-11', 'amount' => 800, 'due_date' => '2026-11-10', 'scope' => 'all'])
            ->assertCreated()->assertJsonPath('created', 1)->assertJsonPath('skipped', 2);

        $fee = Fee::where('student_id', $s1->id)->first();
        $this->as($admin)->postJson("/api/admin/fees/{$fee->id}/pay", ['method' => 'upi'])
            ->assertOk()->assertJsonPath('status', 'paid')->assertJsonPath('receipt_no', 'NOON01-R'.str_pad((string) $fee->id, 5, '0', STR_PAD_LEFT));

        $this->as($admin)->getJson('/api/admin/fees?month=2026-11')->assertOk()
            ->assertJsonPath('summary.expected', 2400)->assertJsonPath('summary.collected', 800)->assertJsonPath('summary.paid', 1);

        $this->as($s2)->getJson('/api/fees')->assertOk()->assertJsonPath('due_total', 800)->assertJsonCount(1, 'fees');
        $this->as($parent)->getJson('/api/fees')->assertOk()->assertJsonPath('fees.0.status', 'paid')->assertJsonPath('fees.0.student.id', $s1->id);

        // Other school's admin sees nothing and cannot pay
        $other = $this->member($this->madrasa('OTHER2'), 'admin');
        $this->as($other)->getJson('/api/admin/fees?month=2026-11')->assertJsonCount(0, 'fees');
        $this->as($other)->postJson("/api/admin/fees/{$fee->id}/pay", ['method' => 'cash'])->assertNotFound();
        $this->as($s3)->postJson('/api/admin/fees', ['title' => 'x', 'month' => '2026-11', 'amount' => 1, 'due_date' => '2026-11-10', 'scope' => 'all'])->assertForbidden();
    }
}
