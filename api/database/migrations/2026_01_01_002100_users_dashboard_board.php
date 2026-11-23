<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Each person's dashboard to-do list and note. */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'dashboard_board')) {
            Schema::table('users', fn (Blueprint $t) => $t->json('dashboard_board')->nullable());
        }
    }

    public function down(): void
    {
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn('dashboard_board'));
    }
};
