<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Course builder:
 *  - course_categories: the list super admin edits (Arabic, Quran, …)
 *  - course_subjects: optional groups inside a course (a one-subject course has none)
 *  - course_lessons: lessons, each optionally inside a subject
 *  - course_items: now belong to a lesson; new kinds html / note / image / link;
 *    a private file_path for uploaded HTML (served only through a signed link)
 *  - courses: price period, free trial days, free for subscribed madrasas
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('course_categories', function (Blueprint $t) {
            $t->id();
            $t->string('name', 60)->unique();
            $t->unsignedSmallInteger('position')->default(0);
            $t->timestamps();
        });
        $now = now();
        foreach (['Arabic', 'Quran', 'Fiqh', 'Seerah', 'Hifz', 'Duas & Adkar'] as $i => $name) {
            DB::table('course_categories')->insert(['name' => $name, 'position' => $i + 1, 'created_at' => $now, 'updated_at' => $now]);
        }

        Schema::create('course_subjects', function (Blueprint $t) {
            $t->id();
            $t->foreignId('course_id')->constrained()->cascadeOnDelete();
            $t->string('title', 160);
            $t->unsignedSmallInteger('position')->default(0);
            $t->timestamps();
        });

        Schema::create('course_lessons', function (Blueprint $t) {
            $t->id();
            $t->foreignId('course_id')->constrained()->cascadeOnDelete();
            $t->foreignId('course_subject_id')->nullable()->constrained()->nullOnDelete();
            $t->string('title', 160);
            $t->string('description', 1000)->nullable();
            $t->string('duration', 20)->nullable();
            $t->boolean('free_preview')->default(false);
            $t->unsignedSmallInteger('position')->default(0);
            $t->timestamps();
            $t->index(['course_id', 'position']);
        });

        Schema::table('course_items', function (Blueprint $t) {
            $t->foreignId('course_lesson_id')->nullable()->after('course_id')->constrained()->cascadeOnDelete();
            $t->longText('body')->nullable()->after('url');           // class note text
            $t->string('file_path')->nullable()->after('body');       // private file (HTML)
            $t->unsignedInteger('file_size')->nullable()->after('file_path');
        });
        // live | video | audio | pdf | test | html | note | image | link
        Schema::table('course_items', fn (Blueprint $t) => $t->string('kind', 12)->change());

        Schema::table('courses', function (Blueprint $t) {
            $t->string('price_period', 8)->default('once')->after('offer_price'); // once | monthly
            $t->unsignedTinyInteger('trial_days')->default(7)->after('price_period');
            $t->boolean('free_for_subscribers')->default(true)->after('trial_days');
        });
    }

    public function down(): void
    {
        Schema::table('courses', fn (Blueprint $t) => $t->dropColumn(['price_period', 'trial_days', 'free_for_subscribers']));
        Schema::table('course_items', function (Blueprint $t) {
            $t->dropConstrainedForeignId('course_lesson_id');
            $t->dropColumn(['body', 'file_path', 'file_size']);
        });
        Schema::dropIfExists('course_lessons');
        Schema::dropIfExists('course_subjects');
        Schema::dropIfExists('course_categories');
    }
};
