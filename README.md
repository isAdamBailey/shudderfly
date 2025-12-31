[![Laravel Forge Site Deployment Status](https://img.shields.io/endpoint?url=https%3A%2F%2Fforge.laravel.com%2Fsite-badges%2Fa89488e3-6bf3-4f91-9427-41050b590248%3Fdate%3D1&style=flat-square)](https://forge.laravel.com)
[![Tests](https://github.com/isAdamBailey/shudderfly/actions/workflows/test.yml/badge.svg)](https://github.com/isAdamBailey/shudderfly/actions/workflows/test.yml)

# 🦋 Shudderfly

## A Safe Digital Space for Families

[Colin's Shudderfly](https://shudderfly.adambailey.io) is a secure, private content management system designed to create a safe digital environment for children. Zero ads, no social media links, no external tracking — just your curated content in a beautiful, modern interface.

### Why Shudderfly?

🛡️ **Child-Safe by Design** - Complete control over all content with role-based permissions  
🎨 **Beautiful & Responsive** - Modern UI that works seamlessly on phones, tablets, and desktops  
📚 **Digital Photo Albums** - Organize memories into themed books with categories and geolocation  
🎵 **Distraction-Free Music** - YouTube integration without recommendations or ads  
🖼️ **PDF Collage Generator** - Create printable photo books from your digital collections  
🔍 **Lightning-Fast Search** - Powered by Meilisearch with typo-tolerance and instant results  
🚀 **Production-Ready** - Built on Laravel 12 with enterprise-grade security and scalability

### Content Types

- **📖 Books**: Digital photo albums with categories, geolocation tags, and read tracking
- **📸 Photos**: Standalone image galleries with infinite scroll and bulk management
- **🎵 Music**: YouTube videos presented as audio tracks with custom thumbnails
- **🎨 Collages**: Generate beautiful PDF photo books for printing
- **💬 Messages**: Internal communication system with reactions and threading

---

## 🏗️ Technical Stack

### Backend

- **Framework**: Laravel 12 (PHP 8.3+)
- **Database**: MySQL 8.0 with Eloquent ORM
- **Authentication**: Laravel Sanctum with role-based permissions via [Spatie Laravel Permission](https://github.com/spatie/laravel-permission)
- **Search**: [Meilisearch](https://www.meilisearch.com/) via Laravel Scout for fast, typo-tolerant search
- **Media Processing**:
  - **Images**: Intervention Image (automatic WebP conversion with 30% quality compression)
  - **Videos**: FFmpeg integration via pbmedia/laravel-ffmpeg (H.264 encoding with poster generation)
  - **PDF Generation**: DomPDF for collage exports
- **Storage**: AWS S3 with CloudFront CDN support
- **Queue System**: Amazon SQS for asynchronous media processing jobs
- **Real-time**: Laravel Echo with Pusher for live notifications and reactions
- **Testing**: PHPUnit with Laravel Nightwatch for debugging

### Frontend

- **Framework**: Vue 3 with Composition API and `<script setup>`
- **Routing**: Inertia.js for SPA experience without REST API overhead
- **Styling**: Tailwind CSS 3 with custom themes (Christmas, Halloween, Fireworks)
- **Rich Text**: TipTap editor with link support for content management
- **File Uploads**: FilePond with drag-and-drop, image preview, and MIME validation
- **Icons**: RemixIcon (4,000+ icons)
- **Maps**: Leaflet.js with geocoding for location features
- **Build Tool**: Vite 6 with hot module replacement
- **Testing**: Vitest with Vue Test Utils and jsdom

### Infrastructure

- **Containerization**: Docker via Laravel Sail for local development
- **CI/CD**: GitHub Actions for automated testing
- **Deployment**: Laravel Forge with zero-downtime deployments
- **Monitoring**: Laravel Nightwatch for error tracking

### Key Features

#### Content Management

- **Role-Based Access Control**: Three permission levels (viewer, editor, admin)
- **Media Optimization Pipeline**:
  - Images automatically converted to WebP format with compression
  - Videos processed with FFmpeg for web-optimized playback
  - Asynchronous job processing with retry logic and exponential backoff
  - Automatic thumbnail generation for videos
- **Categories & Taxonomy**: Hierarchical organization with slug-based routing
- **Read Tracking**: Analytics for book and song engagement
- **Bulk Operations**: Mass edit, delete, or organize content

#### User Experience

- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Dark Mode Support**: System preference detection
- **Progress Indicators**: Visual feedback during uploads and processing
- **Form Validation**: Client and server-side validation with Vuelidate
- **Contact System**: Email notifications to administrators
- **Weekly Stats**: Automated engagement reports

#### Advanced Features

- **Video Snapshot Tool**: Generate page snapshots from video content
- **PDF Collage Generator**: Create printable photo books with custom layouts
- **YouTube Integration**: Safe music playback via vue-lite-youtube-embed
- **Archive System**: Soft delete and restore functionality for collages
- **Settings Management**: Dynamic site configuration via database

---

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **PHP 8.3+** with extensions: `mbstring`, `xml`, `curl`, `zip`, `gd`, `mysql`
- **Composer** (latest version)
- **Node.js 20+** and **npm 10+**
- **Docker Desktop** (for Laravel Sail)
- **FFmpeg** (for video processing)
  ```bash
  # macOS
  brew install ffmpeg
  
  # Ubuntu/Debian
  sudo apt-get install ffmpeg
  ```

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/isAdamBailey/shudderfly.git
cd shudderfly
```

#### 2. Install Dependencies

```bash
# Install PHP dependencies
composer install

# Install JavaScript dependencies
npm install
```

#### 3. Environment Configuration

```bash
# Copy the example environment file
cp .env.example .env

# Generate application key
php artisan key:generate
```

#### 4. Configure Environment Variables

Edit `.env` and configure the following sections:

**Database** (handled by Docker):
```env
DB_CONNECTION=mysql
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=shudderfly
DB_USERNAME=sail
DB_PASSWORD=password
```

**Queue System** (use `sync` for local development):
```env
QUEUE_CONNECTION=sync
# For production with SQS:
# QUEUE_CONNECTION=sqs
# AWS_ACCESS_KEY_ID=your-access-key
# AWS_SECRET_ACCESS_KEY=your-secret-key
# SQS_PREFIX=https://sqs.us-east-1.amazonaws.com/your-account-id
# SQS_QUEUE=your-queue-name
```

**File Storage** (use `local` for development):
```env
FILESYSTEM_DISK=local
# For production with S3:
# FILESYSTEM_DISK=s3
# AWS_BUCKET=your-bucket-name
# CLOUDFRONT_URL=https://your-cloudfront-url
```

**Meilisearch** (handled by Docker):
```env
SCOUT_DRIVER=meilisearch
MEILISEARCH_HOST=http://meilisearch:7700
MEILISEARCH_KEY=
FORWARD_MEILISEARCH_PORT=7700
```

**Mail** (optional for local development):
```env
MAIL_MAILER=log
# For production with AWS SES:
# MAIL_MAILER=ses
# AWS_ACCESS_KEY_ID=your-access-key
# AWS_SECRET_ACCESS_KEY=your-secret-key
```

**Pusher** (optional for real-time features):
```env
# Leave blank to disable real-time features locally
PUSHER_APP_ID=
PUSHER_APP_KEY=
PUSHER_APP_SECRET=
PUSHER_HOST=
PUSHER_APP_CLUSTER=mt1
```

**Web Push Notifications** (optional):
```bash
# Generate VAPID keys
npx web-push generate-vapid-keys

# Add the generated keys to .env
VAPID_PUBLIC_KEY=your-public-key
VAPID_PRIVATE_KEY=your-private-key
```

#### 5. Start Docker Services with Laravel Sail

```bash
# Start all services (MySQL, Meilisearch, PHP)
./vendor/bin/sail up -d

# Create an alias for convenience (optional but recommended)
alias sail='./vendor/bin/sail'
```

#### 6. Run Migrations and Seed Database

```bash
# Run migrations
sail artisan migrate

# Seed database with default roles, permissions, and sample data
sail artisan db:seed

# Or run both commands together
sail artisan migrate:fresh --seed
```

This creates:
- **3 Permission Roles**: Viewer, Editor, Admin
- **Default User**: Check the seeder output for credentials
- **Sample Books, Pages, and Songs**: Test data to explore features

#### 7. Index Data in Meilisearch

```bash
sail artisan scout:import "App\Models\Book"
sail artisan scout:import "App\Models\Page"
sail artisan scout:import "App\Models\Song"
```

#### 8. Build Frontend Assets

```bash
# Development mode with hot reload
npm run dev

# Or in a separate terminal if using Sail
sail npm run dev

# Production build
npm run build
```

#### 9. Access the Application

- **Application**: http://localhost
- **Meilisearch Dashboard**: http://localhost:7700
- **MySQL Database**: localhost:3306 (username: `sail`, password: `password`)

### Running the Queue Worker

For processing media uploads (images/videos) and generating PDFs:

```bash
# Development (synchronous - processes immediately)
# Already configured with QUEUE_CONNECTION=sync

# Production (asynchronous with queue worker)
sail artisan queue:work --tries=3 --timeout=1800
```

**Note**: Video processing can take 15-30 minutes depending on file size. The `StoreVideo` job has a 30-minute timeout.

### Development Workflow

```bash
# Start all services
sail up -d

# Watch for frontend changes (hot reload)
npm run dev

# Run tests
sail artisan test
npm run test

# Run linters
npm run lint
npm run format

# Stop all services
sail down
```

---

## 📊 Application Architecture

### Database Schema

**Core Models**:
- `books` - Photo album containers with categories and geolocation
- `pages` - Individual photos/videos belonging to books
- `songs` - YouTube music tracks with thumbnails
- `categories` - Hierarchical organization for books
- `collages` - Generated PDF collections
- `messages` - Internal messaging system
- `users` - Authentication with role-based permissions

### Queue Jobs

- **`StoreImage`**: Optimizes images to WebP format (30% quality), uploads to S3, cleans up old files
- **`StoreVideo`**: Processes videos with FFmpeg (H.264 encoding), generates posters, uploads to S3 (30-minute timeout)
- **`CreateVideoSnapshot`**: Captures video frames at specific timestamps for page creation
- **`GenerateCollagePdf`**: Creates printable PDF collages from selected images, emails download link
- **`IncrementBookReadCount`** / **`IncrementPageReadCount`** / **`IncrementSongReadCount`**: Tracks engagement analytics

### Permission Levels

1. **Viewer**: Browse books, pages, music; basic read access
2. **Editor**: Create, edit, and delete content; manage books and pages
3. **Admin**: Full system access including user management, settings, and permissions

### Routes Structure

- **Public**: `/login`, `/register` (registration requires secret token)
- **Authenticated** (`auth` middleware): All content routes
- **Editor** (`can:edit pages`): Content management routes
- **Admin** (`can:admin`): User management, settings, system configuration

### Storage Strategy

- **Development**: Local filesystem (`storage/app/public`)
- **Production**: AWS S3 with CloudFront CDN
- **Media Processing**: Temporary files in system temp directory, cleaned up after upload
- **Automatic Cleanup**: Old media deleted when pages are updated

---

## 🔍 Meilisearch Setup

This application uses [Meilisearch](https://www.meilisearch.com/) via Laravel Scout for fast, typo-tolerant search with autocomplete functionality in the search bar.

### Local Development

Meilisearch is included in the Docker Compose setup. When using Laravel Sail:

1. **Start the services** (Meilisearch will start automatically):

   ```bash
   sail up -d
   ```

2. **Configure environment variables** in `.env`:

   ```env
   SCOUT_DRIVER=meilisearch
   MEILISEARCH_HOST=http://meilisearch:7700
   MEILISEARCH_KEY=
   FORWARD_MEILISEARCH_PORT=7700
   ```

   Note: For local development, `MEILISEARCH_KEY` can be left empty (Meilisearch runs without authentication in development mode).

3. **Index existing data**: Already covered in step 7 of the installation guide above.

### Production (Laravel Forge)

1. **Install Meilisearch** on your server:

   ```bash
   sudo docker run -d \
     --name meilisearch \
     --restart unless-stopped \
     -p 7700:7700 \
     -v /opt/meilisearch/data:/meili_data \
     -e MEILI_MASTER_KEY="your-master-key-here" \
     -e MEILI_ENV="production" \
     getmeili/meilisearch:v1.5
   ```

   Generate a secure master key:

   ```bash
   openssl rand -base64 32
   ```

2. **Configure environment variables** in Forge:

   ```env
   SCOUT_DRIVER=meilisearch
   MEILISEARCH_HOST=http://localhost:7700
   MEILISEARCH_KEY=your-generated-master-key-here
   ```

3. **Index data manually** (first time only):
   ```bash
   php artisan scout:import "App\Models\Book"
   php artisan scout:import "App\Models\Page"
   php artisan scout:import "App\Models\Song"
   ```

### Searchable Models

The following models are automatically indexed when created or updated:

- **Book**: Indexes `title` and `excerpt`
- **Page**: Indexes `content` and related book `title`
- **Song**: Indexes `title` and `description`

### Troubleshooting Meilisearch

- **Connection refused**: Ensure Meilisearch is running (`sudo docker ps | grep meilisearch`)
- **Index not found**: Run `php artisan scout:import` for the relevant model
- **Permission denied**: Add your user to the docker group: `sudo usermod -aG docker forge`
- **Tests failing**: Tests use `SCOUT_DRIVER=null` (configured in `phpunit.xml`) to avoid requiring Meilisearch in CI

---

## 🌐 Production Deployment

### AWS Services Setup

#### S3 Bucket Configuration

1. Create an S3 bucket for media storage
2. Enable public access for uploaded media
3. Configure CORS policy:
```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": []
    }
]
```

#### CloudFront CDN (Optional but Recommended)

1. Create a CloudFront distribution pointing to your S3 bucket
2. Add `CLOUDFRONT_URL` to your `.env`
3. Reduces latency and improves media loading speed

#### SQS Queue Setup

1. Create an SQS queue for background jobs
2. Set visibility timeout to at least 1900 seconds (for video processing)
3. Configure dead-letter queue for failed jobs
4. Add credentials to `.env`:
```env
QUEUE_CONNECTION=sqs
SQS_PREFIX=https://sqs.us-east-1.amazonaws.com/your-account-id
SQS_QUEUE=shudderfly-production
```

#### SES Email Configuration

1. Verify your domain in AWS SES
2. Move out of sandbox mode for production sending
3. Configure in `.env`:
```env
MAIL_MAILER=ses
MAIL_FROM_ADDRESS=noreply@yourdomain.com
```

### Laravel Forge Deployment

#### Server Requirements

- Ubuntu 22.04 LTS
- PHP 8.3 with required extensions
- MySQL 8.0
- FFmpeg installed
- Sufficient disk space for temporary video processing

#### Deployment Script

Add to your Forge deployment script:

```bash
cd /home/forge/yourdomain.com

# Maintenance mode
php artisan down

# Pull latest code
git pull origin main

# Install dependencies
composer install --no-dev --optimize-autoloader

# Clear caches
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

# Optimize
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Build frontend assets
npm ci
npm run build

# Run migrations
php artisan migrate --force

# Exit maintenance mode
php artisan up

# Restart queue workers
php artisan queue:restart
```

#### Queue Workers Configuration

In Forge, set up daemon for queue processing:

```bash
php artisan queue:work sqs --tries=3 --timeout=1800 --sleep=3 --max-time=3600
```

**Important**: Set supervisor `stopwaitsecs` to at least 1900 seconds to allow video processing to complete.

#### Scheduled Tasks

Add to Forge scheduler (runs every minute):

```bash
php artisan schedule:run
```

This handles:
- Weekly engagement statistics emails
- Cleanup of old failed jobs
- Cache warming

### Environment Variables for Production

Critical variables to set in Forge:

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://yourdomain.com

# Database
DB_HOST=localhost
DB_DATABASE=your_database
DB_USERNAME=your_user
DB_PASSWORD=secure_password

# AWS Services
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=your-bucket-name
CLOUDFRONT_URL=https://d1234567890.cloudfront.net

# Queue
QUEUE_CONNECTION=sqs
SQS_PREFIX=https://sqs.us-east-1.amazonaws.com/your-account-id
SQS_QUEUE=shudderfly-production

# Mail
MAIL_MAILER=ses
MAIL_FROM_ADDRESS=noreply@yourdomain.com

# Search
SCOUT_DRIVER=meilisearch
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_KEY=your_production_master_key

# Pusher (for real-time features)
PUSHER_APP_ID=your_app_id
PUSHER_APP_KEY=your_app_key
PUSHER_APP_SECRET=your_app_secret
PUSHER_HOST=your_pusher_host
PUSHER_APP_CLUSTER=your_cluster

# Web Push
VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key

# Registration Protection
REGISTRATION_SECRET=your_secret_token
```

---

## 🧪 Testing

### Backend Tests

```bash
# Run all PHPUnit tests
sail artisan test

# Run specific test file
sail artisan test tests/Feature/BookTest.php

# Run with coverage
sail artisan test --coverage
```

### Frontend Tests

```bash
# Run all Vitest tests
npm run test

# Watch mode for development
npm run test:watch

# Run with UI
npm run test:ui

# Run once (for CI)
npm run test:run
```

### Code Quality

```bash
# Run ESLint
npm run lint

# Format code with Prettier
npm run format

# PHP CS Fixer (if configured)
./vendor/bin/pint
```

---

## 🐛 Troubleshooting

### Common Issues

#### Video Upload Fails

**Problem**: Videos fail to process or timeout
**Solutions**:
- Check FFmpeg is installed: `which ffmpeg`
- Increase PHP memory limit in `php.ini`: `memory_limit = 512M`
- Increase queue timeout: `QUEUE_CONNECTION=sync` for local testing
- Check video codec: FFmpeg requires H.264 compatible videos
- Review logs: `tail -f storage/logs/laravel.log`

#### Images Not Displaying

**Problem**: Images upload but don't show in browser
**Solutions**:
- Check S3 bucket permissions (must be publicly readable)
- Verify `CLOUDFRONT_URL` in `.env` matches your distribution
- Check browser console for CORS errors
- Verify S3 CORS policy is configured correctly
- Test direct S3 URL access

#### Search Not Working

**Problem**: Search returns no results
**Solutions**:
- Verify Meilisearch is running: `docker ps | grep meilisearch`
- Re-index models: `sail artisan scout:import "App\Models\Book"`
- Check Meilisearch logs: `docker logs meilisearch`
- Test Meilisearch directly: `curl http://localhost:7700/health`

#### Queue Jobs Stuck

**Problem**: Jobs remain in queue and don't process
**Solutions**:
- Restart queue worker: `sail artisan queue:restart`
- Check failed jobs: `sail artisan queue:failed`
- Retry failed jobs: `sail artisan queue:retry all`
- For video processing, ensure timeout is sufficient (1800 seconds)

#### Permission Denied Errors

**Problem**: Cannot create/edit content
**Solutions**:
- Check user roles: `sail artisan tinker` → `User::with('roles')->get()`
- Verify permissions seeded: `sail artisan db:seed --class=RolesAndPermissionsSeeder`
- Assign role to user in UI: Settings → Users → Edit User

### Log Files

```bash
# Laravel application logs
tail -f storage/logs/laravel.log

# Queue worker logs (production)
tail -f storage/logs/worker.log

# Docker container logs
docker logs -f laravel.test

# Meilisearch logs
docker logs -f meilisearch
```

---

## 📄 License

This project is open-sourced software licensed under the [MIT license](LICENSE).

---

## 👨‍💻 Author

**Adam Bailey**  
- Website: [adambailey.io](https://adambailey.io)
- GitHub: [@isAdamBailey](https://github.com/isAdamBailey)

---

## 🙏 Acknowledgments

Built with:
- [Laravel](https://laravel.com) - The PHP Framework for Web Artisans
- [Vue.js](https://vuejs.org) - The Progressive JavaScript Framework
- [Inertia.js](https://inertiajs.com) - Build single-page apps without building an API
- [Tailwind CSS](https://tailwindcss.com) - A utility-first CSS framework
- [Meilisearch](https://www.meilisearch.com) - Lightning-fast search engine

---

**⭐ If you find this project useful, please consider giving it a star on GitHub!**

