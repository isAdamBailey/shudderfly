<?php

namespace Tests\Unit;

use App\Models\CommentReaction;
use App\Models\MessageComment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CommentReactionTest extends TestCase
{
    use RefreshDatabase;

    public function test_comment_reaction_belongs_to_comment(): void
    {
        $comment = MessageComment::factory()->create();
        $reaction = CommentReaction::factory()->create(['comment_id' => $comment->id]);

        $this->assertInstanceOf(MessageComment::class, $reaction->comment);
        $this->assertEquals($comment->id, $reaction->comment->id);
    }

    public function test_comment_reaction_belongs_to_user(): void
    {
        $user = User::factory()->create();
        $reaction = CommentReaction::factory()->create(['user_id' => $user->id]);

        $this->assertInstanceOf(User::class, $reaction->user);
        $this->assertEquals($user->id, $reaction->user->id);
    }

    public function test_is_allowed_emoji_returns_true_for_allowed_emojis(): void
    {
        $allowedEmojis = CommentReaction::ALLOWED_EMOJIS;

        foreach ($allowedEmojis as $emoji) {
            $this->assertTrue(CommentReaction::isAllowedEmoji($emoji));
        }
    }

    public function test_is_allowed_emoji_returns_false_for_invalid_emojis(): void
    {
        $invalidEmojis = ['🚀', '🎉', '🔥', 'test', ''];

        foreach ($invalidEmojis as $emoji) {
            $this->assertFalse(CommentReaction::isAllowedEmoji($emoji));
        }
    }

    public function test_allowed_emojis_constant_contains_expected_values(): void
    {
        $expectedEmojis = ['👍', '❤️', '😂', '😮', '😢', '💩'];

        $this->assertEquals($expectedEmojis, CommentReaction::ALLOWED_EMOJIS);
    }

    public function test_reaction_is_fillable(): void
    {
        $comment = MessageComment::factory()->create();
        $user = User::factory()->create();

        $reaction = CommentReaction::create([
            'comment_id' => $comment->id,
            'user_id' => $user->id,
            'emoji' => '👍',
        ]);

        $this->assertEquals($comment->id, $reaction->comment_id);
        $this->assertEquals($user->id, $reaction->user_id);
        $this->assertEquals('👍', $reaction->emoji);
    }

    public function test_reaction_timestamps_are_casted(): void
    {
        $reaction = CommentReaction::factory()->create();

        $this->assertInstanceOf(\Carbon\Carbon::class, $reaction->created_at);
        $this->assertInstanceOf(\Carbon\Carbon::class, $reaction->updated_at);
    }

    public function test_unique_constraint_exists_on_comment_and_user(): void
    {
        $comment = MessageComment::factory()->create();
        $user = User::factory()->create();

        // Create first reaction
        CommentReaction::create([
            'comment_id' => $comment->id,
            'user_id' => $user->id,
            'emoji' => '👍',
        ]);

        // Verify we can't create a duplicate reaction directly
        // (The application handles this by updating, but the constraint exists)
        $this->expectException(\Illuminate\Database\QueryException::class);

        CommentReaction::create([
            'comment_id' => $comment->id,
            'user_id' => $user->id,
            'emoji' => '❤️', // Same user/comment combination should violate unique constraint
        ]);
    }
}
