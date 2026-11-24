<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\NooniFaq;
use App\Services\NooniBrain;
use App\Services\NooniFree;
use App\Support\AppSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/** Nooni, the AI voice assistant: one question in, one short spoken answer out. */
class NooniController extends Controller
{
    private const LANGS = ['ml' => 'Malayalam', 'en' => 'English', 'ar' => 'Arabic'];

    /** A free-mode answer (no AI). Unknown questions get a gentle reply and a few questions to tap. */
    private function free(NooniFree $free, string $question, string $role, ?string $lang, array $screens): array
    {
        $f = $free->match($question, $role);
        $ml = $lang === 'ml';
        if (! $f) {
            return ['reply' => $ml ? 'ക്ഷമിക്കണം, എനിക്ക് അത് മനസ്സിലായില്ല. താഴെയുള്ള ഒരു ചോദ്യം തിരഞ്ഞെടുക്കൂ.' : "Sorry, I didn't understand that. Try one of these questions.",
                'open' => null, 'free' => true, 'suggestions' => $free->suggestions($role)];
        }

        return ['reply' => $ml && $f->answer_ml ? $f->answer_ml : $f->answer, 'open' => $f->open && in_array($f->open, $screens, true) ? $f->open : null, 'free' => true, 'suggestions' => []];
    }

    public function ask(Request $request, NooniBrain $brain, NooniFree $free)
    {
        $data = $request->validate([
            'messages' => ['required', 'array', 'min:1', 'max:12'],
            'messages.*.role' => ['required', 'in:user,assistant'],
            'messages.*.content' => ['required', 'string', 'max:1500'],
            'lang' => ['nullable', 'in:ml,en,ar'],
            'screens' => ['nullable', 'array', 'max:24'],
            'screens.*.key' => ['required', 'string', 'regex:/^[a-z][a-z0-9-]{0,23}$/'],
            'screens.*.label' => ['required', 'string', 'max:80'],
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

        $screens = collect($data['screens'] ?? [])->unique('key')->values();
        $question = (string) end($messages)['content'];
        $freeAnswer = fn () => $this->free($free, $question, $user->role, $data['lang'] ?? null, $screens->pluck('key')->all());
        // Mode (super admin → Nooni): ai, free (no AI at all), or auto (AI when it is set up).
        $mode = AppSetting::get('nooni_mode', 'auto');
        if ($mode === 'free' || ! $brain->configured()) {
            return $freeAnswer();
        }
        // In auto mode a question that matches the list well is answered for free too.
        if ($mode === 'auto' && $free->match($question, $user->role, 2) && count(NooniFree::words($question)) <= 6) {
            return $freeAnswer();
        }
        $key = "nooni:{$user->id}:".now()->toDateString();
        $limit = (int) config('services.anthropic.daily_limit');
        if ((int) Cache::get($key, 0) >= $limit) {
            return $freeAnswer(); // AI questions for today are used up: free answers still work
        }
        Cache::put($key, (int) Cache::get($key, 0) + 1, now()->endOfDay());

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
            return $freeAnswer();
        }

        return $answer;
    }

    /* ---------- Super admin: mode and the question list ---------- */

    public function adminIndex(NooniBrain $brain)
    {
        return ['mode' => AppSetting::get('nooni_mode', 'auto'), 'ai_ready' => $brain->configured(),
            'faqs' => NooniFaq::orderBy('position')->orderBy('id')->get()];
    }

    public function setMode(Request $request, NooniBrain $brain)
    {
        AppSetting::set('nooni_mode', $request->validate(['mode' => ['required', 'in:ai,free,auto']])['mode']);

        return $this->adminIndex($brain);
    }

    private function faqRules(bool $partial): array
    {
        $r = $partial ? 'sometimes' : 'required';

        return [
            'audience' => ['sometimes', 'in:'.implode(',', NooniFaq::AUDIENCES)], 'question' => [$r, 'string', 'max:200'],
            'keywords' => ['nullable', 'string', 'max:300'], 'answer' => [$r, 'string', 'max:2000'], 'answer_ml' => ['nullable', 'string', 'max:2000'],
            'open' => ['nullable', 'string', 'regex:/^[a-z][a-z0-9-]{0,23}$/'], 'active' => ['sometimes', 'boolean'],
        ];
    }

    public function storeFaq(Request $request, NooniBrain $brain)
    {
        NooniFaq::create($request->validate($this->faqRules(false)) + ['position' => (int) NooniFaq::max('position') + 1]);

        return $this->adminIndex($brain);
    }

    public function updateFaq(Request $request, NooniFaq $faq, NooniBrain $brain)
    {
        $faq->update($request->validate($this->faqRules(true)));

        return $this->adminIndex($brain);
    }

    public function destroyFaq(NooniFaq $faq, NooniBrain $brain)
    {
        $faq->delete();

        return $this->adminIndex($brain);
    }
}
