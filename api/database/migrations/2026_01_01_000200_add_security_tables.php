<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** OTP codes, blocked accounts, and per-madrasa admission numbers. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('otp_codes', function (Blueprint $t) {
            $t->id();
            $t->string('phone', 20)->index();
            $t->string('purpose', 20)->default('login'); // login | guest
            $t->string('code_hash');
            $t->unsignedTinyInteger('attempts')->default(0);
            $t->timestamp('expires_at');
            $t->timestamp('consumed_at')->nullable();
            $t->timestamps();
        });

        Schema::table('users', function (Blueprint $t) {
            $t->boolean('blocked')->default(false)->after('role');
            $t->timestamp('phone_verified_at')->nullable()->after('phone');
            // Admission numbers repeat across madrasas, never inside one.
            $t->unique(['tenant_id', 'admission_no']);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $t) {
            $t->dropUnique(['tenant_id', 'admission_no']);
            $t->dropColumn(['blocked', 'phone_verified_at']);
        });
        Schema::dropIfExists('otp_codes');
    }
};
