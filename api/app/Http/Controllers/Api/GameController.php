<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Game;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * HTML games. The super admin uploads and manages them; students and guests play them.
 * A game file never runs on the app's own origin: it is served from a short-lived signed
 * link with a "sandbox" policy, so its scripts cannot read logins or reach the API as a user.
 */
class GameController extends Controller
{
    // ---------- Players ----------

    public function index(Request $request)
    {
        return Game::query()->visibleTo($request->user())->get()->map(fn (Game $g) => $g->toApp());
    }

    /** A link to the game file that works for 3 hours. */
    public function play(Request $request, int $id)
    {
        $game = Game::findOrFail($id);
        $user = $request->user();
        if (! $user->hasRole('super') && ! $game->isVisibleTo($user)) {
            abort(404);
        }
        // Sign only the path, so the link still checks out behind the host's HTTPS proxy.
        $path = URL::temporarySignedRoute('games.file', now()->addHours(3), ['id' => $game->id, 'p' => $user->hasRole('super') ? 0 : 1], absolute: false);

        return ['game' => $game->toApp(), 'url' => rtrim(config('app.url'), '/').$path];
    }

    /** The game itself (signed link only). */
    public function file(Request $request, int $id)
    {
        $game = Game::findOrFail($id);
        abort_unless(Storage::disk('local')->exists($game->html_path), 404);
        if ($request->query('p') === '1') {
            $game->increment('plays'); // counted when the game actually loads (a super admin's test play is not counted)
        }

        return response(Storage::disk('local')->get($game->html_path), 200, [
            'Content-Type' => 'text/html; charset=utf-8',
            // Opaque origin even if the link is opened directly: no cookies, no storage of ours, no same-origin API calls.
            'Content-Security-Policy' => 'sandbox allow-scripts allow-pointer-lock allow-modals allow-forms',
            'X-Content-Type-Options' => 'nosniff',
            'Referrer-Policy' => 'no-referrer',
            'Cache-Control' => 'private, max-age=600',
        ]);
    }

    // ---------- Super admin ----------

    public function adminIndex()
    {
        return Game::orderBy('position')->orderBy('id')->get()->map(fn (Game $g) => $g->toApp(true));
    }

    public function store(Request $request)
    {
        $data = $this->validated($request, true);
        $data['html_path'] = $this->saveHtml($request);
        $data['html_size'] = $request->file('html')->getSize();
        $data['thumbnail_url'] = $this->saveThumb($request);
        $data['position'] = (int) Game::max('position') + 1;
        $data['created_by'] = $request->user()->id;

        return response()->json(Game::create($data)->toApp(true), 201);
    }

    /** POST (not PUT) so files can be sent with the form. */
    public function update(Request $request, int $id)
    {
        $game = Game::findOrFail($id);
        $data = $this->validated($request, false);
        if ($request->hasFile('html')) {
            Storage::disk('local')->delete($game->html_path);
            $data['html_path'] = $this->saveHtml($request);
            $data['html_size'] = $request->file('html')->getSize();
        }
        if ($request->hasFile('thumbnail')) {
            $this->deleteThumb($game);
            $data['thumbnail_url'] = $this->saveThumb($request);
        } elseif ($request->boolean('remove_thumbnail')) {
            $this->deleteThumb($game);
            $data['thumbnail_url'] = null;
        }
        $game->update($data);

        return $game->fresh()->toApp(true);
    }

    public function destroy(int $id)
    {
        $game = Game::findOrFail($id);
        Storage::disk('local')->delete($game->html_path);
        $this->deleteThumb($game);
        $game->delete();

        return response()->noContent();
    }

    /** Save a new display order: ids from first to last. */
    public function reorder(Request $request)
    {
        $ids = $request->validate(['ids' => ['required', 'array'], 'ids.*' => ['integer']])['ids'];
        foreach (array_values($ids) as $i => $id) {
            Game::whereKey($id)->update(['position' => $i + 1]);
        }

        return $this->adminIndex();
    }

    private function validated(Request $request, bool $creating): array
    {
        // Multipart forms send everything as text: tenant_ids may arrive as "1,4" or a JSON list.
        if (is_string($request->input('tenant_ids'))) {
            $raw = trim($request->input('tenant_ids'));
            $list = str_starts_with($raw, '[') ? (json_decode($raw, true) ?: []) : array_filter(explode(',', $raw));
            $request->merge(['tenant_ids' => array_map('intval', $list)]);
        }
        $data = $request->validate([
            'title' => [$creating ? 'required' : 'sometimes', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:500'],
            'mode' => ['sometimes', Rule::in(Game::MODES)],
            'audience' => ['sometimes', Rule::in(Game::AUDIENCES)],
            'tenant_ids' => ['nullable', 'array'],
            'tenant_ids.*' => ['integer', 'exists:tenants,id'],
            'age_group' => ['nullable', 'string', 'max:20'],
            'status' => ['sometimes', Rule::in(['live', 'draft'])],
            // One self-contained HTML file, up to 20 MB (games made with AI usually are a few hundred KB).
            'html' => [$creating ? 'required' : 'nullable', 'file', 'max:20480', 'extensions:html,htm', 'mimetypes:text/html,text/plain,application/xhtml+xml'],
            'thumbnail' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:3072'],
        ], [
            'html.extensions' => 'Choose the game\'s .html file.',
            'html.mimetypes' => 'Choose the game\'s .html file.',
        ]);
        unset($data['html'], $data['thumbnail']);
        if (array_key_exists('tenant_ids', $data)) {
            $data['tenant_ids'] = ! empty($data['tenant_ids']) && ($data['audience'] ?? 'students') !== 'guests' ? array_values(array_unique($data['tenant_ids'])) : null;
        }

        return $data;
    }

    private function saveHtml(Request $request): string
    {
        return $request->file('html')->storeAs('games', Str::uuid().'.html', 'local');
    }

    private function saveThumb(Request $request): ?string
    {
        return $request->hasFile('thumbnail') ? Storage::disk('public')->url($request->file('thumbnail')->store('games/thumbs', 'public')) : null;
    }

    private function deleteThumb(Game $game): void
    {
        if ($game->thumbnail_url && str_contains($game->thumbnail_url, '/storage/')) {
            Storage::disk('public')->delete(str_replace(Storage::disk('public')->url(''), '', $game->thumbnail_url));
        }
    }
}
