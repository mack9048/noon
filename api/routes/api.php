<?php

use App\Http\Controllers\Api\AdmissionController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BatchController;
use App\Http\Controllers\Api\CampaignController;
use App\Http\Controllers\Api\LeadController;
use App\Http\Controllers\Api\LiveSessionController;
use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\CourseRequestController;
use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\CourseBuilderController;
use App\Http\Controllers\Api\CourseController;
use App\Http\Controllers\Api\SiteController;
use App\Http\Controllers\Api\FeeController;
use App\Http\Controllers\Api\GameController;
use App\Http\Controllers\Api\InstitutionController;
use App\Http\Controllers\Api\ImpersonationController;
use App\Http\Controllers\Api\LearnController;
use App\Http\Controllers\Api\LeaveController;
use App\Http\Controllers\Api\PasswordAdminController;
use App\Http\Controllers\Api\StudyToolController;
use App\Http\Controllers\Api\TenantController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

/*
| All routes are prefixed with /api (bootstrap/app.php).
| Keep in sync with app/src/lib/mock.ts in the Expo app.
*/

Route::get('/health', function () {
    try {
        DB::select('select 1');
        $db = 'ok';
    } catch (Throwable) {
        $db = 'down';
    }

    return response()->json(['ok' => $db === 'ok', 'version' => config('noon.version'), 'database' => $db, 'time' => now()->toIso8601String()], $db === 'ok' ? 200 : 503);
});

// ---------- Public ----------
Route::middleware('throttle:auth')->group(function () {
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/otp/request', [AuthController::class, 'otpRequest']);
    Route::post('/auth/otp/verify', [AuthController::class, 'otpVerify']);
    Route::post('/auth/guest', [AuthController::class, 'guest']);
    Route::post('/auth/password/forgot', [AuthController::class, 'passwordForgot']);
    Route::post('/auth/password/reset', [AuthController::class, 'passwordReset']);
});
Route::get('/boards', [CatalogController::class, 'boards']);
Route::get('/catalog/courses', [CourseController::class, 'catalog']);
Route::get('/site/content', [SiteController::class, 'content']);
// An uploaded HTML game; only reachable through the short-lived signed link from /games/{id}/play.
Route::get('/games/{id}/file', [GameController::class, 'file'])->whereNumber('id')->name('games.file')->middleware('signed:relative');
// HTML lesson content; only through the short-lived signed link from /course-items/{item}/open.
Route::get('/course-items/{id}/html', [CourseBuilderController::class, 'html'])->whereNumber('id')->name('course-items.html')->middleware('signed:relative');
// Public admission form (from the link the madrasa shares)
Route::post('/apply/{code}', [AdmissionController::class, 'apply'])->middleware('throttle:join');
Route::get('/portal/{code}', [AdmissionController::class, 'portal'])->middleware('throttle:60,1');
Route::post('/portal/{code}/enquire', [AdmissionController::class, 'enquire'])->middleware('throttle:join');
Route::get('/boards/{board}/classes', [CatalogController::class, 'classes']);
Route::get('/classes/{class}/subjects', [CatalogController::class, 'subjects']);

