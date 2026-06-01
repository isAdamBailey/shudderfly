[![Laravel Forge Site Deployment Status](https://img.shields.io/endpoint?url=https%3A%2F%2Fforge.laravel.com%2Fsite-badges%2Fa89488e3-6bf3-4f91-9427-41050b590248%3Fdate%3D1&style=flat)](https://forge.laravel.com/adam-f6w/adambaileyio/1819049)
[![Tests](https://github.com/isAdamBailey/shudderfly/actions/workflows/test.yml/badge.svg)](https://github.com/isAdamBailey/shudderfly/actions/workflows/test.yml)

# 🦋 Shudderfly

Private family media management built with Laravel, Vue, and AWS-backed services.

## Overview

Shudderfly is a private media app for sharing family-friendly content without ads, public feeds, or third-party social distractions. It supports books, pages, songs, movie cast lookup, collages, messages, searchable media, and AI-generated user summaries.

## Core Features

- Private, authenticated media experience
- Books and pages for photo and video collections
- Movie cast lookup (TMDB search, trailers, favorites, share to chat)
- Song library with YouTube-based playback
- PDF collage generation
- Internal messaging and notifications
- Role/permission-based access control
- Fast full-text search with Meilisearch
- Responsive Vue + Inertia interface

## AI Functionality

Shudderfly includes AI-powered user overview support via Hugging Face.

- `HUGGINGFACE_API_TOKEN`
- `HUGGINGFACE_USER_OVERVIEW_MODEL` (`Qwen/Qwen2.5-1.5B-Instruct` by default)
- `HUGGINGFACE_USER_OVERVIEW_ENDPOINT`

## Package / Runtime Versions

### Backend

- PHP `^8.3`
- Laravel Framework `^13.0`
- Laravel Sanctum `^4.0`
- Laravel Scout `^10.22`
- Inertia Laravel `^3.0`
- Spatie Laravel Permission `^6.0`
- Laravel Nightwatch `^1.7`
- DomPDF `^3.1`
- Meilisearch PHP `^1.16`
- Laravel FFMpeg `^8.5`
- Web Push `^9.0`

### Frontend

- Node `>=20.0.0`
- npm `>=10.0.0`
- Vue `^3.2.41`
- Vite `^6.3.5`
- Vitest `^3.2.4`
- Tailwind CSS `^3.2.1`
- Inertia Vue `^3.1.1`
- Laravel Echo `^2.2.6`
- Pusher JS `^8.4.0`
- TipTap `^2.x`

## Services and Integrations

- **MySQL 8.0** for application data
- **Meilisearch** for search indexing
- **AWS S3** for media storage
- **CloudFront** for CDN delivery
- **Amazon SQS** for background jobs
- **AWS SES** for mail delivery
- **Pusher / Laravel Echo** for realtime notifications
- **Web Push (VAPID)** for browser notifications
- **FFmpeg** for video processing
- **YouTube API** for song content
- **TMDB API** for movie cast lookup

## Local Development

### Requirements

- Docker / Laravel Sail
- Node 20+
- npm 10+

### Start locally

```bash
cp .env.example .env
npm install
composer install
./vendor/bin/sail up -d
./vendor/bin/sail artisan key:generate
./vendor/bin/sail artisan migrate:fresh --seed
./vendor/bin/sail artisan scout:import "App\Models\Book"
./vendor/bin/sail artisan scout:import "App\Models\Page"
./vendor/bin/sail artisan scout:import "App\Models\Song"
npm run dev
```

### Important local env values

```env
APP_URL=http://localhost
DB_CONNECTION=mysql
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=shudderfly
DB_USERNAME=sail
DB_PASSWORD=password
FILESYSTEM_DISK=local
QUEUE_CONNECTION=sync
SCOUT_DRIVER=meilisearch
MEILISEARCH_HOST=http://meilisearch:7700
TMDB_API_KEY=
```

### Seeded data

`DatabaseSeeder` runs:

- `RolesAndPermissionsSeeder`
- `SiteSeeder`
- `BookSeeder`
- `SongSeeder`

This gives you roles/permissions plus sample users, books, pages, and songs for local development.

### Local URLs

- App: `http://localhost`
- Meilisearch: `http://localhost:7700`
- MySQL: `127.0.0.1:3306`

## Development Notes

- Docker services include `laravel.test`, `mysql`, and `meilisearch`
- PHP commands are expected to run through Sail
- Local queue processing defaults to `sync`
- Production media and jobs are designed around S3 + SQS

## License

MIT
