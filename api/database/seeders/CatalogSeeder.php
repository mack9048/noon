<?php

namespace Database\Seeders;

use App\Models\Board;
use App\Models\Course;
use App\Models\StudyTool;
use Illuminate\Database\Seeder;

/**
 * Platform content every madrasa shares: boards, classes, subjects and lessons
 * (Madrasa Support), Noon Courses and study tools. No people, no school data.
 */
class CatalogSeeder extends Seeder
{
    public function run(): void
    {
        // ---- Madrasa Support catalogue ----
        $subjects = [
            ['Quran', 'قرآن'], ['Thajweed', 'تجويد'], ['Fiqh', 'فقه'], ['Thareekh', 'تاريخ'],
            ['Aqeedah', 'عقيدة'], ['Akhlaq', 'أخلاق'], ['Hadith', 'حديث'], ['Arabic', 'لغة'],
        ];
        $lessons = ['Thaharah — purity', 'Types of water', 'Najas and cleaning', 'Wudu — steps', 'What breaks wudu', 'Ghusl', 'Tayammum', 'Times of Salah'];

        $boards = collect([
            ['code' => 'AP', 'name' => 'Sunni Vidyabhyasa Board', 'meta' => 'AP syllabus'],
            ['code' => 'EK', 'name' => 'Sunni Board', 'meta' => 'EK syllabus'],
            ['code' => 'GEN', 'name' => 'General', 'meta' => 'Noon Learn syllabus'],
        ])->map(fn ($b) => Board::create($b));

        foreach ($boards as $board) {
            foreach (['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '+1', '+2'] as $i => $label) {
                $class = $board->classes()->create(['label' => $label, 'position' => $i]);
                foreach ($subjects as $p => [$name, $ar]) {
                    $subject = $class->subjects()->create(['name' => $name, 'name_ar' => $ar, 'position' => $p]);
                    // Only seed lesson rows for Class 5 to keep the demo DB small
                    if ($label === '5') {
                        foreach ($lessons as $n => $title) {
                            $subject->lessons()->create([
                                'position' => $n + 1, 'title' => $title,
                                'video_duration' => (6 + $n).':10', 'audio_duration' => (4 + $n % 3).':05',
                            ]);
                        }
                    }
                }
            }
        }

        // ---- Noon Courses (made by Noon Learn; madrasas switch them on) ----
        $courses = [
            ['Arabic for Beginners', 'Arabic', '#DAD3F6', 'published', false, 'Read and write Arabic letters with harakath.', 999],
            ['Thajweed Level 1', 'Quran', '#D2F0D4', 'published', false, 'Makharij and the first Thajweed rules.', 799],
            ['Fiqh of Salah', 'Fiqh', '#CDE6F1', 'published', false, 'Wudu, salah and its conditions, step by step.', 499],
            ['Seerah Stories', 'Seerah', '#F3CFEA', 'published', true, 'The life of the Prophet ﷺ in short stories.', null],
            ['Hifz Juz Amma', 'Quran', '#F7E9BC', 'published', false, 'Memorise Juz Amma with daily revision.', 299],
            ['Daily Duas for Kids', 'Duas', '#D2F0D4', 'published', true, 'Duas for every part of the day.', null],
        ];
        foreach ($courses as [$title, $cat, $cover, $status, $free, $desc, $price]) {
            $course = Course::create(['title' => $title, 'category' => $cat, 'cover' => $cover, 'status' => $status, 'is_free' => $free, 'description' => $desc, 'price' => $price]);
            $course->items()->createMany([
                ['kind' => 'live', 'title' => 'Lesson 6 · Live class', 'starts_at' => now()->addDay()->setTime(17, 0), 'url' => 'https://meet.jit.si/noon-'.$course->id, 'position' => 1],
                ['kind' => 'video', 'title' => 'Lesson 5 · Recorded class', 'meta' => 'Recorded video · 11:20', 'position' => 2],
                ['kind' => 'audio', 'title' => 'Listen and repeat', 'meta' => 'Audio note · 3:05', 'position' => 3],
                ['kind' => 'pdf', 'title' => 'Worksheet 5', 'meta' => 'PDF note · 2 pages', 'position' => 4],
                ['kind' => 'test', 'title' => 'Quiz 5', 'meta' => 'Assessment · 10 questions', 'position' => 5],
            ]);
        }

        // ---- Study tools ----
        $tools = [
            'chart' => ['ഉപ പാഠപുസ്തകം മാർക്ക് ലിസ്റ്റ്', 'എഴുത്ത് പരിശീലനം', 'നിറം നൽകാം (1)', 'നിറം നൽകാം (2)'],
            'adkar' => ['നിസ്കാരം', 'അസ്മാഉൽ ഹുസ്ന', 'ഉറങ്ങുന്നതിനു മുൻപ്', 'ഓരോ വക്തിനും ശേഷമുള്ള ദുആ', 'ഖുർആനിലെ അടയാളങ്ങൾ', 'ദൈനംദിന ദിക്റുകൾ', 'നിത്യജീവിതത്തിലെ ദുആകളും ദിക്റുകളും'],
            'slide' => ['ضَمَائِرُ الْمُنْفَصِلَةِ', 'طَلَعَ الْبَدْرُ', 'مُخَفَّفْ، مُتَوَسِّطْ، مُغَلَّظْ', 'അറബി അക്ഷരമാല', 'ചോദ്യ പദങ്ങൾ', 'നജസുകൾ മൂന്ന് വിധം', 'മാളി മൻഫി'],
            'form' => ['MSR പരിശ്കരണ ഫോം', 'ജോയിൻ ലെറ്റർ', 'തദ്‌രീബ്- മുദരിബ് അംഗത്വത്തിനുള്ള അപേക്ഷാഫോറം', 'മദ്റസയിൽ ചേർക്കാനുള്ള അപേക്ഷാ ഫോറം', 'മദ്റസാ അംഗീകരണത്തിനുള്ള അപേക്ഷാ ഫോറം', 'മുഅല്ലിം നിക്ഷേപ പദ്ധതി അംഗത്വഫോറം', 'യോഗ്യതാ പരീക്ഷാ അപേക്ഷാ ഫോറം'],
        ];
        foreach ($tools as $type => $titles) {
            foreach ($titles as $i => $title) {
                StudyTool::create(['type' => $type, 'title' => $title, 'status' => 'live', 'is_new' => $i === 0 && in_array($type, ['chart', 'form'])]);
            }
        }
    }
}
