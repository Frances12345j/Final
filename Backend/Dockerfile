# syntax=docker/dockerfile:1
# ----------------------------------------------------
# NewMoon API — Laravel 13 on PHP 8.3 + Apache
# ----------------------------------------------------
# This image is API-only. The React admin SPA lives in
# /Newmoon-Web and is published as a separate static site,
# so there is no Node build stage here.
# ----------------------------------------------------

# ----------------------------------------------------
# Stage 1: Install PHP dependencies with Composer
# ----------------------------------------------------
FROM composer:2 AS vendor

WORKDIR /app

COPY composer.json composer.lock ./

RUN composer install \
    --no-dev \
    --no-interaction \
    --prefer-dist \
    --no-scripts \
    --optimize-autoloader

# ----------------------------------------------------
# Stage 2: Production PHP 8.3 + Apache
# ----------------------------------------------------
FROM php:8.3-apache

WORKDIR /var/www/html

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libzip-dev \
    libonig-dev \
    libicu-dev \
    libpq-dev \
    zip \
    unzip \
    curl \
    ca-certificates \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" \
    pdo_mysql \
    pdo_pgsql \
    mbstring \
    exif \
    pcntl \
    posix \
    bcmath \
    gd \
    zip \
    intl \
    opcache \
    && a2enmod rewrite headers \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Virtual host: DocumentRoot is public/, plus the Sanctum bearer-token headers.
COPY apache.conf /etc/apache2/sites-available/000-default.conf

# Entrypoint and Apache configuration are read-only at runtime.
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Application source (vendor/ and .dockerignore'd paths are excluded by the
# .dockerignore in this directory, so they are restored from the stage below).
COPY . /var/www/html

# Restore Composer dependencies built in stage 1.
COPY --from=vendor /app/vendor /var/www/html/vendor

# Laravel writes compiled packages during boot; keep it off the build layer.
RUN php artisan package:discover --ansi || true \
    && chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

EXPOSE 80

ENTRYPOINT ["docker-entrypoint.sh"]
