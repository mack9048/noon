<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** A work book PDF per subject, shown with the textbook and class notes. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subjects', function (Blueprint $t) {
            $t->string('workbook_pdf_url')->nullable()->after('textbook_pdf_url');
        });
    }

    public function down(): void
    {
        Schema::table('subjects', fn (Blueprint $t) => $t->dropColumn('workbook_pdf_url'));
    }
};
