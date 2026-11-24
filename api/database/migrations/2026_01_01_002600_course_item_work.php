<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Work students hand in for a lesson item (a photo or PDF of a finished worksheet). */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('course_item_work')) {
            return;
        }
        Schema::create('course_item_work', function (Blueprint $t) {
            $t->id();
            $t->foreignId('course_item_id')->constrained('course_items')->cascadeOnDelete();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('file_path');
            $t->string('file_name', 160);
            $t->string('mime', 80);
            $t->unsignedInteger('size');
            $t->timestamps();
            $t->index(['course_item_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_item_work');
    }
};
