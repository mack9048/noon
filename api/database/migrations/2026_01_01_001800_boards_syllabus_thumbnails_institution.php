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
    /** Adds a column only if missing, so the migration can be run again after a partial run (MySQL DDL is not transactional). */
    private function add(string $table, string $column, \Closure $def): void
    {
        if (! Schema::hasColumn($table, $column)) {
            Schema::table($table, $def);
        }
    }

    private function hasIndex(string $table, string $name): bool
    {
        return collect(Schema::getIndexes($table))->contains(fn ($i) => $i['name'] === $name);
    }

    public function up(): void
    {
        $this->add('boards', 'full_name', fn (Blueprint $t) => $t->string('full_name', 160)->nullable()->after('name'));
        $this->add('boards', 'logo_path', fn (Blueprint $t) => $t->string('logo_path')->nullable()->after('meta'));
        $this->add('boards', 'position', fn (Blueprint $t) => $t->unsignedSmallInteger('position')->default(0)->after('logo_path'));
        $this->add('boards', 'active', fn (Blueprint $t) => $t->boolean('active')->default(true)->after('position'));
        $this->add('school_classes', 'syllabus', fn (Blueprint $t) => $t->string('syllabus', 10)->default('general')->after('board_id')); // general | english
        // One class label per board AND syllabus. MySQL needs its own index for the board foreign key
        // before the old (board_id, label) unique index can be dropped.
        if (! $this->hasIndex('school_classes', 'school_classes_board_id_index')) {
            Schema::table('school_classes', fn (Blueprint $t) => $t->index('board_id'));
        }
        if ($this->hasIndex('school_classes', 'school_classes_board_id_label_unique')) {
            Schema::table('school_classes', fn (Blueprint $t) => $t->dropUnique(['board_id', 'label']));
        }
        if (! $this->hasIndex('school_classes', 'school_classes_board_id_syllabus_label_unique')) {
            Schema::table('school_classes', fn (Blueprint $t) => $t->unique(['board_id', 'syllabus', 'label']));
        }
        $this->add('subjects', 'thumbnail_path', fn (Blueprint $t) => $t->string('thumbnail_path')->nullable()->after('name_ar'));
        $this->add('course_subjects', 'thumbnail_path', fn (Blueprint $t) => $t->string('thumbnail_path')->nullable()->after('title'));
        $this->add('courses', 'thumbnail_path', fn (Blueprint $t) => $t->string('thumbnail_path')->nullable()->after('logo_url'));
        $this->add('courses', 'board_id', fn (Blueprint $t) => $t->foreignId('board_id')->nullable()->after('category')->constrained()->nullOnDelete());
        $this->add('courses', 'syllabus', fn (Blueprint $t) => $t->string('syllabus', 10)->nullable()->after('board_id'));
        $this->add('courses', 'class_id', fn (Blueprint $t) => $t->foreignId('class_id')->nullable()->after('syllabus')->constrained('school_classes')->nullOnDelete());
        $this->add('courses', 'trial_lessons', fn (Blueprint $t) => $t->unsignedSmallInteger('trial_lessons')->default(2)->after('trial_days'));
        $this->add('users', 'syllabus', fn (Blueprint $t) => $t->string('syllabus', 10)->nullable()->after('board_id'));
        $this->add('course_user', 'paid_at', fn (Blueprint $t) => $t->timestamp('paid_at')->nullable());
        $this->add('course_user', 'enrolled_by', fn (Blueprint $t) => $t->foreignId('enrolled_by')->nullable()->constrained('users')->nullOnDelete());
        $this->add('tenants', 'logo_path', fn (Blueprint $t) => $t->string('logo_path')->nullable()->after('name'));
        $this->add('tenants', 'tagline', fn (Blueprint $t) => $t->string('tagline', 120)->nullable()->after('logo_path'));
        $this->add('tenants', 'website', fn (Blueprint $t) => $t->string('website', 160)->nullable()->after('tagline'));
        $this->add('tenants', 'email', fn (Blueprint $t) => $t->string('email', 160)->nullable()->after('phone'));
        $this->add('tenants', 'registration_no', fn (Blueprint $t) => $t->string('registration_no', 60)->nullable()->after('address'));
        $this->add('tenants', 'affiliation_no', fn (Blueprint $t) => $t->string('affiliation_no', 60)->nullable()->after('registration_no'));
        $this->add('tenants', 'principal', fn (Blueprint $t) => $t->string('principal', 80)->nullable()->after('affiliation_no'));
        $this->add('tenants', 'established', fn (Blueprint $t) => $t->string('established', 10)->nullable()->after('principal'));
        $this->add('tenants', 'currency', fn (Blueprint $t) => $t->string('currency', 3)->default('INR')->after('default_fee'));
        $this->add('tenants', 'country', fn (Blueprint $t) => $t->string('country', 2)->default('IN')->after('currency'));
        $this->add('tenants', 'dial_code', fn (Blueprint $t) => $t->string('dial_code', 6)->default('+91')->after('country'));
        $this->add('tenants', 'timezone', fn (Blueprint $t) => $t->string('timezone', 40)->default('Asia/Kolkata')->after('dial_code'));

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
        Schema::table('school_classes', function (Blueprint $t) { $t->dropUnique(['board_id', 'syllabus', 'label']); $t->unique(['board_id', 'label']); $t->dropIndex(['board_id']); $t->dropColumn('syllabus'); });
        Schema::table('boards', fn (Blueprint $t) => $t->dropColumn(['full_name', 'logo_path', 'position', 'active']));
    }
};
