<?php

namespace App\Models;

use App\Models\Traits\HasUserTagging;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class MessageComment extends Model
{
    use HasFactory, HasUserTagging;

    protected $fillable = [
        'message_id',
        'user_id',
        'comment',
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

        static::deleting(function ($comment) {
            $commentId = $comment->id;

            DB::table('notifications')
                ->where(function ($query) use ($commentId) {
                    $query->where('type', 'App\\Notifications\\UserTagged')
                        ->whereRaw("JSON_EXTRACT(data, '$.comment_id') = ?", [$commentId]);
                })
                ->orWhere(function ($query) use ($commentId) {
                    $query->where('type', 'App\\Notifications\\MessageCommented')
                        ->whereRaw("JSON_EXTRACT(data, '$.comment_id') = ?", [$commentId]);
                })
                ->delete();
        });
    }

    /**
     * Get the message that this comment belongs to.
     */
    public function message(): BelongsTo
    {
        return $this->belongsTo(Message::class);
    }

    /**
     * Get the user that created this comment.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the reactions for this comment.
     */
    public function reactions(): HasMany
    {
        return $this->hasMany(CommentReaction::class, 'comment_id');
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
}
