<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Batch;
use App\Models\Fee;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** Fees: the admin adds fees, records payments and sends reminders; students and parents see their own. */
class FeeController extends Controller
{
    private const WITH = ['student.schoolClass', 'student.parent'];

    /** GET /admin/fees?month=2026-11 — the month's fees with totals. */
    public function index(Request $request)
    {
        $month = $request->validate(['month' => ['nullable', 'date_format:Y-m']])['month'] ?? now()->format('Y-m');
        $fees = Fee::with(self::WITH)->where('month', $month)->orderBy('due_date')->get();
        $live = $fees->where('status', '!=', 'waived');

        return [
            'month' => $month,
            'summary' => [
                'expected' => (float) $live->sum('amount'),
                'collected' => (float) $fees->where('status', 'paid')->sum(fn (Fee $f) => (float) ($f->paid_amount ?? $f->amount)),
                'paid' => $fees->where('status', 'paid')->count(),
                'due' => $fees->where('status', 'due')->filter(fn (Fee $f) => $f->overdueDays() === 0)->count(),
                'overdue' => $fees->where('status', 'due')->filter(fn (Fee $f) => $f->overdueDays() > 0)->count(),
            ],
            'fees' => $fees->map(fn (Fee $f) => $f->toApp())->values(),
        ];
    }

    /** POST /admin/fees — add a fee to all students, a class, a batch or one student. Skips students who already have it. */
    public function store(Request $request)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'min:2', 'max:80'],
            'month' => ['required', 'date_format:Y-m'],
            'amount' => ['required', 'numeric', 'min:1', 'max:10000000'],
            'due_date' => ['required', 'date'],
            'scope' => ['required', Rule::in(['all', 'class', 'batch', 'student'])],
            'class_id' => ['required_if:scope,class', 'nullable', 'integer'],
            'batch_id' => ['required_if:scope,batch', 'nullable', 'integer'],
            'student_id' => ['required_if:scope,student', 'nullable', 'integer'],
        ]);
        $tenantId = $request->user()->tenant_id;
        $students = User::where('tenant_id', $tenantId)->where('role', 'student')->where('blocked', false);
        match ($data['scope']) {
            'class' => $students->where('class_id', $data['class_id']),
            'batch' => $students->whereIn('id', Batch::where('tenant_id', $tenantId)->findOrFail($data['batch_id'])->students()->pluck('users.id')),
            'student' => $students->whereKey($data['student_id']),
            default => null,
        };
        $ids = $students->pluck('id');
        if ($ids->isEmpty()) {
            throw ValidationException::withMessages(['scope' => ['No students found for this choice.']]);
        }
        $title = trim($data['title']);
        $already = Fee::where('month', $data['month'])->where('title', $title)->whereIn('student_id', $ids)->pluck('student_id')->all();
        $made = 0;
        foreach ($ids->diff($already) as $sid) {
            Fee::create(['tenant_id' => $tenantId, 'student_id' => $sid, 'title' => $title, 'month' => $data['month'], 'amount' => $data['amount'],
                'due_date' => $data['due_date'], 'status' => 'due', 'created_by' => $request->user()->id]);
            $made++;
        }

        return response()->json(['created' => $made, 'skipped' => count($already)], 201);
    }

    /** POST /admin/fees/{id}/pay — record a payment and give a receipt number. */
    public function pay(Request $request, int $id)
    {
        $fee = Fee::findOrFail($id);
        $data = $request->validate([
            'amount' => ['nullable', 'numeric', 'min:0', 'max:10000000'],
            'method' => ['required', Rule::in(Fee::METHODS)],
            'note' => ['nullable', 'string', 'max:200'],
            'paid_on' => ['nullable', 'date', 'before_or_equal:today'],
        ]);
        $fee->fill([
            'status' => 'paid', 'paid_amount' => $data['amount'] ?? $fee->amount, 'method' => $data['method'], 'note' => $data['note'] ?? $fee->note,
            'paid_at' => isset($data['paid_on']) ? \Illuminate\Support\Carbon::parse($data['paid_on'])->setTimeFrom(now()) : now(),
            'receipt_no' => $fee->receipt_no ?? (($request->user()->tenant?->code ?? 'NL').'-R'.str_pad((string) $fee->id, 5, '0', STR_PAD_LEFT)),
        ])->save();

        return $fee->load(self::WITH)->toApp();
    }

    /** PATCH /admin/fees/{id} — change amount/due date, undo a payment, or waive. */
    public function update(Request $request, int $id)
    {
        $fee = Fee::findOrFail($id);
        $data = $request->validate([
            'amount' => ['sometimes', 'numeric', 'min:1', 'max:10000000'],
            'due_date' => ['sometimes', 'date'],
            'status' => ['sometimes', Rule::in(['due', 'waived'])],
            'note' => ['nullable', 'string', 'max:200'],
        ]);
        if (($data['status'] ?? null) === 'due') {
            $data += ['paid_amount' => null, 'paid_at' => null, 'method' => null];
        }
        $fee->fill($data)->save();

        return $fee->load(self::WITH)->toApp();
    }

    public function destroy(int $id)
    {
        Fee::findOrFail($id)->delete();

        return response()->noContent();
    }

    /** GET /fees — a student's own fees; a parent sees their children's. */
    public function mine(Request $request)
    {
        $u = $request->user();
        $ids = $u->role === 'parent' ? User::where('parent_id', $u->id)->pluck('id') : collect([$u->id]);
        $fees = Fee::with(self::WITH)->whereIn('student_id', $ids)->orderByDesc('due_date')->limit(200)->get();

        return [
            'due_total' => (float) $fees->where('status', 'due')->sum('amount'),
            'fees' => $fees->map(fn (Fee $f) => $f->toApp())->values(),
        ];
    }
}
