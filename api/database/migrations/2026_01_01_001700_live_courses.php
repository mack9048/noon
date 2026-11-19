<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Live-only courses: no lessons, just regular live classes on a weekly timetable
 * (every day or chosen days, one or more times), a meeting link, and who attended.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('courses', function (Blueprint $t) {
            $t->string('format', 10)->default('recorded')->after('category'); // recorded | live
            $t->string('meet_url', 500)->nullable()->after('format');
            $t->string('live_timezone', 40)->default('Asia/Kolkata')->after('meet_url');
        });
        Schema::create('course_live_slots', function (Blueprint $t) {
            $t->id();
            $t->foreignId('course_id')->constrained()->cascadeOnDelete();
            $t->json('days');                                   // 0 = Sunday … 6 = Saturday
            $t->string('start_time', 5);                        // HH:MM in the course's time zone
            $t->unsignedSmallInteger('duration_min')->default(60);
            $t->string('title', 80)->nullable();
            $t->unsignedInteger('position')->default(0);
            $t->timestamps();
        });
        Schema::create('course_live_attendance', function (Blueprint $t) {
            $t->id();
            $t->foreignId('course_id')->constrained()->cascadeOnDelete();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->dateTime('session_at');                         // when that class started (UTC)
            $t->timestamp('joined_at')->useCurrent();
            $t->unique(['course_id', 'user_id', 'session_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_live_attendance');
        Schema::dropIfExists('course_live_slots');
        Schema::table('courses', fn (Blueprint $t) => $t->dropColumn(['format', 'meet_url', 'live_timezone']));
    }
};
