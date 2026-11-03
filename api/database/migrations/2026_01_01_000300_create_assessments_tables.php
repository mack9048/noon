<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Parent → child link, and assessments and exams for a Noon Course or a madrasa class subject, and each student's marks.
 * tenant_id null = made by Noon (visible to everyone on the course); set = made by one madrasa.
 */
return new class extends Migration
{
    public function up(): void
    {
        // A parent account sees its child's classes and results.
        Schema::table('users', function (Blueprint $t) {
            $t->foreignId('parent_id')->nullable()->after('class_id')->constrained('users')->nullOnDelete();
        });

        Schema::create('assessments', function (Blueprint $t) {
            $t->id();
            $t->foreignId('tenant_id')->nullable()->constrained()->cascadeOnDelete();
            $t->foreignId('course_id')->nullable()->constrained()->cascadeOnDelete();
            $t->foreignId('subject_id')->nullable()->constrained()->cascadeOnDelete();
            $t->enum('type', ['assessment', 'exam']);
            $t->string('title');
            $t->string('description', 1000)->nullable();
            $t->dateTime('due_at')->nullable();   // due date (assessment) or exam date
            $t->unsignedSmallInteger('max_marks')->default(100);
            $t->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamps();
            $t->index(['course_id', 'type']);
            $t->index(['subject_id', 'type']);
        });

        Schema::create('assessment_results', function (Blueprint $t) {
            $t->id();
            $t->foreignId('assessment_id')->constrained()->cascadeOnDelete();
            $t->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $t->decimal('marks', 6, 2);
            $t->string('remarks', 500)->nullable();
            $t->foreignId('marked_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamps();
            $t->unique(['assessment_id', 'student_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assessment_results');
        Schema::dropIfExists('assessments');
        Schema::table('users', fn (Blueprint $t) => $t->dropConstrainedForeignId('parent_id'));
    }
};
