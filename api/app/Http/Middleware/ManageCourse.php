<?php

namespace App\Http\Middleware;

use App\Models\Course;
use App\Models\CourseItem;
use App\Models\CourseLesson;
use App\Models\CourseLiveClass;
use App\Models\CourseLiveSlot;
use App\Models\CourseSubject;
use App\Support\Review;
use Closure;
use Illuminate\Http\Request;

/** Course Management: may this person edit this course, and do their changes wait for approval? */
class ManageCourse
{
    public function handle(Request $request, Closure $next)
    {
        $course = null;
        foreach ($request->route()?->parameters() ?? [] as $p) {
            $course = match (true) {
                $p instanceof Course => $p,
                $p instanceof CourseSubject, $p instanceof CourseLesson, $p instanceof CourseItem, $p instanceof CourseLiveSlot, $p instanceof CourseLiveClass => Course::find($p->course_id),
                default => null,
            };
            if ($course) {
                break;
            }
        }
        if ($course) {
            $mode = Review::mode($request->user(), $course);
            abort_unless($mode, 403, 'You cannot edit this course.');
            $request->attributes->set('manage_mode', $mode);
        }

        return $next($request);
    }
}
