<?php

namespace Tests\Feature;

use App\Models\Assessment;
use App\Models\Board;
use App\Models\Course;
use App\Models\Subject;
use App\Models\Tenant;
use App\Models\User;
use Tests\TestCase;

class LearnTest extends TestCase
{
    private Subject $subject;

    private Subject $otherClassSubject;

    private Course $course;

    protected function setUp(): void
    {
        parent::setUp();
        $board = Board::create(['code' => 'AP', 'name' => 'AP board']);
        $c5 = $board->classes()->create(['label' => '5', 'position' => 5]);
        $c6 = $board->classes()->create(['label' => '6', 'position' => 6]);
        $this->subject = $c5->subjects()->create(['name' => 'Fiqh', 'position' => 1]);
        $this->subject->lessons()->create(['position' => 1, 'title' => 'Wudu', 'video_url' => 'https://v', 'note_pdf_url' => 'https://n']);
        $this->otherClassSubject = $c6->subjects()->create(['name' => 'Fiqh', 'position' => 1]);
        $this->course = Course::create(['title' => 'Arabic', 'category' => 'Arabic', 'cover' => '#fff', 'status' => 'published']);
        $this->course->items()->createMany([
            ['kind' => 'video', 'title' => 'Lesson 1', 'position' => 1],
            ['kind' => 'test', 'title' => 'Quiz 1', 'position' => 2],
        ]);
    }

    private function student(Tenant $t, array $attrs = []): User
    {
        return $this->member($t, 'student', $attrs + ['class_id' => $this->subject->class_id]);
    }

    public function test_spaces_list_class_subjects_and_enrolled_courses_only(): void
    {
        $t = $this->madrasa();
        $t->courses()->attach($this->course->id, ['enabled' => true]);
        $s = $this->student($t);
        $this->as($s)->getJson('/api/learn')->assertOk()->assertJsonCount(1)->assertJsonPath('0.key', 'subject-'.$this->subject->id);

        $s->courses()->attach($this->course->id);
        $this->as($s)->getJson('/api/learn')->assertOk()->assertJsonCount(2)->assertJsonPath('1.key', 'course-'.$this->course->id);
    }

    public function test_course_space_needs_enrolment(): void
    {
        $t = $this->madrasa();
        $t->courses()->attach($this->course->id, ['enabled' => true]);
        $s = $this->student($t);
        $this->as($s)->getJson('/api/learn/course/'.$this->course->id)->assertForbidden();

        $s->courses()->attach($this->course->id);
        $this->as($s)->getJson('/api/learn/course/'.$this->course->id)->assertOk()
            ->assertJsonCount(1, 'materials')->assertJsonCount(2, 'syllabus')
            ->assertJsonPath('assessments.0.title', 'Quiz 1');
    }

    public function test_course_switched_off_by_madrasa_is_locked_even_if_enrolled(): void
    {
        $t = $this->madrasa();
        $t->courses()->attach($this->course->id, ['enabled' => false]);
        $s = $this->student($t);
        $s->courses()->attach($this->course->id);
        $this->as($s)->getJson('/api/learn/course/'.$this->course->id)->assertForbidden();
    }

    public function test_subject_space_only_for_own_class(): void
    {
        $s = $this->student($this->madrasa());
        $this->as($s)->getJson('/api/learn/subject/'.$this->subject->id)->assertOk()->assertJsonPath('materials.0.kind', 'video');
        $this->subject->update(['textbook_pdf_url' => 'https://x/t.pdf', 'workbook_pdf_url' => 'https://x/w.pdf']);
        $this->as($s)->getJson('/api/learn/subject/'.$this->subject->id)->assertOk()
            ->assertJsonPath('materials.0.title', 'Textbook')->assertJsonPath('materials.1.title', 'Work book');
        $this->as($s)->getJson('/api/learn/subject/'.$this->otherClassSubject->id)->assertForbidden();
    }

    public function test_results_and_report_card_and_other_madrasas_exams_hidden(): void
    {
        $t = $this->madrasa();
        $other = $this->madrasa('OTHER1');
        $s = $this->student($t);
        $teacher = $this->member($t, 'teacher');

        $exam = $this->as($teacher)->postJson('/api/staff/assessments', [
            'type' => 'exam', 'title' => 'Onam exam', 'subject_id' => $this->subject->id, 'max_marks' => 50, 'due_at' => now()->subDay()->toDateString(),
        ])->assertCreated()->json('id');
        Assessment::create(['tenant_id' => $other->id, 'subject_id' => $this->subject->id, 'type' => 'exam', 'title' => 'Not ours', 'max_marks' => 100]);

        $this->as($teacher)->postJson("/api/staff/assessments/{$exam}/results", ['results' => [['student_id' => $s->id, 'marks' => 45]]])->assertOk();

        $this->as($s)->getJson('/api/learn/subject/'.$this->subject->id)->assertOk()
            ->assertJsonCount(1, 'exams')->assertJsonPath('exams.0.status', 'marked')
            ->assertJsonPath('results.0.percent', 90)->assertJsonPath('results.0.grade', 'A+')
            ->assertJsonPath('report.average', 90);
    }

    public function test_marks_rules(): void
    {
        $t = $this->madrasa();
        $other = $this->madrasa('OTHER1');
        $teacher = $this->member($t, 'teacher');
        $outsider = $this->student($other);
        $a = Assessment::create(['tenant_id' => $t->id, 'subject_id' => $this->subject->id, 'type' => 'assessment', 'title' => 'Test', 'max_marks' => 20]);

        // Over the max, and students from another madrasa, are refused.
        $s = $this->student($t);
        $this->as($teacher)->postJson("/api/staff/assessments/{$a->id}/results", ['results' => [['student_id' => $s->id, 'marks' => 21]]])->assertUnprocessable();
        $this->as($teacher)->postJson("/api/staff/assessments/{$a->id}/results", ['results' => [['student_id' => $outsider->id, 'marks' => 10]]])->assertUnprocessable();

        // Teachers of another madrasa can't mark it, and students can't mark at all.
        $this->as($this->member($other, 'teacher'))->postJson("/api/staff/assessments/{$a->id}/results", ['results' => [['student_id' => $s->id, 'marks' => 10]]])->assertForbidden();
        $this->as($s)->postJson("/api/staff/assessments/{$a->id}/results", ['results' => [['student_id' => $s->id, 'marks' => 20]]])->assertForbidden();
    }

    public function test_parent_sees_their_childs_marks(): void
    {
        $t = $this->madrasa();
        $parent = $this->member($t, 'parent');
        $child = $this->student($t, ['parent_id' => $parent->id]);
        $a = Assessment::create(['tenant_id' => $t->id, 'subject_id' => $this->subject->id, 'type' => 'exam', 'title' => 'Exam', 'max_marks' => 100]);
        $a->results()->create(['student_id' => $child->id, 'marks' => 72]);

        $this->as($parent)->getJson('/api/learn')->assertOk()->assertJsonCount(1);
        $this->as($parent)->getJson('/api/learn/subject/'.$this->subject->id)->assertOk()
            ->assertJsonPath('results.0.grade', 'B+')->assertJsonPath('report.student', $child->name);
    }
}
