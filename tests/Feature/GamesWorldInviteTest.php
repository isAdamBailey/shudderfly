<?php

namespace Tests\Feature;

use App\Events\MessageCreated;
use App\Models\Message;
use App\Models\SiteSetting;
use App\Models\User;
use App\Notifications\UserTagged;
use App\Support\GameShareMessage;
use App\Support\GamesWorld;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * Inviting people into the scene you're standing in (issue #174): a chat
 * message tagging them, whose place links to that scene and to following
 * whoever sent it.
 */
class GamesWorldInviteTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->setting('messaging_enabled', true);
        $this->setting(GamesWorld::TOGETHER_SETTING, true);
    }

    private function setting(string $key, bool $on): void
    {
        SiteSetting::updateOrCreate(
            ['key' => $key],
            ['value' => $on ? '1' : '0', 'type' => 'boolean', 'description' => 'x']
        );
    }

    public function test_an_invite_is_one_message_tagging_everyone_picked(): void
    {
        Event::fake([MessageCreated::class]);
        Notification::fake();

        $me = User::factory()->create(['name' => 'Cam']);
        $bob = User::factory()->create(['name' => 'Bob']);
        $ann = User::factory()->create(['name' => 'Ann']);

        $this->actingAs($me)
            ->from(route('games.index'))
            ->post(route('games.invite'), [
                'scene' => 'house.kitchen',
                'tagged_user_ids' => [$bob->id, $ann->id],
            ])
            ->assertRedirect(route('games.index'))
            ->assertSessionHas('success');

        $message = Message::sole();
        $this->assertSame($me->id, $message->user_id);
        $this->assertSame(
            "Come hang out with me in \u{E000}w:house.kitchen\u{E000}the Kitchen at the Butt's House\u{E000}! @Ann @Bob",
            $message->message,
        );
        // Everywhere else a message is read, the place is just its name.
        $this->assertSame(
            "Come hang out with me in the Kitchen at the Butt's House! @Ann @Bob",
            GameShareMessage::stripSlugMarker($message->message),
        );

        Notification::assertSentTo([$ann, $bob], UserTagged::class);
        Notification::assertNotSentTo($me, UserTagged::class);
        Event::assertDispatched(MessageCreated::class);
    }

    public function test_an_invite_from_the_street_names_it(): void
    {
        Notification::fake();
        $me = User::factory()->create();
        $friend = User::factory()->create(['name' => 'Ann']);

        $this->actingAs($me)->post(route('games.invite'), [
            'scene' => 'road',
            'tagged_user_ids' => [$friend->id],
        ])->assertSessionHasNoErrors();

        $this->assertSame(
            'Come hang out with me in the street! @Ann',
            GameShareMessage::stripSlugMarker(Message::sole()->message),
        );
    }

    public function test_an_invite_is_refused_for_a_guest(): void
    {
        $friend = User::factory()->create();

        $this->post(route('games.invite'), [
            'scene' => 'house.hall',
            'tagged_user_ids' => [$friend->id],
        ])->assertRedirect(route('login'));

        $this->assertSame(0, Message::count());
    }

    public function test_an_invite_is_refused_for_an_unknown_scene_nobody_or_yourself(): void
    {
        $me = User::factory()->create();
        $friend = User::factory()->create();

        foreach ([
            ['scene' => 'nowhere', 'tagged_user_ids' => [$friend->id]],
            ['scene' => ['road'], 'tagged_user_ids' => [$friend->id]],
            ['scene' => 'house.hall', 'tagged_user_ids' => []],
            ['scene' => 'house.hall'],
            ['scene' => 'house.hall', 'tagged_user_ids' => [$me->id]],
            ['scene' => 'house.hall', 'tagged_user_ids' => [999999]],
        ] as $body) {
            $this->actingAs($me)
                ->post(route('games.invite'), $body)
                ->assertSessionHasErrors();
        }

        $this->assertSame(0, Message::count());
    }

    public function test_an_invite_is_refused_while_messaging_or_togetherness_is_off(): void
    {
        $me = User::factory()->create();
        $friend = User::factory()->create();
        $invite = ['scene' => 'house.hall', 'tagged_user_ids' => [$friend->id]];

        $this->setting('messaging_enabled', false);
        $this->actingAs($me)->post(route('games.invite'), $invite)->assertSessionHasErrors();

        $this->setting('messaging_enabled', true);
        $this->setting(GamesWorld::TOGETHER_SETTING, false);
        $this->actingAs($me)->post(route('games.invite'), $invite)->assertSessionHasErrors();

        $this->assertSame(0, Message::count());
    }

    public function test_an_invites_link_names_who_sent_it_only_when_they_are_real(): void
    {
        $me = User::factory()->create();
        $friend = User::factory()->create();
        $this->actingAs($me);

        $this->get(route('games.index', ['scene' => 'house.hall', 'with' => $friend->id]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('link.scene', 'house.hall')
                ->where('link.with', $friend->id));

        // Nobody, yourself, or a link to no place: nobody to follow.
        foreach ([999999, $me->id, 'abc', ''] as $with) {
            $this->get(route('games.index', ['scene' => 'house.hall', 'with' => $with]))
                ->assertInertia(fn (Assert $page) => $page
                    ->where('link.scene', 'house.hall')
                    ->missing('link.with'));
        }
        $this->get(route('games.index').'?scene=house.hall&with[]='.$friend->id)
            ->assertInertia(fn (Assert $page) => $page->missing('link.with'));
        $this->get(route('games.index', ['with' => $friend->id]))
            ->assertInertia(fn (Assert $page) => $page->where('link', null));
    }

    public function test_the_chat_knows_which_places_an_invite_can_link_to(): void
    {
        $me = User::factory()->create();

        $this->actingAs($me)
            ->get(route('messages.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('worldScenes', GamesWorld::sceneIds()));

        $this->actingAs($me)
            ->get(route('users.show', $me))
            ->assertInertia(fn (Assert $page) => $page
                ->where('worldScenes', GamesWorld::sceneIds()));
    }
}
