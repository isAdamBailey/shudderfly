<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\Page;
use App\Models\User;
use App\Models\SiteSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_data(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);
        $user->givePermissionTo('edit pages');

        $books = Book::factory()->has(Page::factory(13))->count(3)->create();

        $response = $this->get(route('dashboard'));

        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('Dashboard/Index')
                ->has('settings', fn (Assert $page) => $page
                    ->each(fn (Assert $setting) => $setting
                        ->has('id')
                        ->has('key')
                        ->has('value')
                        ->has('type')
                        ->has('description')
                        ->where('type', fn ($type) => in_array($type, ['boolean', 'text']))
                    )
                )
        );
    }

    public function test_can_update_settings(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);
        $user->givePermissionTo('edit pages');

        // Create test settings
        $booleanSetting = SiteSetting::create([
            'key' => 'test_boolean',
            'value' => '0',
            'description' => 'Test boolean description'
        ]);

        $textSetting = SiteSetting::create([
            'key' => 'test_text',
            'value' => 'old value',
            'description' => 'Test text description'
        ]);

        $response = $this->put('/settings', [
            'settings' => [
                'test_boolean' => [
                    'value' => true,
                    'description' => 'Updated boolean description'
                ],
                'test_text' => [
                    'value' => 'new value',
                    'description' => 'Updated text description'
                ]
            ]
        ]);

        $response->assertRedirect(route('dashboard'));

        // Assert boolean setting was updated
        $this->assertDatabaseHas('site_settings', [
            'key' => 'test_boolean',
            'value' => '1',
            'description' => 'Updated boolean description'
        ]);

        // Assert text setting was updated
        $this->assertDatabaseHas('site_settings', [
            'key' => 'test_text',
            'value' => 'new value',
            'description' => 'Updated text description'
        ]);
    }

    public function test_settings_validation(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);
        $user->givePermissionTo('edit pages');

        // Test missing value
        $response = $this->put('/settings', [
            'settings' => [
                'test_key' => [
                    'description' => 'Some description'
                ]
            ]
        ]);
        $response->assertSessionHasErrors('settings.test_key');

        // Test missing description
        $response = $this->put('/settings', [
            'settings' => [
                'test_key' => [
                    'value' => 'some value'
                ]
            ]
        ]);
        $response->assertSessionHasErrors('settings.test_key');

        // Test invalid value type
        $response = $this->put('/settings', [
            'settings' => [
                'test_key' => [
                    'value' => [],
                    'description' => 'Some description'
                ]
            ]
        ]);
        $response->assertSessionHasErrors('settings.test_key');
    }
}
