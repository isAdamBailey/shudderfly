<?php

namespace Tests\Feature;

use App\Models\SiteSetting;
use App\Models\User;
use App\Support\BroadcastChannel;
use App\Support\GamesWorld;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * The Games World together (issue #174): the setting that switches it on and
 * the presence channels people join while it is.
 */
class GamesWorldTogetherTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Tests broadcast through the null driver, which authorizes nothing.
        // Pusher signs a presence auth locally (no connection is opened), so
        // switch to it and register the channels on it.
        config(['broadcasting.default' => 'pusher']);
        Broadcast::forgetDrivers();
        require base_path('routes/channels.php');
    }

    private function together(bool $on = true): void
    {
        SiteSetting::where('key', GamesWorld::TOGETHER_SETTING)->update(['value' => $on ? '1' : '0']);
    }

    private function join(string $channel): TestResponse
    {
        return $this->postJson('/broadcasting/auth', [
            'socket_id' => '1234.5678',
            'channel_name' => 'presence-'.BroadcastChannel::name($channel),
        ]);
    }

    /** The member a presence auth hands Pusher, as every other member sees it. */
    private function member(TestResponse $response): array
    {
        return json_decode($response->assertOk()->json('channel_data'), true)['user_info'];
    }

    public function test_the_setting_exists_defaults_off_and_is_shared(): void
    {
        $setting = SiteSetting::where('key', GamesWorld::TOGETHER_SETTING)->first();

        $this->assertNotNull($setting);
        $this->assertSame('boolean', $setting->type);
        $this->assertFalse($setting->value);
        $this->assertFalse(GamesWorld::togetherEnabled());

        $this->actingAs(User::factory()->create())
            ->get(route('games.index'))
            ->assertInertia(fn ($page) => $page->where('settings.'.GamesWorld::TOGETHER_SETTING, '0'));
    }

    public function test_a_logged_in_user_joins_the_roster_as_their_id_and_name_only(): void
    {
        $this->together();
        $user = User::factory()->create(['name' => 'Butt Friend']);

        $member = $this->member($this->actingAs($user)->join('world'));

        $this->assertSame(['id' => $user->id, 'name' => 'Butt Friend'], $member);
    }

    public function test_a_logged_in_user_joins_the_road_and_a_room(): void
    {
        $this->together();
        $user = User::factory()->create();
        $this->actingAs($user);

        foreach (['road', 'house.hall', 'library.hall'] as $scene) {
            $this->assertSame(
                ['id' => $user->id, 'name' => $user->name],
                $this->member($this->join("world.{$scene}")),
                $scene
            );
        }
    }

    public function test_a_scene_that_is_not_in_the_world_is_refused(): void
    {
        $this->together();
        $this->actingAs(User::factory()->create());

        $this->join('world.nowhere')->assertForbidden();
        $this->join('world.house.attic')->assertForbidden();
    }

    public function test_a_guest_is_refused(): void
    {
        $this->together();

        $this->join('world')->assertUnauthorized();
        $this->join('world.road')->assertUnauthorized();
    }

    public function test_everyone_is_refused_while_the_setting_is_off(): void
    {
        $this->together(false);
        $this->actingAs(User::factory()->create());

        $this->join('world')->assertForbidden();
        $this->join('world.road')->assertForbidden();
        $this->join('world.house.hall')->assertForbidden();
    }
}
