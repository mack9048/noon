<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Admission;
use App\Models\Attendance;
use App\Models\Batch;
use App\Models\Course;
use App\Models\Fee;
use App\Models\Game;
use App\Models\LeaveRequest;
use App\Models\LiveSession;
use App\Models\Order;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/** Dashboard numbers for super admin, institution admin and teachers, plus each person's to-do list and note. */
class DashboardController extends Controller
{
    /** The last six months, oldest first: [['key' => '2026-06', 'label' => 'Jun'], …]. */
    private function months(): Collection
    {
        return collect(range(5, 0))->map(fn ($i) => now()->startOfMonth()->subMonths($i))->map(fn (Carbon $m) => ['key' => $m->format('Y-m'), 'label' => $m->format('M')]);
    }

    /** Count rows per month for the last six months. */
    private function perMonth($query, string $column = 'created_at'): array
    {
        $from = now()->startOfMonth()->subMonths(5);
        $rows = $query->where($column, '>=', $from)->get([$column])->groupBy(fn ($r) => Carbon::parse($r->{$column})->format('Y-m'))->map->count();

        return $this->months()->map(fn ($m) => ['label' => $m['label'], 'value' => (int) ($rows[$m['key']] ?? 0)])->values()->all();
    }

    public function super()
    {
        $roles = User::whereIn('role', ['student', 'teacher', 'guest'])->select('role', DB::raw('count(*) as n'))->groupBy('role')->pluck('n', 'role');
        $paid = Order::where('payment_status', 'paid');
        $monthStart = now()->startOfMonth();

        return [
            'tenants' => ['total' => Tenant::count(), 'active' => Tenant::where('active', true)->count()],
            'students' => (int) ($roles['student'] ?? 0), 'teachers' => (int) ($roles['teacher'] ?? 0), 'guests' => (int) ($roles['guest'] ?? 0),
            'shop' => [
                'month' => (float) (clone $paid)->where('paid_at', '>=', $monthStart)->sum('total'),
                'total' => (float) (clone $paid)->sum('total'),
                'orders_month' => Order::where('created_at', '>=', $monthStart)->count(),
                'to_handle' => Order::whereIn('status', ['placed', 'confirmed', 'packed'])->where('status', '!=', 'cancelled')->count(),
                'verifying' => Order::where('payment_status', 'verifying')->count(),
                'series' => $this->months()->map(fn ($m) => ['label' => $m['label'], 'value' => (float) Order::where('payment_status', 'paid')
                    ->whereBetween('paid_at', [Carbon::parse($m['key'].'-01')->startOfMonth(), Carbon::parse($m['key'].'-01')->endOfMonth()])->sum('total')])->values(),
            ],
            'courses' => ['published' => Course::where('status', 'published')->count(), 'pending' => Course::where('status', 'pending')->count()],
            'games_live' => Game::where('status', 'live')->count(),
            'new_tenants' => $this->perMonth(Tenant::query()),
            'new_learners' => $this->perMonth(User::whereIn('role', ['student', 'guest'])),
            'recent_orders' => Order::latest()->limit(5)->get()->map(fn (Order $o) => [
                'id' => $o->id, 'ref' => $o->ref, 'name' => $o->buyer_name ?: 'Customer', 'total' => (float) $o->total,
                'status' => $o->status, 'payment_status' => $o->payment_status, 'when' => $o->created_at?->toIso8601String(),
            ]),
            'recent_tenants' => Tenant::withCount(['users as students_count' => fn ($q) => $q->where('role', 'student')])->latest()->limit(4)->get()
                ->map(fn (Tenant $t) => ['id' => $t->id, 'name' => $t->name, 'code' => $t->code, 'students' => (int) $t->students_count, 'logo_url' => $t->logoUrl(), 'when' => $t->created_at?->toIso8601String()]),
        ];
    }

