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

        // Without the AI key Nooni answers from the free question list.
        $this->fakeBrain(['reply' => 'x', 'open' => null], configured: false);
        $ask()->assertOk()->assertJsonPath('free', true)->assertJsonPath('reply', 'Wa alaikum assalam! I am Nooni. What shall we do today?');

        $this->fakeBrain(['reply' => 'Wa alaikum salam', 'open' => null]);
        $this->as($s)->postJson('/api/nooni', ['messages' => [['role' => 'user', 'content' => 'x']], 'screens' => [['key' => 'Bad Key!', 'label' => 'x']]])->assertUnprocessable();
        $this->as($s)->postJson('/api/nooni', ['messages' => [['role' => 'user', 'content' => str_repeat('a', 1501)]]])->assertUnprocessable();
        $this->as($s)->postJson('/api/nooni', ['messages' => [['role' => 'assistant', 'content' => 'only me']]])->assertUnprocessable();

        config(['services.anthropic.daily_limit' => 2]);
        $ask()->assertOk();
        $ask()->assertOk();
        // AI questions used up for today: free answers keep working.
        $ask()->assertOk()->assertJsonPath('free', true);

        // AI failure falls back to free answers, and guests can use Nooni too.
        $this->fakeBrain(null);
        $g = User::create(['name' => 'G', 'email' => 'g@x.test', 'password' => 'secret123', 'role' => 'guest']);
        $this->as($g)->postJson('/api/nooni', ['messages' => [['role' => 'user', 'content' => 'Hi']]])->assertOk()->assertJsonPath('free', true);
    }

    public function test_free_mode_answers_from_the_list_and_super_admin_edits_it(): void
    {
        $t = $this->madrasa('NOON01');
        $s = $this->member($t, 'student');
        $boss = User::create(['name' => 'Boss', 'email' => 'b@x.test', 'password' => 'secret123', 'role' => 'super']);
        $this->fakeBrain(['reply' => 'AI answer', 'open' => null]);
        $this->as($s)->getJson('/api/super/nooni')->assertForbidden();
        $this->as($boss)->putJson('/api/super/nooni/mode', ['mode' => 'free'])->assertOk()->assertJsonPath('mode', 'free');
        $ask = fn ($q, $lang = 'en') => $this->as($s)->postJson('/api/nooni', ['messages' => [['role' => 'user', 'content' => $q]], 'lang' => $lang, 'screens' => [['key' => 'fees', 'label' => 'Fees'], ['key' => 'live', 'label' => 'Live classes']]]);

        $ask('where can I pay my fees')->assertOk()->assertJsonPath('open', 'fees')->assertJsonPath('reply', 'Your fees are in Fees. You can see what is due and what is paid.');
        $ask('ഫീസ് എവിടെ', 'ml')->assertOk()->assertJsonPath('open', 'fees')->assertJsonPath('reply', 'ഫീസ് വിവരങ്ങൾ Fees-ൽ ഉണ്ട്. അടയ്ക്കാനുള്ളതും അടച്ചതും കാണാം.');
        $ask('tell me about dinosaurs')->assertOk()->assertJsonPath('open', null)->assertJsonCount(4, 'suggestions');

        // The super admin adds a question; it works straight away.
        $this->as($boss)->postJson('/api/super/nooni/faqs', ['question' => 'When is the Eid holiday?', 'keywords' => 'eid, holiday, പെരുന്നാൾ', 'answer' => 'The madrasa is closed for three days for Eid.'])->assertOk();
        $ask('eid holiday')->assertOk()->assertJsonPath('reply', 'The madrasa is closed for three days for Eid.');

        // AI mode uses the AI again.
        $this->as($boss)->putJson('/api/super/nooni/mode', ['mode' => 'ai'])->assertOk();
        $ask('where can I pay my fees')->assertOk()->assertJsonPath('reply', 'AI answer');
    }
}
