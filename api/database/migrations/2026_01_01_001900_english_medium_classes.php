<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * English Medium Madrasa Syllabus starts as a copy of each board's General syllabus classes and
 * subject names (no lessons: English content is uploaded separately). Boards that already have
 * English Medium classes are left alone.
 */
return new class extends Migration
{
    public function up(): void
    {
        $now = now();
        foreach (DB::table('boards')->pluck('id') as $boardId) {
            if (DB::table('school_classes')->where('board_id', $boardId)->where('syllabus', 'english')->exists()) {
                continue;
            }
            foreach (DB::table('school_classes')->where('board_id', $boardId)->where('syllabus', 'general')->orderBy('position')->get() as $c) {
                $id = DB::table('school_classes')->insertGetId(['board_id' => $boardId, 'syllabus' => 'english', 'label' => $c->label, 'position' => $c->position, 'created_at' => $now, 'updated_at' => $now]);
                $rows = DB::table('subjects')->where('class_id', $c->id)->orderBy('position')->get()->map(fn ($s) => [
                    'class_id' => $id, 'name' => $s->name, 'name_ar' => $s->name_ar, 'thumbnail_path' => $s->thumbnail_path,
                    'position' => $s->position, 'created_at' => $now, 'updated_at' => $now,
                ])->all();
                if ($rows) {
                    DB::table('subjects')->insert($rows);
                }
            }
        }
    }

    public function down(): void
    {
        // Copies may have content added since; leave them.
    }
};
