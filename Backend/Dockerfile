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
    <Directory /var/www/html/public>\n\
        Options -Indexes +FollowSymLinks\n\
        AllowOverride All\n\
        Require all granted\n\
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
         /var/www/html/bootstrap/cache\n\
if [ ! -f /var/www/html/.env ]; then\n\
    if [ -f /var/www/html/.env.example ]; then\n\
        cp /var/www/html/.env.example /var/www/html/.env\n\
    else\n\
        touch /var/www/html/.env\n\
    fi\n\
fi\n\
if [ -z "$APP_KEY" ]; then\n\
    echo "APP_KEY is not set in environment. Generating application key..."\n\
    php artisan key:generate --force || true\n\
fi\n\
chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache\n\
chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache\n\
php artisan storage:link --force || true\n\
if [ "$RUN_MIGRATIONS" = "true" ]; then\n\
    echo "Running database migrations..."\n\
    php artisan migrate --force || true\n\
fi\n\
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
