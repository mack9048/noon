#!/usr/bin/env bash
# Creates the Laravel 11 API in ./server and copies the Noon Learn code on top.
# Run once on your computer (or on the Hostinger server). Needs PHP 8.2+, Composer, MySQL.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d server ]; then
  composer create-project laravel/laravel:^11.0 server
  (cd server && php artisan install:api --without-migration-prompt)   # adds Sanctum + routes/api.php
fi

cp -R overlay/. server/
cp -n env.example server/.env.noon.example || true

cd server
php artisan storage:link || true
echo
echo "✅ Laravel API ready in api/server"
echo "Next:"
echo "  1. Edit api/server/.env  (DB_* and the values in .env.noon.example)"
echo "  2. php artisan migrate --seed"
echo "  3. php artisan serve   →  http://127.0.0.1:8000/api/health"
