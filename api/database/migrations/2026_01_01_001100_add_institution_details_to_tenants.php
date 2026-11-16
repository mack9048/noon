<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Details an institution admin sets in Settings (shown on receipts and to parents). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $t) {
            $t->string('phone', 30)->nullable()->after('name');
            $t->string('address', 200)->nullable()->after('phone');
            $t->string('academic_year', 20)->nullable()->after('address');
            $t->decimal('default_fee', 10, 2)->nullable()->after('academic_year');
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $t) {
            $t->dropColumn(['phone', 'address', 'academic_year', 'default_fee']);
        });
    }
};
