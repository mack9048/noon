<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Student admission portal:
 *  - admission_campaigns: an intake (e.g. "Admissions 2026–27") with its own public link
 *  - leads: enquiries to follow up (from the public page, WhatsApp, calls, walk-ins…)
 *  - admissions gain the campaign, an email and the student account made on admission
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admission_campaigns', function (Blueprint $t) {
            $t->id();
            $t->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $t->string('code', 16)->unique();
            $t->string('title', 120);
            $t->string('academic_year', 12)->nullable();
            $t->json('classes')->nullable();
            $t->unsignedInteger('seats')->nullable();
            $t->date('opens_on')->nullable();
            $t->date('closes_on')->nullable();
            $t->string('description', 600)->nullable();
            $t->string('fee_note', 200)->nullable();
            $t->string('status', 10)->default('open'); // open | closed
            $t->timestamps();
        });

        Schema::create('leads', function (Blueprint $t) {
            $t->id();
            $t->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $t->foreignId('campaign_id')->nullable()->constrained('admission_campaigns')->nullOnDelete();
            $t->string('student_name', 80);
            $t->string('parent_name', 80)->nullable();
            $t->string('phone', 20);
            $t->string('email')->nullable();
            $t->string('class_label', 4)->nullable();
            $t->string('source', 20)->default('portal'); // portal | whatsapp | call | walk_in | referral | social | other
            $t->string('status', 12)->default('new');    // new | contacted | interested | visit | applied | admitted | lost
            $t->date('follow_up_on')->nullable();
            $t->json('notes')->nullable();
            $t->foreignId('admission_id')->nullable()->constrained()->nullOnDelete();
            $t->timestamps();
            $t->index(['tenant_id', 'status']);
        });

        Schema::table('admissions', function (Blueprint $t) {
            $t->foreignId('campaign_id')->nullable()->after('tenant_id')->constrained('admission_campaigns')->nullOnDelete();
            $t->string('email')->nullable()->after('phone');
            $t->foreignId('student_id')->nullable()->after('status')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('admissions', function (Blueprint $t) {
            $t->dropConstrainedForeignId('student_id');
            $t->dropConstrainedForeignId('campaign_id');
            $t->dropColumn('email');
        });
        Schema::dropIfExists('leads');
        Schema::dropIfExists('admission_campaigns');
    }
};
