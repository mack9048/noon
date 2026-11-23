<?php

namespace App\Support;

use App\Models\Course;
use Illuminate\Support\Carbon;

/** Works out a live course's coming classes from its weekly timetable. */
class LiveSchedule
{
    private const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    /** Joining opens this many minutes before a class starts. */
    public const OPEN_BEFORE = 15;

    /**
     * The next classes (a class still running counts), soonest first.
     *
     * @return list<array{starts_at: string, ends_at: string, title: ?string, state: string, start: Carbon}>
     */
    public static function upcoming(Course $course, int $count = 10): array
    {
        $tz = $course->live_timezone ?: 'Asia/Kolkata';
        $now = Carbon::now();
        $out = [];
        $slots = $course->liveSlots;
        // Classes from the course's class list that have a date.
        foreach ($course->liveClasses()->whereNotNull('starts_at')->get() as $c) {
            $start = Carbon::parse($c->starts_at);
            $end = $start->copy()->addMinutes($c->duration_min);
            if ($end->gt($now)) {
                $out[] = ['starts_at' => $start->copy()->setTimezone($tz)->toIso8601String(), 'ends_at' => $end->copy()->setTimezone($tz)->toIso8601String(), 'title' => $c->title,
                    'state' => $now->gte($start->copy()->subMinutes(self::OPEN_BEFORE)) ? 'live' : 'upcoming', 'start' => $start->copy()->utc()];
            }
        }
        $day = Carbon::now($tz)->startOfDay();
        for ($i = 0; $slots->isNotEmpty() && $i < 62 && count($out) < $count * 3; $i++, $day = $day->copy()->addDay()) {
            foreach ($slots as $slot) {
                if (! in_array($day->dayOfWeek, array_map('intval', $slot->days ?? []), true)) {
                    continue;
                }
                [$h, $m] = array_map('intval', explode(':', $slot->start_time));
                $start = $day->copy()->setTime($h, $m);
                $end = $start->copy()->addMinutes($slot->duration_min);
                if ($end->lte($now)) {
                    continue;
                }
                $out[] = [
                    'starts_at' => $start->toIso8601String(), 'ends_at' => $end->toIso8601String(), 'title' => $slot->title,
                    'state' => $now->gte($start->copy()->subMinutes(self::OPEN_BEFORE)) ? 'live' : 'upcoming',
                    'start' => $start->copy()->utc(),
                ];
            }
        }
        usort($out, fn ($a, $b) => $a['start'] <=> $b['start']);

        return array_slice($out, 0, $count);
    }

    /** The class that can be joined now (open from 15 minutes before until it ends), if any. */
    public static function current(Course $course): ?array
    {
        $next = self::upcoming($course, 1)[0] ?? null;

        return $next && $next['state'] === 'live' ? $next : null;
    }

    /** "Every day · 7:00 PM" / "Mon, Wed, Fri · 7:00 PM · Sat · 10:00 AM" */
    public static function summary(Course $course): ?string
    {
        if ($course->liveSlots->isEmpty()) {
            $n = $course->liveClasses()->count();

            return $n ? $n.' live class'.($n === 1 ? '' : 'es') : null;
        }

        return $course->liveSlots->map(function ($s) {
            $days = array_values(array_unique(array_map('intval', $s->days ?? [])));
            sort($days);
            $label = count($days) === 7 ? 'Every day' : ($days === [1, 2, 3, 4, 5] ? 'Mon – Fri' : ($days === [1, 2, 3, 4, 5, 6] ? 'Mon – Sat' : implode(', ', array_map(fn ($d) => self::DAY[$d], $days))));

            return $label.' · '.Carbon::createFromFormat('H:i', $s->start_time)->format('g:i A');
        })->implode(' · ');
    }

    /** Strip the internal Carbon from upcoming() rows for the app. */
    public static function forApp(array $rows): array
    {
        return array_map(fn ($r) => collect($r)->except('start')->all(), $rows);
    }
}
