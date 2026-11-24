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
use App\Http\Controllers\Api\MadrasaSupportAdminController;
use App\Http\Controllers\Api\NooniController;
use App\Http\Controllers\Api\ShopAdminController;
use App\Http\Controllers\Api\ShopController;
use App\Http\Controllers\Api\CourseController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ManageCourseController;
use App\Http\Controllers\Api\MeetingController;
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
// Shop: products are public (website); a bought file only through its short-lived signed link.
Route::get('/shop/products', [ShopController::class, 'products']);
// Website checkout without an account; each order is reached by its secret link.
Route::get('/shop/item/{id}', [ShopController::class, 'websiteProduct'])->whereNumber('id');
Route::get('/shop/checkout-settings', [ShopController::class, 'websiteSettings']);
Route::post('/shop/web-orders', [ShopController::class, 'websiteOrder'])->middleware('throttle:web-orders');
Route::get('/shop/web-orders/{ref}', [ShopController::class, 'websiteShow'])->middleware('throttle:web-order-link');
Route::post('/shop/web-orders/{ref}/upi', [ShopController::class, 'websiteUpi'])->middleware('throttle:web-order-link');
Route::post('/shop/web-orders/{ref}/cancel', [ShopController::class, 'websiteCancel'])->middleware('throttle:web-order-link');
Route::get('/shop/files/{id}', [ShopController::class, 'file'])->whereNumber('id')->name('shop.file')->middleware('signed:relative');
Route::get('/site/content', [SiteController::class, 'content']);
// An uploaded HTML game; only reachable through the short-lived signed link from /games/{id}/play.
Route::get('/games/{id}/file', [GameController::class, 'file'])->whereNumber('id')->name('games.file')->middleware('signed:relative');
// HTML lesson content; only through the short-lived signed link from /course-items/{item}/open.
Route::get('/course-items/{id}/html', [CourseBuilderController::class, 'html'])->whereNumber('id')->name('course-items.html')->middleware('signed:relative');
Route::get('/course-work/{id}/file', [\App\Http\Controllers\Api\CourseWorkController::class, 'file'])->whereNumber('id')->name('course-work.file')->middleware('signed:relative');
// Public admission form (from the link the institution shares)
Route::post('/apply/{code}', [AdmissionController::class, 'apply'])->middleware('throttle:join');
Route::get('/institutions', [AuthController::class, 'institutions'])->middleware('throttle:60,1');
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
    Route::get('/courses/continue', [CourseController::class, 'continue']);
    Route::get('/courses/{course}', [CourseController::class, 'show']);
    Route::post('/courses/{course}/enroll', [CourseController::class, 'enroll']);
    Route::post('/courses/{course}/live/join', [CourseController::class, 'liveJoin']);
    Route::post('/courses/{course}/live/moderate', [CourseController::class, 'liveModerate']);
    // Dashboard to-do list and note (every signed-in person)
    Route::get('/me/board', [DashboardController::class, 'board']);
    Route::put('/me/board', [DashboardController::class, 'saveBoard']);
    Route::post('/course-items/{item}/complete', [CourseController::class, 'complete']);
    Route::get('/course-items/{item}/open', [CourseBuilderController::class, 'open']);
    Route::get('/course-items/{item}/pdf', [CourseBuilderController::class, 'pdf']);
    Route::get('/course-items/{item}/work', [\App\Http\Controllers\Api\CourseWorkController::class, 'mine']);
    Route::post('/course-items/{item}/work', [\App\Http\Controllers\Api\CourseWorkController::class, 'store'])->middleware('throttle:20,1');
    Route::delete('/course-work/{id}', [\App\Http\Controllers\Api\CourseWorkController::class, 'destroy'])->whereNumber('id');
    Route::get('/course-categories', [CourseBuilderController::class, 'categories']);
    // Nooni voice assistant (every role). Limited per minute here and per day in the controller.
    Route::post('/nooni', [NooniController::class, 'ask'])->middleware('throttle:12,1');

    // Shop (every role): cart, checkout by UPI or Cash on Delivery, orders, bought files.
    Route::get('/shop/products/{id}', [ShopController::class, 'product'])->whereNumber('id');
    Route::get('/shop/cart', [ShopController::class, 'cart']);
    Route::post('/shop/cart', [ShopController::class, 'addToCart']);
    Route::put('/shop/cart/{product}', [ShopController::class, 'updateCart'])->whereNumber('product');
    Route::delete('/shop/cart/{product}', [ShopController::class, 'removeFromCart'])->whereNumber('product');
    Route::post('/shop/orders', [ShopController::class, 'placeOrder'])->middleware('throttle:10,1');
    Route::get('/shop/orders', [ShopController::class, 'orders']);
    Route::get('/shop/orders/{ref}', [ShopController::class, 'order']);
    Route::post('/shop/orders/{ref}/upi', [ShopController::class, 'submitUpi'])->middleware('throttle:10,1');
    Route::post('/shop/orders/{ref}/cancel', [ShopController::class, 'cancel']);
    Route::get('/shop/library', [ShopController::class, 'library']);
    Route::get('/shop/products/{id}/download', [ShopController::class, 'download'])->whereNumber('id');

    // A student's subjects and courses, and each one's materials, syllabus, assessments, exams, results, report card
    Route::get('/learn', [LearnController::class, 'index']);
    Route::get('/learn/{type}/{id}', [LearnController::class, 'show'])->whereIn('type', ['subject', 'course'])->whereNumber('id');

    Route::get('/games', [GameController::class, 'index']);
    Route::get('/games/{id}/play', [GameController::class, 'play'])->whereNumber('id');

    Route::get('/study-tools', [StudyToolController::class, 'index']);
    Route::post('/study-tools/{tool}/open', [StudyToolController::class, 'open']);

    // Institution members only. `tenant` limits every query to the user's own institution.
    Route::middleware(['role:student,parent,teacher,admin', 'tenant'])->group(function () {
        Route::get('/fees', [FeeController::class, 'mine']);
        // Institution meetings (Noon Live): admins and teachers host; students join.
        Route::get('/meetings', [MeetingController::class, 'index']);
        Route::post('/meetings', [MeetingController::class, 'store']);
        Route::put('/meetings/{meeting}', [MeetingController::class, 'update']);
        Route::delete('/meetings/{meeting}', [MeetingController::class, 'destroy']);
        Route::post('/meetings/{meeting}/join', [MeetingController::class, 'join']);
        Route::post('/meetings/{meeting}/moderate', [MeetingController::class, 'moderate']);
        Route::get('/attendance', [AttendanceController::class, 'mine']);
        Route::get('/leave-requests', [LeaveController::class, 'index']);
        Route::post('/leave-requests', [LeaveController::class, 'store']);

        Route::get('/live-sessions', [LiveSessionController::class, 'index']);
        Route::get('/live-sessions/{id}', [LiveSessionController::class, 'show'])->whereNumber('id');
        Route::post('/live-sessions/{id}/join', [LiveSessionController::class, 'join'])->whereNumber('id');
        Route::post('/live-sessions/{id}/moderate', [LiveSessionController::class, 'moderate'])->whereNumber('id');

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
        Route::get('/staff/classes', [StudentController::class, 'myClasses']);
        Route::get('/staff/classes/{id}', [StudentController::class, 'myClass'])->whereNumber('id');
        Route::get('/staff/dashboard', [DashboardController::class, 'teacher']);
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
        Route::post('/courses/{course}/thumbnail', [CourseRequestController::class, 'thumbnail']);
        Route::get('/admissions', [AdmissionController::class, 'index']);
        Route::get('/admissions/{ref}', [AdmissionController::class, 'show']);
        Route::patch('/admissions/{ref}', [AdmissionController::class, 'update']);
        Route::post('/admissions/{ref}/admit', [AdmissionController::class, 'admit']);
        Route::get('/students', [StudentController::class, 'index']);
        Route::get('/students/{id}', [StudentController::class, 'show'])->whereNumber('id');
        Route::put('/students/{id}', [StudentController::class, 'update'])->whereNumber('id');
        Route::post('/students', [StudentController::class, 'store']);
        Route::get('/students/{id}/enrollments', [StudentController::class, 'enrollments'])->whereNumber('id');
        Route::put('/students/{id}/madrasa', [StudentController::class, 'madrasa'])->whereNumber('id');
        Route::post('/students/{id}/courses', [StudentController::class, 'addCourse'])->whereNumber('id');
        Route::delete('/students/{id}/courses/{courseId}', [StudentController::class, 'removeCourse'])->whereNumber('id')->whereNumber('courseId');
        Route::get('/teachers', [StudentController::class, 'teachers']);
        Route::get('/teachers/{id}', [StudentController::class, 'showTeacher'])->whereNumber('id');
        Route::post('/teachers', [StudentController::class, 'storeTeacher']);
        Route::get('/campaigns', [CampaignController::class, 'index']);
        Route::post('/campaigns', [CampaignController::class, 'store']);
        Route::get('/campaigns/{id}', [CampaignController::class, 'show'])->whereNumber('id');
        Route::put('/campaigns/{id}', [CampaignController::class, 'update'])->whereNumber('id');
        Route::delete('/campaigns/{id}', [CampaignController::class, 'destroy'])->whereNumber('id');
        Route::get('/dashboard', [DashboardController::class, 'admin']);
        Route::get('/institution', [InstitutionController::class, 'show']);
        Route::put('/institution', [InstitutionController::class, 'update']);
        Route::post('/institution/logo', [InstitutionController::class, 'logo']);
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
        Route::post('/leads/{id}/approve-join', [LeadController::class, 'approveJoin'])->whereNumber('id');
        Route::get('/batches', [BatchController::class, 'index']);
        Route::get('/batches/people', [BatchController::class, 'people']);
        Route::post('/batches', [BatchController::class, 'store']);
        Route::delete('/batches/{id}', [BatchController::class, 'destroy'])->whereNumber('id');
        Route::get('/people', [PasswordAdminController::class, 'people']);
        Route::put('/users/{user}/password', [PasswordAdminController::class, 'adminSet']);
    });

    // Super admin
    // Course Management (institution admins and teachers; super admin under /super/manage). Teachers' changes wait for approval.
    $manage = function () {
        Route::get('/courses', [ManageCourseController::class, 'index']);
        Route::get('/courses/{course}', [CourseBuilderController::class, 'show']);
        Route::put('/courses/{course}', [ManageCourseController::class, 'update']);
        Route::post('/courses/{course}/thumbnail', [CourseRequestController::class, 'thumbnail']);
        Route::post('/courses/{course}/order', [CourseBuilderController::class, 'reorder']);
        Route::post('/courses/{course}/subjects', [CourseBuilderController::class, 'storeSubject']);
        Route::put('/course-subjects/{subject}', [CourseBuilderController::class, 'updateSubject']);
        Route::delete('/course-subjects/{subject}', [CourseBuilderController::class, 'destroySubject']);
        Route::post('/course-subjects/{subject}/thumbnail', [CourseBuilderController::class, 'subjectThumbnail']);
        Route::post('/courses/{course}/lessons', [CourseBuilderController::class, 'storeLesson']);
        Route::get('/course-lessons/{lesson}', [CourseBuilderController::class, 'showLesson']);
        Route::put('/course-lessons/{lesson}', [CourseBuilderController::class, 'updateLesson']);
        Route::delete('/course-lessons/{lesson}', [CourseBuilderController::class, 'destroyLesson']);
        Route::post('/course-lessons/{lesson}/items', [CourseBuilderController::class, 'storeItem']);
        Route::post('/course-lessons/{lesson}/order', [CourseBuilderController::class, 'reorderItems']);
        Route::post('/course-items/{item}', [CourseBuilderController::class, 'updateItem']);
        Route::post('/course-items/{item}/move', [CourseBuilderController::class, 'moveItem']);
        Route::delete('/course-items/{item}', [CourseBuilderController::class, 'destroyItem']);
        Route::post('/courses/{course}/live-slots', [CourseBuilderController::class, 'storeLiveSlot']);
        Route::put('/course-live-slots/{slot}', [CourseBuilderController::class, 'updateLiveSlot']);
        Route::delete('/course-live-slots/{slot}', [CourseBuilderController::class, 'destroyLiveSlot']);
        Route::post('/courses/{course}/live-classes', [ManageCourseController::class, 'storeLiveClasses']);
        Route::post('/courses/{course}/live-classes/order', [ManageCourseController::class, 'reorderLiveClasses']);
        Route::put('/course-live-classes/{class}', [ManageCourseController::class, 'updateLiveClass']);
        Route::delete('/course-live-classes/{class}', [ManageCourseController::class, 'destroyLiveClass']);
        Route::get('/courses/{course}/work', [\App\Http\Controllers\Api\CourseWorkController::class, 'staffIndex']);
        Route::get('/reviews', [CourseBuilderController::class, 'reviews']);
        Route::post('/reviews', [CourseBuilderController::class, 'decide']);
    };
    Route::middleware(['role:admin,teacher', 'tenant', 'pending', 'manage'])->prefix('manage')->group($manage);
    Route::middleware(['role:super', 'pending', 'manage'])->prefix('super/manage')->group($manage);

    Route::middleware(['role:super', 'pending'])->prefix('super')->group(function () {
        Route::apiResource('tenants', TenantController::class)->except('show');
        Route::post('/tenants/{tenant}/logo', [TenantController::class, 'logo']);
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
        Route::post('/courses/{id}/restore', [CourseController::class, 'superRestore'])->whereNumber('id');
        Route::delete('/courses/{id}/forever', [CourseController::class, 'superForceDelete'])->whereNumber('id');
        Route::post('/courses/{course}/items', [CourseController::class, 'superAddItem']);
        Route::delete('/course-items/{item}', [CourseBuilderController::class, 'destroyItem']);
        // Course builder: subjects (optional) → lessons → content, each saved straight away
        Route::get('/courses/{course}', [CourseBuilderController::class, 'show']);
        Route::post('/courses/{course}/order', [CourseBuilderController::class, 'reorder']);
        Route::post('/courses/{course}/subjects', [CourseBuilderController::class, 'storeSubject']);
        Route::put('/course-subjects/{subject}', [CourseBuilderController::class, 'updateSubject']);
        Route::delete('/course-subjects/{subject}', [CourseBuilderController::class, 'destroySubject']);
        Route::post('/course-subjects/{subject}/thumbnail', [CourseBuilderController::class, 'subjectThumbnail']);
        Route::post('/courses/{course}/lessons', [CourseBuilderController::class, 'storeLesson']);
        Route::post('/courses/{course}/live-slots', [CourseBuilderController::class, 'storeLiveSlot']);
        Route::put('/course-live-slots/{slot}', [CourseBuilderController::class, 'updateLiveSlot']);
        Route::delete('/course-live-slots/{slot}', [CourseBuilderController::class, 'destroyLiveSlot']);
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
        Route::post('/courses/{course}/thumbnail', [CourseRequestController::class, 'thumbnail']);
        Route::get('/dashboard', [DashboardController::class, 'super']);
        Route::get('/nooni', [NooniController::class, 'adminIndex']);
        Route::put('/nooni/mode', [NooniController::class, 'setMode']);
        Route::post('/nooni/faqs', [NooniController::class, 'storeFaq']);
        Route::put('/nooni/faqs/{faq}', [NooniController::class, 'updateFaq']);
        Route::delete('/nooni/faqs/{faq}', [NooniController::class, 'destroyFaq']);
        Route::get('/approvals', [CourseRequestController::class, 'index']);
        Route::patch('/approvals/{course}', [CourseRequestController::class, 'decide']);

        // Madrasa Support catalogue: boards (logos), classes per syllabus, subjects (thumbnails)
        Route::get('/madrasa/boards', [MadrasaSupportAdminController::class, 'boards']);
        Route::post('/madrasa/boards/{board}', [MadrasaSupportAdminController::class, 'updateBoard']);
        Route::get('/madrasa/boards/{board}/classes', [MadrasaSupportAdminController::class, 'classes']);
        Route::post('/madrasa/boards/{board}/classes', [MadrasaSupportAdminController::class, 'storeClass']);
        Route::post('/madrasa/boards/{board}/copy', [MadrasaSupportAdminController::class, 'copySyllabus']);
        Route::delete('/madrasa/classes/{class}', [MadrasaSupportAdminController::class, 'destroyClass']);
        Route::post('/madrasa/classes/{class}/subjects', [MadrasaSupportAdminController::class, 'storeSubject']);
        Route::post('/madrasa/subjects/{subject}', [MadrasaSupportAdminController::class, 'updateSubject']);
        Route::delete('/madrasa/subjects/{subject}', [MadrasaSupportAdminController::class, 'destroySubject']);
        Route::get('/shop/summary', [ShopAdminController::class, 'summary']);
        Route::get('/shop/products', [ShopAdminController::class, 'products']);
        Route::post('/shop/products', [ShopAdminController::class, 'storeProduct']);
        Route::post('/shop/products/{id}', [ShopAdminController::class, 'updateProduct'])->whereNumber('id');
        Route::delete('/shop/products/{id}', [ShopAdminController::class, 'destroyProduct'])->whereNumber('id');
        Route::post('/shop/products/{id}/restore', [ShopAdminController::class, 'restoreProduct'])->whereNumber('id');
        Route::delete('/shop/products/{id}/forever', [ShopAdminController::class, 'forceDeleteProduct'])->whereNumber('id');
        Route::get('/shop/orders', [ShopAdminController::class, 'orders']);
        Route::put('/shop/orders/{id}', [ShopAdminController::class, 'updateOrder'])->whereNumber('id');
        Route::get('/shop/settings', [ShopAdminController::class, 'settings']);
        Route::post('/shop/settings', [ShopAdminController::class, 'updateSettings']);
        Route::get('/games', [GameController::class, 'adminIndex']);
        Route::post('/games', [GameController::class, 'store']);
        Route::post('/games/reorder', [GameController::class, 'reorder']);
        Route::post('/games/{id}', [GameController::class, 'update'])->whereNumber('id');
        Route::delete('/games/{id}', [GameController::class, 'destroy'])->whereNumber('id');
        Route::post('/games/{id}/restore', [GameController::class, 'restore'])->whereNumber('id');
        Route::delete('/games/{id}/forever', [GameController::class, 'forceDelete'])->whereNumber('id');

        Route::get('/study-tools', [StudyToolController::class, 'superIndex']);
        Route::post('/study-tools', [StudyToolController::class, 'store']);
        Route::match(['put', 'post'], '/study-tools/{tool}', [StudyToolController::class, 'update']);
        Route::delete('/study-tools/{tool}', [StudyToolController::class, 'destroy']);
        Route::post('/study-tools/{id}/restore', [StudyToolController::class, 'restore'])->whereNumber('id');
        Route::delete('/study-tools/{id}/forever', [StudyToolController::class, 'forceDelete'])->whereNumber('id');
    });
});
