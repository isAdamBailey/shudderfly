<?php

namespace Tests;

use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Foundation\Vite;
use Spatie\Permission\PermissionRegistrar;

abstract class TestCase extends BaseTestCase
{
    use CreatesApplication;

    protected function setUp(): void
    {
        parent::setUp();

        // Clear permission cache
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // re-register all the roles and permissions (clears cache and reloads relations)
        $this->artisan('db:seed', ['--class' => RolesAndPermissionsSeeder::class]);

        // Handle missing Vite manifest entries in tests by creating fake entries
        $this->setupViteManifest();
    }

    protected function setupViteManifest(): void
    {
        $manifestPath = public_path('build/manifest.json');

        if (! file_exists($manifestPath)) {
            return;
        }

        $manifest = json_decode(file_get_contents($manifestPath), true) ?? [];
        $updated = false;

        // Ensure app.js exists
        if (! isset($manifest['resources/js/app.js'])) {
            $manifest['resources/js/app.js'] = [
                'file' => 'assets/app.js',
                'src' => 'resources/js/app.js',
                'isEntry' => true,
            ];
            $updated = true;
        }

        // Ensure all existing entries have 'src' key if they're file paths
        foreach ($manifest as $key => &$entry) {
            if (is_array($entry) && isset($entry['file']) && ! isset($entry['src']) && str_starts_with($key, 'resources/')) {
                $entry['src'] = $key;
                $updated = true;
            }
        }
        unset($entry);

        // Add any missing Page components dynamically requested
        $pagesPath = resource_path('js/Pages');
        if (is_dir($pagesPath)) {
            $iterator = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($pagesPath)
            );

            foreach ($iterator as $file) {
                if ($file->isFile() && $file->getExtension() === 'vue') {
                    $absolutePath = $file->getPathname();
                    $basePath = base_path();
                    // Normalize paths to handle Windows backslashes
                    $normalizedAbsolute = str_replace('\\', '/', $absolutePath);
                    $normalizedBase = str_replace('\\', '/', $basePath);
                    // Remove base path and normalize to forward slashes
                    $relativePath = str_replace($normalizedBase.'/', '', $normalizedAbsolute);
                    if (! isset($manifest[$relativePath])) {
                        $manifest[$relativePath] = [
                            'file' => 'assets/'.basename($relativePath, '.vue').'.js',
                            'src' => $relativePath,
                            'isEntry' => false,
                        ];
                        $updated = true;
                    }
                }
            }
        }

        // Write updated manifest only if changes were made
        if ($updated) {
            file_put_contents($manifestPath, json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        }
    }
}
