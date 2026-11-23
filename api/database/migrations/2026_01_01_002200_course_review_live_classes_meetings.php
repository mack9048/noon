<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * - Teacher changes wait for approval: new / to-delete lessons and items, and pending lesson edits.
 * - A live course's classes as a list: created first, dated later (no date or time needed to create one).
 * - Institution meetings for everyone at once (Noon Live).
 */
return new class extends Migration
{
    public function up(): void
    {
        foreach (['course_lessons', 'course_items'] as $table) {
            Schema::table($table, function (Blueprint $t) use ($table) {
                if (! Schema::hasColumn($table, 'review_state')) {
                    $t->string('review_state', 10)->nullable()->index(); // null = live · new · delete
                }
                if (! Schema::hasColumn($table, 'submitted_by')) {
                    $t->foreignId('submitted_by')->nullable()->constrained('users')->nullOnDelete();
                }
            });
        }
        if (! Schema::hasColumn('course_lessons', 'pending')) {
            Schema::table('course_lessons', fn (Blueprint $t) => $t->json('pending')->nullable()); // edits waiting for approval
        }
        if (! Schema::hasColumn('course_items', 'replaces_id')) {
            Schema::table('course_items', fn (Blueprint $t) => $t->unsignedBigInteger('replaces_id')->nullable()->index()); // an edited copy waiting for approval
        }

        if (! Schema::hasTable('course_live_classes')) {
            Schema::create('course_live_classes', function (Blueprint $t) {
                $t->id();
                $t->foreignId('course_id')->constrained()->cascadeOnDelete();
                $t->unsignedSmallInteger('position')->default(0);
                $t->string('title', 160);
                $t->string('notes', 500)->nullable();
                $t->timestamp('starts_at')->nullable(); // set later
                $t->unsignedSmallInteger('duration_min')->default(45);
                $t->timestamps();
                $t->index(['course_id', 'starts_at']);
            });
        }

        if (! Schema::hasTable('meetings')) {
            Schema::create('meetings', function (Blueprint $t) {
                $t->id();
                $t->foreignId('tenant_id')->constrained()->cascadeOnDelete();
                $t->string('title', 160);
                $t->string('notes', 500)->nullable();
                $t->string('audience', 12)->default('students'); // students · staff · everyone
                $t->timestamp('starts_at')->nullable();
                $t->unsignedSmallInteger('duration_min')->default(45);
                $t->timestamp('started_at')->nullable();
                $t->timestamp('ended_at')->nullable();
                $t->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $t->timestamps();
            });
            Schema::create('meeting_attendance', function (Blueprint $t) {
                $t->foreignId('meeting_id')->constrained()->cascadeOnDelete();
                $t->foreignId('user_id')->constrained()->cascadeOnDelete();
                $t->timestamp('joined_at')->nullable();
                $t->primary(['meeting_id', 'user_id']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('meeting_attendance');
        Schema::dropIfExists('meetings');
        Schema::dropIfExists('course_live_classes');
        Schema::table('course_items', fn (Blueprint $t) => $t->dropColumn(['replaces_id']));
        Schema::table('course_lessons', fn (Blueprint $t) => $t->dropColumn(['pending']));
        foreach (['course_lessons', 'course_items'] as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->dropConstrainedForeignId('submitted_by');
                $t->dropColumn('review_state');
            });
        }
    }
};
