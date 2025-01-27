<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\SiteSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_update_settings(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);
        $user->givePermissionTo('edit pages');

        // Create test settings
        $booleanSetting = SiteSetting::create([
            'key' => 'test_boolean',
            'value' => '0',
            'type' => 'boolean',
            'description' => 'Test boolean description'
        ]);

        $textSetting = SiteSetting::create([
            'key' => 'test_text',
            'value' => 'old value',
            'type' => 'text',
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
            'type' => 'boolean',
            'description' => 'Updated boolean description'
        ]);

        // Assert text setting was updated
        $this->assertDatabaseHas('site_settings', [
            'key' => 'test_text',
            'value' => 'new value',
            'type' => 'text',
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

    public function test_can_create_new_setting(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);
        $user->givePermissionTo('edit pages');

        $response = $this->post('/settings', [
            'key' => 'new_setting',
            'value' => 'test value',
            'description' => 'A test setting',
            'type' => 'text'
        ]);

        $response->assertRedirect(route('dashboard'));

        $this->assertDatabaseHas('site_settings', [
            'key' => 'new_setting',
            'value' => 'test value',
            'type' => 'text',
            'description' => 'A test setting'
        ]);

        // Test creating boolean setting
        $response = $this->post('/settings', [
            'key' => 'new_boolean_setting',
            'value' => true,
            'description' => 'A test boolean setting',
            'type' => 'boolean'
        ]);

        $this->assertDatabaseHas('site_settings', [
            'key' => 'new_boolean_setting',
            'value' => '1',
            'type' => 'boolean',
            'description' => 'A test boolean setting'
        ]);
    }

    public function test_create_setting_validation(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);
        $user->givePermissionTo('edit pages');

        // Create an initial setting for duplicate key test
        SiteSetting::create([
            'key' => 'existing_key',
            'value' => 'test',
            'type' => 'text',
            'description' => 'test'
        ]);

        // Test duplicate key
        $response = $this->post('/settings', [
            'key' => 'existing_key',
            'value' => 'test',
            'description' => 'test',
            'type' => 'text'
        ]);
        $response->assertSessionHasErrors('key');

        // Test key with spaces
        $response = $this->post('/settings', [
            'key' => 'invalid key with spaces',
            'value' => 'test',
            'description' => 'test',
            'type' => 'text'
        ]);
        $response->assertSessionHasErrors(['key' => 'The key cannot contain spaces.']);

        // Test missing key
        $response = $this->post('/settings', [
            'value' => 'test',
            'description' => 'test',
            'type' => 'text'
        ]);
        $response->assertSessionHasErrors('key');

        // Test invalid type
        $response = $this->post('/settings', [
            'key' => 'new_key',
            'value' => 'test',
            'description' => 'test',
            'type' => 'invalid_type'
        ]);
        $response->assertSessionHasErrors('type');
    }

    public function test_can_delete_setting(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);
        $user->givePermissionTo('edit pages');

        $setting = SiteSetting::create([
            'key' => 'test_setting',
            'value' => 'test value',
            'type' => 'text',
            'description' => 'Test setting description'
        ]);

        $response = $this->delete("/settings/{$setting->id}");

        $response->assertRedirect(route('dashboard'));
        $this->assertDatabaseMissing('site_settings', [
            'id' => $setting->id
        ]);
    }

    public function test_cannot_delete_nonexistent_setting(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);
        $user->givePermissionTo('edit pages');

        $response = $this->delete('/settings/999');
        $response->assertNotFound();
    }

    public function test_boolean_setting_type_conversion(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);
        $user->givePermissionTo('edit pages');

        // Test boolean setting with string "true"
        $response = $this->post('/settings', [
            'key' => 'test_bool_string',
            'value' => "true",
            'description' => 'Test boolean setting',
            'type' => 'boolean'
        ]);

        $this->assertDatabaseHas('site_settings', [
            'key' => 'test_bool_string',
            'value' => '1',
            'type' => 'boolean'
        ]);

        // Test boolean setting with boolean true
        $response = $this->post('/settings', [
            'key' => 'test_bool_true',
            'value' => true,
            'description' => 'Test boolean setting',
            'type' => 'boolean'
        ]);

        $this->assertDatabaseHas('site_settings', [
            'key' => 'test_bool_true',
            'value' => '1',
            'type' => 'boolean'
        ]);

        // Test boolean setting with string "1"
        $response = $this->post('/settings', [
            'key' => 'test_bool_one',
            'value' => "1",
            'description' => 'Test boolean setting',
            'type' => 'boolean'
        ]);

        $this->assertDatabaseHas('site_settings', [
            'key' => 'test_bool_one',
            'value' => '1',
            'type' => 'boolean'
        ]);
    }
} 
