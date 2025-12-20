<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommentReaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'comment_id',
        'user_id',
        'emoji',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Allowed emoji reactions.
     */
    public const ALLOWED_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '💩'];

    /**
     * Get the comment that this reaction belongs to.
     */
    public function comment(): BelongsTo
    {
        return $this->belongsTo(MessageComment::class, 'comment_id');
    }

    /**
     * Get the user that created this reaction.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Check if an emoji is allowed.
     */
    public static function isAllowedEmoji(string $emoji): bool
    {
        return in_array($emoji, self::ALLOWED_EMOJIS, true);
    }
}
