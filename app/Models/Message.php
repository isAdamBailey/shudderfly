<?php

namespace App\Models;

use App\Models\Traits\HasUserTagging;
use App\Support\GameShareMessage;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class Message extends Model
{
    use HasFactory, HasUserTagging;

    protected $fillable = [
        'user_id',
        'message',
        'page_id',
        'song_id',
        'movie_tmdb_id',
        'movie_title',
        'movie_image_path',
        'book_id',
        'sound_id',
        'collage_id',
        'voice_clip_path',
        'voice_clip_duration',
        'voice_clip_status',
    ];

    /** A voice clip is being transcoded and isn't playable yet. */
    public const VOICE_CLIP_PROCESSING = 'processing';

    public const VOICE_CLIP_READY = 'ready';

    /** Transcoding gave up; the clip will never play. */
    public const VOICE_CLIP_FAILED = 'failed';

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'voice_clip_duration' => 'integer',
    ];

    protected $hidden = ['voice_clip_path'];

    protected $appends = ['voice_clip_url'];

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        static::deleting(function ($message) {
            if ($path = $message->getRawOriginal('voice_clip_path')) {
                Storage::disk('s3')->delete($path);
            }

            $messageId = $message->id;

            DB::table('notifications')
                ->where(function ($query) use ($messageId) {
                    $query->where('type', 'App\\Notifications\\UserTagged')
                        ->whereRaw("JSON_EXTRACT(data, '$.message_id') = ?", [$messageId]);
                })
                ->orWhere(function ($query) use ($messageId) {
                    $query->where('type', 'App\\Notifications\\MessageCommented')
                        ->whereRaw("JSON_EXTRACT(data, '$.message_id') = ?", [$messageId]);
                })
                ->delete();
        });
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
     * The voice clip fields every client payload carries (the timeline's
     * props, MessageCreated, MessageVoiceClipUpdated).
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

    /**
     * The words a notification or digest shows for this message: its text, or
     * "{name} sent a voice message" for a voice-only message.
     */
    public function previewText(): string
    {
        $text = GameShareMessage::stripSlugMarker($this->message);

        if ($text === '' && $this->voice_clip_status) {
            return __('messages.voice.sent', ['name' => $this->user?->name ?? '']);
        }

        return $text;
    }

    /**
     * Get the user that owns the message.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the reactions for this message.
     */
    public function reactions(): HasMany
    {
        return $this->hasMany(MessageReaction::class);
    }

    /**
     * Get the comments for this message.
     */
    public function comments(): HasMany
    {
        return $this->hasMany(MessageComment::class);
    }

    /**
     * Get the page that this message shares (if any).
     */
    public function page(): BelongsTo
    {
        return $this->belongsTo(Page::class);
    }

    /**
     * Get the song that this message shares (if any).
     */
    public function song(): BelongsTo
    {
        return $this->belongsTo(Song::class);
    }

    /**
     * Get the book that this message shares (if any).
     */
    public function book(): BelongsTo
    {
        return $this->belongsTo(Book::class);
    }

    /**
     * Get the sound that this message shares (if any).
     */
    public function sound(): BelongsTo
    {
        return $this->belongsTo(Sound::class);
    }

    /**
     * Get the collage that this message shares (if any).
     */
    public function collage(): BelongsTo
    {
        return $this->belongsTo(Collage::class);
    }

    /**
     * Get reactions grouped by emoji with user lists.
     *
     * @return array<string, array{count: int, users: array}>
     */
    public function getGroupedReactions(): array
    {
        // Use already-loaded relations if available to avoid N+1 queries
        if ($this->relationLoaded('reactions')) {
            $reactions = $this->reactions;
            // Ensure user relation is loaded on each reaction
            $reactions->loadMissing('user');
        } else {
            $reactions = $this->reactions()->with('user')->get();
        }

        $grouped = [];

        foreach ($reactions as $reaction) {
            $emoji = $reaction->emoji;
            if (! isset($grouped[$emoji])) {
                $grouped[$emoji] = [
                    'count' => 0,
                    'users' => [],
                ];
            }
            $grouped[$emoji]['count']++;
            $grouped[$emoji]['users'][] = [
                'id' => $reaction->user->id,
                'name' => $reaction->user->name,
            ];
        }

        return $grouped;
    }

    /**
     * Scope a query to only include recent messages.
     */
    public function scopeRecent($query)
    {
        return $query->orderBy('created_at', 'desc');
    }

    /**
     * Scope a query to only include messages within the retention period.
     */
    public function scopeWithinRetentionPeriod($query)
    {
        $rawRetention = SiteSetting::where('key', 'messaging_retention_days')->value('value');
        $retentionDays = (is_numeric($rawRetention) && (int) $rawRetention > 0) ? (int) $rawRetention : 30;

        return $query->where('created_at', '>=', now()->subDays($retentionDays));
    }
}
