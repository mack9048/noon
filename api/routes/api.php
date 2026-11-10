<?php

use App\Http\Controllers\Api\AdmissionController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BatchController;
use App\Http\Controllers\Api\CampaignController;
use App\Http\Controllers\Api\LeadController;
use App\Http\Controllers\Api\LiveSessionController;
use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\CourseRequestController;
use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\CourseController;
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

    // A student's subjects and courses, and each one's materials, syllabus, assessments, exams, results, report card
    Route::get('/learn', [LearnController::class, 'index']);
    Route::get('/learn/{type}/{id}', [LearnController::class, 'show'])->whereIn('type', ['subject', 'course'])->whereNumber('id');

    Route::get('/study-tools', [StudyToolController::class, 'index']);
    Route::post('/study-tools/{tool}/open', [StudyToolController::class, 'open']);

    // Madrasa members only. `tenant` limits every query to the user's own madrasa.
    Route::middleware(['role:student,parent,teacher,admin', 'tenant'])->group(function () {
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
        Route::post('/students', [StudentController::class, 'store']);
        Route::get('/teachers', [StudentController::class, 'teachers']);
        Route::post('/teachers', [StudentController::class, 'storeTeacher']);
        Route::get('/campaigns', [CampaignController::class, 'index']);
        Route::post('/campaigns', [CampaignController::class, 'store']);
        Route::get('/campaigns/{id}', [CampaignController::class, 'show'])->whereNumber('id');
        Route::put('/campaigns/{id}', [CampaignController::class, 'update'])->whereNumber('id');
        Route::delete('/campaigns/{id}', [CampaignController::class, 'destroy'])->whereNumber('id');
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

        Route::get('/courses', [CourseController::class, 'superIndex']);
        Route::post('/courses', [CourseController::class, 'superStore']);
        Route::put('/courses/{course}', [CourseController::class, 'superUpdate']);
        Route::delete('/courses/{course}', [CourseController::class, 'superDestroy']);
        Route::post('/courses/{course}/items', [CourseController::class, 'superAddItem']);
        Route::delete('/course-items/{item}', [CourseController::class, 'superDeleteItem']);
        Route::post('/courses/{course}/logo', [CourseRequestController::class, 'logo']);
        Route::get('/approvals', [CourseRequestController::class, 'index']);
        Route::patch('/approvals/{course}', [CourseRequestController::class, 'decide']);

        Route::get('/study-tools', [StudyToolController::class, 'superIndex']);
        Route::post('/study-tools', [StudyToolController::class, 'store']);
        Route::match(['put', 'post'], '/study-tools/{tool}', [StudyToolController::class, 'update']);
        Route::delete('/study-tools/{tool}', [StudyToolController::class, 'destroy']);
    });
});
