<?php

namespace App\Jobs;

use App\Models\Sound;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Process\Process;
use Throwable;

class StoreSoundAudio implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    public int $timeout = 120;

    public function __construct(
        protected string $localRelativePath,
        protected string $title,
        protected ?string $emoji
    ) {}

    public function handle(): void
    {
        $disk = Storage::disk('local');

        if (! $disk->exists($this->localRelativePath)) {
            Log::error('StoreSoundAudio: source file missing', [
                'path' => $this->localRelativePath,
            ]);
            $this->fail(new \RuntimeException('Sound upload file was not found for processing.'));

            return;
        }

        $inputPath = storage_path('app/'.$this->localRelativePath);
        $tempDir = storage_path('app/tmp');
        if (! is_dir($tempDir)) {
            mkdir($tempDir, 0755, true);
        }

        $outputPath = $tempDir.'/sound-m4a-'.uniqid('', true).'.m4a';

        $ffmpegBinary = config('laravel-ffmpeg.ffmpeg.binaries', 'ffmpeg');

        $process = new Process([
            $ffmpegBinary,
            '-nostdin',
            '-hide_banner',
            '-loglevel',
            'error',
            '-i',
            $inputPath,
            '-vn',
            '-c:a',
            'aac',
            '-b:a',
            '128k',
            '-movflags',
            '+faststart',
            '-y',
            $outputPath,
        ]);
        $process->setTimeout($this->timeout);

        try {
            $process->run();
        } catch (Throwable $e) {
            $this->cleanupLocal($disk, $outputPath);
            Log::error('StoreSoundAudio: ffmpeg exception', [
                'message' => $e->getMessage(),
                'path' => $this->localRelativePath,
            ]);
            throw $e;
        }

        if (! $process->isSuccessful() || ! is_file($outputPath)) {
            $err = $process->getErrorOutput();
            $this->cleanupLocal($disk, $outputPath);
            Log::error('StoreSoundAudio: ffmpeg failed', [
                'exit' => $process->getExitCode(),
                'error' => $err,
                'path' => $this->localRelativePath,
            ]);
            $this->fail(new \RuntimeException('Could not convert audio to M4A. Check the file format and try again.'));

            return;
        }

        $s3Key = 'sounds/'.str()->uuid().'.m4a';

        try {
            Storage::disk('s3')->put($s3Key, file_get_contents($outputPath));
            Storage::disk('s3')->setVisibility($s3Key, 'public');
        } finally {
            $this->cleanupLocal($disk, $outputPath);
        }

        Sound::create([
            'title' => $this->title,
            'emoji' => $this->emoji,
            'audio_path' => $s3Key,
        ]);
    }

    public function failed(?Throwable $exception): void
    {
        Storage::disk('local')->delete($this->localRelativePath);
    }

    protected function cleanupLocal($localDisk, string $outputPath): void
    {
        $localDisk->delete($this->localRelativePath);
        if (is_file($outputPath)) {
            @unlink($outputPath);
        }
    }
}
