#!/usr/bin/env bash
# Run on the Hostinger VPS for every release:  bash api/deploy/deploy.sh
set -euo pipefail
cd /var/www/noon-learn
git pull --ff-only
cd api
php artisan down --retry=15 || true
trap 'php artisan up' EXIT           # always bring the API back up
composer install --no-dev --optimize-autoloader --no-interaction
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan queue:restart || true
sudo systemctl reload php8.3-fpm
echo "✅ API deployed"
