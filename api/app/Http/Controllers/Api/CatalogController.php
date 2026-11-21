<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Board;
use App\Models\SchoolClass;
use App\Models\Subject;
use Illuminate\Http\Request;

/** Madrasa Support: board → class → subject → lessons (public read-only catalogue). */
class CatalogController extends Controller
{
    /** The boards to choose from (SKIMVB (EK), SKSVB (AP)), with their logos and the two syllabi. */
    public function boards()
    {
        return Board::where('active', true)->orderBy('position')->orderBy('id')->get()->map(fn (Board $b) => $b->toApp() + [
            'syllabi' => collect(Board::SYLLABI)->map(fn ($label, $key) => ['key' => $key, 'label' => $label,
                'classes' => $b->classes()->where('syllabus', $key)->count()])->values(),
        ]);
    }

    /** Classes of a board for one syllabus (?syllabus=general|english; general by default). */
    public function classes(Request $request, Board $board)
    {
        $syllabus = in_array($request->query('syllabus'), array_keys(Board::SYLLABI), true) ? $request->query('syllabus') : 'general';

        return $board->classes()->where('syllabus', $syllabus)->withCount('subjects')->get()
            ->map(fn (SchoolClass $c) => [
                'id' => $c->id,
                'board_id' => $c->board_id,
                'syllabus' => $c->syllabus,
                'label' => $c->label,
                'subjects_count' => $c->subjects_count,
            ]);
    }

    public function subjects(SchoolClass $class)
    {
        return $class->subjects()->withCount('lessons')->get()
            ->map(fn (Subject $s) => [
                'id' => $s->id,
                'class_id' => $s->class_id,
                'name' => $s->name,
                'name_ar' => $s->name_ar,
                'thumbnail_url' => $s->thumbnailUrl(),
                'lessons_count' => $s->lessons_count,
            ]);
    }

    public function subject(Subject $subject)
    {
        $subject->load(['lessons', 'schoolClass.board']);

        return [
            'id' => $subject->id,
            'class_id' => $subject->class_id,
            'name' => $subject->name,
            'name_ar' => $subject->name_ar,
            'thumbnail_url' => $subject->thumbnailUrl(),
            'syllabus' => $subject->schoolClass->syllabus,
            'textbook_pdf_url' => $subject->textbook_pdf_url,
            'board_name' => $subject->schoolClass->board->code,
            'class_label' => $subject->schoolClass->label,
            'lessons_count' => $subject->lessons->count(),
            'lessons' => $subject->lessons,
        ];
    }
}
