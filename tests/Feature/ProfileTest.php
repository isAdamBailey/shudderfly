<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_profile_page_is_displayed()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->get('/profile');

        $response->assertOk();
    }

    public function test_profile_information_can_be_updated()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('edit profile');

        $response = $this
            ->actingAs($user)
            ->patch('/profile', [
                'name' => 'Test User',
                'email' => 'test@example.com',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/profile');

        $user->refresh();

        $this->assertSame('Test User', $user->name);
        $this->assertSame('test@example.com', $user->email);
        $this->assertNull($user->email_verified_at);
    }

    public function test_email_verification_status_is_unchanged_when_the_email_address_is_unchanged()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('edit profile');

        $response = $this
            ->actingAs($user)
            ->patch('/profile', [
                'name' => 'Test User',
                'email' => $user->email,
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/profile');

        $this->assertNotNull($user->refresh()->email_verified_at);
    }

    public function test_user_can_delete_their_account()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('edit profile');

        $response = $this
            ->actingAs($user)
            ->delete('/profile', [
                'password' => 'password',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/');

        $this->assertGuest();
        $this->assertNull($user->fresh());
    }

    public function test_correct_password_must_be_provided_to_delete_account()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('edit profile');

        $response = $this
            ->actingAs($user)
            ->from('/profile')
            ->delete('/profile', [
                'password' => 'wrong-password',
            ]);

        $response
            ->assertSessionHasErrors('password')
            ->assertRedirect('/profile');

        $this->assertNotNull($user->fresh());
    }

    public function test_avatar_can_be_updated()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch('/profile/avatar', [
                'avatar' => 'avatar-1',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/profile');

        $user->refresh();

        $this->assertSame('avatar-1', $user->avatar);
    }

    public function test_avatar_can_be_updated_without_edit_profile_permission()
    {
        $user = User::factory()->create();
        // User does NOT have 'edit profile' permission

        $response = $this
            ->actingAs($user)
            ->patch('/profile/avatar', [
                'avatar' => 'avatar-2',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/profile');

        $user->refresh();

        $this->assertSame('avatar-2', $user->avatar);
    }

    public function test_avatar_can_be_cleared()
    {
        $user = User::factory()->create(['avatar' => 'avatar-3']);

        $response = $this
            ->actingAs($user)
            ->patch('/profile/avatar', [
                'avatar' => null,
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/profile');

        $user->refresh();

        $this->assertNull($user->avatar);
    }

    public function test_invalid_avatar_is_rejected()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->from('/profile')
            ->patch('/profile/avatar', [
                'avatar' => 'invalid-avatar',
            ]);

        $response
            ->assertSessionHasErrors('avatar')
            ->assertRedirect('/profile');

        $user->refresh();

        $this->assertNotSame('invalid-avatar', $user->avatar);
    }

    public function test_avatar_update_requires_authentication()
    {
        $response = $this->patch('/profile/avatar', [
            'avatar' => 'avatar-1',
        ]);

        $response->assertRedirect('/login');
    }
}
