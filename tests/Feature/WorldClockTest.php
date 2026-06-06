<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
        );
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
