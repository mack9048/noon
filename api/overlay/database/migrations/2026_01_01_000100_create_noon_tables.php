<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Noon Learn core schema (MySQL 8).
 * Multi-tenant: every madrasa is a tenant; super admin + guests have tenant_id = NULL.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenants', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->string('code', 20)->unique();           // "madrasa code" guests enter to join
            $t->string('plan', 20)->default('basic');    // basic | pro | enterprise
            $t->unsignedTinyInteger('leave_quota')->default(15);
            $t->boolean('active')->default(true);
            $t->timestamps();
        });

        Schema::create('boards', function (Blueprint $t) {
            $t->id();
            $t->string('code', 10)->unique();  // AP, EK, GEN
            $t->string('name');
            $t->string('meta')->nullable();
            $t->timestamps();
        });

        Schema::create('school_classes', function (Blueprint $t) {
            $t->id();
            $t->foreignId('board_id')->constrained()->cascadeOnDelete();
            $t->string('label', 5);            // 1..10, +1, +2
            $t->unsignedTinyInteger('position');
            $t->timestamps();
            $t->unique(['board_id', 'label']);
        });

        Schema::table('users', function (Blueprint $t) {
            $t->foreignId('tenant_id')->nullable()->after('id')->constrained()->nullOnDelete();
            $t->string('role', 20)->default('student')->after('name')->index(); // guest|student|parent|teacher|admin|super
            $t->string('phone', 30)->nullable()->unique()->after('email');
            $t->string('admission_no', 40)->nullable()->after('phone');
            $t->unsignedTinyInteger('age')->nullable();
            $t->foreignId('board_id')->nullable()->constrained()->nullOnDelete();
            $t->foreignId('class_id')->nullable()->constrained('school_classes')->nullOnDelete();
            $t->string('email')->nullable()->change();
        });

        Schema::create('subjects', function (Blueprint $t) {
            $t->id();
            $t->foreignId('class_id')->constrained('school_classes')->cascadeOnDelete();
            $t->string('name');
            $t->string('name_ar')->nullable();
            $t->string('textbook_pdf_url')->nullable();
            $t->unsignedSmallInteger('position')->default(0);
            $t->timestamps();
        });

        Schema::create('lessons', function (Blueprint $t) {
            $t->id();
            $t->foreignId('subject_id')->constrained()->cascadeOnDelete();
            $t->unsignedSmallInteger('position');
            $t->string('title');
            $t->string('video_url')->nullable();
            $t->string('video_duration', 10)->nullable();
            $t->string('audio_url')->nullable();
            $t->string('audio_duration', 10)->nullable();
            $t->string('note_pdf_url')->nullable();
            $t->timestamps();
        });

        Schema::create('courses', function (Blueprint $t) {
            $t->id();
            $t->string('title');
            $t->string('category', 60);
            $t->string('level', 30)->default('Beginner');
            $t->string('cover', 9)->default('#DAD3F6');
            $t->enum('status', ['draft', 'published'])->default('draft')->index();
            $t->boolean('is_free')->default(false);
            $t->foreignId('teacher_id')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamps();
        });

        Schema::create('course_items', function (Blueprint $t) {
            $t->id();
            $t->foreignId('course_id')->constrained()->cascadeOnDelete();
            $t->enum('kind', ['live', 'video', 'audio', 'pdf', 'test']);
            $t->string('title');
            $t->string('meta')->nullable();
            $t->string('url')->nullable();          // file URL or meeting link
            $t->dateTime('starts_at')->nullable();  // for live classes
            $t->unsignedSmallInteger('position')->default(0);
            $t->timestamps();
        });

        // Which tenants have switched a course on (institute admin toggle)
        Schema::create('course_tenant', function (Blueprint $t) {
            $t->foreignId('course_id')->constrained()->cascadeOnDelete();
            $t->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $t->boolean('enabled')->default(true);
            $t->foreignId('teacher_id')->nullable()->constrained('users')->nullOnDelete();
            $t->json('class_ids')->nullable();
            $t->primary(['course_id', 'tenant_id']);
        });

        Schema::create('course_user', function (Blueprint $t) {
            $t->foreignId('course_id')->constrained()->cascadeOnDelete();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->unsignedTinyInteger('progress')->default(0);
            $t->timestamp('trial_ends_at')->nullable();
            $t->timestamps();
            $t->primary(['course_id', 'user_id']);
        });

        Schema::create('course_item_user', function (Blueprint $t) {
            $t->foreignId('course_item_id')->constrained()->cascadeOnDelete();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->timestamp('completed_at')->useCurrent();
            $t->primary(['course_item_id', 'user_id']);
        });

        Schema::create('study_tools', function (Blueprint $t) {
            $t->id();
            $t->enum('type', ['chart', 'adkar', 'slide', 'form'])->index();
            $t->string('title');
            $t->string('file_path')->nullable();
            $t->boolean('is_new')->default(false);
            $t->enum('status', ['draft', 'live'])->default('draft');
            $t->foreignId('board_id')->nullable()->constrained()->nullOnDelete();
            $t->unsignedInteger('views')->default(0);
            $t->timestamps();
        });

        Schema::create('leave_requests', function (Blueprint $t) {
            $t->id();
            $t->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $t->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $t->string('type', 40);
            $t->date('start_date');
            $t->date('end_date');
            $t->text('reason')->nullable();
            $t->enum('status', ['pending', 'approved', 'rejected'])->default('pending')->index();
            $t->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamp('reviewed_at')->nullable();
            $t->timestamps();
        });

        Schema::create('conversations', function (Blueprint $t) {
            $t->id();
            $t->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $t->enum('kind', ['direct', 'group', 'office'])->default('direct');
            $t->string('title')->nullable();
            $t->timestamps();
        });

        Schema::create('conversation_user', function (Blueprint $t) {
            $t->foreignId('conversation_id')->constrained()->cascadeOnDelete();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->unsignedBigInteger('last_read_message_id')->nullable();
            $t->primary(['conversation_id', 'user_id']);
        });

        Schema::create('messages', function (Blueprint $t) {
            $t->id();
            $t->foreignId('conversation_id')->constrained()->cascadeOnDelete();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->enum('kind', ['text', 'voice', 'file', 'image'])->default('text');
            $t->text('body');
            $t->string('file_path')->nullable();
            $t->timestamps();
            $t->index(['conversation_id', 'id']);
        });
    }

    public function down(): void
    {
        foreach (['messages', 'conversation_user', 'conversations', 'leave_requests', 'study_tools', 'course_item_user',
                  'course_user', 'course_tenant', 'course_items', 'courses', 'lessons', 'subjects'] as $table) {
            Schema::dropIfExists($table);
        }
        Schema::table('users', function (Blueprint $t) {
            $t->dropConstrainedForeignId('class_id');
            $t->dropConstrainedForeignId('board_id');
            $t->dropConstrainedForeignId('tenant_id');
            $t->dropColumn(['role', 'phone', 'admission_no', 'age']);
        });
        Schema::dropIfExists('school_classes');
        Schema::dropIfExists('boards');
        Schema::dropIfExists('tenants');
    }
};
