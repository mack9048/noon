<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Live courses run on Google Meet (a link) or Noon Live (LiveKit, inside the app). */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('courses', 'live_provider')) {
            Schema::table('courses', fn (Blueprint $t) => $t->string('live_provider', 10)->default('meet')->after('format'));
        }
    }

    public function down(): void
    {
        Schema::table('courses', fn (Blueprint $t) => $t->dropColumn('live_provider'));
    }
};
