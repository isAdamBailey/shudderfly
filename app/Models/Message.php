<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class Message extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'message',
        'page_id',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        // Delete related notifications when a message is deleted
        // Note: This only fires for single model deletions, not bulk deletes
        static::deleting(function ($message) {
            $driver = DB::getDriverName();
            if ($driver === 'mysql' || $driver === 'mariadb') {
                DB::table('notifications')
                    ->where('type', 'App\\Notifications\\UserTagged')
                    ->whereRaw("JSON_EXTRACT(data, '$.message_id') = ?", [$message->id])
                    ->delete();
            } elseif ($driver === 'pgsql') {
                DB::table('notifications')
                    ->where('type', 'App\\Notifications\\UserTagged')
                    ->whereRaw("data->>'message_id' = ?", [(string) $message->id])
                    ->delete();
            } else {
                // SQLite or fallback
                DB::table('notifications')
                    ->where('type', 'App\\Notifications\\UserTagged')
                    ->whereJsonContains('data->message_id', $message->id)
                    ->delete();
            }
        });
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

    /**
     * Parse tagged usernames from message content.
     * Returns array of usernames (without @ symbol).
     * Extracts the name after @ and looks it up directly.
     */
    public function getTaggedUsernames(): array
    {
        // Extract all @mentions - match @ followed by word characters and spaces until punctuation/end
        // Try to match full usernames first, then partial matches
        $allUserNames = User::pluck('name')->toArray();

        if (empty($allUserNames)) {
            return [];
        }

        $foundUsernames = [];

        // First, try to match full usernames (with spaces)
        // Pattern matches @username followed by:
        // - whitespace (\s)
        // - end of string ($)
        // - any non-word, non-whitespace character ([^\w\s]) - handles punctuation like , . ! ? etc.
        foreach ($allUserNames as $userName) {
            $pattern = '/@'.preg_quote($userName, '/').'(?=\s|$|[^\w\s])/i';
            if (preg_match($pattern, $this->message)) {
                $foundUsernames[] = $userName;
            }
        }

        // Then, extract simple @mentions (single word) and look them up
        preg_match_all('/@([a-zA-Z0-9_]+)(?=\s|$|[^\w])/', $this->message, $matches);
        $simpleMentions = $matches[1] ?? [];

        foreach ($simpleMentions as $mention) {
            // Check if this mention is already covered by a full username match
            $alreadyMatched = false;
            foreach ($foundUsernames as $found) {
                if (stripos($found, $mention) === 0) {
                    $alreadyMatched = true;
                    break;
                }
            }

            if (! $alreadyMatched) {
                // Look up the mention directly - if it matches a user name exactly, use it
                $user = User::whereRaw('LOWER(name) = LOWER(?)', [$mention])->first();
                if ($user) {
                    $foundUsernames[] = $user->name;
                }
            }
        }

        return array_unique($foundUsernames);
    }

    /**
     * Get tagged user IDs from message content.
     * Returns array of user IDs by looking up the matched name directly.
     */
    public function getTaggedUserIds(): array
    {
        $usernames = $this->getTaggedUsernames();

        if (empty($usernames)) {
            return [];
        }

        // Get user IDs by looking up the name directly (case-insensitive)
        $userIds = [];
        foreach ($usernames as $username) {
            $user = User::whereRaw('LOWER(name) = LOWER(?)', [trim($username)])->first();
            if ($user) {
                $userIds[] = $user->id;
            }
        }

        return array_unique($userIds);
    }
}
