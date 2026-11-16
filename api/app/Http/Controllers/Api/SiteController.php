<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SitePage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

/**
 * Website management (super admin only). The website build reads GET /site/content;
 * "Publish" copies drafts to published and starts a new website build (Vercel deploy hook).
 */
class SiteController extends Controller
{
    private const PAGE = '/^[a-z][a-z0-9-]{0,39}$/';

    /** GET /site/content — public; what the website build applies. */
    public function content()
    {
        $pages = SitePage::whereNotNull('published')->get()
            ->mapWithKeys(fn (SitePage $p) => [$p->page => $p->published])->filter();

        return response()->json(['pages' => $pages->isEmpty() ? new \stdClass : $pages, 'updated' => SitePage::max('published_at')])
            ->header('Cache-Control', 'no-store');
    }

    /** GET /super/site — every edited page with its state. */
    public function index()
    {
        return [
            'pages' => SitePage::orderBy('page')->get()->map(fn (SitePage $p) => [
                'page' => $p->page, 'changed' => $p->hasUnpublished(), 'edits' => $this->count($p->draft),
                'updated_at' => $p->updated_at, 'published_at' => $p->published_at,
            ])->values(),
            'unpublished' => SitePage::all()->filter->hasUnpublished()->count(),
            'last_publish' => Cache::get('site.last_publish'),
            'deploy_hook' => (bool) config('noon.site.deploy_hook'),
            'site_url' => config('noon.site.url'),
        ];
    }

    /** GET /super/site/{page} */
    public function show(string $page)
    {
        abort_unless(preg_match(self::PAGE, $page), 404);
        $p = SitePage::where('page', $page)->first();

        return ['page' => $page, 'draft' => $p?->draft ?? new \stdClass, 'published' => $p?->published ?? new \stdClass,
            'changed' => $p?->hasUnpublished() ?? false, 'updated_at' => $p?->updated_at];
    }

    /** PUT /super/site/{page} — save the draft. */
    public function update(Request $request, string $page)
    {
        abort_unless(preg_match(self::PAGE, $page), 404);
        // Keys contain dots ("2.0.1"), so values are checked by hand instead of with nested rules.
        $request->validate(['fields' => ['nullable', 'array', 'max:2000'], 'lists' => ['nullable', 'array', 'max:200']]);
        $keyOk = fn ($k) => is_string($k) && preg_match('/^[\w.:@-]{1,80}$/', $k);
        $valOk = fn ($v) => is_string($v) || is_int($v) || is_float($v);
        $clean = fn ($arr) => collect(is_array($arr) ? $arr : [])->filter(fn ($v, $k) => $keyOk($k) && $valOk($v))
            ->map(fn ($v) => mb_substr((string) $v, 0, 5000))->all();
        $fields = $clean($request->input('fields'));
        $lists = collect($request->input('lists') ?? [])->filter(fn ($v, $k) => $keyOk($k) && is_array($v) && count($v) <= 200)
            ->map(fn ($items) => collect($items)->filter(fn ($it) => is_array($it))->map(fn ($it) => [
                'src' => isset($it['src']) && is_numeric($it['src']) ? max(0, min(500, (int) $it['src'])) : null,
                'fields' => (object) $clean($it['fields'] ?? []),
            ])->values()->all())->all();
        $draft = ['fields' => (object) $fields, 'lists' => (object) $lists];
        abort_if(strlen(json_encode($draft)) > 400000, 422, 'This page has too much content.');

        $p = SitePage::firstOrNew(['page' => $page]);
        $p->fill(['draft' => json_decode(json_encode($draft), true), 'updated_by' => $request->user()->id])->save();

        return $this->show($page);
    }

    /** POST /super/site/{page}/discard — drop unpublished changes on one page. */
    public function discard(string $page)
    {
        abort_unless(preg_match(self::PAGE, $page), 404);
        $p = SitePage::where('page', $page)->first();
        if ($p) {
            $p->published ? $p->update(['draft' => $p->published]) : $p->delete();
        }

        return $this->show($page);
    }

    /** POST /super/site/publish — make every draft live and rebuild the website. */
    public function publish(Request $request)
    {
        $changed = 0;
        foreach (SitePage::all() as $p) {
            if ($p->hasUnpublished()) {
                $p->update(['published' => $p->draft ?: null, 'published_at' => now()]);
                $changed++;
            }
        }
        $deploy = 'not_configured';
        if ($hook = config('noon.site.deploy_hook')) {
            try {
                $deploy = Http::timeout(20)->post($hook)->successful() ? 'started' : 'failed';
            } catch (Throwable) {
                $deploy = 'failed';
            }
        }
        $info = ['at' => now()->toIso8601String(), 'by' => $request->user()->name, 'pages' => $changed, 'deploy' => $deploy];
        Cache::forever('site.last_publish', $info);

        return $info;
    }

    /** POST /super/site/upload — an image for the website. */
    public function upload(Request $request)
    {
        $request->validate(['image' => ['required', 'file', 'mimes:jpg,jpeg,png,webp,gif', 'max:5120']]);
        $file = $request->file('image');
        $path = $file->storeAs('site', Str::lower(Str::random(16)).'.'.$file->extension(), 'public');

        return ['url' => Storage::disk('public')->url($path)];
    }

    private function count(?array $d): int
    {
        return count($d['fields'] ?? []) + count($d['lists'] ?? []);
    }
}
