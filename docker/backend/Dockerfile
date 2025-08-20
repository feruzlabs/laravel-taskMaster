# syntax=docker/dockerfile:1

FROM php:8.3-cli AS app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       git unzip libpq-dev \
    && docker-php-ext-install pdo pdo_pgsql \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www

# Install PHP deps first for better layer caching
COPY ./backend/composer.json ./backend/composer.lock ./
RUN composer install --no-dev --prefer-dist --no-interaction --no-progress || true

# Copy source
COPY ./backend .

# Copy entrypoint
COPY ./docker/backend/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Optimize
RUN php artisan key:generate --force \
 && php artisan config:clear \
 && php artisan route:clear

EXPOSE 8000
ENTRYPOINT ["/entrypoint.sh"] 