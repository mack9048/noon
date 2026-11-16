<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Website (www.noonlearn.com) content edited by the super admin: a draft and the published version per page.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('site_pages', function (Blueprint $t) {
            $t->id();
            $t->string('page', 40)->unique();
            $t->longText('draft')->nullable();
            $t->longText('published')->nullable();
            $t->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamp('published_at')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_pages');
    }
};
