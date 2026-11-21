<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * - Madrasa Support boards: SKIMVB (EK) and SKSVB (AP) with full names and logos; General board hidden.
 * - Syllabus per class: General Madrasa Syllabus or English Medium Madrasa Syllabus.
 * - Thumbnails for Madrasa Support subjects, course subjects and courses.
 * - Courses in the Madrasa Support category target a board / syllabus / class; recorded courses give N free lessons.
 * - Course enrolments made by the institution (paid / given by the institution).
 * - Institution details (logo, school details) and its currency, phone country code and time zone.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('boards', function (Blueprint $t) {
            $t->string('full_name', 160)->nullable()->after('name');
            $t->string('logo_path')->nullable()->after('meta');
            $t->unsignedSmallInteger('position')->default(0)->after('logo_path');
            $t->boolean('active')->default(true)->after('position');
        });
        Schema::table('school_classes', function (Blueprint $t) {
            $t->string('syllabus', 10)->default('general')->after('board_id'); // general | english
        });
        Schema::table('school_classes', function (Blueprint $t) {
            $t->dropUnique(['board_id', 'label']);
            $t->unique(['board_id', 'syllabus', 'label']);
        });
        Schema::table('subjects', fn (Blueprint $t) => $t->string('thumbnail_path')->nullable()->after('name_ar'));
        Schema::table('course_subjects', fn (Blueprint $t) => $t->string('thumbnail_path')->nullable()->after('title'));
        Schema::table('courses', function (Blueprint $t) {
            $t->string('thumbnail_path')->nullable()->after('logo_url');
            $t->foreignId('board_id')->nullable()->after('category')->constrained()->nullOnDelete();
            $t->string('syllabus', 10)->nullable()->after('board_id');
            $t->foreignId('class_id')->nullable()->after('syllabus')->constrained('school_classes')->nullOnDelete();
            $t->unsignedSmallInteger('trial_lessons')->default(2)->after('trial_days');
        });
        Schema::table('users', fn (Blueprint $t) => $t->string('syllabus', 10)->nullable()->after('board_id'));
        Schema::table('course_user', function (Blueprint $t) {
            $t->timestamp('paid_at')->nullable();
            $t->foreignId('enrolled_by')->nullable()->constrained('users')->nullOnDelete();
        });
        Schema::table('tenants', function (Blueprint $t) {
            $t->string('logo_path')->nullable()->after('name');
            $t->string('tagline', 120)->nullable()->after('logo_path');
            $t->string('website', 160)->nullable()->after('tagline');
            $t->string('email', 160)->nullable()->after('phone');
            $t->string('registration_no', 60)->nullable()->after('address');
            $t->string('affiliation_no', 60)->nullable()->after('registration_no');
            $t->string('principal', 80)->nullable()->after('affiliation_no');
            $t->string('established', 10)->nullable()->after('principal');
            $t->string('currency', 3)->default('INR')->after('default_fee');
            $t->string('country', 2)->default('IN')->after('currency');
            $t->string('dial_code', 6)->default('+91')->after('country');
            $t->string('timezone', 40)->default('Asia/Kolkata')->after('dial_code');
        });

        // Board names as used by the boards themselves; EK first.
        DB::table('boards')->where('code', 'EK')->update(['name' => 'SKIMVB (EK)', 'full_name' => 'Samastha Kerala Islam Matha Vidyabhyasa Board', 'position' => 1, 'active' => true]);
        DB::table('boards')->where('code', 'AP')->update(['name' => 'SKSVB (AP)', 'full_name' => 'Samastha Kerala Sunni Vidyabhyasa Board', 'position' => 2, 'active' => true]);
        DB::table('boards')->where('code', 'GEN')->update(['active' => false, 'position' => 9]);
        // Course categories for Madrasa Support courses and everything else.
        if (Schema::hasTable('course_categories')) {
            $pos = (int) DB::table('course_categories')->max('position');
            foreach (['Madrasa Support', 'General'] as $i => $name) {
                if (! DB::table('course_categories')->where('name', $name)->exists()) {
                    DB::table('course_categories')->insert(['name' => $name, 'position' => $i === 0 ? 0 : $pos + 1, 'created_at' => now(), 'updated_at' => now()]);
                }
            }
        }
    }

    public function down(): void
    {
        Schema::table('tenants', fn (Blueprint $t) => $t->dropColumn(['logo_path', 'tagline', 'website', 'email', 'registration_no', 'affiliation_no', 'principal', 'established', 'currency', 'country', 'dial_code', 'timezone']));
        Schema::table('course_user', function (Blueprint $t) { $t->dropConstrainedForeignId('enrolled_by'); $t->dropColumn('paid_at'); });
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn('syllabus'));
        Schema::table('courses', function (Blueprint $t) { $t->dropConstrainedForeignId('board_id'); $t->dropConstrainedForeignId('class_id'); $t->dropColumn(['thumbnail_path', 'syllabus', 'trial_lessons']); });
        Schema::table('course_subjects', fn (Blueprint $t) => $t->dropColumn('thumbnail_path'));
        Schema::table('subjects', fn (Blueprint $t) => $t->dropColumn('thumbnail_path'));
        Schema::table('school_classes', function (Blueprint $t) { $t->dropUnique(['board_id', 'syllabus', 'label']); $t->unique(['board_id', 'label']); $t->dropColumn('syllabus'); });
        Schema::table('boards', fn (Blueprint $t) => $t->dropColumn(['full_name', 'logo_path', 'position', 'active']));
    }
};
