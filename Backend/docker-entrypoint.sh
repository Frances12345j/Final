#!/bin/sh
set -e

PORT="${PORT:-80}"

# Configure Apache to listen on Render's assigned dynamic $PORT
sed -i "s/Listen 80/Listen ${PORT}/g" /etc/apache2/ports.conf
sed -i "s/<VirtualHost \*:80>/<VirtualHost \*:${PORT}>/g" /etc/apache2/sites-available/000-default.conf

# An unset APP_ENV must not be treated as "not production". A service created
# without environment variables (e.g. a misconfigured duplicate of the API) has
# no APP_ENV at all, which previously skipped the SQLite refusal below and
# booted the app against an ephemeral empty database. Default it to production
# so only an explicit APP_ENV=local opts into the SQLite fallback.
APP_ENV="${APP_ENV:-production}"
export APP_ENV

# Ensure critical storage & cache directories exist with appropriate permissions
mkdir -p /var/www/html/storage/framework/cache/data \
         /var/www/html/storage/framework/sessions \
         /var/www/html/storage/framework/views \
         /var/www/html/storage/logs \
         /var/www/html/bootstrap/cache

# Ensure a base .env exists if not provided
if [ ! -f /var/www/html/.env ]; then
    if [ -f /var/www/html/.env.example ]; then
        cp /var/www/html/.env.example /var/www/html/.env
    else
        touch /var/www/html/.env
    fi
fi

# Fall back to SQLite only when no external database is configured at all.
# Production injects a single DB_URL connection string and leaves DB_HOST
# empty, so testing DB_HOST alone would silently switch a real deployment to
# SQLite. config/database.php gives DB_URL precedence over DB_HOST.
if [ -z "$DB_URL" ] && { [ -z "$DB_HOST" ] || [ "$DB_HOST" = "127.0.0.1" ]; }; then
    if [ "$APP_ENV" = "production" ]; then
        echo "FATAL: APP_ENV=production but neither DB_URL nor a remote DB_HOST is set." >&2
        echo "The database service is probably not linked to this service. Refusing" >&2
        echo "to start on SQLite: the container filesystem is ephemeral, so every" >&2
        echo "redeploy would silently discard the entire database. Requests would" >&2
        echo "also fail with 'no such table' because the schema is never persisted." >&2
        echo "Set DB_URL (and APP_ENV=local only for local development)." >&2
        exit 1
    fi

    echo "APP_ENV=${APP_ENV} and no DB_URL or remote DB_HOST. Using SQLite fallback."
    touch /var/www/html/database/database.sqlite
    sed -i "s/^DB_CONNECTION=.*/DB_CONNECTION=sqlite/" /var/www/html/.env || true
    sed -i "s|^DB_DATABASE=.*|DB_DATABASE=/var/www/html/database/database.sqlite|" /var/www/html/.env || true
    sed -i "s/^DB_HOST=.*/DB_HOST=/" /var/www/html/.env || true
    export DB_CONNECTION=sqlite
    export DB_DATABASE=/var/www/html/database/database.sqlite
fi

# Fix storage & cache permissions
chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache /var/www/html/database
chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache /var/www/html/database
[ -f /var/www/html/database/database.sqlite ] && chmod 666 /var/www/html/database/database.sqlite

# Generate symlink for public storage uploads
php artisan storage:link --force || true

# Run database migrations if RUN_MIGRATIONS is set to true
if [ "$RUN_MIGRATIONS" = "true" ]; then
    echo "Running database migrations..."
    php artisan migrate --force || true
    php artisan db:seed --class=AdminSeeder --force || true
fi

# Clear old configuration cache so runtime environment variables are respected
php artisan config:clear || true
php artisan route:clear || true
php artisan view:clear || true

echo "Starting Apache on port ${PORT}..."
exec apache2-foreground
