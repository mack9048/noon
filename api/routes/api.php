<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\CourseController;
use App\Http\Controllers\Api\LearnController;
use App\Http\Controllers\Api\LeaveController;
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
});
Route::get('/boards', [CatalogController::class, 'boards']);
Route::get('/boards/{board}/classes', [CatalogController::class, 'classes']);
Route::get('/classes/{class}/subjects', [CatalogController::class, 'subjects']);

// ---------- Any signed-in user (guest, student, parent, teacher, admin, super) ----------
Route::middleware(['auth:sanctum', 'active'])->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
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
        Route::post('/staff/assessments/{assessment}/results', [LearnController::class, 'storeResults']);
    });

    // Institute admin
    Route::middleware(['role:admin', 'tenant'])->prefix('admin')->group(function () {
        Route::put('/courses/{course}', [CourseController::class, 'adminToggle']);
    });

    // Super admin
    Route::middleware('role:super')->prefix('super')->group(function () {
        Route::apiResource('tenants', TenantController::class)->except('show');

        Route::get('/courses', [CourseController::class, 'superIndex']);
        Route::post('/courses', [CourseController::class, 'superStore']);
        Route::put('/courses/{course}', [CourseController::class, 'superUpdate']);
        Route::delete('/courses/{course}', [CourseController::class, 'superDestroy']);
        Route::post('/courses/{course}/items', [CourseController::class, 'superAddItem']);
        Route::delete('/course-items/{item}', [CourseController::class, 'superDeleteItem']);

        Route::get('/study-tools', [StudyToolController::class, 'superIndex']);
        Route::post('/study-tools', [StudyToolController::class, 'store']);
        Route::match(['put', 'post'], '/study-tools/{tool}', [StudyToolController::class, 'update']);
        Route::delete('/study-tools/{tool}', [StudyToolController::class, 'destroy']);
    });
});
