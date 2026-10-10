<?php

namespace App\Jobs;

use App\Exceptions\AiVoiceBudgetExceeded;
use App\Exceptions\AiVoicePaused;
use App\Exceptions\AiVoiceUnavailable;
use App\Services\AiVoiceService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

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

    /**
     * False when this clip was not made. A queued run still succeeds so a
     * provider timeout does not log a stack trace or fill failed_jobs.
     */
    public function handle(AiVoiceService $service): bool
    {
        // Empty or too long for one clip (a long page): it plays in the
        // device voice, so there is nothing to make.
        if (AiVoiceService::keyFor($this->text, $this->locale, $this->voice) === null) {
            return true;
        }

        try {
            $service->clipFor($this->text, $this->locale, $this->voice, ahead: true);

            return true;
        } catch (AiVoicePaused|AiVoiceBudgetExceeded) {
            return true;
        } catch (AiVoiceUnavailable) {
            return false;
        }
    }
}
