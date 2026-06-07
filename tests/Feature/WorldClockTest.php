<?php

namespace Tests\Feature;

use App\Models\TimezoneLabel;
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
        $this->putJson(route('world-clock.labels.update'), ['timezone' => 'Asia/Tokyo', 'label' => 'Office'])
            ->assertUnauthorized();
    }

    public function test_world_clock_page_renders(): void
    {
        $this->actingAs(User::factory()->create());

        TimezoneLabel::create(['timezone' => 'Asia/Tokyo', 'label' => 'Office']);

        $this->get(route('world-clock.index'))->assertInertia(
            fn (Assert $page) => $page
                ->component('WorldClock/Index')
                ->where('maxCities', 6)
                ->has('defaultCities')
                ->where('defaultCities.0.timezone', 'America/New_York')
                ->where('timezoneLabels.Asia/Tokyo', 'Office')
        );
    }

    public function test_user_without_edit_pages_cannot_search_or_relabel(): void
    {
        $this->actingAs(User::factory()->create());

        $this->getJson(route('world-clock.cities.search', ['q' => 'tokyo']))->assertForbidden();
        $this->putJson(route('world-clock.labels.update'), ['timezone' => 'Asia/Tokyo', 'label' => 'Office'])
            ->assertForbidden();
    }

    public function test_city_search_requires_query(): void
    {
        $user = User::factory()->create();
        $user->givePermissionTo('edit pages');
        $this->actingAs($user);

        $this->getJson(route('world-clock.cities.search'))->assertStatus(422);
        $this->getJson(route('world-clock.cities.search', ['q' => 'a']))->assertStatus(422);
    }

    public function test_city_search_returns_matches(): void
    {
        $user = User::factory()->create();
        $user->givePermissionTo('edit pages');
        $this->actingAs($user);

        $response = $this->getJson(route('world-clock.cities.search', ['q' => 'tok']));

        $response->assertOk();

        $results = $response->json();
        $this->assertNotEmpty($results);
        $this->assertContains('Asia/Tokyo', array_column($results, 'timezone'));

        foreach ($results as $city) {
            $this->assertArrayHasKey('name', $city);
            $this->assertArrayHasKey('timezone', $city);
            $this->assertArrayHasKey('region', $city);
        }
    }

    public function test_city_search_matches_by_region(): void
    {
        $user = User::factory()->create();
        $user->givePermissionTo('edit pages');
        $this->actingAs($user);

        $response = $this->getJson(route('world-clock.cities.search', ['q' => 'argentina']));

        $response->assertOk();
        $this->assertContains('Buenos Aires', array_column($response->json(), 'name'));
    }

    public function test_city_search_no_match_returns_empty(): void
    {
        $user = User::factory()->create();
        $user->givePermissionTo('edit pages');
        $this->actingAs($user);

        $this->getJson(route('world-clock.cities.search', ['q' => 'zzzznowhere']))
            ->assertOk()
            ->assertExactJson([]);
    }

    public function test_user_with_edit_pages_can_set_and_clear_a_label(): void
    {
        $user = User::factory()->create();
        $user->givePermissionTo('edit pages');
        $this->actingAs($user);

        $this->putJson(route('world-clock.labels.update'), [
            'timezone' => 'Asia/Tokyo',
            'label' => '  Office  ',
        ])->assertOk()->assertJson(['timezone' => 'Asia/Tokyo', 'label' => 'Office']);

        $this->assertDatabaseHas('timezone_labels', [
            'timezone' => 'Asia/Tokyo',
            'label' => 'Office',
        ]);

        $this->putJson(route('world-clock.labels.update'), [
            'timezone' => 'Asia/Tokyo',
            'label' => '   ',
        ])->assertOk()->assertJson(['timezone' => 'Asia/Tokyo', 'label' => null]);

        $this->assertDatabaseMissing('timezone_labels', ['timezone' => 'Asia/Tokyo']);
    }

    public function test_label_update_rejects_invalid_timezone(): void
    {
        $user = User::factory()->create();
        $user->givePermissionTo('edit pages');
        $this->actingAs($user);

        $this->putJson(route('world-clock.labels.update'), [
            'timezone' => 'Not/A_Timezone',
            'label' => 'Nonsense',
        ])->assertStatus(422);
    }
}
