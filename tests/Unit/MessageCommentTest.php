<?php

namespace Tests\Unit;

use App\Models\CommentReaction;
use App\Models\Message;
use App\Models\MessageComment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MessageCommentTest extends TestCase
{
    use RefreshDatabase;

    public function test_message_comment_belongs_to_message(): void
    {
        $message = Message::factory()->create();
        $comment = MessageComment::factory()->create(['message_id' => $message->id]);

        $this->assertInstanceOf(Message::class, $comment->message);
        $this->assertEquals($message->id, $comment->message->id);
    }

    public function test_message_comment_belongs_to_user(): void
    {
        $user = User::factory()->create();
        $comment = MessageComment::factory()->create(['user_id' => $user->id]);

        $this->assertInstanceOf(User::class, $comment->user);
        $this->assertEquals($user->id, $comment->user->id);
    }

    public function test_message_comment_has_many_reactions(): void
    {
        $comment = MessageComment::factory()->create();
        $reaction1 = CommentReaction::factory()->create(['comment_id' => $comment->id]);
        $reaction2 = CommentReaction::factory()->create(['comment_id' => $comment->id]);

        $reactions = $comment->reactions;

        $this->assertCount(2, $reactions);
        $this->assertTrue($reactions->contains($reaction1));
        $this->assertTrue($reactions->contains($reaction2));
    }

    public function test_get_grouped_reactions_returns_correct_structure(): void
    {
        $user1 = User::factory()->create(['name' => 'Alice']);
        $user2 = User::factory()->create(['name' => 'Bob']);
        $user3 = User::factory()->create(['name' => 'Charlie']);
        $comment = MessageComment::factory()->create();

        // Add reactions
        CommentReaction::factory()->create([
            'comment_id' => $comment->id,
            'user_id' => $user1->id,
            'emoji' => '👍',
        ]);

        CommentReaction::factory()->create([
            'comment_id' => $comment->id,
            'user_id' => $user2->id,
            'emoji' => '👍',
        ]);

        CommentReaction::factory()->create([
            'comment_id' => $comment->id,
            'user_id' => $user3->id,
            'emoji' => '❤️',
        ]);

        $grouped = $comment->getGroupedReactions();

        $this->assertArrayHasKey('👍', $grouped);
        $this->assertEquals(2, $grouped['👍']['count']);
        $this->assertCount(2, $grouped['👍']['users']);
        $this->assertArrayHasKey('id', $grouped['👍']['users'][0]);
        $this->assertArrayHasKey('name', $grouped['👍']['users'][0]);

        $this->assertArrayHasKey('❤️', $grouped);
        $this->assertEquals(1, $grouped['❤️']['count']);
        $this->assertCount(1, $grouped['❤️']['users']);
    }

    public function test_get_grouped_reactions_returns_empty_array_when_no_reactions(): void
    {
        $comment = MessageComment::factory()->create();

        $grouped = $comment->getGroupedReactions();

        $this->assertIsArray($grouped);
        $this->assertEmpty($grouped);
    }

    public function test_get_grouped_reactions_uses_loaded_relations(): void
    {
        $user1 = User::factory()->create(['name' => 'Alice']);
        $user2 = User::factory()->create(['name' => 'Bob']);
        $comment = MessageComment::factory()->create();

        // Add reactions
        CommentReaction::factory()->create([
            'comment_id' => $comment->id,
            'user_id' => $user1->id,
            'emoji' => '👍',
        ]);

        CommentReaction::factory()->create([
            'comment_id' => $comment->id,
            'user_id' => $user2->id,
            'emoji' => '👍',
        ]);

        // Load relations first
        $comment->load('reactions.user');

        $grouped = $comment->getGroupedReactions();

        $this->assertArrayHasKey('👍', $grouped);
        $this->assertEquals(2, $grouped['👍']['count']);
        $this->assertCount(2, $grouped['👍']['users']);
    }

    public function test_comment_is_fillable(): void
    {
        $message = Message::factory()->create();
        $user = User::factory()->create();

        $comment = MessageComment::create([
            'message_id' => $message->id,
            'user_id' => $user->id,
            'comment' => 'Test comment',
        ]);

        $this->assertEquals($message->id, $comment->message_id);
        $this->assertEquals($user->id, $comment->user_id);
        $this->assertEquals('Test comment', $comment->comment);
    }

    public function test_comment_timestamps_are_casted(): void
    {
        $comment = MessageComment::factory()->create();

        $this->assertInstanceOf(\Carbon\Carbon::class, $comment->created_at);
        $this->assertInstanceOf(\Carbon\Carbon::class, $comment->updated_at);
    }
}
