<?php

namespace Database\Seeders;

use App\Models\Assessment;
use App\Models\Board;
use App\Models\Conversation;
use App\Models\Course;
use App\Models\StudyTool;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Demo data matching the design canvas.
 * Logins (password: "password"): super@noon.test, admin@noon.test, teacher@noon.test, parent@noon.test, student@noon.test
 * Change these passwords before going live!
 */
class DatabaseSeeder extends Seeder
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
        $ap5 = $boards[0]->classes()->where('label', '5')->first();

        // ---- Tenant + users ----
        $tenant = Tenant::create(['name' => 'Noon Madrasa', 'code' => 'NOON01', 'plan' => 'pro']);
        User::create(['name' => 'Super Admin', 'email' => 'super@noon.test', 'password' => 'password', 'role' => 'super']);
        User::create(['tenant_id' => $tenant->id, 'name' => 'Office Admin', 'email' => 'admin@noon.test', 'password' => 'password', 'role' => 'admin']);
        $teacher = User::create(['tenant_id' => $tenant->id, 'name' => 'Ustad Ahmed', 'email' => 'teacher@noon.test', 'password' => 'password', 'role' => 'teacher']);
        $parent = User::create(['tenant_id' => $tenant->id, 'name' => 'Muhammed', 'email' => 'parent@noon.test', 'password' => 'password', 'role' => 'parent']);
        $student = User::create([
            'tenant_id' => $tenant->id, 'name' => 'Ayisha', 'email' => 'student@noon.test', 'admission_no' => 'NM-0014',
            'password' => 'password', 'role' => 'student', 'board_id' => $boards[0]->id, 'class_id' => $ap5->id,
        ]);

        // ---- Noon Courses ----
        $courses = [
            ['Arabic for Beginners', 'Arabic', '#DAD3F6', 'published', false],
            ['Thajweed Level 1', 'Quran', '#D2F0D4', 'published', false],
            ['Fiqh of Salah', 'Fiqh', '#CDE6F1', 'published', false],
            ['Seerah Stories', 'Seerah', '#F3CFEA', 'published', true],
            ['Hifz Juz Amma', 'Quran', '#F7E9BC', 'draft', false],
        ];
        foreach ($courses as $i => [$title, $cat, $cover, $status, $free]) {
            $course = Course::create(['title' => $title, 'category' => $cat, 'cover' => $cover, 'status' => $status, 'is_free' => $free, 'teacher_id' => $teacher->id]);
            $course->items()->createMany([
                ['kind' => 'live', 'title' => 'Lesson 6 · Live class', 'starts_at' => now()->addDay()->setTime(17, 0), 'url' => 'https://meet.jit.si/noon-'.$course->id, 'position' => 1],
                ['kind' => 'video', 'title' => 'Lesson 5 · Recorded class', 'meta' => 'Recorded video · 11:20', 'position' => 2],
                ['kind' => 'audio', 'title' => 'Listen and repeat', 'meta' => 'Audio note · 3:05', 'position' => 3],
                ['kind' => 'pdf', 'title' => 'Worksheet 5', 'meta' => 'PDF note · 2 pages', 'position' => 4],
                ['kind' => 'test', 'title' => 'Quiz 5', 'meta' => 'Assessment · 10 questions', 'position' => 5],
            ]);
            if ($status === 'published') {
                $tenant->courses()->attach($course->id, ['enabled' => $i < 3, 'teacher_id' => $teacher->id]);
            }
            if ($i < 3) {
                $student->courses()->attach($course->id, ['progress' => [40, 65, 15][$i]]);
            }
        }

        $student->forceFill(['parent_id' => $parent->id])->save();

        // ---- Assessments, exams and marks ----
        // Noon-made ones on the student's courses, madrasa-made ones on the class subjects.
        $make = function (array $where, string $type, string $title, int $days, ?float $marks, int $max = 50) use ($student, $teacher) {
            $a = Assessment::create($where + ['type' => $type, 'title' => $title, 'due_at' => now()->addDays($days)->setTime(10, 0), 'max_marks' => $max, 'created_by' => $teacher->id]);
            if ($marks !== null) {
                $a->results()->create(['student_id' => $student->id, 'marks' => $marks, 'marked_by' => $teacher->id, 'remarks' => $marks / $max >= 0.8 ? 'Excellent, keep it up' : 'Good effort']);
            }
        };
        foreach ($student->courses()->get() as $n => $course) {
            $make(['course_id' => $course->id], 'assessment', 'Unit 1 assessment', -20, [46, 41, 38][$n] ?? null);
            $make(['course_id' => $course->id], 'assessment', 'Unit 2 assessment', 4, null);
            $make(['course_id' => $course->id], 'exam', 'Term 1 exam', -10, [88, 79, 72][$n] ?? null, 100);
            $make(['course_id' => $course->id], 'exam', 'Term 2 exam', 30, null, 100);
        }
        foreach ($ap5->subjects()->get() as $n => $subject) {
            $make(['tenant_id' => $tenant->id, 'subject_id' => $subject->id], 'assessment', 'Weekly test 3', -6, 35 + ($n * 3) % 15);
            $make(['tenant_id' => $tenant->id, 'subject_id' => $subject->id], 'assessment', 'Weekly test 4', 3, null);
            $make(['tenant_id' => $tenant->id, 'subject_id' => $subject->id], 'exam', 'Onam exam', -14, 70 + ($n * 7) % 30, 100);
            $make(['tenant_id' => $tenant->id, 'subject_id' => $subject->id], 'exam', 'Half-yearly exam', 40, null, 100);
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

        // ---- A chat between teacher and student ----
        $chat = Conversation::create(['tenant_id' => $tenant->id, 'kind' => 'direct']);
        $chat->users()->attach([$teacher->id, $student->id]);
        $chat->messages()->createMany([
            ['user_id' => $teacher->id, 'body' => 'Assalamu alaikum Ayisha 🌙'],
            ['user_id' => $student->id, 'body' => 'Wa alaikum assalam Ustad'],
            ['user_id' => $teacher->id, 'body' => 'Please revise Lesson 5 before tomorrow\'s live class.'],
        ]);
    }
}
