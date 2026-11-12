<?php

namespace App\Support;

use App\Models\Message;
use App\Models\SiteSetting;
use Illuminate\Http\Request;

/** Gate and upload rules for voice clips recorded in the Message Builder. */
class VoiceMessages
{
    public const SETTING_KEY = 'voice_messages_enabled';

    /**
     * What MediaRecorder hands over: WebM/Opus (Chrome, Firefox), MP4/AAC
     * (Safari), Ogg/Opus (older Firefox). WebM and MP4 sniff as video/*.
     */
    private const MIMES = [
        'audio/webm',
        'video/webm',
        'audio/mp4',
        'video/mp4',
        'audio/x-m4a',
        'audio/aac',
        'audio/ogg',
        'application/ogg',
    ];

    public static function enabled(): bool
    {
        return (bool) SiteSetting::where('key', self::SETTING_KEY)->first()?->value;
    }

    /**
     * Rules for a request's optional voice_clip and its voice_clip_duration
     * (a message's or a comment's).
     *
     * @return array<string, array<int, mixed>>
     */
    public static function rules(): array
    {
        return [
            'voice_clip' => [
                'nullable',
                // Only runs when a clip was sent, so no settings query otherwise.
                function (string $attribute, mixed $value, \Closure $fail) {
                    if (! self::enabled()) {
                        $fail(__('messages.voice.disabled'));
                    }
                },
                'file',
                'max:'.(int) config('voice_messages.max_kilobytes'),
                'mimetypes:'.implode(',', self::MIMES),
            ],
            // The browser stops at the cap; this catches one that didn't.
            // StoreVoiceClip also trims to it, whatever this claims.
            'voice_clip_duration' => ['required_with:voice_clip', 'nullable', 'numeric', 'min:0', 'max:'.self::maxSeconds()],
        ];
    }

    /** @return array<string, string> */
    public static function messages(): array
    {
        return [
            'voice_clip_duration.max' => __('messages.voice.too_long', ['seconds' => self::maxSeconds()]),
        ];
    }

    /**
     * Keeps a validated request's clip on the local disk for StoreVoiceClip.
     * Called before the message or comment exists, so a failed write can't
     * leave it stuck "processing" with no job to finish it.
     */
    public static function storeUpload(Request $request): ?string
    {
        return $request->file('voice_clip')?->store('tmp/voice-clips', 'local') ?: null;
    }

    /**
     * The clip fields a new message or comment starts with: processing, at
     * the browser's measure until StoreVoiceClip probes the real one.
     *
     * @return array<string, mixed>
     */
    public static function pendingAttributes(?string $path, mixed $duration): array
    {
        return [
            'voice_clip_status' => $path ? Message::VOICE_CLIP_PROCESSING : null,
            'voice_clip_duration' => $path ? (int) ceil((float) $duration) : null,
        ];
    }

    private static function maxSeconds(): int
    {
        return (int) config('voice_messages.max_seconds');
    }
}
