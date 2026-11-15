<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * HTML games uploaded by the super admin (for example games made with AI).
 * Each game is one self-contained .html file, played inside a locked-down sandbox.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('games', function (Blueprint $t) {
            $t->id();
            $t->string('title');
            $t->text('description')->nullable();
            $t->string('html_path');                              // private file on the "local" disk
            $t->unsignedInteger('html_size')->default(0);
            $t->string('thumbnail_url')->nullable();              // public image
            $t->string('mode', 10)->default('solo');               // solo | group
            $t->string('audience', 12)->default('all');            // all | students | guests
            $t->json('tenant_ids')->nullable();                    // students of these madrasas only (null = every madrasa)
            $t->string('age_group', 20)->nullable();               // e.g. "6–9"
            $t->string('status', 10)->default('draft');            // live | draft
            $t->unsignedInteger('position')->default(0)->index();  // display order, low first
            $t->unsignedInteger('plays')->default(0);
            $t->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('games');
    }
};
