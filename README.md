[![Laravel Forge Site Deployment Status](https://img.shields.io/endpoint?url=https%3A%2F%2Fforge.laravel.com%2Fsite-badges%2Fa89488e3-6bf3-4f91-9427-41050b590248%3Fdate%3D1&style=flat-square)](https://forge.laravel.com)
[![Tests](https://github.com/isAdamBailey/shudderfly/actions/workflows/test.yml/badge.svg)](https://github.com/isAdamBailey/shudderfly/actions/workflows/test.yml)

## About Shudderfly

[Colin's Shudderfly](https://shudderfly.adambailey.io) is a secure, content-managed application designed to provide a safe digital environment for children. Built to upload, organize, and display curated images, videos, and music that are appropriate for specific permission levels without exposure to external marketing, social links, or inappropriate content.

The application serves multiple content types:
- **Books**: Digital photo albums with categorization and read tracking
- **Photos**: Standalone image galleries with bulk management capabilities
- **Music**: YouTube video integration with a clean, distraction-free player
- **Collages**: Custom PDF generation from selected images for printing

## Technical Stack

### Backend
- **Framework**: Laravel 12 (PHP 8.3+)
- **Database**: MySQL/PostgreSQL with Eloquent ORM
- **Authentication**: Laravel Sanctum with role-based permissions via [Spatie Laravel Permission](https://github.com/spatie/laravel-permission)
- **Media Processing**:
  - Images: Intervention Image (WebP conversion with 30% quality for optimization)
  - Videos: FFmpeg integration via pbmedia/laravel-ffmpeg
  - PDF Generation: DomPDF for collage exports
- **Storage**: AWS S3 with CloudFront CDN support
- **Queue System**: Amazon SQS for asynchronous media processing
- **Testing**: PHPUnit with Laravel Nightwatch for debugging

### Frontend
- **Framework**: Vue 3 with Composition API
- **Routing**: Inertia.js for SPA-like experience without API overhead
- **Styling**: Tailwind CSS with typography and forms plugins
- **Rich Text**: TipTap editor for content management
- **File Uploads**: FilePond with image preview and type validation
- **Icons**: RemixIcon
- **Build Tool**: Vite with hot module replacement
- **Testing**: Vitest with Vue Test Utils and jsdom

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

## Architecture Highlights

### Queue Jobs
- `StoreImage`: Handles image optimization and S3 upload
- `StoreVideo`: FFmpeg video processing with 30-minute timeout
- `CreateVideoSnapshot`: Generates video thumbnails
- `GenerateCollagePdf`: Asynchronous PDF generation with email delivery
- `IncrementReadCount`: Tracks engagement metrics

### Routes Structure
- Public routes: None (fully authenticated application)
- Auth middleware: All routes require authentication
- `can:edit pages`: Content management permission
- `can:admin`: Full administrative access including user management and settings

### Storage Strategy
- Default disk: S3 with public visibility
- CloudFront CDN for optimized content delivery
- Local storage for temporary processing files
- Automatic cleanup of old media when updated
