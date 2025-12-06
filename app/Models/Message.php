<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Message extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'message',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the user that owns the message.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
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
        $retentionDays = (is_numeric($rawRetention) && (int)$rawRetention > 0) ? (int)$rawRetention : 30;

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
