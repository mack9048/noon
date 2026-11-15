<?php

namespace Tests\Feature;

use App\Models\Game;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class GameTest extends TestCase
{
    use RefreshDatabase;

    private function boss(): User
    {
        return User::create(['name' => 'Boss', 'email' => 'boss@x.test', 'password' => 'secret123', 'role' => 'super']);
    }

    private function html(string $name = 'game.html'): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($name, '<!doctype html><html><body><h1>Harf game</h1><script>1</script></body></html>');
    }

    public function test_super_admin_uploads_lists_reorders_and_deletes_games(): void
    {
        Storage::fake('local');
        Storage::fake('public');
        $boss = $this->boss();

        $a = $this->as($boss)->post('/api/super/games', ['title' => 'Harf Match', 'mode' => 'solo', 'audience' => 'all', 'status' => 'live', 'html' => $this->html(),
            'thumbnail' => UploadedFile::fake()->image('t.png', 300, 200)], ['Accept' => 'application/json'])
            ->assertCreated()->assertJsonPath('mode', 'solo')->json();
        $this->assertNotNull($a['thumbnail_url']);
        $b = $this->as($boss)->post('/api/super/games', ['title' => 'Team Quiz', 'mode' => 'group', 'status' => 'draft', 'html' => $this->html()], ['Accept' => 'application/json'])
            ->assertCreated()->json();
        Storage::disk('local')->assertExists(Game::find($a['id'])->html_path);

        $this->as($boss)->postJson('/api/super/games/reorder', ['ids' => [$b['id'], $a['id']]])->assertOk()->assertJsonPath('0.title', 'Team Quiz');
        $this->as($boss)->post("/api/super/games/{$b['id']}", ['title' => 'Team Quiz 2', 'status' => 'live'], ['Accept' => 'application/json'])->assertOk()->assertJsonPath('status', 'live');

        $path = Game::find($a['id'])->html_path;
        $this->as($boss)->deleteJson("/api/super/games/{$a['id']}")->assertNoContent();
        Storage::disk('local')->assertMissing($path);
    }

    public function test_only_html_files_are_accepted_and_only_super_admin_can_upload(): void
    {
        Storage::fake('local');
        $this->as($this->boss())->post('/api/super/games', ['title' => 'Bad', 'html' => UploadedFile::fake()->create('virus.exe', 10, 'application/octet-stream')], ['Accept' => 'application/json'])
            ->assertStatus(422);
        $t = $this->madrasa('NOON01');
        $this->as($this->member($t, 'admin'))->post('/api/super/games', ['title' => 'X', 'html' => $this->html()], ['Accept' => 'application/json'])->assertForbidden();
    }

    public function test_players_see_only_live_games_meant_for_them_and_play_through_a_signed_sandboxed_link(): void
    {
        Storage::fake('local');
        $boss = $this->boss();
        $t1 = $this->madrasa('NOON01');
        $t2 = $this->madrasa('OTHER2');
        $mk = fn ($title, $extra) => $this->as($boss)->post('/api/super/games', $extra + ['title' => $title, 'status' => 'live', 'html' => $this->html()], ['Accept' => 'application/json'])->json('id');
        $all = $mk('For all', ['audience' => 'all']);
        $mk('Guests only', ['audience' => 'guests']);
        $mk('Students only', ['audience' => 'students']);
        $mk('Only madrasa 2', ['audience' => 'students', 'tenant_ids' => (string) $t2->id]);
        $mk('Draft', ['audience' => 'all', 'status' => 'draft']);

        $student = $this->member($t1, 'student');
        $guest = User::create(['name' => 'G', 'role' => 'guest', 'password' => 'x']);
        $this->assertSame(['For all', 'Students only'], collect($this->as($student)->getJson('/api/games')->assertOk()->json())->pluck('title')->all());
        $this->assertSame(['For all', 'Guests only'], collect($this->as($guest)->getJson('/api/games')->json())->pluck('title')->all());

        $url = $this->as($student)->getJson("/api/games/{$all}/play")->assertOk()->json('url');
        $this->app['auth']->forgetGuards();
        $res = $this->get($url)->assertOk();
        $this->assertStringContainsString('Harf game', $res->getContent());
        $this->assertStringContainsString('sandbox allow-scripts', $res->headers->get('Content-Security-Policy'));
        $this->get("/api/games/{$all}/file")->assertForbidden(); // without the signature
        $this->assertSame(1, Game::find($all)->plays);
    }
}
