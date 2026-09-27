#!/bin/sh
set -e

PORT="${PORT:-80}"

# Configure Apache to listen on Render's assigned dynamic $PORT
sed -i "s/Listen 80/Listen ${PORT}/g" /etc/apache2/ports.conf
sed -i "s/<VirtualHost \*:80>/<VirtualHost \*:${PORT}>/g" /etc/apache2/sites-available/000-default.conf

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

# Prevent crashes if MySQL is not configured yet
if [ -z "$DB_HOST" ] || [ "$DB_HOST" = "127.0.0.1" ]; then
    echo "DB_HOST not set or points to localhost. Using SQLite fallback."
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
