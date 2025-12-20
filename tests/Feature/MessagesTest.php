<?php

namespace Tests\Feature;

use App\Models\CommentReaction;
use App\Models\Message;
use App\Models\MessageComment;
use App\Models\MessageReaction;
use App\Models\SiteSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class MessagesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Create or update messaging settings
        SiteSetting::updateOrCreate(
            ['key' => 'messaging_enabled'],
            [
                'value' => '1',
                'type' => 'boolean',
                'description' => 'Enable or disable the messaging system globally',
            ]
        );

        SiteSetting::updateOrCreate(
            ['key' => 'messaging_retention_days'],
            [
                'value' => '30',
                'type' => 'text',
                'description' => 'Number of days to retain messages before automatic cleanup',
            ]
        );
    }

    public function test_messages_index_page_requires_authentication(): void
    {
        $response = $this->get(route('messages.index'));

        $response->assertRedirect(route('login'));
    }

    public function test_messages_index_page_displays_when_messaging_enabled(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('messages.index'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Messages/Index')
            ->has('messages')
            ->where('messagingEnabled', true)
        );
    }

    public function test_messages_index_page_shows_disabled_message_when_messaging_disabled(): void
    {
        SiteSetting::where('key', 'messaging_enabled')->update(['value' => '0']);

        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('messages.index'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Messages/Index')
            ->where('messagingEnabled', false)
        );
    }

    public function test_messages_index_displays_messages_in_reverse_chronological_order(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $message1 = Message::factory()->create(['user_id' => $user->id, 'created_at' => now()->subHour()]);
        $message2 = Message::factory()->create(['user_id' => $user->id, 'created_at' => now()]);

        $response = $this->get(route('messages.index'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Messages/Index')
            ->has('messages.data', 2)
            ->where('messages.data.0.id', $message2->id)
            ->where('messages.data.1.id', $message1->id)
        );
    }

    public function test_messages_index_includes_users_list(): void
    {
        $user1 = User::factory()->create(['name' => 'Alice']);
        $user2 = User::factory()->create(['name' => 'Bob']);
        $this->actingAs($user1);

        $response = $this->get(route('messages.index'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Messages/Index')
            ->has('users', 2)
            ->where('users.0.name', 'Alice')
            ->where('users.1.name', 'Bob')
        );
    }

    public function test_authenticated_user_can_create_message(): void
    {
        Event::fake();
        Notification::fake();

        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->post(route('messages.store'), [
            'message' => 'Hello, world!',
        ]);

        $response->assertRedirect();

        $this->assertDatabaseHas('messages', [
            'user_id' => $user->id,
            'message' => 'Hello, world!',
        ]);

        Event::assertDispatched(\App\Events\MessageCreated::class);
    }

    public function test_message_creation_requires_authentication(): void
    {
        $response = $this->post(route('messages.store'), [
            'message' => 'Hello, world!',
        ]);

        $response->assertRedirect(route('login'));
    }

    public function test_message_creation_validates_required_message(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->post(route('messages.store'), []);

        $response->assertSessionHasErrors('message');
    }

    public function test_message_creation_validates_message_max_length(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->post(route('messages.store'), [
            'message' => str_repeat('a', 1001),
        ]);

        $response->assertSessionHasErrors('message');
    }

    public function test_message_creation_fails_when_messaging_disabled(): void
    {
        SiteSetting::where('key', 'messaging_enabled')->update(['value' => '0']);

        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->post(route('messages.store'), [
            'message' => 'Hello, world!',
        ]);

        $response->assertSessionHasErrors('message');
    }

    public function test_message_creation_sends_notification_when_user_tagged(): void
    {
        Notification::fake();
        Event::fake();

        $tagger = User::factory()->create(['name' => 'Alice']);
        $taggedUser = User::factory()->create(['name' => 'Bob']);
        $this->actingAs($tagger);

        $response = $this->post(route('messages.store'), [
            'message' => 'Hello @Bob!',
            'tagged_user_ids' => [$taggedUser->id],
        ]);

        $response->assertRedirect();

        Notification::assertSentTo($taggedUser, \App\Notifications\UserTagged::class);
    }

    public function test_message_creation_validates_tagged_user_ids_exist(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->post(route('messages.store'), [
            'message' => 'Hello @999!',
            'tagged_user_ids' => [999],
        ]);

        $response->assertSessionHasErrors('tagged_user_ids.0');
    }

    public function test_message_creation_validates_tagged_user_ids_are_integers(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->post(route('messages.store'), [
            'message' => 'Hello!',
            'tagged_user_ids' => ['not-an-integer'],
        ]);

        $response->assertSessionHasErrors('tagged_user_ids.0');
    }

    public function test_admin_can_delete_message(): void
    {
        $admin = User::factory()->create();
        $admin->givePermissionTo('admin');

        $message = Message::factory()->create();

        $this->actingAs($admin);

        $response = $this->delete(route('messages.destroy', $message));

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertDatabaseMissing('messages', [
            'id' => $message->id,
        ]);
    }

    public function test_admin_deleting_message_also_deletes_related_notifications(): void
    {
        $admin = User::factory()->create();
        $admin->givePermissionTo('admin');

        $tagger = User::factory()->create(['name' => 'Alice']);
        $taggedUser = User::factory()->create(['name' => 'Bob']);

        $message = Message::factory()->create([
            'user_id' => $tagger->id,
        ]);

        // Create a notification for this message
        $notificationId = \Illuminate\Support\Str::uuid()->toString();
        DB::table('notifications')->insert([
            'id' => $notificationId,
            'type' => 'App\\Notifications\\UserTagged',
            'notifiable_type' => 'App\\Models\\User',
            'notifiable_id' => $taggedUser->id,
            'data' => json_encode([
                'message_id' => $message->id,
                'message' => 'Hello @Bob!',
                'tagger_id' => $tagger->id,
                'tagger_name' => $tagger->name,
                'tagger_avatar' => null,
                'created_at' => $message->created_at->toIso8601String(),
                'url' => route('messages.index').'#message-'.$message->id,
            ]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($admin);

        $response = $this->delete(route('messages.destroy', $message));

        $response->assertRedirect();
        $response->assertSessionHas('success');

        // Message should be deleted
        $this->assertDatabaseMissing('messages', [
            'id' => $message->id,
        ]);

        // Notification should also be deleted
        $this->assertDatabaseMissing('notifications', [
            'id' => $notificationId,
        ]);
    }

    public function test_non_admin_cannot_delete_message(): void
    {
        $user = User::factory()->create();
        $message = Message::factory()->create();

        $this->actingAs($user);

        $response = $this->delete(route('messages.destroy', $message));

        $response->assertStatus(403);

        $this->assertDatabaseHas('messages', [
            'id' => $message->id,
        ]);
    }

    public function test_message_deletion_requires_authentication(): void
    {
        $message = Message::factory()->create();

        $response = $this->delete(route('messages.destroy', $message));

        $response->assertRedirect(route('login'));
    }

    public function test_messages_are_filtered_by_retention_period(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        // Create messages within and outside retention period
        $recentMessage = Message::factory()->create([
            'user_id' => $user->id,
            'created_at' => now()->subDays(10),
        ]);

        $oldMessage = Message::factory()->create([
            'user_id' => $user->id,
            'created_at' => now()->subDays(35),
        ]);

        $response = $this->get(route('messages.index'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Messages/Index')
            ->has('messages.data', 1)
            ->where('messages.data.0.id', $recentMessage->id)
        );
    }

    public function test_message_parses_mentions_with_punctuation_after_username(): void
    {
        $user1 = User::factory()->create(['name' => 'JohnDoe']);
        $user2 = User::factory()->create(['name' => 'Jane Smith']);

        // Test comma immediately after
        $message1 = Message::factory()->create([
            'user_id' => $user1->id,
            'message' => 'Hello @JohnDoe,how are you?',
        ]);
        $tagged1 = $message1->getTaggedUsernames();
        $this->assertContains('JohnDoe', $tagged1);

        // Test period immediately after
        $message2 = Message::factory()->create([
            'user_id' => $user1->id,
            'message' => 'Hello @JohnDoe. How are you?',
        ]);
        $tagged2 = $message2->getTaggedUsernames();
        $this->assertContains('JohnDoe', $tagged2);

        // Test exclamation immediately after
        $message3 = Message::factory()->create([
            'user_id' => $user1->id,
            'message' => 'Hello @JohnDoe! How are you?',
        ]);
        $tagged3 = $message3->getTaggedUsernames();
        $this->assertContains('JohnDoe', $tagged3);

        // Test question mark immediately after
        $message4 = Message::factory()->create([
            'user_id' => $user1->id,
            'message' => 'Hello @JohnDoe? How are you?',
        ]);
        $tagged4 = $message4->getTaggedUsernames();
        $this->assertContains('JohnDoe', $tagged4);

        // Test full username with space and punctuation
        $message5 = Message::factory()->create([
            'user_id' => $user1->id,
            'message' => 'Hello @Jane Smith,how are you?',
        ]);
        $tagged5 = $message5->getTaggedUsernames();
        $this->assertContains('Jane Smith', $tagged5);

        // Test full username with period
        $message6 = Message::factory()->create([
            'user_id' => $user1->id,
            'message' => 'Hello @Jane Smith. How are you?',
        ]);
        $tagged6 = $message6->getTaggedUsernames();
        $this->assertContains('Jane Smith', $tagged6);
    }

    public function test_message_parses_mentions_at_end_of_string(): void
    {
        $user = User::factory()->create(['name' => 'JohnDoe']);

        $message = Message::factory()->create([
            'user_id' => $user->id,
            'message' => 'Hello @JohnDoe',
        ]);

        $tagged = $message->getTaggedUsernames();
        $this->assertContains('JohnDoe', $tagged);
    }

    public function test_message_parses_mentions_with_space_after(): void
    {
        $user = User::factory()->create(['name' => 'JohnDoe']);

        $message = Message::factory()->create([
            'user_id' => $user->id,
            'message' => 'Hello @JohnDoe how are you?',
        ]);

        $tagged = $message->getTaggedUsernames();
        $this->assertContains('JohnDoe', $tagged);
    }

    public function test_cleanup_command_deletes_old_messages(): void
    {
        $user = User::factory()->create();

        // Create messages within and outside retention period
        $recentMessage = Message::factory()->create([
            'user_id' => $user->id,
            'created_at' => now()->subDays(10),
        ]);

        $oldMessage = Message::factory()->create([
            'user_id' => $user->id,
            'created_at' => now()->subDays(35),
        ]);

        $this->artisan('messages:cleanup')
            ->expectsOutput('Deleted 1 message(s) older than 30 days.')
            ->assertExitCode(0);

        // Recent message should still exist
        $this->assertDatabaseHas('messages', [
            'id' => $recentMessage->id,
        ]);

        // Old message should be deleted
        $this->assertDatabaseMissing('messages', [
            'id' => $oldMessage->id,
        ]);
    }

    public function test_cleanup_command_deletes_notifications_for_deleted_messages(): void
    {
        $tagger = User::factory()->create(['name' => 'Alice']);
        $taggedUser = User::factory()->create(['name' => 'Bob']);

        // Create an old message that will be deleted
        $oldMessage = Message::factory()->create([
            'user_id' => $tagger->id,
            'created_at' => now()->subDays(35),
        ]);

        // Create a notification for this message
        $notificationId = \Illuminate\Support\Str::uuid()->toString();
        DB::table('notifications')->insert([
            'id' => $notificationId,
            'type' => 'App\\Notifications\\UserTagged',
            'notifiable_type' => 'App\\Models\\User',
            'notifiable_id' => $taggedUser->id,
            'data' => json_encode([
                'message_id' => $oldMessage->id,
                'message' => 'Hello @Bob!',
                'tagger_id' => $tagger->id,
                'tagger_name' => $tagger->name,
                'tagger_avatar' => null,
                'created_at' => $oldMessage->created_at->toIso8601String(),
                'url' => route('messages.index').'#message-'.$oldMessage->id,
            ]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Create a recent message with a notification that should remain
        $recentMessage = Message::factory()->create([
            'user_id' => $tagger->id,
            'created_at' => now()->subDays(10),
        ]);

        $recentNotificationId = \Illuminate\Support\Str::uuid()->toString();
        DB::table('notifications')->insert([
            'id' => $recentNotificationId,
            'type' => 'App\\Notifications\\UserTagged',
            'notifiable_type' => 'App\\Models\\User',
            'notifiable_id' => $taggedUser->id,
            'data' => json_encode([
                'message_id' => $recentMessage->id,
                'message' => 'Hello @Bob!',
                'tagger_id' => $tagger->id,
                'tagger_name' => $tagger->name,
                'tagger_avatar' => null,
                'created_at' => $recentMessage->created_at->toIso8601String(),
                'url' => route('messages.index').'#message-'.$recentMessage->id,
            ]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->artisan('messages:cleanup')
            ->expectsOutput('Deleted 1 message(s) older than 30 days.')
            ->expectsOutput('Deleted 1 notification(s) for deleted messages.')
            ->assertExitCode(0);

        // Old notification should be deleted
        $this->assertDatabaseMissing('notifications', [
            'id' => $notificationId,
        ]);

        // Recent notification should still exist
        $this->assertDatabaseHas('notifications', [
            'id' => $recentNotificationId,
        ]);
    }

    public function test_cleanup_command_handles_custom_retention_period(): void
    {
        SiteSetting::where('key', 'messaging_retention_days')->update(['value' => '7']);

        $user = User::factory()->create();

        // Create messages within and outside the custom retention period
        $recentMessage = Message::factory()->create([
            'user_id' => $user->id,
            'created_at' => now()->subDays(5),
        ]);

        $oldMessage = Message::factory()->create([
            'user_id' => $user->id,
            'created_at' => now()->subDays(10),
        ]);

        $this->artisan('messages:cleanup')
            ->expectsOutput('Deleted 1 message(s) older than 7 days.')
            ->assertExitCode(0);

        // Recent message should still exist
        $this->assertDatabaseHas('messages', [
            'id' => $recentMessage->id,
        ]);

        // Old message should be deleted
        $this->assertDatabaseMissing('messages', [
            'id' => $oldMessage->id,
        ]);
    }

    public function test_user_can_add_reaction_to_message(): void
    {
        Event::fake();

        $user = User::factory()->create();
        $message = Message::factory()->create();

        $this->actingAs($user);

        $response = $this->postJson(route('messages.reactions.store', $message), [
            'emoji' => '👍',
        ]);

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'reaction' => ['id', 'emoji', 'user'],
            'grouped_reactions',
        ]);

        $this->assertDatabaseHas('message_reactions', [
            'message_id' => $message->id,
            'user_id' => $user->id,
            'emoji' => '👍',
        ]);

        Event::assertDispatched(\App\Events\MessageReactionUpdated::class);
    }

    public function test_user_can_remove_reaction_from_message(): void
    {
        Event::fake();

        $user = User::factory()->create();
        $message = Message::factory()->create();

        // Create a reaction first
        MessageReaction::factory()->create([
            'message_id' => $message->id,
            'user_id' => $user->id,
            'emoji' => '👍',
        ]);

        $this->actingAs($user);

        $response = $this->deleteJson(route('messages.reactions.destroy', $message));

        $response->assertStatus(200);
        $response->assertJsonStructure(['grouped_reactions']);

        $this->assertDatabaseMissing('message_reactions', [
            'message_id' => $message->id,
            'user_id' => $user->id,
        ]);

        Event::assertDispatched(\App\Events\MessageReactionUpdated::class);
    }

    public function test_user_can_change_reaction(): void
    {
        Event::fake();

        $user = User::factory()->create();
        $message = Message::factory()->create();

        // Create initial reaction
        MessageReaction::factory()->create([
            'message_id' => $message->id,
            'user_id' => $user->id,
            'emoji' => '👍',
        ]);

        $this->actingAs($user);

        // Change to different emoji
        $response = $this->postJson(route('messages.reactions.store', $message), [
            'emoji' => '❤️',
        ]);

        $response->assertStatus(200);

        // Should only have one reaction with the new emoji
        $this->assertDatabaseHas('message_reactions', [
            'message_id' => $message->id,
            'user_id' => $user->id,
            'emoji' => '❤️',
        ]);

        $this->assertDatabaseMissing('message_reactions', [
            'message_id' => $message->id,
            'user_id' => $user->id,
            'emoji' => '👍',
        ]);

        // Should only have one reaction total for this user/message
        $this->assertEquals(1, MessageReaction::where('message_id', $message->id)
            ->where('user_id', $user->id)
            ->count());

        Event::assertDispatched(\App\Events\MessageReactionUpdated::class);
    }

    public function test_user_can_only_have_one_reaction_per_message(): void
    {
        $user = User::factory()->create();
        $message = Message::factory()->create();

        $this->actingAs($user);

        // Add first reaction
        $this->postJson(route('messages.reactions.store', $message), [
            'emoji' => '👍',
        ]);

        // Try to add second reaction with different emoji
        $this->postJson(route('messages.reactions.store', $message), [
            'emoji' => '❤️',
        ]);

        // Should only have one reaction (the second one)
        $reactions = MessageReaction::where('message_id', $message->id)
            ->where('user_id', $user->id)
            ->get();

        $this->assertCount(1, $reactions);
        $this->assertEquals('❤️', $reactions->first()->emoji);
    }

    public function test_invalid_emoji_is_rejected(): void
    {
        $user = User::factory()->create();
        $message = Message::factory()->create();

        $this->actingAs($user);

        $response = $this->postJson(route('messages.reactions.store', $message), [
            'emoji' => '🚀', // Not in allowed list
        ]);

        $response->assertStatus(422);
        $response->assertJson(['error' => true]);

        $this->assertDatabaseMissing('message_reactions', [
            'message_id' => $message->id,
            'user_id' => $user->id,
        ]);
    }

    public function test_allowed_emojis_can_be_used(): void
    {
        $user = User::factory()->create();
        $message = Message::factory()->create();

        $this->actingAs($user);

        $allowedEmojis = ['👍', '❤️', '😂', '😮', '😢'];

        foreach ($allowedEmojis as $emoji) {
            $response = $this->postJson(route('messages.reactions.store', $message), [
                'emoji' => $emoji,
            ]);

            $response->assertStatus(200);

            // Remove reaction before testing next one
            $this->deleteJson(route('messages.reactions.destroy', $message));
        }
    }

    public function test_multiple_users_can_react_to_same_message(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();
        $user3 = User::factory()->create();
        $message = Message::factory()->create();

        // User 1 reacts
        $this->actingAs($user1);
        $this->postJson(route('messages.reactions.store', $message), [
            'emoji' => '👍',
        ]);

        // User 2 reacts
        $this->actingAs($user2);
        $this->postJson(route('messages.reactions.store', $message), [
            'emoji' => '👍',
        ]);

        // User 3 reacts with different emoji
        $this->actingAs($user3);
        $this->postJson(route('messages.reactions.store', $message), [
            'emoji' => '❤️',
        ]);

        // Should have 3 reactions total
        $this->assertEquals(3, MessageReaction::where('message_id', $message->id)->count());

        // Check grouped reactions
        $message->refresh();
        $grouped = $message->getGroupedReactions();

        $this->assertArrayHasKey('👍', $grouped);
        $this->assertEquals(2, $grouped['👍']['count']);
        $this->assertCount(2, $grouped['👍']['users']);

        $this->assertArrayHasKey('❤️', $grouped);
        $this->assertEquals(1, $grouped['❤️']['count']);
        $this->assertCount(1, $grouped['❤️']['users']);
    }

    public function test_reactions_are_included_in_message_index(): void
    {
        $user = User::factory()->create();
        $message = Message::factory()->create();

        // Add reactions
        MessageReaction::factory()->create([
            'message_id' => $message->id,
            'user_id' => $user->id,
            'emoji' => '👍',
        ]);

        $this->actingAs($user);

        $response = $this->get(route('messages.index'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Messages/Index')
            ->has('messages.data', 1)
            ->has('messages.data.0.grouped_reactions')
        );
    }

    public function test_reactions_are_included_in_message_show(): void
    {
        $user = User::factory()->create();
        $message = Message::factory()->create();

        // Add reactions
        MessageReaction::factory()->create([
            'message_id' => $message->id,
            'user_id' => $user->id,
            'emoji' => '👍',
        ]);

        $this->actingAs($user);

        $response = $this->getJson(route('messages.show', $message));

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'id',
            'user_id',
            'message',
            'created_at',
            'user',
            'grouped_reactions',
        ]);

        $data = $response->json();
        $this->assertArrayHasKey('grouped_reactions', $data);
    }

    public function test_reactions_are_deleted_when_message_is_deleted(): void
    {
        $admin = User::factory()->create();
        $admin->givePermissionTo('admin');

        $user = User::factory()->create();
        $message = Message::factory()->create();

        // Add reactions
        $reaction1 = MessageReaction::factory()->create([
            'message_id' => $message->id,
            'user_id' => $user->id,
            'emoji' => '👍',
        ]);

        $reaction2 = MessageReaction::factory()->create([
            'message_id' => $message->id,
            'user_id' => $admin->id,
            'emoji' => '❤️',
        ]);

        $this->actingAs($admin);

        $response = $this->delete(route('messages.destroy', $message));

        $response->assertRedirect();

        // Message should be deleted
        $this->assertDatabaseMissing('messages', [
            'id' => $message->id,
        ]);

        // Reactions should be deleted (cascade)
        $this->assertDatabaseMissing('message_reactions', [
            'id' => $reaction1->id,
        ]);

        $this->assertDatabaseMissing('message_reactions', [
            'id' => $reaction2->id,
        ]);
    }

    public function test_reaction_requires_authentication(): void
    {
        $message = Message::factory()->create();

        $response = $this->postJson(route('messages.reactions.store', $message), [
            'emoji' => '👍',
        ]);

        $response->assertStatus(401);
    }

    public function test_remove_reaction_requires_authentication(): void
    {
        $message = Message::factory()->create();

        $response = $this->deleteJson(route('messages.reactions.destroy', $message));

        $response->assertStatus(401);
    }

    public function test_reaction_requires_emoji(): void
    {
        $user = User::factory()->create();
        $message = Message::factory()->create();

        $this->actingAs($user);

        $response = $this->postJson(route('messages.reactions.store', $message), []);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('emoji');
    }

    public function test_grouped_reactions_returns_correct_structure(): void
    {
        $user1 = User::factory()->create(['name' => 'Alice']);
        $user2 = User::factory()->create(['name' => 'Bob']);
        $user3 = User::factory()->create(['name' => 'Charlie']);
        $message = Message::factory()->create();

        // Add reactions
        MessageReaction::factory()->create([
            'message_id' => $message->id,
            'user_id' => $user1->id,
            'emoji' => '👍',
        ]);

        MessageReaction::factory()->create([
            'message_id' => $message->id,
            'user_id' => $user2->id,
            'emoji' => '👍',
        ]);

        MessageReaction::factory()->create([
            'message_id' => $message->id,
            'user_id' => $user3->id,
            'emoji' => '❤️',
        ]);

        $grouped = $message->getGroupedReactions();

        $this->assertArrayHasKey('👍', $grouped);
        $this->assertEquals(2, $grouped['👍']['count']);
        $this->assertCount(2, $grouped['👍']['users']);
        $this->assertArrayHasKey('id', $grouped['👍']['users'][0]);
        $this->assertArrayHasKey('name', $grouped['👍']['users'][0]);

        $this->assertArrayHasKey('❤️', $grouped);
        $this->assertEquals(1, $grouped['❤️']['count']);
        $this->assertCount(1, $grouped['❤️']['users']);
    }

    public function test_empty_reactions_returns_empty_array(): void
    {
        $message = Message::factory()->create();

        $grouped = $message->getGroupedReactions();

        $this->assertIsArray($grouped);
        $this->assertEmpty($grouped);
    }

    public function test_user_can_create_comment_on_message(): void
    {
        Event::fake();
        Notification::fake();

        $user = User::factory()->create();
        $message = Message::factory()->create();

        $this->actingAs($user);

        $response = $this->post(route('messages.comments.store', $message), [
            'comment' => 'This is a test comment',
        ]);

        $response->assertRedirect();

        $this->assertDatabaseHas('message_comments', [
            'message_id' => $message->id,
            'user_id' => $user->id,
            'comment' => 'This is a test comment',
        ]);

        Event::assertDispatched(\App\Events\CommentCreated::class);
    }

    public function test_comment_creation_requires_authentication(): void
    {
        $message = Message::factory()->create();

        $response = $this->post(route('messages.comments.store', $message), [
            'comment' => 'This is a test comment',
        ]);

        $response->assertRedirect(route('login'));
    }

    public function test_comment_creation_validates_required_comment(): void
    {
        $user = User::factory()->create();
        $message = Message::factory()->create();

        $this->actingAs($user);

        $response = $this->post(route('messages.comments.store', $message), []);

        $response->assertSessionHasErrors('comment');
    }

    public function test_comment_creation_validates_comment_max_length(): void
    {
        $user = User::factory()->create();
        $message = Message::factory()->create();

        $this->actingAs($user);

        $response = $this->post(route('messages.comments.store', $message), [
            'comment' => str_repeat('a', 1001),
        ]);

        $response->assertSessionHasErrors('comment');
    }

    public function test_comment_creation_sends_notification_to_message_author(): void
    {
        Notification::fake();
        Event::fake();

        $messageAuthor = User::factory()->create(['name' => 'Alice']);
        $commenter = User::factory()->create(['name' => 'Bob']);
        $message = Message::factory()->create(['user_id' => $messageAuthor->id]);

        $this->actingAs($commenter);

        $response = $this->post(route('messages.comments.store', $message), [
            'comment' => 'Great message!',
        ]);

        $response->assertRedirect();

        Notification::assertSentTo($messageAuthor, \App\Notifications\MessageCommented::class);
    }

    public function test_comment_creation_does_not_send_notification_when_commenting_on_own_message(): void
    {
        Notification::fake();
        Event::fake();

        $user = User::factory()->create();
        $message = Message::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user);

        $response = $this->post(route('messages.comments.store', $message), [
            'comment' => 'My own comment',
        ]);

        $response->assertRedirect();

        Notification::assertNothingSent();
    }

    public function test_admin_can_delete_comment(): void
    {
        Event::fake();

        $admin = User::factory()->create();
        $admin->givePermissionTo('admin');

        $message = Message::factory()->create();
        $comment = MessageComment::factory()->create(['message_id' => $message->id]);

        $this->actingAs($admin);

        $response = $this->delete(route('messages.comments.destroy', [$message, $comment]));

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertDatabaseMissing('message_comments', [
            'id' => $comment->id,
        ]);
    }

    public function test_non_admin_cannot_delete_comment(): void
    {
        $user = User::factory()->create();
        $message = Message::factory()->create();
        $comment = MessageComment::factory()->create(['message_id' => $message->id]);

        $this->actingAs($user);

        $response = $this->delete(route('messages.comments.destroy', [$message, $comment]));

        $response->assertStatus(403);

        $this->assertDatabaseHas('message_comments', [
            'id' => $comment->id,
        ]);
    }

    public function test_comment_deletion_requires_authentication(): void
    {
        $message = Message::factory()->create();
        $comment = MessageComment::factory()->create(['message_id' => $message->id]);

        $response = $this->delete(route('messages.comments.destroy', [$message, $comment]));

        $response->assertRedirect(route('login'));
    }

    public function test_comments_are_deleted_when_message_is_deleted(): void
    {
        $admin = User::factory()->create();
        $admin->givePermissionTo('admin');

        $message = Message::factory()->create();
        $comment1 = MessageComment::factory()->create(['message_id' => $message->id]);
        $comment2 = MessageComment::factory()->create(['message_id' => $message->id]);

        $this->actingAs($admin);

        $response = $this->delete(route('messages.destroy', $message));

        $response->assertRedirect();

        // Message should be deleted
        $this->assertDatabaseMissing('messages', [
            'id' => $message->id,
        ]);

        // Comments should be deleted (cascade)
        $this->assertDatabaseMissing('message_comments', [
            'id' => $comment1->id,
        ]);

        $this->assertDatabaseMissing('message_comments', [
            'id' => $comment2->id,
        ]);
    }

    public function test_comments_are_included_in_message_index(): void
    {
        $user = User::factory()->create();
        $message = Message::factory()->create();

        // Add comment
        MessageComment::factory()->create([
            'message_id' => $message->id,
            'user_id' => $user->id,
        ]);

        $this->actingAs($user);

        $response = $this->get(route('messages.index'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Messages/Index')
            ->has('messages.data', 1)
            ->has('messages.data.0.comments', 1)
        );
    }

    public function test_comments_are_included_in_message_show(): void
    {
        $user = User::factory()->create();
        $message = Message::factory()->create();

        // Add comment
        MessageComment::factory()->create([
            'message_id' => $message->id,
            'user_id' => $user->id,
        ]);

        $this->actingAs($user);

        $response = $this->getJson(route('messages.show', $message));

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'id',
            'user_id',
            'message',
            'created_at',
            'user',
            'comments',
        ]);

        $data = $response->json();
        $this->assertArrayHasKey('comments', $data);
        $this->assertCount(1, $data['comments']);
    }

    public function test_user_can_add_reaction_to_comment(): void
    {
        Event::fake();

        $user = User::factory()->create();
        $message = Message::factory()->create();
        $comment = MessageComment::factory()->create(['message_id' => $message->id]);

        $this->actingAs($user);

        $response = $this->postJson(route('messages.comments.reactions.store', [$message, $comment]), [
            'emoji' => '👍',
        ]);

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'reaction' => ['id', 'emoji', 'user'],
            'grouped_reactions',
        ]);

        $this->assertDatabaseHas('comment_reactions', [
            'comment_id' => $comment->id,
            'user_id' => $user->id,
            'emoji' => '👍',
        ]);

        Event::assertDispatched(\App\Events\CommentReactionUpdated::class);
    }

    public function test_user_can_remove_reaction_from_comment(): void
    {
        Event::fake();

        $user = User::factory()->create();
        $message = Message::factory()->create();
        $comment = MessageComment::factory()->create(['message_id' => $message->id]);

        // Create a reaction first
        CommentReaction::factory()->create([
            'comment_id' => $comment->id,
            'user_id' => $user->id,
            'emoji' => '👍',
        ]);

        $this->actingAs($user);

        $response = $this->deleteJson(route('messages.comments.reactions.destroy', [$message, $comment]));

        $response->assertStatus(200);
        $response->assertJsonStructure(['grouped_reactions']);

        $this->assertDatabaseMissing('comment_reactions', [
            'comment_id' => $comment->id,
            'user_id' => $user->id,
        ]);

        Event::assertDispatched(\App\Events\CommentReactionUpdated::class);
    }

    public function test_user_can_change_comment_reaction(): void
    {
        Event::fake();

        $user = User::factory()->create();
        $message = Message::factory()->create();
        $comment = MessageComment::factory()->create(['message_id' => $message->id]);

        // Create initial reaction
        CommentReaction::factory()->create([
            'comment_id' => $comment->id,
            'user_id' => $user->id,
            'emoji' => '👍',
        ]);

        $this->actingAs($user);

        // Change to different emoji
        $response = $this->postJson(route('messages.comments.reactions.store', [$message, $comment]), [
            'emoji' => '❤️',
        ]);

        $response->assertStatus(200);

        // Should only have one reaction with the new emoji
        $this->assertDatabaseHas('comment_reactions', [
            'comment_id' => $comment->id,
            'user_id' => $user->id,
            'emoji' => '❤️',
        ]);

        $this->assertDatabaseMissing('comment_reactions', [
            'comment_id' => $comment->id,
            'user_id' => $user->id,
            'emoji' => '👍',
        ]);

        // Should only have one reaction total for this user/comment
        $this->assertEquals(1, CommentReaction::where('comment_id', $comment->id)
            ->where('user_id', $user->id)
            ->count());

        Event::assertDispatched(\App\Events\CommentReactionUpdated::class);
    }

    public function test_user_can_only_have_one_reaction_per_comment(): void
    {
        $user = User::factory()->create();
        $message = Message::factory()->create();
        $comment = MessageComment::factory()->create(['message_id' => $message->id]);

        $this->actingAs($user);

        // Add first reaction
        $this->postJson(route('messages.comments.reactions.store', [$message, $comment]), [
            'emoji' => '👍',
        ]);

        // Try to add second reaction with different emoji
        $this->postJson(route('messages.comments.reactions.store', [$message, $comment]), [
            'emoji' => '❤️',
        ]);

        // Should only have one reaction (the second one)
        $reactions = CommentReaction::where('comment_id', $comment->id)
            ->where('user_id', $user->id)
            ->get();

        $this->assertCount(1, $reactions);
        $this->assertEquals('❤️', $reactions->first()->emoji);
    }

    public function test_invalid_emoji_is_rejected_for_comment_reaction(): void
    {
        $user = User::factory()->create();
        $message = Message::factory()->create();
        $comment = MessageComment::factory()->create(['message_id' => $message->id]);

        $this->actingAs($user);

        $response = $this->postJson(route('messages.comments.reactions.store', [$message, $comment]), [
            'emoji' => '🚀', // Not in allowed list
        ]);

        $response->assertStatus(422);
        $response->assertJson(['error' => true]);

        $this->assertDatabaseMissing('comment_reactions', [
            'comment_id' => $comment->id,
            'user_id' => $user->id,
        ]);
    }

    public function test_allowed_emojis_can_be_used_for_comment_reactions(): void
    {
        $user = User::factory()->create();
        $message = Message::factory()->create();
        $comment = MessageComment::factory()->create(['message_id' => $message->id]);

        $this->actingAs($user);

        $allowedEmojis = ['👍', '❤️', '😂', '😮', '😢', '💩'];

        foreach ($allowedEmojis as $emoji) {
            $response = $this->postJson(route('messages.comments.reactions.store', [$message, $comment]), [
                'emoji' => $emoji,
            ]);

            $response->assertStatus(200);

            // Remove reaction before testing next one
            $this->deleteJson(route('messages.comments.reactions.destroy', [$message, $comment]));
        }
    }

    public function test_multiple_users_can_react_to_same_comment(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();
        $user3 = User::factory()->create();
        $message = Message::factory()->create();
        $comment = MessageComment::factory()->create(['message_id' => $message->id]);

        // User 1 reacts
        $this->actingAs($user1);
        $this->postJson(route('messages.comments.reactions.store', [$message, $comment]), [
            'emoji' => '👍',
        ]);

        // User 2 reacts
        $this->actingAs($user2);
        $this->postJson(route('messages.comments.reactions.store', [$message, $comment]), [
            'emoji' => '👍',
        ]);

        // User 3 reacts with different emoji
        $this->actingAs($user3);
        $this->postJson(route('messages.comments.reactions.store', [$message, $comment]), [
            'emoji' => '❤️',
        ]);

        // Should have 3 reactions total
        $this->assertEquals(3, CommentReaction::where('comment_id', $comment->id)->count());

        // Check grouped reactions
        $comment->refresh();
        $grouped = $comment->getGroupedReactions();

        $this->assertArrayHasKey('👍', $grouped);
        $this->assertEquals(2, $grouped['👍']['count']);
        $this->assertCount(2, $grouped['👍']['users']);

        $this->assertArrayHasKey('❤️', $grouped);
        $this->assertEquals(1, $grouped['❤️']['count']);
        $this->assertCount(1, $grouped['❤️']['users']);
    }

    public function test_comment_reactions_are_deleted_when_comment_is_deleted(): void
    {
        $admin = User::factory()->create();
        $admin->givePermissionTo('admin');

        $message = Message::factory()->create();
        $comment = MessageComment::factory()->create(['message_id' => $message->id]);

        // Add reactions
        $reaction1 = CommentReaction::factory()->create([
            'comment_id' => $comment->id,
            'emoji' => '👍',
        ]);

        $reaction2 = CommentReaction::factory()->create([
            'comment_id' => $comment->id,
            'emoji' => '❤️',
        ]);

        $this->actingAs($admin);

        $response = $this->delete(route('messages.comments.destroy', [$message, $comment]));

        $response->assertRedirect();

        // Comment should be deleted
        $this->assertDatabaseMissing('message_comments', [
            'id' => $comment->id,
        ]);

        // Reactions should be deleted (cascade)
        $this->assertDatabaseMissing('comment_reactions', [
            'id' => $reaction1->id,
        ]);

        $this->assertDatabaseMissing('comment_reactions', [
            'id' => $reaction2->id,
        ]);
    }

    public function test_comment_reactions_are_deleted_when_message_is_deleted(): void
    {
        $admin = User::factory()->create();
        $admin->givePermissionTo('admin');

        $message = Message::factory()->create();
        $comment = MessageComment::factory()->create(['message_id' => $message->id]);

        // Add reactions
        $reaction1 = CommentReaction::factory()->create([
            'comment_id' => $comment->id,
            'emoji' => '👍',
        ]);

        $reaction2 = CommentReaction::factory()->create([
            'comment_id' => $comment->id,
            'emoji' => '❤️',
        ]);

        $this->actingAs($admin);

        $response = $this->delete(route('messages.destroy', $message));

        $response->assertRedirect();

        // Message should be deleted
        $this->assertDatabaseMissing('messages', [
            'id' => $message->id,
        ]);

        // Comment should be deleted (cascade)
        $this->assertDatabaseMissing('message_comments', [
            'id' => $comment->id,
        ]);

        // Reactions should be deleted (cascade)
        $this->assertDatabaseMissing('comment_reactions', [
            'id' => $reaction1->id,
        ]);

        $this->assertDatabaseMissing('comment_reactions', [
            'id' => $reaction2->id,
        ]);
    }

    public function test_comment_reaction_requires_authentication(): void
    {
        $message = Message::factory()->create();
        $comment = MessageComment::factory()->create(['message_id' => $message->id]);

        $response = $this->postJson(route('messages.comments.reactions.store', [$message, $comment]), [
            'emoji' => '👍',
        ]);

        $response->assertStatus(401);
    }

    public function test_remove_comment_reaction_requires_authentication(): void
    {
        $message = Message::factory()->create();
        $comment = MessageComment::factory()->create(['message_id' => $message->id]);

        $response = $this->deleteJson(route('messages.comments.reactions.destroy', [$message, $comment]));

        $response->assertStatus(401);
    }

    public function test_comment_reaction_requires_emoji(): void
    {
        $user = User::factory()->create();
        $message = Message::factory()->create();
        $comment = MessageComment::factory()->create(['message_id' => $message->id]);

        $this->actingAs($user);

        $response = $this->postJson(route('messages.comments.reactions.store', [$message, $comment]), []);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('emoji');
    }

    public function test_grouped_comment_reactions_returns_correct_structure(): void
    {
        $user1 = User::factory()->create(['name' => 'Alice']);
        $user2 = User::factory()->create(['name' => 'Bob']);
        $user3 = User::factory()->create(['name' => 'Charlie']);
        $message = Message::factory()->create();
        $comment = MessageComment::factory()->create(['message_id' => $message->id]);

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

    public function test_empty_comment_reactions_returns_empty_array(): void
    {
        $message = Message::factory()->create();
        $comment = MessageComment::factory()->create(['message_id' => $message->id]);

        $grouped = $comment->getGroupedReactions();

        $this->assertIsArray($grouped);
        $this->assertEmpty($grouped);
    }
}