// ---------- Any signed-in user (guest, student, parent, teacher, admin, super) ----------
Route::middleware(['auth:sanctum', 'active'])->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::put('/me/password', [AuthController::class, 'changePassword']);
    Route::post('/auth/join-tenant', [AuthController::class, 'joinTenant'])->middleware('throttle:join');
    Route::put('/me/learning', [AuthController::class, 'updateLearning']);

    Route::get('/subjects/{subject}', [CatalogController::class, 'subject']);

    Route::get('/courses', [CourseController::class, 'index']);
    Route::get('/courses/{course}', [CourseController::class, 'show']);
    Route::post('/courses/{course}/enroll', [CourseController::class, 'enroll']);
    Route::post('/course-items/{item}/complete', [CourseController::class, 'complete']);
    Route::get('/course-items/{item}/open', [CourseBuilderController::class, 'open']);
    Route::get('/course-categories', [CourseBuilderController::class, 'categories']);

    // A student's subjects and courses, and each one's materials, syllabus, assessments, exams, results, report card
    Route::get('/learn', [LearnController::class, 'index']);
    Route::get('/learn/{type}/{id}', [LearnController::class, 'show'])->whereIn('type', ['subject', 'course'])->whereNumber('id');

    Route::get('/games', [GameController::class, 'index']);
    Route::get('/games/{id}/play', [GameController::class, 'play'])->whereNumber('id');

    Route::get('/study-tools', [StudyToolController::class, 'index']);
    Route::post('/study-tools/{tool}/open', [StudyToolController::class, 'open']);

    // Madrasa members only. `tenant` limits every query to the user's own madrasa.
    Route::middleware(['role:student,parent,teacher,admin', 'tenant'])->group(function () {
        Route::get('/fees', [FeeController::class, 'mine']);
        Route::get('/attendance', [AttendanceController::class, 'mine']);
        Route::get('/leave-requests', [LeaveController::class, 'index']);
        Route::post('/leave-requests', [LeaveController::class, 'store']);

        Route::get('/live-sessions', [LiveSessionController::class, 'index']);
        Route::get('/live-sessions/{id}', [LiveSessionController::class, 'show'])->whereNumber('id');

        Route::get('/conversations', [ChatController::class, 'index']);
        Route::get('/conversations/{conversation}/messages', [ChatController::class, 'messages']);
        Route::post('/conversations/{conversation}/messages', [ChatController::class, 'send']);
    });

    // Teacher + institute admin
    Route::middleware(['role:teacher,admin', 'tenant'])->group(function () {
        Route::get('/staff/leave-requests', [LeaveController::class, 'staffIndex']);
        Route::patch('/staff/leave-requests/{leave}', [LeaveController::class, 'decide']);
        Route::post('/teacher/courses/{course}/items', [CourseController::class, 'teacherAddItem']);
        Route::post('/staff/assessments', [LearnController::class, 'store']);
        Route::get('/staff/batches', [LiveSessionController::class, 'batches']);
        Route::get('/staff/attendance', [AttendanceController::class, 'sheet']);
        Route::post('/staff/attendance', [AttendanceController::class, 'save']);
        Route::post('/staff/live-sessions', [LiveSessionController::class, 'store']);
        Route::put('/staff/live-sessions/{id}', [LiveSessionController::class, 'update'])->whereNumber('id');
        Route::delete('/staff/live-sessions/{id}', [LiveSessionController::class, 'destroy'])->whereNumber('id');
        Route::post('/staff/assessments/{assessment}/results', [LearnController::class, 'storeResults']);
    });

    // Institute admin
    Route::middleware(['role:admin', 'tenant'])->prefix('admin')->group(function () {
        Route::put('/courses/{course}', [CourseController::class, 'adminToggle']);
        Route::post('/courses', [CourseRequestController::class, 'store']);
        Route::post('/courses/{course}/logo', [CourseRequestController::class, 'logo']);
        Route::get('/admissions', [AdmissionController::class, 'index']);
        Route::get('/admissions/{ref}', [AdmissionController::class, 'show']);
        Route::patch('/admissions/{ref}', [AdmissionController::class, 'update']);
        Route::post('/admissions/{ref}/admit', [AdmissionController::class, 'admit']);
        Route::get('/students', [StudentController::class, 'index']);
        Route::get('/students/{id}', [StudentController::class, 'show'])->whereNumber('id');
        Route::put('/students/{id}', [StudentController::class, 'update'])->whereNumber('id');
        Route::post('/students', [StudentController::class, 'store']);
        Route::get('/teachers', [StudentController::class, 'teachers']);
        Route::post('/teachers', [StudentController::class, 'storeTeacher']);
        Route::get('/campaigns', [CampaignController::class, 'index']);
        Route::post('/campaigns', [CampaignController::class, 'store']);
        Route::get('/campaigns/{id}', [CampaignController::class, 'show'])->whereNumber('id');
        Route::put('/campaigns/{id}', [CampaignController::class, 'update'])->whereNumber('id');
        Route::delete('/campaigns/{id}', [CampaignController::class, 'destroy'])->whereNumber('id');
        Route::get('/institution', [InstitutionController::class, 'show']);
        Route::put('/institution', [InstitutionController::class, 'update']);
        Route::get('/attendance', [AttendanceController::class, 'report']);
        Route::get('/fees', [FeeController::class, 'index']);
        Route::post('/fees', [FeeController::class, 'store']);
        Route::post('/fees/{id}/pay', [FeeController::class, 'pay'])->whereNumber('id');
        Route::patch('/fees/{id}', [FeeController::class, 'update'])->whereNumber('id');
        Route::delete('/fees/{id}', [FeeController::class, 'destroy'])->whereNumber('id');
        Route::get('/leads', [LeadController::class, 'index']);
        Route::post('/leads', [LeadController::class, 'store']);
        Route::patch('/leads/{id}', [LeadController::class, 'update'])->whereNumber('id');
        Route::delete('/leads/{id}', [LeadController::class, 'destroy'])->whereNumber('id');
        Route::post('/leads/{id}/convert', [LeadController::class, 'convert'])->whereNumber('id');
        Route::get('/batches', [BatchController::class, 'index']);
        Route::get('/batches/people', [BatchController::class, 'people']);
        Route::post('/batches', [BatchController::class, 'store']);
        Route::get('/people', [PasswordAdminController::class, 'people']);
        Route::put('/users/{user}/password', [PasswordAdminController::class, 'adminSet']);
    });

    // Super admin
    Route::middleware('role:super')->prefix('super')->group(function () {
        Route::apiResource('tenants', TenantController::class)->except('show');
        Route::get('/users', [ImpersonationController::class, 'users']);
        Route::post('/users/{user}/impersonate', [ImpersonationController::class, 'start']);
        Route::put('/users/{user}/password', [PasswordAdminController::class, 'superSet']);

        Route::get('/site', [SiteController::class, 'index']);
        Route::post('/site/publish', [SiteController::class, 'publish']);
        Route::post('/site/upload', [SiteController::class, 'upload']);
        Route::get('/site/{page}', [SiteController::class, 'show']);
        Route::put('/site/{page}', [SiteController::class, 'update']);
        Route::post('/site/{page}/discard', [SiteController::class, 'discard']);
        Route::get('/courses', [CourseController::class, 'superIndex']);
        Route::post('/courses', [CourseController::class, 'superStore']);
        Route::put('/courses/{course}', [CourseController::class, 'superUpdate']);
        Route::delete('/courses/{course}', [CourseController::class, 'superDestroy']);
        Route::post('/courses/{course}/items', [CourseController::class, 'superAddItem']);
        Route::delete('/course-items/{item}', [CourseBuilderController::class, 'destroyItem']);
        // Course builder: subjects (optional) → lessons → content, each saved straight away
        Route::get('/courses/{course}', [CourseBuilderController::class, 'show']);
        Route::post('/courses/{course}/order', [CourseBuilderController::class, 'reorder']);
        Route::post('/courses/{course}/subjects', [CourseBuilderController::class, 'storeSubject']);
        Route::put('/course-subjects/{subject}', [CourseBuilderController::class, 'updateSubject']);
        Route::delete('/course-subjects/{subject}', [CourseBuilderController::class, 'destroySubject']);
        Route::post('/courses/{course}/lessons', [CourseBuilderController::class, 'storeLesson']);
        Route::get('/course-lessons/{lesson}', [CourseBuilderController::class, 'showLesson']);
        Route::put('/course-lessons/{lesson}', [CourseBuilderController::class, 'updateLesson']);
        Route::delete('/course-lessons/{lesson}', [CourseBuilderController::class, 'destroyLesson']);
        Route::post('/course-lessons/{lesson}/items', [CourseBuilderController::class, 'storeItem']);
        Route::post('/course-lessons/{lesson}/order', [CourseBuilderController::class, 'reorderItems']);
        Route::post('/course-items/{item}', [CourseBuilderController::class, 'updateItem']);
        Route::post('/course-items/{item}/move', [CourseBuilderController::class, 'moveItem']);
        Route::post('/course-categories', [CourseBuilderController::class, 'storeCategory']);
        Route::put('/course-categories/{category}', [CourseBuilderController::class, 'updateCategory']);
        Route::delete('/course-categories/{category}', [CourseBuilderController::class, 'destroyCategory']);
        Route::post('/courses/{course}/logo', [CourseRequestController::class, 'logo']);
        Route::get('/approvals', [CourseRequestController::class, 'index']);
        Route::patch('/approvals/{course}', [CourseRequestController::class, 'decide']);

        Route::get('/games', [GameController::class, 'adminIndex']);
        Route::post('/games', [GameController::class, 'store']);
        Route::post('/games/reorder', [GameController::class, 'reorder']);
        Route::post('/games/{id}', [GameController::class, 'update'])->whereNumber('id');
        Route::delete('/games/{id}', [GameController::class, 'destroy'])->whereNumber('id');

        Route::get('/study-tools', [StudyToolController::class, 'superIndex']);
        Route::post('/study-tools', [StudyToolController::class, 'store']);
        Route::match(['put', 'post'], '/study-tools/{tool}', [StudyToolController::class, 'update']);
        Route::delete('/study-tools/{tool}', [StudyToolController::class, 'destroy']);
    });
});
