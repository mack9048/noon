<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Nooni free mode: answers from a list of questions and answers (no AI), editable by the super admin.
 * app_settings keeps small platform settings such as the Nooni mode (ai · free · auto).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('app_settings')) {
            Schema::create('app_settings', function (Blueprint $t) {
                $t->string('key', 60)->primary();
                $t->text('value')->nullable();
                $t->timestamps();
            });
        }
        if (Schema::hasTable('nooni_faqs')) {
            return;
        }
        Schema::create('nooni_faqs', function (Blueprint $t) {
            $t->id();
            $t->string('audience', 10)->default('all'); // all · student · guest · teacher · admin
            $t->string('question', 200);
            $t->string('keywords', 300)->nullable(); // extra words people may use, comma separated (any language)
            $t->text('answer');
            $t->text('answer_ml')->nullable();
            $t->string('open', 24)->nullable(); // app screen to open (e.g. fees, live)
            $t->unsignedSmallInteger('position')->default(0);
            $t->boolean('active')->default(true);
            $t->timestamps();
        });

        $now = now();
        $rows = [
            ['student', 'How do I join a live class?', 'live, class, join, meeting, ലൈവ്, ക്ലാസ്', 'Open Live classes. When your class is on, the Join button turns on. You can join from 15 minutes before.', 'ലൈവ് ക്ലാസുകൾ തുറക്കൂ. ക്ലാസ് തുടങ്ങുമ്പോൾ Join ബട്ടൺ തെളിയും. 15 മിനിറ്റ് മുമ്പ് മുതൽ കയറാം.', 'live'],
            ['student', 'Where are my fees?', 'fee, fees, pay, payment, ഫീസ്', 'Your fees are in Fees. You can see what is due and what is paid.', 'ഫീസ് വിവരങ്ങൾ Fees-ൽ ഉണ്ട്. അടയ്ക്കാനുള്ളതും അടച്ചതും കാണാം.', 'fees'],
            ['student', 'How do I ask for leave?', 'leave, absent, holiday, sick, ലീവ്, അവധി', 'Open Leave and send your request. Your teacher will see it.', 'Leave തുറന്ന് അപേക്ഷ അയക്കൂ. ടീച്ചർ കാണും.', 'leave'],
            ['student', 'Where is my attendance?', 'attendance, present, absent, ഹാജർ', 'Your attendance is in Attendance.', 'ഹാജർ Attendance-ൽ കാണാം.', 'attendance'],
            ['student', 'Where are my marks?', 'marks, result, exam, report, mark, മാർക്ക്', 'Your marks and report card are in Performance.', 'മാർക്കും റിപ്പോർട്ട് കാർഡും Performance-ൽ ഉണ്ട്.', 'performance'],
            ['all', 'Where are the games?', 'game, games, play, കളി', 'Open Games to play and learn.', 'കളിച്ച് പഠിക്കാൻ Games തുറക്കൂ.', 'games'],
            ['all', 'I want to read the Quran', 'quran, surah, ayah, ഖുർആൻ, സൂറ', 'Open Quran to read and listen.', 'വായിക്കാനും കേൾക്കാനും Quran തുറക്കൂ.', 'quran'],
            ['all', 'Where is Madrasa Support?', 'madrasa, support, board, class, subject, textbook, മദ്രസ', 'Open Madrasa Support. Choose your board and syllabus once, then your class.', 'Madrasa Support തുറക്കൂ. ബോർഡും സിലബസും ഒരിക്കൽ തിരഞ്ഞെടുക്കൂ, പിന്നെ ക്ലാസ്.', 'madrasa-support'],
            ['all', 'What courses are there?', 'course, courses, learn, കോഴ്സ്', 'Open Our Courses to see Madrasa Support and every Noon course.', 'Madrasa Support-ഉം എല്ലാ Noon കോഴ്സുകളും കാണാൻ Our Courses തുറക്കൂ.', 'courses'],
            ['guest', 'How do I join my madrasa?', 'join, institution, code, madrasa, unlock, ചേരുക', 'Open Unlock and enter the code from your institution office.', 'Unlock തുറന്ന് സ്ഥാപനത്തിന്റെ കോഡ് നൽകൂ.', 'unlock'],
            ['teacher', 'How do I mark attendance?', 'attendance, mark, present, ഹാജർ', 'Open Attendance, choose the batch and mark each student.', 'Attendance തുറന്ന് ബാച്ച് തിരഞ്ഞെടുത്ത് ഓരോ കുട്ടിയെയും മാർക്ക് ചെയ്യൂ.', 'attendance'],
            ['teacher', 'How do I start a live class?', 'live, class, start, ലൈവ്', 'Open Live classes and press Start class. Students join inside the app.', 'Live classes തുറന്ന് Start class അമർത്തൂ. കുട്ടികൾ app-നുള്ളിൽ കയറും.', 'live'],
            ['admin', 'How do I add fees?', 'fee, fees, add, receipt, ഫീസ്', 'Open Fees to add this month\'s fees and mark payments.', 'ഈ മാസത്തെ ഫീസ് ചേർക്കാനും അടച്ചത് മാർക്ക് ചെയ്യാനും Fees തുറക്കൂ.', 'fees'],
            ['admin', 'How do I add a student?', 'student, add, admit, admission, കുട്ടി', 'Open Students and press New student.', 'Students തുറന്ന് New student അമർത്തൂ.', 'students'],
            ['all', 'Assalamu alaikum', 'salam, salaam, hello, hi, assalamu, സലാം', 'Wa alaikum assalam! I am Nooni. What shall we do today?', 'വ അലൈക്കുമുസ്സലാം! ഞാൻ നൂനി. ഇന്ന് എന്ത് ചെയ്യാം?', null],
        ];
        foreach ($rows as $i => [$aud, $q, $k, $a, $ml, $open]) {
            DB::table('nooni_faqs')->insert(['audience' => $aud, 'question' => $q, 'keywords' => $k, 'answer' => $a, 'answer_ml' => $ml, 'open' => $open,
                'position' => $i + 1, 'active' => true, 'created_at' => $now, 'updated_at' => $now]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('nooni_faqs');
        Schema::dropIfExists('app_settings');
    }
};
