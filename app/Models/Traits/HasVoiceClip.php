<?php

namespace App\Models\Traits;

use App\Models\Sound;
use App\Support\GameShareMessage;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Support\Facades\Storage;

/**
 * One voice clip recorded in the Message Builder, on a Message or a
 * MessageComment: the clip fields, where it plays from, and removing its
 * audio when the model is deleted. StoreVoiceClip fills it in.
 */
trait HasVoiceClip
{
    /** A voice clip is being transcoded and isn't playable yet. */
    public const VOICE_CLIP_PROCESSING = 'processing';

    public const VOICE_CLIP_READY = 'ready';

    /** Transcoding gave up; the clip will never play. */
    public const VOICE_CLIP_FAILED = 'failed';

    /** The broadcast that tells the timeline this clip is ready or failed. */
    abstract public function voiceClipUpdatedEvent(): ShouldBroadcast;

    public static function bootHasVoiceClip(): void
    {
        static::deleting(function (self $model) {
            if ($path = $model->getRawOriginal('voice_clip_path')) {
                Storage::disk('s3')->delete($path);
            }
        });
    }

    public function initializeHasVoiceClip(): void
    {
        $this->mergeFillable(['voice_clip_path', 'voice_clip_duration', 'voice_clip_status']);
        $this->mergeCasts(['voice_clip_duration' => 'integer']);
        $this->makeHidden('voice_clip_path');
        $this->append('voice_clip_url');
    }

    /** Where a ready voice clip plays from; null until it's ready. */
    public function getVoiceClipUrlAttribute(): ?string
    {
        $path = $this->attributes['voice_clip_path'] ?? null;

        if (! $path || ($this->attributes['voice_clip_status'] ?? null) !== self::VOICE_CLIP_READY) {
            return null;
        }

        return Sound::urlForPath($path);
    }

    /**
     * Preview text for a notification or digest: the text without its slug
     * marker, or the voice-only wording (a translation key taking :name) when
     * there's no text but a clip.
     */
    protected function voicePreviewText(?string $text, string $voiceOnlyKey): string
    {
        $text = GameShareMessage::stripSlugMarker($text);

        if ($text === '' && $this->voice_clip_status) {
            return __($voiceOnlyKey, ['name' => $this->user?->name ?? '']);
        }

        return $text;
    }

    /**
     * The voice clip fields every client payload carries (the timeline's
     * props and the created / clip-updated broadcasts).
     *
     * @return array{voice_clip_status: ?string, voice_clip_duration: ?int, voice_clip_url: ?string}
     */
    public function voiceClipPayload(): array
    {
        return [
            'voice_clip_status' => $this->voice_clip_status,
            'voice_clip_duration' => $this->voice_clip_duration,
            'voice_clip_url' => $this->voice_clip_url,
        ];
    }
}
