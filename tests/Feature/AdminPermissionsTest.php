<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminPermissionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_users_permissions_are_updated()
    {
        $this->actingAs($user = User::factory()->create());
        $user->givePermissionTo('admin');

        $editUser = User::factory()->create();
        $this->assertFalse($editUser->hasPermissionTo('edit pages'));

        $payload = [
            'user' => $editUser->toArray(),
            'permissions' => ['edit pages'],
        ];
        $response = $this->put(route('admin.permissions'), $payload);

        $this->assertTrue($editUser->fresh()->hasPermissionTo('edit pages'));

        $response->assertRedirect(route('welcome'));
    }

    public function test_users_permissions_are_revoked()
    {
        $this->actingAs($user = User::factory()->create());
        $user->givePermissionTo('admin');

        $editUser = User::factory()->create();
        $editUser->givePermissionTo('edit pages');
        $this->assertTrue($editUser->hasPermissionTo('edit pages'));

        $payload = [
            'user' => $editUser->toArray(),
            'permissions' => [],
        ];
        $response = $this->put(route('admin.permissions'), $payload);

        $this->assertFalse($editUser->fresh()->hasPermissionTo('edit pages'));

        $response->assertRedirect(route('welcome'));
    }

    public function test_users_can_be_deleted()
    {
        $this->actingAs($user = User::factory()->create());
        $user->givePermissionTo('admin');

        $deleteUser = User::factory()->create();
        $deleteUser->givePermissionTo('edit pages');
        $this->assertTrue($deleteUser->hasPermissionTo('edit pages'));

        $payload = [
            'email' => $deleteUser->email,
        ];
        $response = $this->delete(route('admin.destroy'), $payload);

        $this->assertFalse(User::where('id', $deleteUser->id)->exists());

        $response->assertRedirect(route('welcome'));
    }

    public function test_non_admin_users_cannot_update_permissions()
    {
        $this->actingAs($user = User::factory()->create());
        // User does not have admin permission

        $editUser = User::factory()->create();

        $payload = [
            'user' => $editUser->toArray(),
            'permissions' => ['edit pages'],
        ];
        $response = $this->put(route('admin.permissions'), $payload);

        $response->assertStatus(403); // Forbidden
    }

    public function test_non_admin_users_cannot_delete_users()
    {
        $this->actingAs($user = User::factory()->create());
        // User does not have admin permission

        $deleteUser = User::factory()->create();

        $payload = [
            'email' => $deleteUser->email,
        ];
        $response = $this->delete(route('admin.destroy'), $payload);

        $response->assertStatus(403); // Forbidden
        $this->assertTrue(User::where('id', $deleteUser->id)->exists());
    }

    public function test_super_admin_can_grant_super_admin()
    {
        $this->actingAs($user = User::factory()->create());
        $user->givePermissionTo(['admin', 'super admin']);

        $editUser = User::factory()->create();

        $payload = [
            'user' => $editUser->toArray(),
            'permissions' => ['super admin'],
        ];
        $response = $this->put(route('admin.permissions'), $payload);

        $response->assertRedirect(route('welcome'));
        $this->assertTrue($editUser->fresh()->hasPermissionTo('super admin'));
    }

    public function test_admin_without_super_admin_cannot_grant_super_admin()
    {
        $this->actingAs($user = User::factory()->create());
        $user->givePermissionTo('admin');

        $editUser = User::factory()->create();

        $payload = [
            'user' => $editUser->toArray(),
            'permissions' => ['super admin'],
        ];
        $response = $this->put(route('admin.permissions'), $payload);

        $response->assertStatus(403);
        $this->assertFalse($editUser->fresh()->hasPermissionTo('super admin'));
    }

    public function test_admin_without_super_admin_cannot_revoke_super_admin()
    {
        $this->actingAs($user = User::factory()->create());
        $user->givePermissionTo('admin');

        $editUser = User::factory()->create();
        $editUser->givePermissionTo('super admin');

        $payload = [
            'user' => $editUser->toArray(),
            'permissions' => [],
        ];
        $response = $this->put(route('admin.permissions'), $payload);

        $response->assertStatus(403);
        $this->assertTrue($editUser->fresh()->hasPermissionTo('super admin'));
    }

    public function test_admin_can_change_other_permissions_of_a_super_admin()
    {
        $this->actingAs($user = User::factory()->create());
        $user->givePermissionTo('admin');

        $editUser = User::factory()->create();
        $editUser->givePermissionTo('super admin');

        $payload = [
            'user' => $editUser->toArray(),
            'permissions' => ['super admin', 'edit pages'],
        ];
        $response = $this->put(route('admin.permissions'), $payload);

        $response->assertRedirect(route('welcome'));
        $this->assertTrue($editUser->fresh()->hasPermissionTo('edit pages'));
        $this->assertTrue($editUser->fresh()->hasPermissionTo('super admin'));
    }

    public function test_last_super_admin_cannot_be_demoted()
    {
        $this->actingAs($user = User::factory()->create());
        $user->givePermissionTo(['admin', 'super admin']);

        $payload = [
            'user' => $user->toArray(),
            'permissions' => ['admin'],
        ];
        $response = $this->put(route('admin.permissions'), $payload);

        $response->assertSessionHasErrors('permissions');
        $this->assertTrue($user->fresh()->can('super admin'));
    }

    public function test_super_admin_can_be_demoted_when_another_one_remains()
    {
        $this->actingAs($user = User::factory()->create());
        $user->givePermissionTo(['admin', 'super admin']);

        $otherSuperAdmin = User::factory()->create();
        $otherSuperAdmin->givePermissionTo('super admin');

        $payload = [
            'user' => $otherSuperAdmin->toArray(),
            'permissions' => [],
        ];
        $response = $this->put(route('admin.permissions'), $payload);

        $response->assertRedirect(route('welcome'));
        $this->assertFalse($otherSuperAdmin->fresh()->can('super admin'));
    }

    public function test_admin_without_super_admin_cannot_delete_a_super_admin()
    {
        $this->actingAs($user = User::factory()->create());
        $user->givePermissionTo('admin');

        $superAdmin = User::factory()->create();
        $superAdmin->givePermissionTo('super admin');

        $response = $this->delete(route('admin.destroy'), ['email' => $superAdmin->email]);

        $response->assertStatus(403);
        $this->assertTrue(User::whereKey($superAdmin->getKey())->exists());
    }

    public function test_last_super_admin_cannot_be_deleted()
    {
        $this->actingAs($user = User::factory()->create());
        $user->givePermissionTo(['admin', 'super admin']);

        $response = $this->delete(route('admin.destroy'), ['email' => $user->email]);

        $response->assertSessionHasErrors('email');
        $this->assertTrue(User::whereKey($user->getKey())->exists());
    }
}
