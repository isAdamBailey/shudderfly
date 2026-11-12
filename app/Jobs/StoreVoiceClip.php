<?php

namespace App\Jobs;

use App\Models\Message;
use App\Models\MessageComment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Process\Process;
use Throwable;

/**
 * Turns a voice clip recorded in the Message Builder (WebM/Opus, or MP4/AAC
 * from Safari) into an M4A on S3, then marks its message or comment ready. Modelled on
 * StoreSoundAudio, but always transcodes: that also trims anything past the
 * cap, whatever the browser claimed.
 */
class StoreVoiceClip implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    public int $timeout = 120;

    /** @var class-string<Message|MessageComment> */
    protected string $ownerClass;

    protected int $ownerId;

    /**
     * Kept as class and id, not the model, so one deleted while this waits
     * in the queue still runs (and drops the upload) instead of failing.
     */
    public function __construct(
        Message|MessageComment $owner,
        protected string $localRelativePath,
    ) {
        $this->ownerClass = $owner::class;
        $this->ownerId = $owner->getKey();
    }

    protected function owner(): Message|MessageComment|null
    {
        return $this->ownerClass::find($this->ownerId);
    }

    public function handle(): void
    {
        $disk = Storage::disk('local');
        $owner = $this->owner();

        // Deleted while it waited in the queue: nothing to attach it to.
        // Already ready: a retry after the broadcast failed, done already.
        if (! $owner || $owner->voice_clip_status === $owner::VOICE_CLIP_READY) {
            $disk->delete($this->localRelativePath);

            return;
        }

        if (! $disk->exists($this->localRelativePath)) {
            Log::error('StoreVoiceClip: source file missing', ['path' => $this->localRelativePath]);
            $this->fail(new \RuntimeException('Voice clip upload was not found for processing.'));

            return;
        }

        $tempDir = storage_path('app/tmp');
        if (! is_dir($tempDir)) {
            mkdir($tempDir, 0755, true);
        }
        $outputPath = $tempDir.'/voice-clip-'.uniqid('', true).'.m4a';

        try {
            $this->transcode($disk->path($this->localRelativePath), $outputPath);

            $s3Key = 'voice-clips/'.str()->uuid().'.m4a';
            $stream = fopen($outputPath, 'r');
            try {
                Storage::disk('s3')->put($s3Key, $stream, 'public');
            } finally {
                fclose($stream);
            }

            $attached = $this->ownerClass::whereKey($owner->getKey())->update([
                'voice_clip_path' => $s3Key,
                'voice_clip_duration' => $this->durationOf($outputPath) ?? $owner->voice_clip_duration,
                'voice_clip_status' => $owner::VOICE_CLIP_READY,
            ]);

            // Deleted while it was transcoding: its deleting hook had no
            // file to remove yet, so remove this one.
            if (! $attached) {
                Storage::disk('s3')->delete($s3Key);
            }
        } finally {
            if (is_file($outputPath)) {
                @unlink($outputPath);
            }
        }

        $disk->delete($this->localRelativePath);

        if ($attached) {
            event($owner->refresh()->voiceClipUpdatedEvent());
        }
    }

    public function failed(?Throwable $exception): void
    {
        Storage::disk('local')->delete($this->localRelativePath);

        $owner = $this->owner();
        if ($owner) {
            $owner->update(['voice_clip_status' => $owner::VOICE_CLIP_FAILED]);
            event($owner->voiceClipUpdatedEvent());
        }
    }

    protected function transcode(string $inputPath, string $outputPath): void
    {
        $process = new Process([
            config('laravel-ffmpeg.ffmpeg.binaries', 'ffmpeg'),
            '-nostdin',
            '-hide_banner',
            '-loglevel',
            'error',
            '-i',
            $inputPath,
            '-t',
            (string) config('voice_messages.max_seconds'),
            '-vn',
            '-c:a',
            'aac',
            '-b:a',
            '96k',
            '-movflags',
            '+faststart',
            '-y',
            $outputPath,
        ]);
        $process->setTimeout($this->timeout);
        $process->run();

        if (! $process->isSuccessful() || ! is_file($outputPath)) {
            Log::error('StoreVoiceClip: ffmpeg failed', [
                'exit' => $process->getExitCode(),
                'error' => $process->getErrorOutput(),
                'path' => $this->localRelativePath,
            ]);

            throw new \RuntimeException('Could not convert the voice clip to M4A.');
        }
    }

    /** Whole seconds, rounded up; null if ffprobe can't tell. */
    protected function durationOf(string $path): ?int
    {
        $process = new Process([
            config('laravel-ffmpeg.ffprobe.binaries', 'ffprobe'),
            '-v',
            'error',
            '-show_entries',
            'format=duration',
            '-of',
            'default=noprint_wrappers=1:nokey=1',
            $path,
        ]);
        $process->setTimeout(30);
        $process->run();

        $seconds = trim($process->getOutput());

        return $process->isSuccessful() && is_numeric($seconds)
            ? (int) min(ceil((float) $seconds), (int) config('voice_messages.max_seconds'))
            : null;
    }
}
