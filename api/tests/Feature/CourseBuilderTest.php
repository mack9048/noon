<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CourseBuilderTest extends TestCase
{
    use RefreshDatabase;

    private function boss(): User
    {
        return User::create(['name' => 'Boss', 'email' => 'boss@x.test', 'password' => 'secret123', 'role' => 'super']);
    }

    public function test_course_subject_lesson_and_content_are_saved_and_reordered(): void
    {
        Storage::fake('public');
        Storage::fake('local');
        $boss = $this->boss();
        $c = $this->as($boss)->postJson('/api/super/courses', ['title' => 'Arabic for Beginners', 'category' => 'Arabic', 'status' => 'draft'])->json();

        // Optional subject, and a lesson straight under the course.
        $grammar = $this->as($boss)->postJson("/api/super/courses/{$c['id']}/subjects", ['title' => 'Grammar'])->assertOk()->json();
        $l1 = $this->as($boss)->postJson("/api/super/courses/{$c['id']}/lessons", ['title' => 'Alphabet'])->assertOk()->json();
        $l2 = $this->as($boss)->postJson("/api/super/courses/{$c['id']}/lessons", ['title' => 'Harakath', 'subject_id' => $grammar['id']])->assertOk()
            ->assertJsonPath('subject_id', $grammar['id'])->json();

        // Content: two audios, a PDF, an HTML file, pasted HTML and a note.
        $a1 = $this->as($boss)->post("/api/super/course-lessons/{$l1['id']}/items", ['kind' => 'audio', 'title' => 'Listen 1', 'file' => UploadedFile::fake()->create('a.mp3', 200, 'audio/mpeg')])->assertOk()->json();
        $a2 = $this->as($boss)->post("/api/super/course-lessons/{$l1['id']}/items", ['kind' => 'audio', 'title' => 'Listen 2', 'file' => UploadedFile::fake()->create('b.mp3', 200, 'audio/mpeg')])->assertOk()->json();
        $this->as($boss)->post("/api/super/course-lessons/{$l1['id']}/items", ['kind' => 'pdf', 'title' => 'Book', 'file' => UploadedFile::fake()->create('b.pdf', 50, 'application/pdf')])->assertOk();
        $h = $this->as($boss)->post("/api/super/course-lessons/{$l1['id']}/items", ['kind' => 'html', 'title' => 'Letter game', 'file' => UploadedFile::fake()->createWithContent('game.html', '<h1>Game</h1>')])->assertOk()
            ->assertJsonPath('has_file', true)->assertJsonPath('url', null)->json();
        $this->as($boss)->postJson("/api/super/course-lessons/{$l1['id']}/items", ['kind' => 'html', 'title' => 'Pasted', 'body' => '<p>Hi</p>'])->assertOk()->assertJsonPath('has_file', true);
        $this->as($boss)->postJson("/api/super/course-lessons/{$l1['id']}/items", ['kind' => 'note', 'title' => 'Note', 'body' => 'Read page 3'])->assertOk()->assertJsonPath('body', 'Read page 3');
        // Wrong file for the kind, and HTML with nothing in it.
        $this->as($boss)->post("/api/super/course-lessons/{$l1['id']}/items", ['kind' => 'audio', 'title' => 'x', 'file' => UploadedFile::fake()->create('x.pdf', 5, 'application/pdf')], ['Accept' => 'application/json'])->assertUnprocessable();
        $this->as($boss)->postJson("/api/super/course-lessons/{$l1['id']}/items", ['kind' => 'html', 'title' => 'Empty'])->assertUnprocessable();

        // Reorder content: second audio first.
        $this->as($boss)->postJson("/api/super/course-lessons/{$l1['id']}/order", ['items' => [$a2['id'], $a1['id']]])->assertOk()
            ->assertJsonPath('items.0.id', $a2['id'])->assertJsonPath('items.1.id', $a1['id']);

        // Edit a lesson, then reorder lessons and move the first into the subject.
        $this->as($boss)->putJson("/api/super/course-lessons/{$l1['id']}", ['title' => 'The alphabet', 'free_preview' => true])->assertOk()->assertJsonPath('title', 'The alphabet');
        $tree = $this->as($boss)->postJson("/api/super/courses/{$c['id']}/order", ['lessons' => [['id' => $l2['id'], 'subject_id' => $grammar['id']], ['id' => $l1['id'], 'subject_id' => $grammar['id']]]])->assertOk()->json();
        $this->assertSame([$l2['id'], $l1['id']], array_column($tree['lessons'], 'id'));
        $this->assertSame($grammar['id'], $tree['lessons'][1]['subject_id']);
        $this->assertSame(2, $tree['lessons_count']);

        // The course name never changes while editing lessons.
        $this->as($boss)->getJson("/api/super/courses/{$c['id']}")->assertJsonPath('title', 'Arabic for Beginners');

        // Deleting the subject keeps its lessons.
        $this->as($boss)->deleteJson("/api/super/course-subjects/{$grammar['id']}")->assertNoContent();
        $this->as($boss)->getJson("/api/super/courses/{$c['id']}")->assertJsonCount(2, 'lessons')->assertJsonPath('lessons.0.subject_id', null);

        // A lesson from another course can't be put in this one.
        $other = $this->as($boss)->postJson('/api/super/courses', ['title' => 'Other', 'category' => 'Fiqh'])->json();
        $ol = $this->as($boss)->postJson("/api/super/courses/{$other['id']}/lessons", ['title' => 'X'])->json();
        $this->as($boss)->postJson("/api/super/courses/{$c['id']}/order", ['lessons' => [['id' => $ol['id']]]])->assertUnprocessable();

        // Deleting an item removes its private HTML file.
        $this->assertCount(2, Storage::disk('local')->files('course-html'));
        $this->as($boss)->deleteJson("/api/super/course-items/{$h['id']}")->assertNoContent();
        $this->assertCount(1, Storage::disk('local')->files('course-html'));
    }

    public function test_students_see_lessons_and_open_html_only_when_allowed(): void
    {
        Storage::fake('local');
        $boss = $this->boss();
        $t = Tenant::create(['name' => 'Institution A', 'code' => 'AAA111']);
        $s = User::create(['name' => 'S', 'email' => 's@x.test', 'password' => 'secret123', 'role' => 'student', 'tenant_id' => $t->id]);
        $c = $this->as($boss)->postJson('/api/super/courses', ['title' => 'Arabic', 'category' => 'Arabic', 'status' => 'published', 'audience' => 'all'])->json();
        $free = $this->as($boss)->postJson("/api/super/courses/{$c['id']}/lessons", ['title' => 'Free one', 'free_preview' => true])->json();
        $paid = $this->as($boss)->postJson("/api/super/courses/{$c['id']}/lessons", ['title' => 'Paid one'])->json();
        $hf = $this->as($boss)->postJson("/api/super/course-lessons/{$free['id']}/items", ['kind' => 'html', 'title' => 'G1', 'body' => '<p>1</p>'])->json();
        $hp = $this->as($boss)->postJson("/api/super/course-lessons/{$paid['id']}/items", ['kind' => 'html', 'title' => 'G2', 'body' => '<p>2</p>'])->json();

        $this->as($s)->getJson("/api/courses/{$c['id']}")->assertOk()->assertJsonCount(2, 'lessons')->assertJsonPath('lessons.1.title', 'Paid one')->assertJsonCount(2, 'items');
        $this->as($s)->getJson("/api/course-items/{$hf['id']}/open")->assertOk();
        $this->as($s)->getJson("/api/course-items/{$hp['id']}/open")->assertForbidden();
        $this->as($s)->postJson("/api/courses/{$c['id']}/enroll")->assertOk();
        $url = $this->as($s)->getJson("/api/course-items/{$hp['id']}/open")->assertOk()->json('url');

        // The file is served only with the signature, inside a sandbox.
        $path = parse_url($url, PHP_URL_PATH).'?'.parse_url($url, PHP_URL_QUERY);
        $this->get($path)->assertOk()->assertSee('<p>2</p>', false)->assertHeader('Content-Security-Policy');
        $this->get(parse_url($url, PHP_URL_PATH))->assertForbidden();

        // Only super admin builds courses.
        $this->as($s)->postJson("/api/super/courses/{$c['id']}/lessons", ['title' => 'Hack'])->assertForbidden();
    }

    public function test_categories_can_be_added_renamed_and_removed(): void
    {
        $boss = $this->boss();
        $this->as($boss)->getJson('/api/course-categories')->assertOk()->assertJsonPath('0.name', 'Arabic');
        $cat = $this->as($boss)->postJson('/api/super/course-categories', ['name' => 'Akhlaq'])->assertOk()->json();
        $this->as($boss)->postJson('/api/super/course-categories', ['name' => 'Akhlaq'])->assertUnprocessable();
        $c = $this->as($boss)->postJson('/api/super/courses', ['title' => 'Good manners', 'category' => 'Akhlaq'])->json();
        // Renaming moves its courses too; a category in use can't be deleted.
        $this->as($boss)->putJson("/api/super/course-categories/{$cat['id']}", ['name' => 'Adab'])->assertOk();
        $this->as($boss)->getJson("/api/super/courses/{$c['id']}")->assertJsonPath('category', 'Adab');
        $this->as($boss)->deleteJson("/api/super/course-categories/{$cat['id']}")->assertUnprocessable();
        $this->as($boss)->deleteJson("/api/super/courses/{$c['id']}")->assertNoContent();
        $this->as($boss)->deleteJson("/api/super/course-categories/{$cat['id']}")->assertNoContent();
    }

    public function test_continue_shows_the_next_lesson_after_the_last_completed(): void
    {
        $boss = $this->boss();
        $t = Tenant::create(['name' => 'Inst A', 'code' => 'AAA111']);
        $s = User::create(['name' => 'S', 'email' => 's@x.test', 'password' => 'secret123', 'role' => 'student', 'tenant_id' => $t->id]);
        $this->as($s)->getJson('/api/courses/continue')->assertOk()->assertExactJson([]);
        $c = $this->as($boss)->postJson('/api/super/courses', ['title' => 'Arabic', 'category' => 'Arabic', 'status' => 'published', 'audience' => 'all'])->json();
        $sub = $this->as($boss)->postJson("/api/super/courses/{$c['id']}/subjects", ['title' => 'Reading'])->json();
        // Made in this order, but the subject's lesson comes after the loose one in the player.
        $l2 = $this->as($boss)->postJson("/api/super/courses/{$c['id']}/lessons", ['title' => 'Two', 'subject_id' => $sub['id']])->json();
        $l1 = $this->as($boss)->postJson("/api/super/courses/{$c['id']}/lessons", ['title' => 'One'])->json();
        $item = fn ($l, $title) => $this->as($boss)->postJson("/api/super/course-lessons/{$l['id']}/items", ['kind' => 'note', 'title' => $title, 'body' => 'x'])->json();
        $a = $item($l1, 'A'); $b = $item($l1, 'B'); $c2 = $item($l2, 'C');
        $this->as($s)->postJson("/api/courses/{$c['id']}/enroll")->assertOk();

        $this->as($s)->getJson('/api/courses/continue')->assertOk()
            ->assertJsonPath('course.id', $c['id'])->assertJsonPath('lesson.id', $l1['id'])->assertJsonPath('item.id', $a['id'])->assertJsonPath('done', 0);
        $this->as($s)->postJson("/api/course-items/{$b['id']}/complete")->assertNoContent();
        // After B comes C (next lesson), even though A is still open.
        $this->as($s)->getJson('/api/courses/continue')->assertJsonPath('lesson.id', $l2['id'])->assertJsonPath('lesson.number', 2)->assertJsonPath('item.id', $c2['id']);
        $this->as($s)->postJson("/api/course-items/{$c2['id']}/complete");
        $this->as($s)->getJson('/api/courses/continue')->assertJsonPath('item.id', $a['id']);
        $this->as($s)->postJson("/api/course-items/{$a['id']}/complete");
        $this->as($s)->getJson('/api/courses/continue')->assertJsonPath('finished', true)->assertJsonPath('item', null)->assertJsonPath('total', 3);
        // A chosen course; one the student has not joined gives nothing.
        $this->as($s)->getJson("/api/courses/continue?course={$c['id']}")->assertJsonPath('course.id', $c['id']);
        $this->as($s)->getJson('/api/courses/continue?course=99999')->assertExactJson([]);
    }
}
