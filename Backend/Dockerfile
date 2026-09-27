# ----------------------------------------------------
# Stage 1: Build frontend assets with Node 22
# ----------------------------------------------------
FROM node:22-alpine AS frontend-builder
WORKDIR /app

COPY package*.json ./
RUN npm ci || npm install

COPY resources ./resources
COPY public ./public
COPY vite.config.js ./

RUN npm run build

# ----------------------------------------------------
# Stage 2: Install PHP dependencies with Composer
# ----------------------------------------------------
FROM composer:2 AS composer-builder
WORKDIR /app

COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --no-interaction \
    --prefer-dist \
    --optimize-autoloader \
    --no-scripts

# ----------------------------------------------------
# Stage 3: Production PHP 8.3 + Apache
# ----------------------------------------------------
FROM php:8.3-apache

WORKDIR /var/www/html

# Install system dependencies & PHP extensions required by Laravel
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libzip-dev \
    libonig-dev \
    libicu-dev \
    zip \
    unzip \
    curl \
    ca-certificates \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
    pdo_mysql \
    mbstring \
    exif \
    pcntl \
    bcmath \
    gd \
    zip \
    intl \
    opcache \
    && a2enmod rewrite headers \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Configure Apache virtual host
RUN echo '<VirtualHost *:80>\n\
    ServerAdmin webmaster@localhost\n\
    DocumentRoot /var/www/html/public\n\
    SetEnvIfNoCase ^Authorization$ "(.+)" HTTP_AUTHORIZATION=$1\n\
    <Directory /var/www/html/public>\n\
        Options -Indexes +FollowSymLinks\n\
        AllowOverride All\n\
        Require all granted\n\
        CGIPassAuth On\n\
    </Directory>\n\
    ErrorLog ${APACHE_LOG_DIR}/error.log\n\
    CustomLog ${APACHE_LOG_DIR}/access.log combined\n\
</VirtualHost>' > /etc/apache2/sites-available/000-default.conf

# Copy application files
COPY . /var/www/html

# Copy vendor dependencies from composer-builder
COPY --from=composer-builder /app/vendor /var/www/html/vendor

# Copy built frontend assets from frontend-builder
COPY --from=frontend-builder /app/public/build /var/www/html/public/build

# Setup entrypoint script directly
RUN echo '#!/bin/sh\n\
set -e\n\
PORT="${PORT:-80}"\n\
sed -i "s/Listen 80/Listen ${PORT}/g" /etc/apache2/ports.conf\n\
sed -i "s/<VirtualHost \\*:80>/<VirtualHost \\*:${PORT}>/g" /etc/apache2/sites-available/000-default.conf\n\
mkdir -p /var/www/html/storage/framework/cache/data \\\n\
         /var/www/html/storage/framework/sessions \\\n\
         /var/www/html/storage/framework/views \\\n\
         /var/www/html/storage/logs \\\n\
         /var/www/html/bootstrap/cache \\\n\
         /var/www/html/database\n\
if [ ! -f /var/www/html/.env ]; then\n\
    if [ -f /var/www/html/.env.example ]; then\n\
        cp /var/www/html/.env.example /var/www/html/.env\n\
    else\n\
        touch /var/www/html/.env\n\
    fi\n\
fi\n\
if [ -z "$APP_KEY" ]; then\n\
    echo "APP_KEY is not set. Generating application key..."\n\
    php artisan key:generate --force || true\n\
fi\n\
# Prevent crashes if MySQL is not configured yet\n\
if [ -z "$DB_HOST" ] || [ "$DB_HOST" = "127.0.0.1" ]; then\n\
    echo "DB_HOST not set or points to localhost. Using SQLite fallback."\n\
    touch /var/www/html/database/database.sqlite\n\
    sed -i "s/^DB_CONNECTION=.*/DB_CONNECTION=sqlite/" /var/www/html/.env || true\n\
    sed -i "s|^DB_DATABASE=.*|DB_DATABASE=/var/www/html/database/database.sqlite|" /var/www/html/.env || true\n\
    sed -i "s/^DB_HOST=.*/DB_HOST=/" /var/www/html/.env || true\n\
    export DB_CONNECTION=sqlite\n\
    export DB_DATABASE=/var/www/html/database/database.sqlite\n\
fi\n\
export SESSION_DRIVER="${SESSION_DRIVER:-file}"\n\
export CACHE_STORE="${CACHE_STORE:-file}"\n\
chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache /var/www/html/database\n\
chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache /var/www/html/database\n\
[ -f /var/www/html/database/database.sqlite ] && chmod 666 /var/www/html/database/database.sqlite\n\
php artisan storage:link --force || true\n\
php artisan migrate --force || true\n\
php artisan db:seed --class=AdminSeeder --force || true\n\
php artisan config:clear || true\n\
php artisan route:clear || true\n\
php artisan view:clear || true\n\
echo "Starting Apache on port ${PORT}..."\n\
exec apache2-foreground\n' > /usr/local/bin/docker-entrypoint.sh \
    && chmod +x /usr/local/bin/docker-entrypoint.sh

# Discover packages & set directory permissions
RUN php artisan package:discover --ansi || true \
    && chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

EXPOSE 80

ENTRYPOINT ["docker-entrypoint.sh"]
