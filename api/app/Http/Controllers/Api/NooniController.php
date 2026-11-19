<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\NooniBrain;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/** Nooni, the AI voice assistant: one question in, one short spoken answer out. */
class NooniController extends Controller
{
    private const LANGS = ['ml' => 'Malayalam', 'en' => 'English', 'ar' => 'Arabic'];

    public function ask(Request $request, NooniBrain $brain)
    {
        $data = $request->validate([
            'messages' => ['required', 'array', 'min:1', 'max:12'],
            'messages.*.role' => ['required', 'in:user,assistant'],
            'messages.*.content' => ['required', 'string', 'max:1500'],
            'lang' => ['nullable', 'in:ml,en,ar'],
            'screens' => ['nullable', 'array', 'max:24'],
            'screens.*.key' => ['required', 'string', 'regex:/^[a-z][a-z0-9-]{0,23}$/'],
            'screens.*.label' => ['required', 'string', 'max:40'],
            'context' => ['nullable', 'array'],
            'context.course' => ['nullable', 'string', 'max:160'],
            'context.lesson' => ['nullable', 'string', 'max:160'],
            'context.item' => ['nullable', 'string', 'max:160'],
            'context.screen' => ['nullable', 'string', 'max:60'],
        ]);
        $user = $request->user();
        // The conversation must start with the user and end with their new question.
        $messages = array_values($data['messages']);
        while ($messages && $messages[0]['role'] !== 'user') {
            array_shift($messages);
        }
        abort_unless($messages && end($messages)['role'] === 'user', 422, 'Ask Nooni a question.');

        if (! $brain->configured()) {
            return response()->json(['message' => 'Nooni is not switched on yet. Please try again later.'], 503);
        }
        $key = "nooni:{$user->id}:".now()->toDateString();
        $limit = (int) config('services.anthropic.daily_limit');
        if ((int) Cache::get($key, 0) >= $limit) {
            return response()->json(['message' => "You have asked Nooni {$limit} questions today. Come back tomorrow, in sha Allah!"], 429);
        }
        Cache::put($key, (int) Cache::get($key, 0) + 1, now()->endOfDay());

        $screens = collect($data['screens'] ?? [])->unique('key')->values();
        $ctx = $data['context'] ?? [];
        $about = implode("\n", array_filter([
            "The user is {$user->name}, role: ".($user->role === 'guest' ? 'guest exploring the free app' : $user->role).'.',
            $user->tenant?->name ? "Institution: {$user->tenant->name}." : null,
            isset($data['lang']) ? 'Preferred language: '.self::LANGS[$data['lang']].'.' : null,
            ! empty($ctx['screen']) ? "They are on the \"{$ctx['screen']}\" screen." : null,
            ! empty($ctx['course']) ? "Current course: {$ctx['course']}." : null,
            ! empty($ctx['lesson']) ? "Current lesson: {$ctx['lesson']}." : null,
            ! empty($ctx['item']) ? "Open content: {$ctx['item']}." : null,
            $screens->isNotEmpty() ? 'Screens you can open (key: name): '.$screens->map(fn ($s) => "{$s['key']}: {$s['label']}")->implode('; ').'.' : 'You cannot open screens right now; set "open" to "none".',
        ]));

        $answer = $brain->answer($about, array_map(fn ($m) => ['role' => $m['role'], 'content' => $m['content']], $messages), $screens->pluck('key')->all());
        if (! $answer) {
            return response()->json(['message' => 'Nooni could not answer right now. Please try again.'], 503);
        }

        return $answer;
    }
}
