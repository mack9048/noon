<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LeaveRequest;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/** Runs inside the user's madrasa (`tenant` middleware), so every query is limited to it. */
class LeaveController extends Controller
{
    /** Student/parent: quota summary + own history. */
    public function index(Request $request)
    {
        return $this->summary($request->user());
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'type' => ['required', 'string', 'max:40'],
            'start_date' => ['required', 'date', 'after_or_equal:today'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date', 'before:'.now()->addYear()->toDateString()],
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);

        $overlaps = LeaveRequest::where('student_id', $user->id)
            ->whereIn('status', ['pending', 'approved'])
            ->whereDate('start_date', '<=', $data['end_date'])
            ->whereDate('end_date', '>=', $data['start_date'])
            ->exists();
        if ($overlaps) {
            throw ValidationException::withMessages(['start_date' => 'You already asked for leave on some of these days.']);
        }

        $days = (int) Carbon::parse($data['start_date'])->diffInDays(Carbon::parse($data['end_date'])) + 1;
        // Pending requests hold their days too, so two requests can't both use the last days.
        $pending = LeaveRequest::where('student_id', $user->id)->where('status', 'pending')
            ->get()->filter(fn ($r) => $r->start_date->year === now()->year)->sum(fn ($r) => $r->days());
        $remaining = max(0, $this->summary($user)['remaining'] - $pending);
        if ($days > $remaining) {
            throw ValidationException::withMessages(['end_date' => "Only {$remaining} leave days are left this year."]);
        }

        return LeaveRequest::create($data + ['student_id' => $user->id]);
    }

    /** Teacher/admin: requests in their madrasa. */
    public function staffIndex(Request $request)
    {
        return LeaveRequest::with('student:id,name')
            ->latest()->limit(200)->get()
            ->map(fn ($r) => $r->toArray() + ['student_name' => $r->student?->name]);
    }

    public function decide(Request $request, LeaveRequest $leave)
    {
        abort_if($leave->student_id === $request->user()->id, 403, 'You cannot approve your own leave.');
        abort_unless($leave->status === 'pending', 422, 'This request has already been decided.');
        $data = $request->validate(['status' => ['required', 'in:approved,rejected']]);
        $leave->update($data + ['reviewed_by' => $request->user()->id, 'reviewed_at' => now()]);

        return $leave;
    }

    /** @return array{total: int, used: int, remaining: int, requests: mixed} */
    private function summary(User $user): array
    {
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
}
