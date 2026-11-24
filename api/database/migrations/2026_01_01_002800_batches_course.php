<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** A batch can be for a course (board and class only matter for Madrasa Support). */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('batches', 'course_id')) {
            Schema::table('batches', function (Blueprint $t) {
                $t->foreignId('course_id')->nullable()->after('tenant_id')->constrained()->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('batches', 'course_id')) {
            Schema::table('batches', function (Blueprint $t) {
                $t->dropConstrainedForeignId('course_id');
            });
        }
    }
};
