<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Board;
use App\Models\SchoolClass;
use App\Models\Subject;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

/** Super admin: Madrasa Support boards (names, logos), classes per syllabus, subjects with thumbnails. */
class MadrasaSupportAdminController extends Controller
{
    public function boards()
    {
        return Board::orderBy('position')->orderBy('id')->get()->map(fn (Board $b) => $b->toApp() + [
            'syllabi' => collect(Board::SYLLABI)->map(fn ($label, $key) => ['key' => $key, 'label' => $label, 'classes' => $b->classes()->where('syllabus', $key)->count()])->values(),
        ]);
    }

    /** POST (multipart): name, full name, active, logo. */
    public function updateBoard(Request $request, Board $board)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:60'], 'full_name' => ['nullable', 'string', 'max:160'],
            'active' => ['sometimes', 'boolean'], 'position' => ['sometimes', 'integer', 'min:0', 'max:99'],
            'logo' => ['nullable', 'file', 'max:2048', 'extensions:png,jpg,jpeg,webp,svg'], 'remove_logo' => ['sometimes', 'boolean'],
        ]);
        if ($request->boolean('remove_logo') || $request->hasFile('logo')) {
            $board->logo_path && Storage::disk('public')->delete($board->logo_path);
            $data['logo_path'] = $request->hasFile('logo') ? $request->file('logo')->store('boards', 'public') : null;
        }
        $board->update(collect($data)->except(['logo', 'remove_logo'])->all());

        return $board->fresh()->toApp();
    }

    /** Classes of one syllabus with their subjects. */
    public function classes(Request $request, Board $board)
    {
        $syllabus = $this->syllabus($request);

        return $board->classes()->where('syllabus', $syllabus)->with(['subjects' => fn ($q) => $q->withCount('lessons')])->get()->map(fn (SchoolClass $c) => [
            'id' => $c->id, 'label' => $c->label, 'syllabus' => $c->syllabus,
            'subjects' => $c->subjects->map(fn (Subject $s) => $this->subjectRow($s))->values(),
        ]);
    }

    public function storeClass(Request $request, Board $board)
    {
        $syllabus = $this->syllabus($request);
        $data = $request->validate(['label' => ['required', 'string', 'max:5', Rule::unique('school_classes')->where('board_id', $board->id)->where('syllabus', $syllabus)]],
            ['label.unique' => 'This class already exists in this syllabus.']);
        $board->classes()->create(['syllabus' => $syllabus, 'label' => trim($data['label']), 'position' => (int) $board->classes()->where('syllabus', $syllabus)->max('position') + 1]);

        return $this->classes($request, $board);
    }

    public function destroyClass(SchoolClass $class)
    {
        abort_if(\App\Models\User::where('class_id', $class->id)->exists(), 422, 'Some students are in this class. Move them first.');
        $class->delete();

        return response()->noContent();
    }

    /** Copy classes and subjects (names, thumbnails) from one syllabus to another, to start the English Medium syllabus quickly. */
    public function copySyllabus(Request $request, Board $board)
    {
        $data = $request->validate(['from' => ['required', Rule::in(array_keys(Board::SYLLABI))], 'to' => ['required', 'different:from', Rule::in(array_keys(Board::SYLLABI))]]);
        DB::transaction(function () use ($board, $data) {
            foreach ($board->classes()->where('syllabus', $data['from'])->with('subjects')->get() as $c) {
                $new = SchoolClass::firstOrCreate(['board_id' => $board->id, 'syllabus' => $data['to'], 'label' => $c->label], ['position' => $c->position]);
                foreach ($c->subjects as $s) {
                    $new->subjects()->firstOrCreate(['name' => $s->name], ['name_ar' => $s->name_ar, 'position' => $s->position, 'thumbnail_path' => $s->thumbnail_path]);
                }
            }
        });
        $request->query->set('syllabus', $data['to']);

        return $this->classes($request, $board);
    }

    public function storeSubject(Request $request, SchoolClass $class)
    {
        $data = $this->subjectRules($request, true);
        $s = new Subject(collect($data)->except(['thumbnail', 'remove_thumbnail'])->all() + ['position' => (int) $class->subjects()->max('position') + 1]);
        $s->class_id = $class->id;
        $this->thumb($request, $s);
        $s->save();

        return $this->subjectRow($s->loadCount('lessons'));
    }

    /** POST (multipart) so the thumbnail can be replaced. */
    public function updateSubject(Request $request, Subject $subject)
    {
        $data = $this->subjectRules($request, false);
        $subject->fill(collect($data)->except(['thumbnail', 'remove_thumbnail'])->all());
        $this->thumb($request, $subject);
        $subject->save();

        return $this->subjectRow($subject->loadCount('lessons'));
    }

    public function destroySubject(Subject $subject)
    {
        abort_if($subject->lessons()->exists(), 422, 'This subject has lessons. Remove them first.');
        $subject->thumbnail_path && Storage::disk('public')->delete($subject->thumbnail_path);
        $subject->delete();

        return response()->noContent();
    }

    private function subjectRules(Request $request, bool $creating): array
    {
        return $request->validate([
            'name' => [$creating ? 'required' : 'sometimes', 'string', 'max:80'],
            'name_ar' => ['nullable', 'string', 'max:80'],
            'thumbnail' => ['nullable', 'file', 'max:2048', 'extensions:png,jpg,jpeg,webp,svg'],
            'remove_thumbnail' => ['sometimes', 'boolean'],
        ]);
    }

    private function thumb(Request $request, Subject $s): void
    {
        if ($request->boolean('remove_thumbnail') || $request->hasFile('thumbnail')) {
            // A copied subject may share the file with its original: only delete files no other subject uses.
            if ($s->thumbnail_path && ! Subject::where('thumbnail_path', $s->thumbnail_path)->whereKeyNot($s->id ?? 0)->exists()) {
                Storage::disk('public')->delete($s->thumbnail_path);
            }
            $s->thumbnail_path = $request->hasFile('thumbnail') ? $request->file('thumbnail')->store('subjects', 'public') : null;
        }
    }

    private function subjectRow(Subject $s): array
    {
        return ['id' => $s->id, 'class_id' => $s->class_id, 'name' => $s->name, 'name_ar' => $s->name_ar, 'thumbnail_url' => $s->thumbnailUrl(), 'lessons_count' => (int) ($s->lessons_count ?? 0)];
    }

    private function syllabus(Request $request): string
    {
        $s = (string) $request->input('syllabus', $request->query('syllabus', 'general'));

        return array_key_exists($s, Board::SYLLABI) ? $s : 'general';
    }
}
