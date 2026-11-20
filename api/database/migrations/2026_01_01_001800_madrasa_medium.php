<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Madrasa Support in two mediums: every board's classes exist once in Malayalam (ml)
 * and once in English (en), each with its own subjects and lessons.
 * The learner picks board + medium once; users.medium remembers it (they can change it).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('school_classes', function (Blueprint $t) {
            $t->string('medium', 2)->default('ml')->after('board_id');
        });
        Schema::table('school_classes', function (Blueprint $t) {
            // The new unique index also covers board_id for its foreign key, so the old one can go.
            $t->unique(['board_id', 'medium', 'label']);
            $t->dropUnique(['board_id', 'label']);
        });

        Schema::table('users', function (Blueprint $t) {
            $t->string('medium', 2)->nullable()->after('class_id');
        });

        // Existing classes are the Malayalam medium. Give every board an English-medium copy
        // with the same subject names (no lessons yet: English content is uploaded separately).
        $now = now();
        foreach (DB::table('school_classes')->where('medium', 'ml')->orderBy('id')->get() as $class) {
            $enId = DB::table('school_classes')->insertGetId([
                'board_id' => $class->board_id, 'medium' => 'en', 'label' => $class->label,
                'position' => $class->position, 'created_at' => $now, 'updated_at' => $now,
            ]);
            $subjects = DB::table('subjects')->where('class_id', $class->id)->orderBy('position')->get(['name', 'name_ar', 'position']);
            DB::table('subjects')->insert($subjects->map(fn ($s) => [
                'class_id' => $enId, 'name' => $s->name, 'name_ar' => $s->name_ar,
                'position' => $s->position, 'created_at' => $now, 'updated_at' => $now,
            ])->all());
        }

        // Learners who already picked a class keep that class's medium.
        DB::table('users')->whereNotNull('class_id')->update(['medium' => 'ml']);
    }

    public function down(): void
    {
        DB::table('school_classes')->where('medium', 'en')->delete();
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn('medium'));
        Schema::table('school_classes', function (Blueprint $t) {
            $t->unique(['board_id', 'label']);
            $t->dropUnique(['board_id', 'medium', 'label']);
        });
        Schema::table('school_classes', fn (Blueprint $t) => $t->dropColumn('medium'));
    }
};
