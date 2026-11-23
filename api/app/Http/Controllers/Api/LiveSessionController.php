<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Batch;
use App\Models\LiveSession;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Live classes and meetings. Staff set a time; everyone joins inside the app on Noon Live (LiveKit).
 * An outside meeting link (Google Meet …) is optional and only used when Noon Live is not set up.
 */
class LiveSessionController extends Controller
{
    public function index(Request $request)
    {
        return $this->visible($request->user())
            ->where('starts_at', '>=', now()->subDays(7))
            ->orderBy('starts_at')->limit(200)->get()
            ->map(fn (LiveSession $s) => $s->toApp());
    }

    public function show(Request $request, int $id)
    {
        return $this->visible($request->user())->findOrFail($id)->toApp();
    }

    /** Batches a teacher or admin can schedule for. */
    public function batches(Request $request)
    {
        return Batch::orderBy('name')->get(['id', 'name'])->map(fn ($b) => ['id' => $b->id, 'name' => $b->name]);
    }

    public function store(Request $request)
    {
        $s = LiveSession::create($this->data($request) + ['created_by' => $request->user()->id]);

        return response()->json($s->load(['batch', 'creator'])->toApp(), 201);
    }

    public function update(Request $request, int $id)
    {
        $s = LiveSession::findOrFail($id);
        $s->update($this->data($request, true));

        return $s->load(['batch', 'creator'])->toApp();
    }

    public function destroy(int $id)
    {
        LiveSession::findOrFail($id)->delete();

        return response()->noContent();
    }

    private function staff(User $user): bool
    {
        return in_array($user->role, ['teacher', 'admin'], true);
    }

    /** Join (or start, for staff): a Noon Live room pass; an outside link only when Noon Live is not set up. */
    public function join(Request $request, int $id)
    {
        $user = $request->user();
        $s = $this->visible($user)->findOrFail($id);
        $staff = $this->staff($user);
        $state = $s->toApp()['state'];
        abort_if($state === 'ended', 422, 'This class has ended.');
        abort_if($state !== 'live' && ! $staff, 422, 'You can join 15 minutes before the start.');
        if (! \App\Support\LiveKit::configured()) {
            abort_unless($s->meet_url, 422, 'Noon Live is not switched on yet. Please ask Noon Learn.');

            return ['provider' => 'meet', 'url' => $s->meet_url];
        }
        $room = 'noon-session-'.$s->id;

        return [
            'provider' => 'livekit', 'url' => \App\Support\LiveKit::url(), 'room' => $room, 'host' => $staff, 'kind' => 'session',
            'token' => \App\Support\LiveKit::token($room, 'u'.$user->id, $user->name, $staff, ['role' => $user->role]),
            'course' => ['id' => $s->id, 'title' => $s->title],
        ];
    }

    /** Staff only: mute, remove, or end the class for everyone. */
    public function moderate(Request $request, int $id)
    {
        abort_unless($this->staff($request->user()), 403);
        $s = LiveSession::findOrFail($id);
        $data = $request->validate(['action' => ['required', 'in:mute,remove,end'], 'identity' => ['required_unless:action,end', 'string', 'max:40']]);
        $room = 'noon-session-'.$s->id;
        match ($data['action']) {
            'mute' => \App\Support\LiveKit::muteMic($room, $data['identity']),
            'remove' => \App\Support\LiveKit::call('RemoveParticipant', ['room' => $room, 'identity' => $data['identity']], $room),
            'end' => \App\Support\LiveKit::call('DeleteRoom', ['room' => $room], $room),
        };

        return ['ok' => true];
    }

    private function visible(User $user)
    {
        $q = LiveSession::with(['batch', 'creator']);
        if (in_array($user->role, ['student', 'parent'], true)) {
            $students = $user->role === 'parent' ? User::where('parent_id', $user->id)->pluck('id')->all() : [$user->id];
            $batchIds = \DB::table('batch_user')->whereIn('user_id', $students)->pluck('batch_id')->all();
            $q->where(fn ($w) => $w->whereNull('batch_id')->orWhereIn('batch_id', $batchIds));
        }

        return $q;
    }

    private function data(Request $request, bool $partial = false): array
    {
        $req = $partial ? 'sometimes' : 'required';
        $data = $request->validate([
            'title' => [$req, 'string', 'min:2', 'max:120'],
            'kind' => ['sometimes', Rule::in(['class', 'meeting'])],
            'batch_id' => ['nullable', 'integer'],
            'starts_at' => [$req, 'date'],
            'duration_min' => ['sometimes', 'integer', 'between:5,480'],
            'meet_url' => ['nullable', 'url:https', 'max:500'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);
        if (! empty($data['batch_id']) && ! Batch::find($data['batch_id'])) {
            abort(422, 'Unknown batch.');
        }

        return $data;
    }
}
