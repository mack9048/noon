<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ContentBinTest extends TestCase
{
    use RefreshDatabase;

    public function test_deleted_courses_games_and_resources_go_to_the_bin_and_come_back(): void
    {
        Storage::fake('public');
        Storage::fake('local');
        $boss = User::create(['name' => 'Boss', 'email' => 'boss@x.test', 'password' => 'secret123', 'role' => 'super']);
        $guest = User::create(['name' => 'G', 'email' => 'g@x.test', 'password' => 'secret123', 'role' => 'guest']);

        // Course: delete hides it everywhere, the bin lists it, restore brings it back as a draft.
        $c = $this->as($boss)->postJson('/api/super/courses', ['title' => 'Arabic', 'category' => 'Arabic', 'status' => 'published', 'audience' => 'all'])->json();
        $l = $this->as($boss)->postJson("/api/super/courses/{$c['id']}/lessons", ['title' => 'One'])->json();
        $this->as($boss)->post("/api/super/course-lessons/{$l['id']}/items", ['kind' => 'pdf', 'title' => 'Book', 'file' => UploadedFile::fake()->create('b.pdf', 10, 'application/pdf')])->assertOk();
        $this->as($boss)->deleteJson("/api/super/courses/{$c['id']}")->assertNoContent();
        $this->as($guest)->getJson("/api/courses/{$c['id']}")->assertNotFound();
        $this->as($boss)->getJson('/api/super/courses')->assertJsonCount(0);
        $this->as($boss)->getJson('/api/super/courses?deleted=1')->assertJsonCount(1)->assertJsonPath('0.id', $c['id']);
        $this->as($boss)->postJson("/api/super/courses/{$c['id']}/restore")->assertOk()->assertJsonPath('status', 'draft');
        $this->as($boss)->getJson('/api/super/courses')->assertJsonCount(1);
        // Delete for good removes it and its files; only from the bin.
        $this->as($boss)->deleteJson("/api/super/courses/{$c['id']}/forever")->assertNotFound();
        $this->as($boss)->deleteJson("/api/super/courses/{$c['id']}");
        $this->assertCount(1, Storage::disk('public')->allFiles());
        $this->as($boss)->deleteJson("/api/super/courses/{$c['id']}/forever")->assertNoContent();
        $this->assertCount(0, Storage::disk('public')->allFiles());
        $this->as($boss)->getJson('/api/super/courses?deleted=1')->assertJsonCount(0);

        // Game: the file stays while it is in the bin.
        $g = $this->as($boss)->post('/api/super/games', ['title' => 'Letters', 'status' => 'live', 'html' => UploadedFile::fake()->createWithContent('g.html', '<!doctype html><p>x</p>')], ['Accept' => 'application/json'])->assertCreated()->json();
        $this->as($boss)->deleteJson("/api/super/games/{$g['id']}")->assertNoContent();
        $this->as($guest)->getJson('/api/games')->assertJsonCount(0);
        $this->assertCount(1, Storage::disk('local')->allFiles());
        $this->as($boss)->getJson('/api/super/games?deleted=1')->assertJsonCount(1);
        $this->as($boss)->postJson("/api/super/games/{$g['id']}/restore")->assertOk();
        $this->as($guest)->getJson('/api/games')->assertJsonCount(1);
        $this->as($boss)->deleteJson("/api/super/games/{$g['id']}");
        $this->as($boss)->deleteJson("/api/super/games/{$g['id']}/forever")->assertNoContent();
        $this->assertCount(0, Storage::disk('local')->allFiles());

        // Audio book resource: an audio file; a PDF is refused for it.
        $this->as($boss)->post('/api/super/study-tools', ['type' => 'audio', 'title' => 'Bedtime duas', 'file' => UploadedFile::fake()->create('x.pdf', 5, 'application/pdf')], ['Accept' => 'application/json'])->assertUnprocessable();
        $a = $this->as($boss)->post('/api/super/study-tools', ['type' => 'audio', 'title' => 'Bedtime duas', 'author' => 'Usthad', 'status' => 'live', 'file' => UploadedFile::fake()->create('a.mp3', 50, 'audio/mpeg')], ['Accept' => 'application/json'])->assertCreated()->json();
        $this->as($guest)->getJson('/api/study-tools?type=audio')->assertJsonCount(1)->assertJsonPath('0.author', 'Usthad');
        $this->as($boss)->deleteJson("/api/super/study-tools/{$a['id']}")->assertNoContent();
        $this->as($guest)->getJson('/api/study-tools?type=audio')->assertJsonCount(0);
        $this->as($boss)->getJson('/api/super/study-tools?deleted=1')->assertJsonCount(1);
        $this->as($boss)->postJson("/api/super/study-tools/{$a['id']}/restore")->assertOk();
        $this->as($boss)->deleteJson("/api/super/study-tools/{$a['id']}");
        $this->as($boss)->deleteJson("/api/super/study-tools/{$a['id']}/forever")->assertNoContent();
        $this->assertCount(0, Storage::disk('public')->allFiles());

        // Only super admin.
        $this->as($guest)->getJson('/api/super/courses?deleted=1')->assertForbidden();
    }
}
