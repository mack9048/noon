<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Fresh database: platform content, the super admin, and one demo institution.
 *
 * Set these in .env before seeding a live server:
 *   SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD  your own super admin login
 *   DEMO_PASSWORD                            shared password of every demo institution login
 * Skip the demo institution with SEED_DEMO_SCHOOL=false.
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(CatalogSeeder::class);

        // Never fall back to a guessable password: without SUPER_ADMIN_PASSWORD, make a strong
        // one and show it once in the console so the person running the seed can save it.
        $password = env('SUPER_ADMIN_PASSWORD');
        if (! $password) {
            $password = 'Noon-'.Str::password(14, symbols: false);
            $this->command?->warn('SUPER_ADMIN_PASSWORD was not set. Super admin password: '.$password.'  (save it now, it is not shown again)');
        }
        User::create([
            'name' => 'Super Admin',
            'email' => strtolower(env('SUPER_ADMIN_EMAIL', 'super@noonlearn.com')),
            'password' => $password,
            'role' => 'super',
        ]);

        if (filter_var(env('SEED_DEMO_SCHOOL', true), FILTER_VALIDATE_BOOL)) {
            $this->call(DemoSchoolSeeder::class);
        }
    }
}
