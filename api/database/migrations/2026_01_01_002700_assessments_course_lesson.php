<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** A test can belong to one lesson of a course: the next lesson opens once the student's test is marked. */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('assessments', 'course_lesson_id')) {
            Schema::table('assessments', function (Blueprint $t) {
                $t->foreignId('course_lesson_id')->nullable()->after('course_id')->constrained('course_lessons')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('assessments', 'course_lesson_id')) {
            Schema::table('assessments', function (Blueprint $t) {
                $t->dropConstrainedForeignId('course_lesson_id');
            });
        }
    }
};
