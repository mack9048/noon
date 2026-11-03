<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LeaveRequest;
use Illuminate\Http\Request;

class LeaveController extends Controller
{
    /** Student/parent: quota summary + own history. */
    public function index(Request $request)
    {
        $user = $request->user();
        $requests = LeaveRequest::where('student_id', $user->id)->latest()->get();
        $used = $requests->where('status', 'approved')
            ->filter(fn ($r) => $r->start_date->year === now()->year)
            ->sum(fn ($r) => $r->days());
        $total = $user->tenant?->leave_quota ?? 15;

        return [
            'total' => $total,
            'used' => $used,
            'remaining' => max(0, $total - $used),
            'requests' => $requests,
        ];
    }

    public function store(Request $request)
    {
        $user = $request->user();
        abort_unless($user->tenant_id, 422, 'Join a madrasa to request leave.');
        $data = $request->validate([
            'type' => ['required', 'string', 'max:40'],
            'start_date' => ['required', 'date', 'after_or_equal:today'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);
        return LeaveRequest::create($data + ['tenant_id' => $user->tenant_id, 'student_id' => $user->id]);
    }

    /** Teacher/admin: requests in their madrasa. */
    public function staffIndex(Request $request)
    {
        return LeaveRequest::with('student:id,name')
            ->where('tenant_id', $request->user()->tenant_id)
            ->latest()->limit(200)->get()
            ->map(fn ($r) => $r->toArray() + ['student_name' => $r->student?->name]);
    }

    public function decide(Request $request, LeaveRequest $leave)
    {
        abort_unless($leave->tenant_id === $request->user()->tenant_id, 404);
        $data = $request->validate(['status' => ['required', 'in:approved,rejected']]);
        $leave->update($data + ['reviewed_by' => $request->user()->id, 'reviewed_at' => now()]);
        return $leave;
    }
}
