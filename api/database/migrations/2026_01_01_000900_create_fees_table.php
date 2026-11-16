<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Fees: one row per student per fee (e.g. "November fee"), paid or still due. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fees', function (Blueprint $t) {
            $t->id();
            $t->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $t->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $t->string('title', 80);                       // "November 2026 fee", "Admission fee"
            $t->char('month', 7)->index();                 // 2026-11 (the month it belongs to)
            $t->decimal('amount', 10, 2);
            $t->date('due_date');
            $t->string('status', 10)->default('due');      // due | paid | waived
            $t->decimal('paid_amount', 10, 2)->nullable();
            $t->dateTime('paid_at')->nullable();
            $t->string('method', 12)->nullable();          // cash | upi | bank | card
            $t->string('receipt_no', 40)->nullable();
            $t->string('note', 200)->nullable();
            $t->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamps();
            $t->index(['tenant_id', 'month']);
            $t->unique(['tenant_id', 'student_id', 'month', 'title']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fees');
    }
};
