<?php

namespace Database\Seeders;

use App\Models\Admission;
use App\Models\Assessment;
use App\Models\Batch;
use App\Models\Board;
use App\Models\Conversation;
use App\Models\Course;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * One demo madrasa to show the app: an office admin, teachers, parents and students
 * with batches, enrolled courses, marks, admissions and a chat.
 * Every demo login uses the same password: DEMO_PASSWORD in .env (default "Demo@1234").
 * Runs after CatalogSeeder.
 */
class DemoSchoolSeeder extends Seeder
{
    public const CODE = 'DEMO01';

    public function run(): void
    {
        $pw = env('DEMO_PASSWORD', 'Demo@1234');
        $board = Board::where('code', 'AP')->firstOrFail();
        $class5 = $board->classes()->where('label', '5')->firstOrFail();
        $class3 = $board->classes()->where('label', '3')->firstOrFail();

        $tenant = Tenant::create(['name' => 'Noon Demo Madrasa', 'code' => self::CODE, 'plan' => 'pro']);
        $user = fn (array $a) => User::create($a + ['tenant_id' => $tenant->id, 'password' => $pw]);

        // ---- Staff ----
        $user(['name' => 'Demo Office Admin', 'email' => 'admin@demo.noonlearn.com', 'role' => 'admin']);
        $teachers = collect([
            ['Ustad Ahmed', 'teacher1@demo.noonlearn.com'],
            ['Ayisha Miss', 'teacher2@demo.noonlearn.com'],
            ['Safwan Usthad', 'teacher3@demo.noonlearn.com'],
        ])->map(fn ($t) => $user(['name' => $t[0], 'email' => $t[1], 'role' => 'teacher']));

        // ---- Parents and students (students sign in with their admission no.) ----
        $parents = collect([
            ['Muhammed Ali', 'parent1@demo.noonlearn.com'],
            ['Nasrin P', 'parent2@demo.noonlearn.com'],
            ['Abdul Rahman K', 'parent3@demo.noonlearn.com'],
        ])->map(fn ($p) => $user(['name' => $p[0], 'email' => $p[1], 'role' => 'parent']));

        $students = collect([
            ['Ayisha', 'DEMO-001', $class5, 0],
            ['Rayan Ahmed', 'DEMO-002', $class5, 2],
            ['Fathima Nasrin', 'DEMO-003', $class5, 1],
            ['Hana Fathima', 'DEMO-004', $class5, 0],
            ['Shifa K', 'DEMO-005', $class3, 2],
            ['Muhammed Zayan', 'DEMO-006', $class3, 1],
        ])->map(function ($s, $i) use ($user, $board, $parents) {
            $st = $user([
                'name' => $s[0], 'admission_no' => $s[1], 'email' => 'student'.($i + 1).'@demo.noonlearn.com',
                'role' => 'student', 'board_id' => $board->id, 'class_id' => $s[2]->id,
            ]);
            $st->forceFill(['parent_id' => $parents[$s[3]]->id])->save();

            return $st;
        });
        $class5Students = $students->filter(fn ($s) => $s->class_id === $class5->id)->values();
        $class3Students = $students->filter(fn ($s) => $s->class_id === $class3->id)->values();

        // ---- Batches ----
        $b5 = Batch::create(['tenant_id' => $tenant->id, 'name' => 'Madrasa 5 · Evening', 'board' => 'AP', 'class_label' => '5', 'days' => ['Mo', 'Tu', 'We', 'Th'],
            'start_time' => '5:00 PM', 'seats' => 30, 'class_teacher_id' => $teachers[0]->id,
            'subject_teachers' => ['Quran' => $teachers[2]->id, 'Fiqh' => $teachers[0]->id, 'Arabic' => $teachers[1]->id]]);
        $b5->students()->attach($class5Students->pluck('id'));
        $b3 = Batch::create(['tenant_id' => $tenant->id, 'name' => 'Madrasa 3 · Morning', 'board' => 'AP', 'class_label' => '3', 'days' => ['Fr', 'Sa'],
            'start_time' => '9:00 AM', 'seats' => 25, 'class_teacher_id' => $teachers[1]->id,
            'subject_teachers' => ['Quran' => $teachers[2]->id, 'Akhlaq' => $teachers[1]->id]]);
        $b3->students()->attach($class3Students->pluck('id'));

        // ---- Noon Courses switched on for this madrasa; students enrolled ----
        $courses = Course::whereNull('tenant_id')->where('status', 'published')->orderBy('id')->get();
        foreach ($courses as $i => $course) {
            $tenant->courses()->attach($course->id, ['enabled' => $i < 4, 'teacher_id' => $teachers[$i % 3]->id]);
        }
        foreach ($students as $n => $st) {
            foreach ($courses->take(3) as $i => $course) {
                if (($n + $i) % 2 === 0 || $i === 0) {
                    $st->courses()->attach($course->id, ['progress' => [40, 65, 15, 80, 25, 55][($n + $i) % 6]]);
                }
            }
        }

        // ---- Tests, exams and marks for Class 5 ----
        foreach ($class5->subjects()->get() as $n => $subject) {
            foreach ([['assessment', 'Weekly test 3', -6, 50], ['exam', 'Onam exam', -14, 100], ['assessment', 'Weekly test 4', 3, 50], ['exam', 'Half-yearly exam', 40, 100]] as [$type, $title, $days, $max]) {
                $a = Assessment::create(['tenant_id' => $tenant->id, 'subject_id' => $subject->id, 'type' => $type, 'title' => $title,
                    'due_at' => now()->addDays($days)->setTime(10, 0), 'max_marks' => $max, 'created_by' => $teachers[$n % 3]->id]);
                if ($days < 0) {
                    foreach ($class5Students as $k => $st) {
                        $marks = round($max * (0.55 + (($n * 7 + $k * 11) % 40) / 100));
                        $a->results()->create(['student_id' => $st->id, 'marks' => $marks, 'marked_by' => $teachers[$n % 3]->id,
                            'remarks' => $marks / $max >= 0.8 ? 'Excellent, keep it up' : 'Good effort']);
                    }
                }
            }
        }

        // ---- Admission requests from the public form ----
        foreach ([
            ['Amna Sherin', 'Girl', '2016-08-20', '5', 'Sherin', 'Mother', '971554047788', 'Dubai, UAE', 'new'],
            ['Yusuf Hameed', 'Boy', '2018-02-11', '3', 'Hameed', 'Father', '971501112233', 'Sharjah, UAE', 'review'],
        ] as $i => [$n, $g, $dob, $c, $p, $r, $ph, $city, $st]) {
            Admission::create(['tenant_id' => $tenant->id, 'ref' => 'APL-DEMO-'.str_pad((string) ($i + 1), 3, '0', STR_PAD_LEFT), 'student_name' => $n, 'gender' => $g, 'dob' => $dob,
                'board' => 'AP', 'class_label' => $c, 'parent_name' => $p, 'relation' => $r, 'phone' => $ph, 'city' => $city,
                'docs' => ['birth' => true, 'tc' => $i === 0, 'photo' => true], 'status' => $st, 'timeline' => [['Form submitted via WhatsApp link', 'Today, 9:42 AM']]]);
        }

        // ---- A course this madrasa made, waiting for Noon's approval ----
        $pending = Course::create(['title' => 'Malayalam Duas for Kids', 'category' => 'Duas', 'cover' => '#F7E9BC', 'status' => 'pending',
            'tenant_id' => $tenant->id, 'visibility' => 'madrasa', 'teacher_id' => $teachers[1]->id]);
        $pending->items()->createMany([['kind' => 'video', 'title' => 'Duas before sleeping', 'position' => 1], ['kind' => 'audio', 'title' => 'Dua after eating', 'position' => 2]]);

        // ---- A chat between a teacher and a student ----
        $chat = Conversation::create(['tenant_id' => $tenant->id, 'kind' => 'direct']);
        $chat->users()->attach([$teachers[0]->id, $students[0]->id]);
        $chat->messages()->createMany([
            ['user_id' => $teachers[0]->id, 'body' => 'Assalamu alaikum Ayisha 🌙'],
            ['user_id' => $students[0]->id, 'body' => 'Wa alaikum assalam Ustad'],
            ['user_id' => $teachers[0]->id, 'body' => 'Please revise Lesson 5 before tomorrow\'s live class.'],
        ]);
    }
}
