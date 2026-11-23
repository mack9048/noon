<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** A guest who picks an institution in the app sends a join request: a lead linked to their account, for the office to approve. */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('leads', 'user_id')) {
            Schema::table('leads', function (Blueprint $t) {
                $t->foreignId('user_id')->nullable()->after('admission_id')->constrained('users')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('leads', 'user_id')) {
            Schema::table('leads', function (Blueprint $t) {
                $t->dropConstrainedForeignId('user_id');
            });
        }
    }
};
