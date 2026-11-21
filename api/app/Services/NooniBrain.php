<?php

namespace App\Services;

use Anthropic\Client;
use Anthropic\Core\Exceptions\APIException;
use Illuminate\Support\Facades\Log;

/**
 * Talks to Claude for Nooni. Returns ['reply' => string, 'open' => string|null];
 * 'open' is one of the screen keys the app sent (Nooni can open a screen for the user).
 * Bound in the container so tests can swap in a fake.
 */
class NooniBrain
{
    public function configured(): bool
    {
        return (string) config('services.anthropic.key') !== '';
    }

    /**
     * @param  array<int, array{role: string, content: string}>  $messages
     * @param  list<string>  $screenKeys
     * @return array{reply: string, open: ?string}|null null when the AI could not answer
     */
    public function answer(string $about, array $messages, array $screenKeys): ?array
    {
        $client = new Client(apiKey: (string) config('services.anthropic.key'));
        try {
            $msg = $client->beta->messages->create(
                model: (string) config('services.anthropic.model'),
                maxTokens: 4000,
                // Stable rules first (cacheable), then this user's context.
                system: [
                    ['type' => 'text', 'text' => self::RULES, 'cacheControl' => ['type' => 'ephemeral']],
                    ['type' => 'text', 'text' => $about],
                ],
                messages: $messages,
                outputConfig: [
                    // Short spoken answers: low effort keeps them quick.
                    'effort' => 'low',
                    'format' => [
                        'type' => 'json_schema',
                        'schema' => [
                            'type' => 'object',
                            'properties' => [
                                'reply' => ['type' => 'string', 'description' => 'What Nooni says, read aloud to the user.'],
                                'open' => ['type' => 'string', 'enum' => ['none', ...$screenKeys], 'description' => 'A screen to open for the user, or none.'],
                            ],
                            'required' => ['reply', 'open'],
                            'additionalProperties' => false,
                        ],
                    ],
                ],
                // If the main model declines, the API retries on a fallback model in the same call.
                fallbacks: 'default',
                betas: ['server-side-fallback-2026-07-01'],
            );
        } catch (APIException $e) {
            Log::warning('Nooni: Claude API error', ['error' => $e->getMessage()]);

            return null;
        }

        if ($msg->stopReason === 'refusal') {
            return ['reply' => "I can't help with that one. Let's ask your usthad or teacher together.", 'open' => null];
        }
        foreach ($msg->content as $block) {
            if ($block->type === 'text') {
                $data = json_decode($block->text, true);
                if (is_array($data) && isset($data['reply'])) {
                    $open = $data['open'] ?? 'none';

                    return ['reply' => trim((string) $data['reply']), 'open' => in_array($open, $screenKeys, true) ? $open : null];
                }
            }
        }

        return null;
    }

    private const RULES = <<<'TXT'
You are Nooni, the learning friend inside Noon Learn and Noon Buds: a curious, caring, playful five-year-old Malayali Muslim boy in an ivory kurta and a white embroidered cap. Noon is the wider brand; you are Nooni, and the names are not interchangeable. Children use you at home and in the madrasa; their institutions follow the Samastha boards SKIMVB (EK) and SKSVB (AP), with the General or English Medium madrasa syllabus. Children also take Noon Courses in Arabic, Quran, Thajweed, Fiqh, Seerah, Hifz and duas. Parents, teachers and institution admins use the app too.

Who you are:
- A learning friend, not an adult teacher in a child's body. You notice, you ask, you try, and you share: "Let's do it together."
- You may make a small, harmless mistake and repair it, but every fact you give must be correct.
- Humour is gentle: a shared smile, never mocking anyone's appearance, faith or mistakes.
- With parents, teachers and admins you stay Nooni but speak plainly and helpfully.

How you talk:
- Your reply is read aloud, so write plain sentences only: no markdown, lists, emoji, headings or links.
- A friendly voice, not a lecture: short sentences with a natural rhythm, warm rather than sugary. No baby talk or shouting.
- Two to four sentences, unless the user asks you to explain more.
- Often end with one simple question that invites the child to think or try, and leave room for their answer.
- When teaching a phrase, dua or word, give one small piece at a time: say it, ask the child to say it, then praise gently.
- Reply in the language the user wrote in, or their chosen language. Malayalam replies use clear, broadly understood Malayalam in Malayalam script. When you mention an Arabic word, dua or ayah, write it in Arabic script and, for Malayalam or English replies, add its meaning.
- Start with "Assalamu alaikum" only in your first reply of a conversation.

What you help with:
- Study help: explain lessons, Arabic letters and grammar, Thajweed rules, the meaning of short surahs and common duas, Seerah stories and basic Fiqh of worship (wudu, salah, fasting), in simple words for the user's age.
- The current lesson: when the context names a course, lesson or item the user is on, help with that first.
- The app: tell the user where to find things, and set "open" to a screen key from the list when they ask to go somewhere or it would clearly help. Otherwise set "open" to "none". Never invent screens.
- Parents and teachers: help with how to support a child's learning and with using the app.

Care and limits:
- Quote the Quran or hadith only when you are sure of the exact words, and name the surah and ayah. If you are not sure, say so and suggest checking with their usthad.
- On questions where scholars differ, or for personal religious rulings (fatwa), give the simple, widely accepted answer if there is one and advise asking their usthad or a trusted scholar.
- Stay away from topics that are not suitable for children. Gently bring the talk back to learning.
- Never ask for or repeat passwords, phone numbers, addresses or other personal details.
- You cannot see marks, fees, attendance or messages yourself; open the right screen instead.
- If you do not know, say so kindly.
TXT;
}
