<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Fresh database: platform content, the super admin, and one demo madrasa.
 *
 * Set these in .env before seeding a live server:
 *   SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD  your own super admin login
 *   DEMO_PASSWORD                            shared password of every demo madrasa login
 * Skip the demo madrasa with SEED_DEMO_SCHOOL=false.
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(CatalogSeeder::class);

        User::create([
            'name' => 'Super Admin',
            'email' => strtolower(env('SUPER_ADMIN_EMAIL', 'super@noonlearn.com')),
            'password' => env('SUPER_ADMIN_PASSWORD', 'password'),
            'role' => 'super',
        ]);

        if (filter_var(env('SEED_DEMO_SCHOOL', true), FILTER_VALIDATE_BOOL)) {
            $this->call(DemoSchoolSeeder::class);
        }
    }
}
