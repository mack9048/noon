<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/** Small platform settings kept in the database (e.g. the Nooni mode). */
class AppSetting
{
    public static function get(string $key, ?string $default = null): ?string
    {
        if (! Schema::hasTable('app_settings')) {
            return $default;
        }

        return DB::table('app_settings')->where('key', $key)->value('value') ?? $default;
    }

    public static function set(string $key, ?string $value): void
    {
        DB::table('app_settings')->updateOrInsert(['key' => $key], ['value' => $value, 'updated_at' => now(), 'created_at' => now()]);
    }
}
