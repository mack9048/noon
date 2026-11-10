<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Batch;
use App\Models\LiveSession;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Live classes and meetings. Staff add a Google Meet (or other https) link with a time;
 * students and parents see the ones for their batches and join from the app.
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
            'meet_url' => [$req, 'url:https', 'max:500'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);
        if (! empty($data['batch_id']) && ! Batch::find($data['batch_id'])) {
            abort(422, 'Unknown batch.');
        }

        return $data;
    }
}
