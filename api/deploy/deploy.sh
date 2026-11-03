#!/usr/bin/env bash
# Run on the Hostinger VPS for every release:  bash api/deploy/deploy.sh
set -euo pipefail
cd /var/www/noon-learn
git pull --ff-only
bash api/install.sh            # re-copies overlay files onto api/server
cd api/server
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan queue:restart || true
sudo systemctl reload php8.3-fpm
echo "✅ API deployed"
