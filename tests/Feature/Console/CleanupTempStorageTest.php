<?php

namespace Tests\Feature\Console;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CleanupTempStorageTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_deletes_stale_temp_files_and_keeps_recent_ones(): void
    {
        Storage::fake('local');

        $stale = $this->makeTempFile('temp/stale-upload.mp4', now()->subDays(5)->getTimestamp());
        $staleTmp = $this->makeTempFile('tmp/sound-m4a-old.m4a', now()->subDays(5)->getTimestamp());
        $recent = $this->makeTempFile('temp/in-flight-upload.mp4', now()->subMinutes(5)->getTimestamp());

        $this->artisan('storage:cleanup-temp')->assertSuccessful();

        $this->assertFileDoesNotExist($stale);
        $this->assertFileDoesNotExist($staleTmp);
        $this->assertFileExists($recent);
    }

    public function test_it_cleans_nested_directories_and_prunes_them_when_emptied(): void
    {
        Storage::fake('local');

        $staleSound = $this->makeTempFile('tmp/sounds/old-upload.mp3', now()->subDays(5)->getTimestamp());
        $staleCollage = $this->makeTempFile('temp/collage-14/page-1.jpg', now()->subDays(5)->getTimestamp());

        $collageDir = dirname($staleCollage);
        touch($collageDir, now()->subDays(5)->getTimestamp());

        $this->artisan('storage:cleanup-temp')->assertSuccessful();

        $this->assertFileDoesNotExist($staleSound);
        $this->assertFileDoesNotExist($staleCollage);
        $this->assertDirectoryDoesNotExist($collageDir);
    }

    public function test_it_keeps_directories_that_still_hold_recent_files(): void
    {
        Storage::fake('local');

        $stale = $this->makeTempFile('temp/collage-9/old.jpg', now()->subDays(5)->getTimestamp());
        $recent = $this->makeTempFile('temp/collage-9/new.jpg', now()->subMinutes(2)->getTimestamp());

        touch(dirname($stale), now()->subDays(5)->getTimestamp());

        $this->artisan('storage:cleanup-temp')->assertSuccessful();

        $this->assertFileDoesNotExist($stale);
        $this->assertFileExists($recent);
        $this->assertDirectoryExists(dirname($recent));
    }

    public function test_default_cutoff_keeps_uploads_staged_for_pending_jobs(): void
    {
        Storage::fake('local');

        // A worker outage can leave a staged upload sitting for a day or two; the
        // default cutoff must outlast that or the upload is lost.
        $staged = $this->makeTempFile('temp/staged-upload.mp4', now()->subHours(36)->getTimestamp());

        $this->artisan('storage:cleanup-temp')->assertSuccessful();

        $this->assertFileExists($staged);
    }

    public function test_hours_option_controls_the_cutoff(): void
    {
        Storage::fake('local');

        $file = $this->makeTempFile('temp/upload.mp4', now()->subHours(3)->getTimestamp());

        $this->artisan('storage:cleanup-temp', ['--hours' => 6])->assertSuccessful();
        $this->assertFileExists($file);

        $this->artisan('storage:cleanup-temp', ['--hours' => 2])->assertSuccessful();
        $this->assertFileDoesNotExist($file);
    }

    public function test_dry_run_reports_without_deleting(): void
    {
        Storage::fake('local');

        $file = $this->makeTempFile('temp/upload.mp4', now()->subDays(2)->getTimestamp());

        $this->artisan('storage:cleanup-temp', ['--dry-run' => true])->assertSuccessful();

        $this->assertFileExists($file);
    }

    public function test_it_succeeds_when_temp_directories_do_not_exist(): void
    {
        Storage::fake('local');

        $this->artisan('storage:cleanup-temp')->assertSuccessful();
    }

    private function makeTempFile(string $relativePath, int $modifiedAt): string
    {
        Storage::disk('local')->put($relativePath, 'x');

        $absolutePath = Storage::disk('local')->path($relativePath);
        touch($absolutePath, $modifiedAt);

        return $absolutePath;
    }
}
