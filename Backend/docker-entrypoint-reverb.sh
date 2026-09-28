#!/bin/sh
# Container init for the Reverb websocket service.
# The API service owns migrations; this service only serves websocket traffic.
set -e

PORT="${PORT:-8080}"

# Reverb writes logs and cached config under storage/.
mkdir -p /var/www/html/storage/framework/cache/data \
         /var/www/html/storage/framework/sessions \
         /var/www/html/storage/framework/views \
         /var/www/html/storage/logs \
         /var/www/html/bootstrap/cache

# A minimal .env is only needed for values the platform does not inject.
# Laravel's immutable Dotenv gives real environment variables precedence,
# so anything set in the Render dashboard wins over this fallback file.
if [ ! -f /var/www/html/.env ]; then
    if [ -f /var/www/html/.env.example ]; then
        cp /var/www/html/.env.example /var/www/html/.env
    else
        touch /var/www/html/.env
    fi
fi

if [ -z "$APP_KEY" ]; then
    echo "APP_KEY is not set. Generating application key..."
    php artisan key:generate --force || true
fi

chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

php artisan config:clear || true
php artisan route:clear || true

echo "Starting Reverb on 0.0.0.0:${PORT}..."
exec php artisan reverb:start --host=0.0.0.0 --port="${PORT}"
