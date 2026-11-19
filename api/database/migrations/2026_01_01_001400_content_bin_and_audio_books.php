<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Content bin: deleted courses, games and resources can be restored (or deleted for good).
 * Study tools also hold audio books (type "audio").
 */
return new class extends Migration
{
    public function up(): void
    {
        foreach (['courses', 'games', 'study_tools'] as $table) {
            Schema::table($table, fn (Blueprint $t) => $t->softDeletes());
        }
        Schema::table('study_tools', fn (Blueprint $t) => $t->string('type', 10)->change());
        Schema::table('study_tools', fn (Blueprint $t) => $t->string('author', 80)->nullable()->after('title'));
    }

    public function down(): void
    {
        Schema::table('study_tools', fn (Blueprint $t) => $t->dropColumn('author'));
        foreach (['courses', 'games', 'study_tools'] as $table) {
            Schema::table($table, fn (Blueprint $t) => $t->dropSoftDeletes());
        }
    }
};
