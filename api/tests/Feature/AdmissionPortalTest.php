<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdmissionPortalTest extends TestCase
{
    use RefreshDatabase;

    private function board(): void
    {
        $b = Board::create(['code' => 'AP', 'name' => 'Sunni Vidyabhyasa Board']);
        $b->classes()->create(['label' => '5', 'position' => 4]);
    }

    public function test_admin_adds_one_student_with_parent_logins(): void
    {
        $this->board();
        $t = $this->madrasa('NOON01');
        $admin = $this->member($t, 'admin');

        $res = $this->as($admin)->postJson('/api/admin/students', [
            'name' => 'Rayan', 'board' => 'AP', 'cls' => '5', 'parent_name' => 'Abdul', 'parent_phone' => '+971 50 111 2222', 'password' => 'student123',
        ])->assertCreated()->assertJsonPath('student.cls', '5')->assertJsonPath('credentials.0.login', 'NOON01-0001');

        $parentPw = $res->json('credentials.1.password');
        $this->assertTrue(Hash::check('student123', User::where('admission_no', 'NOON01-0001')->first()->password));
        $this->postJson('/api/auth/login', ['login' => '971501112222', 'password' => $parentPw])->assertOk()->assertJsonPath('user.role', 'parent');

        // a sibling reuses the same parent account
        $this->as($admin)->postJson('/api/admin/students', ['name' => 'Sara', 'board' => 'AP', 'cls' => '5', 'parent_phone' => '971501112222'])
            ->assertCreated()->assertJsonPath('credentials.1.password', null);
        $this->as($admin)->getJson('/api/admin/students')->assertOk()->assertJsonCount(2);
    }

    public function test_campaign_portal_enquiry_lead_application_and_admit(): void
    {
        $this->board();
        $t = $this->madrasa('NOON01');
        $admin = $this->member($t, 'admin');

        $c = $this->as($admin)->postJson('/api/admin/campaigns', ['title' => 'Admissions 2026–27', 'academic_year' => '2026–27', 'classes' => ['1', '5'], 'seats' => 30])
            ->assertCreated()->json();

        // public page + enquiry (no login)
        $this->app['auth']->forgetGuards();
        $this->getJson("/api/portal/{$c['code']}")->assertOk()->assertJsonPath('campaign.title', 'Admissions 2026–27')->assertJsonPath('institution.name', $t->name);
        $this->postJson("/api/portal/{$c['code']}/enquire", ['student_name' => 'Amna', 'parent_name' => 'Sherin', 'phone' => '971554047788', 'cls' => '5'])->assertCreated();

        $lead = Lead::withoutGlobalScopes()->first();
        $this->assertSame('portal', $lead->source);
        $this->assertSame($c['id'], $lead->campaign_id);

        // follow up, then convert to an application and admit
        $this->as($admin)->patchJson("/api/admin/leads/{$lead->id}", ['status' => 'contacted', 'note' => 'Called, visiting Friday', 'follow_up_on' => now()->addDays(3)->toDateString()])
            ->assertOk()->assertJsonPath('status', 'contacted');
        $ref = $this->as($admin)->postJson("/api/admin/leads/{$lead->id}/convert", ['gender' => 'Girl', 'board' => 'AP', 'cls' => '5'])
            ->assertOk()->assertJsonPath('lead.status', 'applied')->json('application.id');

        $admit = $this->as($admin)->postJson("/api/admin/admissions/{$ref}/admit")->assertOk()->assertJsonPath('application.status', 'admitted');
        $this->assertSame('student', User::find($admit->json('student_id'))->role);
        $this->assertSame('admitted', $lead->fresh()->status);
        $this->as($admin)->postJson("/api/admin/admissions/{$ref}/admit")->assertStatus(422);
        $this->as($admin)->getJson('/api/admin/campaigns')->assertJsonPath('0.admitted', 1)->assertJsonPath('0.seats_left', 29);

        // apply online with the campaign code
        $this->app['auth']->forgetGuards();
        $this->postJson("/api/apply/{$c['code']}", ['name' => 'Yusuf Hameed', 'gender' => 'Boy', 'board' => 'AP', 'cls' => '5', 'parent' => 'Hameed', 'phone' => '971501112233'])->assertCreated();
    }

    public function test_other_institutions_cannot_see_leads_or_students(): void
    {
        $this->board();
        $a = $this->madrasa('AAA111');
        $b = $this->madrasa('BBB222');
        $adminA = $this->member($a, 'admin');
        $adminB = $this->member($b, 'admin');
        $lead = $this->as($adminA)->postJson('/api/admin/leads', ['student_name' => 'Kid', 'phone' => '971500000001'])->assertCreated()->json('id');
        $kid = $this->as($adminA)->postJson('/api/admin/students', ['name' => 'Kid', 'board' => 'AP', 'cls' => '5'])->json('student.id');

        $this->as($adminB)->getJson('/api/admin/leads')->assertOk()->assertJsonCount(0);
        $this->as($adminB)->patchJson("/api/admin/leads/{$lead}", ['status' => 'lost'])->assertNotFound();
        $this->as($adminB)->getJson("/api/admin/students/{$kid}")->assertNotFound();
    }

    public function test_admin_adds_a_teacher_with_login(): void
    {
        $t = $this->madrasa('NOON01');
        $admin = $this->member($t, 'admin');
        $pw = $this->as($admin)->postJson('/api/admin/teachers', ['name' => 'Ustad Ali', 'email' => 'ali@x.test'])->assertCreated()->json('credentials.0.password');
        $this->as($admin)->getJson('/api/admin/teachers')->assertOk()->assertJsonCount(1)->assertJsonPath('0.name', 'Ustad Ali');
        $this->app['auth']->forgetGuards();
        $this->postJson('/api/auth/login', ['login' => 'ali@x.test', 'password' => $pw])->assertOk()->assertJsonPath('user.role', 'teacher');
    }
}
