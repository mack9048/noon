<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Live classes and meetings (Google Meet or any https meeting link). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('live_sessions', function (Blueprint $t) {
            $t->id();
            $t->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $t->foreignId('batch_id')->nullable()->constrained()->nullOnDelete(); // null = everyone in the institution
            $t->string('title', 120);
            $t->string('kind', 10)->default('class'); // class | meeting
            $t->dateTime('starts_at');
            $t->unsignedSmallInteger('duration_min')->default(45);
            $t->string('meet_url', 500);
            $t->string('notes', 500)->nullable();
            $t->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamps();
            $t->index(['tenant_id', 'starts_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('live_sessions');
    }
};
