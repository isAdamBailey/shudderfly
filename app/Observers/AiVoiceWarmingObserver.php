<?php

namespace App\Observers;

use App\Jobs\GenerateAiVoiceClip;
use App\Models\Book;
use App\Models\Page;
use App\Services\AiVoiceService;
use App\Support\AiVoice;
use App\Support\Content;
use App\Support\SpokenText;
use Illuminate\Database\Eloquent\Model;

/**
 * Makes AI voice clips for a book's or page's spoken text as soon as it is
 * written, so the first listener doesn't wait for the provider.
 */
class AiVoiceWarmingObserver
{
    /** The attributes each model reads aloud. */
    private const SPOKEN = [
        Book::class => ['title', 'excerpt'],
        Page::class => ['content'],
    ];

    /**
     * Runs as soon as the model is saved, even inside a transaction: by the
     * time it commits, getOriginal() already holds the new values and the
     * change can't be seen. The jobs wait for the commit instead, so a
     * rolled-back save warms nothing.
     */
    public function saved(Model $model): void
    {
        $texts = array_values(array_filter(
            array_map(fn (string $attribute) => $this->changedText($model, $attribute), self::SPOKEN[$model::class] ?? []),
        ));

        if ($texts === [] || ! AiVoice::enabled()) {
            return;
        }

        foreach (AiVoice::spokenLocales() as $locale) {
            foreach ($texts as $text) {
                GenerateAiVoiceClip::dispatch($text, $locale)->afterCommit();
            }
        }
    }

    /**
     * The attribute's spoken text when saving changed it and it fits in one
     * clip, otherwise null. Comparing what is said, not the raw HTML, skips
     * edits that only touch markup or spacing.
     */
    private function changedText(Model $model, string $attribute): ?string
    {
        // Most saves are read-count bumps: skip them before any text work.
        if (! $model->wasRecentlyCreated && ! $model->wasChanged($attribute)) {
            return null;
        }

        // What the editor leaves behind when nothing was typed, such as
        // "<p>&nbsp;</p>", has no words to say.
        if (Content::isBlank($model->getAttribute($attribute))) {
            return null;
        }

        // getOriginal() still holds the values from before this save, and
        // nothing at all for a new model.
        $text = AiVoiceService::normalize(SpokenText::fromHtml($model->getAttribute($attribute)));
        $before = AiVoiceService::normalize(SpokenText::fromHtml($model->getOriginal($attribute)));

        // Too long for one clip: it plays in the device voice.
        return AiVoiceService::fits($text) && $text !== $before ? $text : null;
    }
}
