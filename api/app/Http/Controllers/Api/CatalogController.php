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
    public function boards()
    {
        // Madrasa Support offers only the AP and EK boards for now (General is hidden, not deleted).
        return Board::where('code', '!=', 'GEN')->orderBy('id')->get(['id', 'code', 'name', 'meta']);
    }

    /** Classes of one board in one medium (?medium=ml|en, Malayalam by default). */
    public function classes(Request $request, Board $board)
    {
        $medium = in_array($request->query('medium'), SchoolClass::MEDIUMS, true) ? $request->query('medium') : 'ml';

        return $board->classes()->where('medium', $medium)->withCount('subjects')->get()
            ->map(fn (SchoolClass $c) => [
                'id' => $c->id,
                'board_id' => $c->board_id,
                'medium' => $c->medium,
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
            'textbook_pdf_url' => $subject->textbook_pdf_url,
            'board_name' => $subject->schoolClass->board->code,
            'class_label' => $subject->schoolClass->label,
            'medium' => $subject->schoolClass->medium,
            'lessons_count' => $subject->lessons->count(),
            'lessons' => $subject->lessons,
        ];
    }
}
