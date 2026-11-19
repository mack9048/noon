<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Orders from the website without an account: the buyer's name and phone, and a secret link to the order. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $t) {
            $t->foreignId('user_id')->nullable()->change();
            $t->string('buyer_name', 80)->nullable()->after('tenant_id');
            $t->string('buyer_phone', 20)->nullable()->after('buyer_name');
            $t->string('buyer_email', 120)->nullable()->after('buyer_phone');
            $t->string('access_token', 64)->nullable()->unique()->after('buyer_email');
        });
    }

    public function down(): void
    {
        Schema::table('orders', fn (Blueprint $t) => $t->dropColumn(['buyer_name', 'buyer_phone', 'buyer_email', 'access_token']));
    }
};
