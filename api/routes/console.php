<?php

use App\Models\OtpCode;
use Illuminate\Support\Facades\Schedule;

/*
 * Cron runs `php artisan schedule:run` every minute.
 * On the VPS, Supervisor runs the queue worker (deploy/noon-queue.conf).
 * On hosting without Supervisor, set QUEUE_VIA_SCHEDULER=true instead.
 */
if (config('noon.queue_via_scheduler')) {
    Schedule::command('queue:work --stop-when-empty --max-time=55 --tries=3')
        ->everyMinute()
        ->withoutOverlapping()
        ->runInBackground();
}

// Housekeeping
Schedule::command('sanctum:prune-expired --hours=24')->daily();
Schedule::call(fn () => OtpCode::where('created_at', '<', now()->subDay())->delete())->daily()->name('prune-otp-codes');
Schedule::command('queue:prune-failed --hours=720')->weekly();
