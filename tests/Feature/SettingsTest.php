<?php

namespace Tests\Feature;

use App\Models\SiteSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_update_settings(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);
        $user->givePermissionTo('admin');

        // Create test settings
        $booleanSetting = SiteSetting::create([
            'key' => 'test_boolean',
            'value' => '0',
            'type' => 'boolean',
            'description' => 'Test boolean description',
        ]);

        $textSetting = SiteSetting::create([
            'key' => 'test_text',
            'value' => 'old value',
            'type' => 'text',
            'description' => 'Test text description',
        ]);

        $response = $this->put('/settings', [
            'settings' => [
                'test_boolean' => [
                    'value' => true,
                    'description' => 'Updated boolean description',
                ],
                'test_text' => [
                    'value' => 'new value',
                    'description' => 'Updated text description',
                ],
            ],
        ]);

        $response->assertRedirect(route('dashboard'));

        // Assert boolean setting was updated
        $this->assertDatabaseHas('site_settings', [
            'key' => 'test_boolean',
            'value' => '1',
            'type' => 'boolean',
            'description' => 'Updated boolean description',
        ]);

        // Assert text setting was updated
        $this->assertDatabaseHas('site_settings', [
            'key' => 'test_text',
            'value' => 'new value',
            'type' => 'text',
            'description' => 'Updated text description',
        ]);
    }

    public function test_settings_validation(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);
        $user->givePermissionTo('admin');

        // Test missing value
        $response = $this->put('/settings', [
            'settings' => [
                'test_key' => [
                    'description' => 'Some description',
                ],
            ],
        ]);
        $response->assertSessionHasErrors('settings.test_key');

        // Test missing description
        $response = $this->put('/settings', [
            'settings' => [
                'test_key' => [
                    'value' => 'some value',
                ],
            ],
        ]);
        $response->assertSessionHasErrors('settings.test_key');

        // Test invalid value type
        $response = $this->put('/settings', [
            'settings' => [
                'test_key' => [
                    'value' => [],
                    'description' => 'Some description',
                ],
            ],
        ]);
        $response->assertSessionHasErrors('settings.test_key');
    }
}
