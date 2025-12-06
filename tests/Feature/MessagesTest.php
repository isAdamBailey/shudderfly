<?php

namespace Tests\Feature;

use App\Models\Message;
use App\Models\SiteSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
        $response->assertSessionHas('success');

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
}
