<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** A picture for each piece of lesson content (shown instead of the type icon). */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('course_items', 'thumbnail_path')) {
            Schema::table('course_items', function (Blueprint $t) {
                $t->string('thumbnail_path')->nullable()->after('file_size');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('course_items', 'thumbnail_path')) {
            Schema::table('course_items', function (Blueprint $t) {
                $t->dropColumn('thumbnail_path');
            });
        }
    }
};
