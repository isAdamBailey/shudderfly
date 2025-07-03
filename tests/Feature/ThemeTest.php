<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ThemeTest extends TestCase
{
    use RefreshDatabase;

    public function test_app_blade_has_data_theme_attribute(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $user->givePermissionTo('edit pages');
        $this->actingAs($user);

        $response = $this->get(route('dashboard'));

        // Check that the response contains the data-theme attribute on the <html> tag
        $response->assertSee('<html', false);
        $this->assertMatchesRegularExpression('/<html[^>]+data-theme="/', $response->getContent());
    }

    public function test_data_theme_attribute_value(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $user->givePermissionTo('edit pages');
        $this->actingAs($user);

        // Simulate December for 'christmas' theme
        $this->travelTo('2024-12-15');
        $response = $this->get(route('dashboard'));
        $response->assertSee('<html', false);
        $this->assertMatchesRegularExpression('/<html[^>]+data-theme="christmas"/', $response->getContent());

        // Simulate July for 'fireworks' theme
        $this->travelTo('2024-07-04');
        $response = $this->get(route('dashboard'));
        $response->assertSee('<html', false);
        $this->assertMatchesRegularExpression('/<html[^>]+data-theme="fireworks"/', $response->getContent());

        // Simulate March for no theme
        $this->travelTo('2024-03-15');
        $response = $this->get(route('dashboard'));
        $response->assertSee('<html', false);
        $this->assertMatchesRegularExpression('/<html[^>]+data-theme=""/', $response->getContent());

        $this->travelBack();
    }

    public function test_christmas_theme_in_december(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $user->givePermissionTo('edit pages');
        $this->actingAs($user);

        // Mock the current date to be December
        $this->travelTo('2024-12-15');

        $response = $this->get(route('dashboard'));

        // Should have christmas theme
        $this->assertStringContainsString('data-theme="christmas"', $response->getContent());

        $this->travelBack();
    }

    public function test_fireworks_theme_in_july(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $user->givePermissionTo('edit pages');
        $this->actingAs($user);

        // Mock the current date to be July
        $this->travelTo('2024-07-04');

        $response = $this->get(route('dashboard'));

        // Should have fireworks theme
        $this->assertStringContainsString('data-theme="fireworks"', $response->getContent());

        $this->travelBack();
    }

    public function test_no_theme_in_other_months(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $user->givePermissionTo('edit pages');
        $this->actingAs($user);

        // Mock the current date to be a non-theme month (e.g., March)
        $this->travelTo('2024-03-15');

        $response = $this->get(route('dashboard'));

        // Should have empty theme
        $this->assertStringContainsString('data-theme=""', $response->getContent());

        $this->travelBack();
    }

    public function test_theme_prop_is_passed_to_inertia(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $user->givePermissionTo('edit pages');
        $this->actingAs($user);

        // Mock the current date to be December
        $this->travelTo('2024-12-15');

        $response = $this->get(route('dashboard'));

        // Check that the theme is included in the Inertia page props
        $response->assertInertia(
            fn ($page) => $page->where('theme', 'christmas')
        );

        $this->travelBack();
    }

    public function test_theme_prop_is_empty_in_non_theme_months(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $user->givePermissionTo('edit pages');
        $this->actingAs($user);

        // Mock the current date to be March
        $this->travelTo('2024-03-15');

        $response = $this->get(route('dashboard'));

        // Check that the theme is empty in non-theme months
        $response->assertInertia(
            fn ($page) => $page->where('theme', '')
        );

        $this->travelBack();
    }

    public function test_theme_works_on_different_pages(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $user->givePermissionTo('edit pages');
        $this->actingAs($user);

        // Mock the current date to be December
        $this->travelTo('2024-12-15');

        // Test multiple pages to ensure theme is consistent
        $pages = [
            route('dashboard'),
            route('books.index'),
            route('welcome'),
        ];

        foreach ($pages as $page) {
            $response = $this->get($page);
            $this->assertStringContainsString('data-theme="christmas"', $response->getContent());
        }

        $this->travelBack();
    }

    public function test_theme_works_for_unauthenticated_users(): void
    {
        // Mock the current date to be July
        $this->travelTo('2024-07-04');

        $response = $this->get(route('login'));

        // Should have fireworks theme even for unauthenticated users
        $response->assertSee('<html', false);
        $this->assertMatchesRegularExpression('/<html[^>]+data-theme="fireworks"/', $response->getContent());

        $this->travelBack();
    }

    public function test_theme_switches_correctly_between_months(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $user->givePermissionTo('edit pages');
        $this->actingAs($user);

        // Test December
        $this->travelTo('2024-12-15');
        $response = $this->get(route('dashboard'));
        $this->assertStringContainsString('data-theme="christmas"', $response->getContent());
        $this->travelBack();

        // Test July
        $this->travelTo('2024-07-04');
        $response = $this->get(route('dashboard'));
        $this->assertStringContainsString('data-theme="fireworks"', $response->getContent());
        $this->travelBack();

        // Test March (no theme)
        $this->travelTo('2024-03-15');
        $response = $this->get(route('dashboard'));
        $this->assertStringContainsString('data-theme=""', $response->getContent());
        $this->travelBack();
    }

    public function test_debug_response_content(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $user->givePermissionTo('edit pages');
        $this->actingAs($user);

        // Mock the current date to be July
        $this->travelTo('2024-07-04');

        $response = $this->get(route('welcome'));

        // Debug: Let's see what's actually in the response
        $content = $response->getContent();

        // Check if data-theme is present
        $this->assertStringContainsString('data-theme', $content);

        // Check if fireworks theme is present
        $this->assertStringContainsString('data-theme="fireworks"', $content);

        $this->travelBack();
    }
}
