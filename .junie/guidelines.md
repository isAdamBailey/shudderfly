# Shudderfly Development Guidelines

This document provides essential information for developers working on the Shudderfly project.

## Build/Configuration Instructions

### Prerequisites

-   PHP 8.3+
-   Composer
-   Node.js and npm
-   MySQL or compatible database
-   Docker & Docker Compose (if using Laravel Sail)

### Local Development Setup

This project uses Laravel Sail, a light-weight command-line interface for interacting with Laravel's default Docker development environment. Instead of using the `php artisan` command directly, you should use the `sail` command which runs commands within the Docker container.

1. **Clone the repository and install dependencies**:

    ```bash
    composer install
    npm install
    ```

2. **Environment Configuration**:

    - Copy `.env.example` to `.env`
    - Configure your database connection in `.env`
    - Set up AWS services (if needed):
        - AWS SES for email (MAIL_MAILER=ses)
        - AWS S3 for file storage (AWS\_\* variables)
        - CloudFront for CDN (CLOUDFRONT_URL)
    - Generate application key:
        ```bash
        sail artisan key:generate
        ```

3. **Database Setup**:

    ```bash
    sail artisan migrate
    sail artisan db:seed # Optional, if you want sample data
    ```

4. **Start the development server**:

    ```bash
    # Start Sail:
    sail up -d

    # In another terminal:
    npm run dev
    ```

### Docker Setup

The project includes Docker configuration via `docker-compose.yml`:

```bash
docker-compose up -d
```

## Testing Information

### Test Configuration

-   Tests use a separate database named `testing` (configured in `phpunit.xml`)
-   The testing environment uses in-memory cache, session, and mail drivers

### Running Tests

**Run all tests**:

```bash
sail test
```

**Run specific test suite**:

```bash
sail test --testsuite=Unit
sail test --testsuite=Feature
```

**Run specific test file**:

```bash
sail test tests/Unit/StringHelperTest.php
```

### Creating New Tests

#### Unit Tests

Unit tests should be placed in the `tests/Unit` directory and extend `PHPUnit\Framework\TestCase`:

```php
<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class ExampleTest extends TestCase
{
    public function test_example()
    {
        $this->assertTrue(true);
    }
}
```

#### Feature Tests

Feature tests should be placed in the `tests/Feature` directory and extend `Tests\TestCase`:

```php
<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExampleFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_example()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
                         ->get('/dashboard');

        $response->assertStatus(200);
    }
}
```

#### Testing Inertia.js Components

For testing Inertia.js responses, use the `assertInertia` method:

```php
$response->assertInertia(
    fn (Assert $page) => $page
        ->component('Dashboard/Index')
        ->has('settings')
);
```

## Additional Development Information

### Code Style

-   PHP code follows PSR-12 coding standards
-   JavaScript/Vue code uses ESLint and Prettier for formatting
-   Run linting:

    ```bash
    # PHP (Laravel Pint)
    sail pint

    # JavaScript
    npm run lint
    npm run format
    ```

### Frontend Architecture

-   The project uses Vue 3 with Inertia.js for the frontend
-   Tailwind CSS is used for styling
-   Key frontend dependencies:
    -   Vuelidate for form validation
    -   Tiptap for rich text editing
    -   Vue Multiselect for select inputs

### Backend Features

-   Spatie Permission package for role/permission management
-   Intervention Image for image manipulation
-   Laravel FFMpeg for video processing
-   AWS S3 integration for file storage

### Common Development Tasks

**Creating a new Inertia page**:

1. Create a Vue component in `resources/js/Pages`
2. Create a controller method that returns an Inertia response:
    ```php
    return Inertia::render('YourComponent', [
        'data' => $data
    ]);
    ```
3. Add a route in `routes/web.php`

**Working with permissions**:

```php
// Assign permissions to a user
$user->givePermissionTo('edit pages');

// Check permissions
if ($user->can('edit pages')) {
    // ...
}

// In routes or controllers
Route::middleware('can:edit pages')->get('/pages/{page}/edit', ...);
```
