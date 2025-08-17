<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

class CacheStatus extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'cache:status {--store= : The cache store to test (defaults to app default)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Show the current cache driver and verify it can write/read values and support atomic add (throttle)';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $store = $this->option('store');
        $default = config('cache.default');

        $storeInstance = $store ? Cache::store($store) : Cache::store($default);
        $storeName = $store ?: $default;

        $this->info('Cache status');
        $this->line('-----------------------------');
        $this->line('APP_ENV:        '.(config('app.env') ?? env('APP_ENV', 'unknown')));
        $this->line('Default driver: '.$default);
        $this->line('Testing store:  '.$storeName);

        // Warn about array driver being non-persistent across requests
        if ($storeName === 'array') {
            $this->warn("Warning: 'array' driver is in-memory and resets every request. It's fine for tests but not persistent.");
        }

        // Perform a write/read test
        $key = 'cache_status_probe_'.uniqid('', true);
        $value = ['ok' => true, 'time' => now()->toIso8601String()];

        try {
            $storeInstance->put($key, $value, now()->addMinutes(1));
            $readBack = $storeInstance->get($key);
        } catch (\Throwable $e) {
            $this->error('Cache write/read threw an exception: '.$e->getMessage());
            $this->line('Ensure your cache driver is configured and the backend service is reachable.');

            return self::FAILURE;
        }

        if ($readBack === null) {
            $this->error('Cache read returned null. The store may not be persistent or is misconfigured.');

            return self::FAILURE;
        }

        $this->info('Cache write/read test: PASS');
        $this->line('Stored value: '.json_encode($readBack));

        // Test atomic add (what our throttling relies on)
        $throttleKey = 'cache_status_add_'.uniqid('', true);
        $ttlSeconds = 5;
        try {
            $firstAdd = $storeInstance->add($throttleKey, 1, now()->addSeconds($ttlSeconds));
            $secondAdd = $storeInstance->add($throttleKey, 1, now()->addSeconds($ttlSeconds));
        } catch (\Throwable $e) {
            $this->error('Cache::add test threw an exception: '.$e->getMessage());
            $this->line('This store may not support atomic adds required for throttling.');
            // Best-effort cleanup
            try {
                $storeInstance->forget($throttleKey);
            } catch (\Throwable $e2) {
            }

            return self::FAILURE;
        }

        if ($firstAdd && ! $secondAdd) {
            $this->info('Atomic add test: PASS (first add=true, second add=false)');
        } else {
            $this->warn('Atomic add test: UNEXPECTED (first add='.var_export($firstAdd, true).', second add='.var_export($secondAdd, true).')');
            $this->line('If both were true, this store does not enforce uniqueness correctly.');
        }

        // Cleanup keys
        try {
            $storeInstance->forget($key);
            $storeInstance->forget($throttleKey);
        } catch (\Throwable $e) {
            // ignore
        }

        // Helpful guidance for Forge
        $this->line('');
        $this->line('Tips:');
        $this->line('- On Forge, prefer CACHE_DRIVER=redis with Redis installed/enabled, or use CACHE_DRIVER=file.');
        $this->line('- Run: php artisan cache:status to verify after deploy.');

        return self::SUCCESS;
    }
}
