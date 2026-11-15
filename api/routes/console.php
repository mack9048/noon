<?php

use App\Models\OtpCode;
use App\Models\User;
use Illuminate\Support\Facades\Artisan;
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

/*
 * Set (or create) the super admin login:
 *   php artisan noon:super-admin you@example.com 'YourPassword'
 * Changes the email and password of the existing super admin; signs out its old sessions.
 */
Artisan::command('noon:super-admin {email} {password}', function (string $email, string $password) {
    $email = strtolower(trim($email));
    if (! filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($password) < 8) {
        $this->error('Give a valid email and a password of at least 8 characters.');

        return 1;
    }
    $other = User::where('email', $email)->where('role', '!=', 'super')->first();
    if ($other) {
        $this->error("{$email} already belongs to another (non super admin) account.");

        return 1;
    }
    $super = User::where('role', 'super')->where('email', $email)->first() ?? User::where('role', 'super')->orderBy('id')->first();
    if ($super) {
        $super->forceFill(['email' => $email, 'password' => $password, 'blocked' => false])->save();
        $super->tokens()->delete();
    } else {
        $super = User::create(['name' => 'Super Admin', 'email' => $email, 'password' => $password, 'role' => 'super']);
    }
    $this->info("Super admin login is now {$email}.");

    return 0;
})->purpose('Set the super admin email and password');
