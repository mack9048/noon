<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Second design round:
 *  - courses: logo, description, prices, owner madrasa + visibility, and approval states
 *    (pending / changes / rejected) for courses that madrasa admins create
 *  - admissions: applications from the public admission form
 *  - batches: groups of students with a class teacher and subject teachers
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('courses', function (Blueprint $t) {
            $t->string('logo_url')->nullable()->after('cover');
            $t->string('description', 500)->nullable()->after('title');
            $t->unsignedInteger('price')->nullable()->after('is_free');
            $t->unsignedInteger('offer_price')->nullable()->after('price');
            $t->foreignId('tenant_id')->nullable()->after('teacher_id')->constrained()->nullOnDelete(); // madrasa that made it
            $t->string('visibility', 10)->default('all')->after('tenant_id');                          // all | madrasa
            $t->string('review_note', 500)->nullable()->after('visibility');
        });
        // draft | published | pending | changes | rejected
        Schema::table('courses', fn (Blueprint $t) => $t->string('status', 12)->default('draft')->change());

        Schema::create('admissions', function (Blueprint $t) {
            $t->id();
            $t->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $t->string('ref', 20)->unique();
            $t->string('student_name', 80);
            $t->string('gender', 6);
            $t->date('dob')->nullable();
            $t->string('board', 10);
            $t->string('class_label', 4);
            $t->string('parent_name', 80);
            $t->string('relation', 20)->default('Parent');
            $t->string('phone', 20);
            $t->string('city', 80)->nullable();
            $t->string('prev_madrasa', 120)->nullable();
            $t->string('preferred_time', 40)->nullable();
            $t->json('docs')->nullable();
            $t->string('status', 10)->default('new')->index(); // new | review | admitted | rejected
            $t->json('timeline')->nullable();
            $t->timestamps();
        });

        Schema::create('batches', function (Blueprint $t) {
            $t->id();
            $t->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $t->string('name', 80);
            $t->string('board', 10);
            $t->string('class_label', 4);
            $t->json('days');
            $t->string('start_time', 10);
            $t->unsignedSmallInteger('seats')->default(30);
            $t->foreignId('class_teacher_id')->nullable()->constrained('users')->nullOnDelete();
            $t->json('subject_teachers')->nullable(); // { "Arabic": user_id, ... }
            $t->timestamps();
        });
        Schema::create('batch_user', function (Blueprint $t) {
            $t->foreignId('batch_id')->constrained()->cascadeOnDelete();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->primary(['batch_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('batch_user');
        Schema::dropIfExists('batches');
        Schema::dropIfExists('admissions');
        Schema::table('courses', function (Blueprint $t) {
            $t->dropConstrainedForeignId('tenant_id');
            $t->dropColumn(['logo_url', 'description', 'price', 'offer_price', 'visibility', 'review_note']);
        });
    }
};
