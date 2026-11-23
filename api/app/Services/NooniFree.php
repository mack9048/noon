<?php

namespace App\Services;

use App\Models\NooniFaq;
use Illuminate\Support\Collection;

/**
 * Nooni free mode: finds the closest question in the list by shared words (English and Malayalam),
 * and answers with its reply. No AI and no outside service.
 */
class NooniFree
{
    private const STOP = ['a', 'an', 'the', 'i', 'my', 'me', 'is', 'are', 'do', 'does', 'how', 'what', 'where', 'can', 'to', 'of', 'in', 'on', 'for', 'and', 'or', 'it', 'this', 'that', 'you', 'please', 'want', 'there', 'am', 'be', 'with', 'from', 'at', 'when', 'which', 'who', 'why', 'will'];

    /** Lower-case words of any script; very short or common words are dropped. */
    public static function words(string $text): array
    {
        $parts = preg_split('/[^\p{L}\p{M}\p{N}]+/u', mb_strtolower($text), -1, PREG_SPLIT_NO_EMPTY) ?: [];

        return array_values(array_unique(array_filter($parts, fn ($w) => mb_strlen($w) > 1 && ! in_array($w, self::STOP, true))));
    }

    private function faqs(string $role): Collection
    {
        $aud = in_array($role, ['student', 'parent'], true) ? 'student' : $role;

        return NooniFaq::where('active', true)->whereIn('audience', ['all', $aud])->orderBy('position')->orderBy('id')->get();
    }

    /** The best answer, or null when nothing is close enough. */
    public function match(string $question, string $role, float $min = 1): ?NooniFaq
    {
        $q = self::words($question);
        if (! $q) {
            return null;
        }
        $best = null;
        $bestScore = 0.0;
        foreach ($this->faqs($role) as $f) {
            $own = self::words($f->question.' '.str_replace(',', ' ', (string) $f->keywords));
            $score = 0.0;
            foreach ($q as $w) {
                foreach ($own as $o) {
                    if ($w === $o) {
                        $score += 1;
                        break;
                    }
                    // Word stems: "fees" ~ "fee", "classes" ~ "class", Malayalam endings.
                    if (mb_strlen($w) >= 3 && mb_strlen($o) >= 3 && (str_starts_with($w, $o) || str_starts_with($o, $w))) {
                        $score += 0.7;
                        break;
                    }
                }
            }
            if ($score > $bestScore) {
                [$best, $bestScore] = [$f, $score];
            }
        }

        return $bestScore >= $min ? $best : null;
    }

    /** A few questions this person can tap when Nooni did not understand. */
    public function suggestions(string $role, int $n = 4): array
    {
        return $this->faqs($role)->filter(fn ($f) => $f->open)->take($n)->pluck('question')->values()->all();
    }
}
