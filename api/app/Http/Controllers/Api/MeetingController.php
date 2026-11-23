<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Meeting;
use App\Support\LiveKit;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/** Institution meetings on Noon Live: admins and teachers host; students (and parents on the student login) join. */
class MeetingController extends Controller
{
    private function host(Request $request): bool
    {
        return in_array($request->user()->role, ['admin', 'teacher'], true);
    }

    public function index(Request $request)
    {
        $user = $request->user();

        return Meeting::with('creator')->where(fn ($q) => $q->whereNull('ended_at')->orWhere('ended_at', '>', now()->subDays(7)))
            ->orderByRaw('ended_at is not null')->orderByRaw('started_at is null')->orderBy('starts_at')->latest('id')->limit(50)->get()
            ->filter(fn (Meeting $m) => $m->isFor($user))->map(fn (Meeting $m) => $m->toApp($user))->values();
    }

    private function rules(bool $partial): array
    {
        return [
            'title' => [$partial ? 'sometimes' : 'required', 'string', 'max:160'], 'notes' => ['nullable', 'string', 'max:500'],
            'audience' => ['sometimes', 'in:'.implode(',', Meeting::AUDIENCES)], 'starts_at' => ['nullable', 'date'],
            'duration_min' => ['sometimes', 'integer', 'min:10', 'max:300'],
        ];
    }

    private function clean(array $data): array
    {
        if (! empty($data['starts_at'])) {
            $data['starts_at'] = Carbon::parse($data['starts_at'])->setTimezone(config('app.timezone'));
        }

        return $data;
    }

    public function store(Request $request)
    {
        abort_unless($this->host($request), 403);
        $m = Meeting::create($this->clean($request->validate($this->rules(false))) + ['created_by' => $request->user()->id]);

        return response()->json($m->load('creator')->toApp($request->user()), 201);
    }

    public function update(Request $request, Meeting $meeting)
    {
        abort_unless($this->host($request), 403);
        $meeting->update($this->clean($request->validate($this->rules(true))));

        return $meeting->load('creator')->toApp($request->user());
    }

    public function destroy(Request $request, Meeting $meeting)
    {
        abort_unless($this->host($request), 403);
        if ($meeting->state() === 'live' && LiveKit::configured()) {
            rescue(fn () => LiveKit::call('DeleteRoom', ['room' => $this->room($meeting)], $this->room($meeting)), report: false);
        }
        $meeting->delete();

        return response()->noContent();
    }

    private function room(Meeting $m): string
    {
        return 'noon-meeting-'.$m->id;
    }

    /** Start (host) or join: a short-lived pass for the meeting room. */
    public function join(Request $request, Meeting $meeting)
    {
        $user = $request->user();
        $host = $this->host($request);
        abort_unless($meeting->isFor($user), 404);
        abort_unless(LiveKit::configured(), 422, 'Meetings need Noon Live. Please ask Noon Learn to switch it on.');
        abort_if($meeting->ended_at && ! $host, 422, 'This meeting has ended.');
        if ($host) {
            if (! $meeting->started_at || $meeting->ended_at) {
                $meeting->update(['started_at' => now(), 'ended_at' => null]);
            }
        } else {
            abort_unless(in_array($meeting->state(), ['live', 'open'], true), 422, $meeting->starts_at
                ? 'The meeting starts '.$meeting->starts_at->format('D j M, g:i A').'. You can join 15 minutes before.'
                : 'The meeting has not started yet. Please wait for your teacher.');
            DB::table('meeting_attendance')->insertOrIgnore(['meeting_id' => $meeting->id, 'user_id' => $user->id, 'joined_at' => now()]);
        }

        return [
            'provider' => 'livekit', 'url' => LiveKit::url(), 'room' => $this->room($meeting), 'host' => $host,
            'token' => LiveKit::token($this->room($meeting), 'u'.$user->id, $user->name, $host, ['role' => $user->role]),
            'course' => ['id' => $meeting->id, 'title' => $meeting->title], 'kind' => 'meeting',
        ];
    }

    /** Host only: mute, remove, or end the meeting for everyone. */
    public function moderate(Request $request, Meeting $meeting)
    {
        abort_unless($this->host($request), 403);
        $data = $request->validate(['action' => ['required', 'in:mute,remove,end'], 'identity' => ['required_unless:action,end', 'string', 'max:40']]);
        $room = $this->room($meeting);
        if ($data['action'] === 'end') {
            $meeting->update(['ended_at' => now()]);
            rescue(fn () => LiveKit::call('DeleteRoom', ['room' => $room], $room), report: false);
        } elseif ($data['action'] === 'mute') {
            LiveKit::muteMic($room, $data['identity']);
        } else {
            LiveKit::call('RemoveParticipant', ['room' => $room, 'identity' => $data['identity']], $room);
        }

        return ['ok' => true];
    }
}