    public function admin(Request $request)
    {
        $month = now()->format('Y-m');
        $fees = Fee::where('month', $month)->where('status', '!=', 'waived')->get();
        $due = $fees->where('status', 'due');
        $tenantId = $request->user()->tenant_id;
        $students = User::where('tenant_id', $tenantId)->where('role', 'student');
        $withDues = Fee::where('status', 'due')->where('due_date', '<', now()->toDateString())->distinct()->count('student_id');
        $today = now()->toDateString();
        $att = Attendance::where('date', $today)->select('status', DB::raw('count(*) as n'))->groupBy('status')->pluck('n', 'status');
        $collected = fn ($q) => (float) $q->sum(DB::raw('coalesce(paid_amount, amount)'));

        return [
            'students' => ['total' => (clone $students)->count(), 'blocked' => (clone $students)->where('blocked', true)->count(), 'with_dues' => $withDues],
            'teachers' => User::where('tenant_id', $tenantId)->where('role', 'teacher')->count(),
            'fees' => [
                'month' => $month,
                'expected' => (float) $fees->sum('amount'),
                'collected' => (float) $fees->where('status', 'paid')->sum(fn ($f) => (float) ($f->paid_amount ?? $f->amount)),
                'pending' => (float) $due->sum('amount'),
                'receipts' => $fees->where('status', 'paid')->count(),
                'overdue' => $due->filter(fn (Fee $f) => $f->overdueDays() > 0)->count(),
                'due_upcoming' => (float) $due->filter(fn (Fee $f) => $f->overdueDays() === 0)->sum('amount'),
                'overdue_total' => (float) Fee::where('status', 'due')->where('due_date', '<', $today)->sum('amount'),
                'series' => $this->months()->map(fn ($m) => [
                    'label' => $m['label'],
                    'expected' => (float) Fee::where('month', $m['key'])->where('status', '!=', 'waived')->sum('amount'),
                    'collected' => $collected(Fee::where('month', $m['key'])->where('status', 'paid')),
                ])->values(),
            ],
            'recent_payments' => Fee::with('student:id,name')->where('status', 'paid')->latest('paid_at')->limit(6)->get()->map(fn (Fee $f) => [
                'id' => $f->id, 'name' => $f->student?->name ?? 'Student', 'title' => $f->title, 'amount' => (float) ($f->paid_amount ?? $f->amount),
                'method' => $f->method, 'when' => $f->paid_at?->toIso8601String(),
            ]),
            'admissions' => ['new' => Admission::where('status', 'new')->count(), 'series' => $this->perMonth(User::where('tenant_id', $tenantId)->where('role', 'student'))],
            'attendance_today' => ['present' => (int) (($att['present'] ?? 0) + ($att['late'] ?? 0)), 'absent' => (int) ($att['absent'] ?? 0), 'marked' => (int) $att->sum()],
            'leave_pending' => LeaveRequest::where('status', 'pending')->count(),
            'today_classes' => LiveSession::with(['batch', 'creator'])->whereDate('starts_at', $today)->orderBy('starts_at')->limit(5)->get()->map->toApp(),
        ];
    }

    public function teacher(Request $request)
    {
        $me = $request->user();
        $batches = Batch::withCount('students')->get()->filter(fn (Batch $b) => $b->class_teacher_id === $me->id || in_array($me->id, array_map('intval', array_values($b->subject_teachers ?? [])), true))->values();
        $ids = $batches->pluck('id');
        $today = now()->toDateString();
        $marked = Attendance::where('date', $today)->whereIn('batch_id', $ids)->distinct()->pluck('batch_id');

        return [
            'batches' => $batches->map(fn (Batch $b) => ['id' => $b->id, 'name' => $b->name, 'students' => (int) $b->students_count, 'class_label' => $b->class_label,
                'class_teacher' => $b->class_teacher_id === $me->id, 'marked_today' => $marked->contains($b->id)]),
            'students' => (int) $batches->sum('students_count'),
            'today' => LiveSession::with(['batch', 'creator'])->whereDate('starts_at', $today)
                ->where(fn ($q) => $q->whereIn('batch_id', $ids)->orWhere('created_by', $me->id))->orderBy('starts_at')->get()->map->toApp(),
            'upcoming' => LiveSession::with(['batch', 'creator'])->where('starts_at', '>', now()->endOfDay())
                ->where(fn ($q) => $q->whereIn('batch_id', $ids)->orWhere('created_by', $me->id))->orderBy('starts_at')->limit(4)->get()->map->toApp(),
            'attendance_week' => collect(range(6, 0))->map(function ($i) use ($ids) {
                $d = now()->subDays($i);
                $rows = Attendance::where('date', $d->toDateString())->whereIn('batch_id', $ids)->get(['status']);

                return ['label' => $d->format('D'), 'value' => $rows->count() ? (int) round(100 * $rows->whereIn('status', ['present', 'late'])->count() / $rows->count()) : 0];
            })->values(),
            'leave_pending' => LeaveRequest::where('status', 'pending')->whereHas('student.batches', fn ($q) => $q->whereIn('batches.id', $ids))->count(),
        ];
    }

    /** The signed-in person's own to-do list and note on their dashboard. */
    public function board(Request $request)
    {
        return $request->user()->dashboard_board ?? ['todos' => [], 'note' => ''];
    }

    public function saveBoard(Request $request)
    {
        $data = $request->validate([
            'todos' => ['present', 'array', 'max:30'], 'todos.*.id' => ['required', 'string', 'max:20'],
            'todos.*.text' => ['required', 'string', 'max:160'], 'todos.*.done' => ['boolean'],
            'note' => ['nullable', 'string', 'max:2000'],
        ]);
        $board = ['todos' => array_values($data['todos']), 'note' => (string) ($data['note'] ?? '')];
        $request->user()->forceFill(['dashboard_board' => $board])->save();

        return $board;
    }
}
