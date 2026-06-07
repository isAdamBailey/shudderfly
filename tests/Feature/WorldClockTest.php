<?php

namespace Tests\Feature;

use App\Events\WorldClockUpdated;
use App\Models\User;
use App\Models\WorldClockSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class WorldClockTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_world_clock(): void
    {
        $this->get(route('world-clock.index'))->assertRedirect(route('login'));
        $this->getJson(route('world-clock.cities.search', ['q' => 'tokyo']))
            ->assertUnauthorized();
    }

    public function test_world_clock_page_renders(): void
    {
        $this->actingAs(User::factory()->create());

        $this->get(route('world-clock.index'))->assertInertia(
            fn (Assert $page) => $page
                ->component('WorldClock/Index')
                ->where('maxCities', 6)
                ->has('defaultCities')
                ->where('defaultCities.0.timezone', 'America/New_York')
                ->has('worldClock', fn (Assert $wc) => $wc
                    ->has('cities')
                    ->has('face_preset')
                    ->has('timer_ends_at')
                    ->has('server_now')
                    ->etc())
        );
    }

    public function test_instance_seeds_default_cities(): void
    {
        $setting = WorldClockSetting::instance();

        $this->assertNotEmpty($setting->cities);
        $this->assertSame('America/New_York', $setting->cities[0]['timezone']);
        $this->assertLessThanOrEqual(config('world_clock.max_cities'), count($setting->cities));
        $this->assertSame(1, WorldClockSetting::count());
    }

    public function test_instance_heals_city_list_that_exceeds_the_limit(): void
    {
        $max = config('world_clock.max_cities');
        $cities = [];
        for ($i = 0; $i < $max + 4; $i++) {
            $cities[] = ['name' => "City {$i}", 'timezone' => 'UTC', 'country' => ''];
        }
        WorldClockSetting::create(['cities' => $cities]);

        // Reloading the singleton trims the over-limit list so settings saves
        // (which include the full city list) pass validation.
        $this->assertCount($max, WorldClockSetting::instance()->cities);
    }

    public function test_update_settings_persists_and_broadcasts(): void
    {
        Event::fake([WorldClockUpdated::class]);
        $this->actingAs(User::factory()->create());

        $this->putJson(route('world-clock.settings.update'), [
            'cities' => [
                ['name' => 'Berlin', 'timezone' => 'Europe/Berlin', 'country' => 'Germany'],
            ],
            'face_preset' => 'night',
            'hand_preset' => 'ornate',
            'numerals' => 'roman',
            'second_hand_mode' => 'tick',
        ])->assertOk()->assertJsonPath('face_preset', 'night');

        $setting = WorldClockSetting::instance();
        $this->assertSame('night', $setting->face_preset);
        $this->assertSame('Berlin', $setting->cities[0]['name']);
        $this->assertSame(1, WorldClockSetting::count());

        Event::assertDispatched(WorldClockUpdated::class);
    }

    public function test_update_settings_rejects_too_many_cities(): void
    {
        $this->actingAs(User::factory()->create());

        $cities = [];
        for ($i = 0; $i < config('world_clock.max_cities') + 1; $i++) {
            $cities[] = ['name' => "City {$i}", 'timezone' => 'UTC', 'country' => ''];
        }

        $this->putJson(route('world-clock.settings.update'), [
            'cities' => $cities,
            'face_preset' => 'theme',
            'hand_preset' => 'classic',
            'numerals' => 'arabic',
            'second_hand_mode' => 'smooth',
        ])->assertStatus(422);
    }

    public function test_guest_cannot_update_settings(): void
    {
        $this->putJson(route('world-clock.settings.update'), [
            'cities' => [],
            'face_preset' => 'theme',
            'hand_preset' => 'classic',
            'numerals' => 'arabic',
            'second_hand_mode' => 'smooth',
        ])->assertUnauthorized();
    }

    public function test_update_logo_persists_pinned_city_only(): void
    {
        $this->actingAs(User::factory()->create());

        WorldClockSetting::instance()->update([
            'face_preset' => 'night',
            'hand_preset' => 'ornate',
            'numerals' => 'roman',
        ]);

        $this->putJson(route('world-clock.logo.update'), [
            'enabled' => true,
            'cityName' => 'Tokyo',
            'timezone' => 'Asia/Tokyo',
        ])->assertOk()->assertJsonPath('logo.enabled', true);

        $logo = WorldClockSetting::instance()->logo;
        $this->assertSame('Tokyo', $logo['cityName']);
        $this->assertSame('Asia/Tokyo', $logo['timezone']);
        $this->assertTrue($logo['enabled']);
        $this->assertArrayNotHasKey('facePreset', $logo);
        $this->assertArrayNotHasKey('handPreset', $logo);
        $this->assertArrayNotHasKey('numerals', $logo);
    }

    public function test_start_and_stop_timer(): void
    {
        $this->actingAs(User::factory()->create());

        $this->postJson(route('world-clock.timer.start'), ['seconds' => 600])
            ->assertOk()
            ->assertJsonPath('timer_ends_at', fn ($v) => $v !== null);

        $endsAt = WorldClockSetting::instance()->timer_ends_at;
        $this->assertNotNull($endsAt);
        $this->assertEqualsWithDelta(600, now()->diffInSeconds($endsAt, false), 5);

        $this->deleteJson(route('world-clock.timer.stop'))
            ->assertOk()
            ->assertJsonPath('timer_ends_at', null);

        $this->assertNull(WorldClockSetting::instance()->timer_ends_at);
    }

    public function test_start_timer_validates_seconds(): void
    {
        $this->actingAs(User::factory()->create());

        $this->postJson(route('world-clock.timer.start'), ['seconds' => 0])
            ->assertStatus(422);
    }

    public function test_city_search_requires_query(): void
    {
        $this->actingAs(User::factory()->create());

        $this->getJson(route('world-clock.cities.search'))->assertStatus(422);
        $this->getJson(route('world-clock.cities.search', ['q' => 'a']))->assertStatus(422);
    }

    public function test_city_search_returns_matches(): void
    {
        $this->actingAs(User::factory()->create());

        $response = $this->getJson(route('world-clock.cities.search', ['q' => 'tok']));

        $response->assertOk();

        $results = $response->json();
        $this->assertNotEmpty($results);
        $this->assertContains('Asia/Tokyo', array_column($results, 'timezone'));

        foreach ($results as $city) {
            $this->assertArrayHasKey('name', $city);
            $this->assertArrayHasKey('timezone', $city);
            $this->assertArrayHasKey('country', $city);
        }
    }

    public function test_city_search_matches_by_country(): void
    {
        $this->actingAs(User::factory()->create());

        $response = $this->getJson(route('world-clock.cities.search', ['q' => 'japan']));

        $response->assertOk();
        $this->assertContains('Tokyo', array_column($response->json(), 'name'));
    }

    public function test_city_search_no_match_returns_empty(): void
    {
        $this->actingAs(User::factory()->create());

        $this->getJson(route('world-clock.cities.search', ['q' => 'zzzznowhere']))
            ->assertOk()
            ->assertExactJson([]);
    }
}
