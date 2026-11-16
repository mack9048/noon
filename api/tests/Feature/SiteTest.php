<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SiteTest extends TestCase
{
    private function boss(): User
    {
        return User::create(['name' => 'Boss', 'email' => 'boss@x.test', 'password' => 'secret123', 'role' => 'super']);
    }

    public function test_drafts_are_private_until_published_and_publish_starts_a_build(): void
    {
        config(['noon.site.deploy_hook' => 'https://api.vercel.com/v1/integrations/deploy/test']);
        Http::fake(['api.vercel.com/*' => Http::response(['job' => ['id' => 'x']], 201)]);
        $boss = $this->boss();

        $this->getJson('/api/site/content')->assertOk()->assertExactJson(['pages' => [], 'updated' => null]);

        $r = $this->as($boss)->putJson('/api/super/site/courses', [
            'fields' => ['0.2.0.1' => 'All our *Courses*', 'meta:title' => 'Courses', 'bad key!' => 'x'],
            'lists' => ['2.0.2' => [['src' => 1, 'fields' => ['i.1' => 'Thajweed 2']], ['src' => null, 'fields' => ['i.1' => 'New course']]]],
        ])->assertOk()->assertJsonPath('changed', true)->json();
        $this->assertSame('All our *Courses*', $r['draft']['fields']['0.2.0.1']);
        $this->assertArrayNotHasKey('bad key!', $r['draft']['fields']);
        $this->assertSame('New course', $r['draft']['lists']['2.0.2'][1]['fields']['i.1']);

        // Nothing public yet.
        $this->getJson('/api/site/content')->assertJsonPath('pages', []);
        $this->as($boss)->getJson('/api/super/site')->assertJsonPath('unpublished', 1)->assertJsonPath('deploy_hook', true);

        $this->as($boss)->postJson('/api/super/site/publish')->assertOk()->assertJsonPath('pages', 1)->assertJsonPath('deploy', 'started');
        Http::assertSentCount(1);

        $live = $this->getJson('/api/site/content')->json('pages.courses');
        $this->assertSame('Courses', $live['fields']['meta:title']);
        $this->assertSame('New course', $live['lists']['2.0.2'][1]['fields']['i.1']);
        $this->assertNull($live['lists']['2.0.2'][1]['src']);
        $this->as($boss)->getJson('/api/super/site')->assertJsonPath('unpublished', 0)->assertJsonPath('last_publish.deploy', 'started');

        // Discard brings the draft back to what is live.
        $this->as($boss)->putJson('/api/super/site/courses', ['fields' => ['meta:title' => 'Oops']])->assertJsonPath('changed', true);
        $this->as($boss)->postJson('/api/super/site/courses/discard')->assertJsonPath('changed', false)->assertJsonPath('draft.fields.meta:title', 'Courses');
    }

    public function test_only_the_super_admin_can_edit_the_website(): void
    {
        $t = $this->madrasa();
        foreach (['admin', 'teacher', 'student'] as $role) {
            $this->as($this->member($t, $role))->putJson('/api/super/site/index', ['fields' => ['x' => 'y']])->assertForbidden();
            $this->as($this->member($t, $role))->postJson('/api/super/site/publish')->assertForbidden();
        }
        $this->as($this->boss())->getJson('/api/super/site/..%2Fetc')->assertNotFound();
    }

    public function test_image_upload_and_publish_without_a_deploy_hook(): void
    {
        Storage::fake('public');
        config(['noon.site.deploy_hook' => null]);
        $boss = $this->boss();
        $url = $this->as($boss)->post('/api/super/site/upload', ['image' => UploadedFile::fake()->image('hero.png', 400, 300)], ['Accept' => 'application/json'])
            ->assertOk()->json('url');
        $this->assertStringContainsString('/storage/site/', $url);
        $this->as($boss)->post('/api/super/site/upload', ['image' => UploadedFile::fake()->create('x.svg', 2, 'image/svg+xml')], ['Accept' => 'application/json'])->assertStatus(422);

        $this->as($boss)->putJson('/api/super/site/index', ['fields' => ['5.0.0.0.0@src' => $url]]);
        $this->as($boss)->postJson('/api/super/site/publish')->assertJsonPath('deploy', 'not_configured');
        $this->assertSame($url, $this->getJson('/api/site/content')->json('pages.index')['fields']['5.0.0.0.0@src']);
    }
}
