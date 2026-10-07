<?php

namespace App\Jobs;

use App\Exceptions\AiVoiceBudgetExceeded;
use App\Services\AiVoiceService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

/**
 * Makes an AI voice clip ahead of time, so the first person to hear it
 * gets it from the cache instead of waiting for the provider.
 */
class GenerateAiVoiceClip implements ShouldQueue
{
    use Queueable;

    // A timed-out request may already have been billed, so a retry could
    // pay for the same clip twice. A clip that fails is made on first play.
    public int $tries = 1;

    public function __construct(
        public string $text,
        public string $locale,
        public ?string $voice = null,
    ) {}

    public function handle(AiVoiceService $service): void
    {
        // Empty or too long for one clip (a long page): it plays in the
        // device voice, so there is nothing to make.
        if (AiVoiceService::keyFor($this->text, $this->locale, $this->voice) === null) {
            return;
        }

        try {
            $service->clipFor($this->text, $this->locale, $this->voice, ahead: true);
        } catch (AiVoiceBudgetExceeded) {
            Log::warning('AI voice prewarm skipped: daily character limit reached', [
                'locale' => $this->locale,
                'characters' => mb_strlen(AiVoiceService::normalize($this->text)),
            ]);
        }
    }
}
