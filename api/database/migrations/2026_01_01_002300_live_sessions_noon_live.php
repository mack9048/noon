<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Institution live classes run on Noon Live; a Google Meet link is no longer needed. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('live_sessions', fn (Blueprint $t) => $t->string('meet_url', 500)->nullable()->change());
    }

    public function down(): void
    {
        // Keep it optional: older rows may have no link now.
    }
};
