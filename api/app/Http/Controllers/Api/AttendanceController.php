<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Batch;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/** Attendance: teachers/admins mark a batch for a day; the admin sees reports; students and parents see their own. */
class AttendanceController extends Controller
{
    /** GET /staff/attendance?batch_id=&date= — the batch's students with the day's marks. */
    public function sheet(Request $request)
    {
        $data = $request->validate(['batch_id' => ['required', 'integer'], 'date' => ['nullable', 'date', 'before_or_equal:today']]);
        $batch = Batch::findOrFail($data['batch_id']);
        $date = Carbon::parse($data['date'] ?? today())->toDateString();
        $students = $batch->students()->where('role', 'student')->orderBy('name')->get(['users.id', 'users.name', 'users.admission_no']);
        $marks = Attendance::whereDate('date', $date)->whereIn('student_id', $students->pluck('id'))->get()->keyBy('student_id');

        return [
            'batch' => ['id' => $batch->id, 'name' => $batch->name], 'date' => $date,
            'marked' => $marks->isNotEmpty(),
            'students' => $students->map(fn ($s) => ['id' => $s->id, 'name' => $s->name, 'admission_no' => $s->admission_no, 'status' => $marks[$s->id]->status ?? null])->values(),
        ];
    }

    /** POST /staff/attendance — save a batch's marks for a day (re-saving replaces them). */
    public function save(Request $request)
    {
        $data = $request->validate([
            'batch_id' => ['required', 'integer'],
            'date' => ['required', 'date', 'before_or_equal:today'],
            'marks' => ['required', 'array', 'min:1'],
            'marks.*.student_id' => ['required', 'integer'],
            'marks.*.status' => ['required', Rule::in(Attendance::STATUSES)],
        ]);
        $batch = Batch::findOrFail($data['batch_id']);
        $allowed = $batch->students()->pluck('users.id')->all();
        $date = Carbon::parse($data['date'])->toDateString();
        $tenantId = $request->user()->tenant_id;
        $saved = 0;
        DB::transaction(function () use ($data, $allowed, $date, $tenantId, $batch, $request, &$saved) {
            foreach ($data['marks'] as $m) {
                if (! in_array((int) $m['student_id'], $allowed, true)) {
                    continue;
                }
                $row = Attendance::where('student_id', $m['student_id'])->whereDate('date', $date)->first()
                    ?? new Attendance(['student_id' => $m['student_id'], 'date' => $date, 'tenant_id' => $tenantId]);
                $row->fill(['batch_id' => $batch->id, 'status' => $m['status'], 'marked_by' => $request->user()->id])->save();
                $saved++;
            }
        });

        return ['saved' => $saved];
    }

    /** GET /admin/attendance?period=today|week|month — totals, each batch and absent students. */
    public function report(Request $request)
    {
        $period = $request->validate(['period' => ['nullable', Rule::in(['today', 'week', 'month'])]])['period'] ?? 'today';
        $to = today();
        $from = match ($period) {
            'week' => today()->subDays(6), 'month' => today()->startOfMonth(), default => today()
        };
        $rows = Attendance::whereDate('date', '>=', $from->toDateString())->whereDate('date', '<=', $to->toDateString())->get(['student_id', 'batch_id', 'date', 'status']);
        $count = fn ($s) => $rows->where('status', $s)->count();
        $attended = $count('present') + $count('late');
        $students = User::where('tenant_id', $request->user()->tenant_id)->where('role', 'student')->count();

        $batches = Batch::with(['classTeacher:id,name'])->withCount('students')->orderBy('name')->get();
        $byBatch = $batches->map(function (Batch $b) use ($rows) {
            $r = $rows->where('batch_id', $b->id);
            $att = $r->whereIn('status', ['present', 'late'])->count();

            return ['id' => $b->id, 'name' => $b->name, 'teacher' => $b->classTeacher?->name, 'students' => $b->students_count,
                'marks' => $r->count(), 'percent' => $r->count() ? (int) round($att * 100 / $r->count()) : null,
                'marked_today' => $r->contains(fn ($x) => $x->date->isToday())];
        })->values();

        $absent = $rows->where('status', 'absent')->groupBy('student_id')->map->count()->sortDesc()->take(100);
        $people = User::with(['schoolClass', 'parent'])->whereIn('id', $absent->keys())->get()->keyBy('id');
        $absentList = $absent->map(fn ($n, $sid) => isset($people[$sid]) ? [
            'id' => $sid, 'name' => $people[$sid]->name, 'cls' => $people[$sid]->schoolClass?->label, 'days' => $n,
            'parent' => $people[$sid]->parent?->name, 'parent_phone' => $people[$sid]->parent?->phone,
        ] : null)->filter()->values();

        return [
            'period' => $period, 'from' => $from->toDateString(), 'to' => $to->toDateString(),
            'days' => $rows->pluck('date')->map(fn ($d) => $d->toDateString())->unique()->count(),
            'students' => $students,
            'summary' => ['present' => $count('present'), 'absent' => $count('absent'), 'late' => $count('late'), 'leave' => $count('leave'),
                'marks' => $rows->count(), 'percent' => $rows->count() ? (int) round($attended * 100 / max(1, $rows->count() - $count('leave'))) : null],
            'batches' => $byBatch,
            'absent' => $absentList,
        ];
    }

    /** GET /attendance — a student's own record this month (a parent sees their children). */
    public function mine(Request $request)
    {
        $u = $request->user();
        $kids = $u->role === 'parent' ? User::where('parent_id', $u->id)->get(['id', 'name']) : collect([$u]);
        $from = today()->startOfMonth()->toDateString();

        return $kids->map(function (User $k) use ($from) {
            $rows = Attendance::where('student_id', $k->id)->orderByDesc('date')->limit(60)->get(['date', 'status']);
            $month = $rows->filter(fn ($r) => $r->date->toDateString() >= $from);
            $att = $month->whereIn('status', ['present', 'late'])->count();
            $counted = $month->where('status', '!=', 'leave')->count();

            return [
                'student' => ['id' => $k->id, 'name' => $k->name],
                'month' => ['present' => $month->where('status', 'present')->count(), 'absent' => $month->where('status', 'absent')->count(),
                    'late' => $month->where('status', 'late')->count(), 'leave' => $month->where('status', 'leave')->count(),
                    'percent' => $counted ? (int) round($att * 100 / $counted) : null],
                'days' => $rows->map(fn ($r) => ['date' => $r->date->toDateString(), 'status' => $r->status])->values(),
            ];
        })->values();
    }
}
