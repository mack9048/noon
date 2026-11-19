<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\NooniBrain;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class NooniTest extends TestCase
{
    use RefreshDatabase;

    private function fakeBrain(?array $answer, bool $configured = true): object
    {
        $fake = new class($answer, $configured) extends NooniBrain {
            public array $seen = [];

            public function __construct(private ?array $a, private bool $on) {}

            public function configured(): bool { return $this->on; }

            public function answer(string $about, array $messages, array $screenKeys): ?array
            {
                $this->seen = compact('about', 'messages', 'screenKeys');

                return $this->a;
            }
        };
        $this->app->instance(NooniBrain::class, $fake);

        return $fake;
    }

    public function test_student_asks_nooni_with_lesson_context_and_screens(): void
    {
        $t = $this->madrasa('NOON01');
        $s = $this->member($t, 'student');
        $fake = $this->fakeBrain(['reply' => 'Alif is the first letter.', 'open' => 'courses']);
        $this->as($s)->postJson('/api/nooni', [
            'messages' => [['role' => 'assistant', 'content' => 'Hi'], ['role' => 'user', 'content' => 'What is alif?']],
            'lang' => 'ml',
            'screens' => [['key' => 'courses', 'label' => 'My courses'], ['key' => 'games', 'label' => 'Games']],
            'context' => ['course' => 'Arabic for Beginners', 'lesson' => 'Letters'],
        ])->assertOk()->assertJson(['reply' => 'Alif is the first letter.', 'open' => 'courses']);
        // A leading assistant message is dropped; context and screens reach the prompt.
        $this->assertSame('user', $fake->seen['messages'][0]['role']);
        $this->assertStringContainsString('Arabic for Beginners', $fake->seen['about']);
        $this->assertStringContainsString('Malayalam', $fake->seen['about']);
        $this->assertSame(['courses', 'games'], $fake->seen['screenKeys']);
    }

    public function test_bad_input_limits_and_not_configured(): void
    {
        $t = $this->madrasa('NOON01');
        $s = $this->member($t, 'student');
        $ask = fn () => $this->as($s)->postJson('/api/nooni', ['messages' => [['role' => 'user', 'content' => 'Salam']]]);

        $this->fakeBrain(['reply' => 'x', 'open' => null], configured: false);
        $ask()->assertStatus(503);

        $this->fakeBrain(['reply' => 'Wa alaikum salam', 'open' => null]);
        $this->as($s)->postJson('/api/nooni', ['messages' => [['role' => 'user', 'content' => 'x']], 'screens' => [['key' => 'Bad Key!', 'label' => 'x']]])->assertUnprocessable();
        $this->as($s)->postJson('/api/nooni', ['messages' => [['role' => 'user', 'content' => str_repeat('a', 1501)]]])->assertUnprocessable();
        $this->as($s)->postJson('/api/nooni', ['messages' => [['role' => 'assistant', 'content' => 'only me']]])->assertUnprocessable();

        config(['services.anthropic.daily_limit' => 2]);
        $ask()->assertOk();
        $ask()->assertOk();
        $this->assertSame(429, $ask()->status());

        // AI failure is a friendly 503, and guests can use Nooni too.
        $this->fakeBrain(null);
        $g = User::create(['name' => 'G', 'email' => 'g@x.test', 'password' => 'secret123', 'role' => 'guest']);
        $this->as($g)->postJson('/api/nooni', ['messages' => [['role' => 'user', 'content' => 'Hi']]])->assertStatus(503);
    }
}
