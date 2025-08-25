<?php

namespace Tests\Feature;

use App\Models\Collage;
use App\Models\Page;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CollageLockingTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_lock_collage(): void
    {
        /** @var User $admin */
        $admin = User::factory()->create();
        $admin->givePermissionTo('admin');

        $collage = Collage::factory()->create(['is_locked' => false]);

        $response = $this->actingAs($admin)
            ->put(route('collages.update', $collage), [
                'is_locked' => true,
            ]);

        $response->assertRedirect();
        $this->assertTrue($collage->fresh()->is_locked);
    }

    public function test_admin_can_unlock_collage(): void
    {
        /** @var User $admin */
        $admin = User::factory()->create();
        $admin->givePermissionTo('admin');

        $collage = Collage::factory()->create(['is_locked' => true]);

        $response = $this->actingAs($admin)
            ->put(route('collages.update', $collage), [
                'is_locked' => false,
            ]);

        $response->assertRedirect();
        $this->assertFalse($collage->fresh()->is_locked);
    }

    public function test_non_admin_cannot_lock_collage(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        $collage = Collage::factory()->create(['is_locked' => false]);

        $response = $this->actingAs($user)
            ->put(route('collages.update', $collage), [
                'is_locked' => true,
            ]);

        $response->assertForbidden();
        $this->assertFalse($collage->fresh()->is_locked);
    }

    public function test_cannot_add_page_to_locked_collage(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        $collage = Collage::factory()->create(['is_locked' => true]);
        $page = Page::factory()->create();

        $response = $this->actingAs($user)
            ->post(route('collage-page.store'), [
                'collage_id' => $collage->id,
                'page_id' => $page->id,
            ]);

        $response->assertRedirect();
        $response->assertSessionHasErrors(['collage']);
        $this->assertFalse($collage->pages()->where('page_id', $page->id)->exists());
    }

    public function test_can_add_page_to_unlocked_collage(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        $collage = Collage::factory()->create(['is_locked' => false]);
        $page = Page::factory()->create();

        $response = $this->actingAs($user)
            ->post(route('collage-page.store'), [
                'collage_id' => $collage->id,
                'page_id' => $page->id,
            ]);

        $response->assertRedirect();
        $this->assertTrue($collage->pages()->where('page_id', $page->id)->exists());
    }

    public function test_archiving_collage_unlocks_it(): void
    {
        /** @var User $admin */
        $admin = User::factory()->create();
        $admin->givePermissionTo('admin');

        $collage = Collage::factory()->create([
            'is_locked' => true,
            'is_archived' => false,
        ]);

        $response = $this->actingAs($admin)
            ->patch(route('collages.archive', $collage));

        $collage->refresh();
        $response->assertRedirect(route('collages.archived'));
        $this->assertTrue($collage->is_archived);
        $this->assertFalse($collage->is_locked);
    }

    public function test_restoring_collage_keeps_unlocked_state(): void
    {
        /** @var User $admin */
        $admin = User::factory()->create();
        $admin->givePermissionTo('admin');

        $collage = Collage::factory()->create([
            'is_archived' => true,
            'is_locked' => false,
        ]);

        $response = $this->actingAs($admin)
            ->patch(route('collages.restore', $collage));

        $collage->refresh();
        $response->assertRedirect(route('collages.index'));
        $this->assertFalse($collage->is_archived);
        $this->assertFalse($collage->is_locked);
    }

    public function test_lock_update_requires_boolean_value(): void
    {
        /** @var User $admin */
        $admin = User::factory()->create();
        $admin->givePermissionTo('admin');

        $collage = Collage::factory()->create();

        $response = $this->actingAs($admin)
            ->put(route('collages.update', $collage), [
                'is_locked' => 'not-a-boolean',
            ]);

        $response->assertSessionHasErrors(['is_locked']);
    }

    public function test_lock_update_requires_is_locked_field(): void
    {
        /** @var User $admin */
        $admin = User::factory()->create();
        $admin->givePermissionTo('admin');

        $collage = Collage::factory()->create();

        $response = $this->actingAs($admin)
            ->put(route('collages.update', $collage), []);

        $response->assertSessionHasErrors(['is_locked']);
    }

    public function test_lock_status_is_included_in_collage_model(): void
    {
        $collage = Collage::factory()->create(['is_locked' => true]);

        $this->assertTrue($collage->is_locked);
        $this->assertContains('is_locked', $collage->getFillable());
    }

    public function test_new_collages_are_unlocked_by_default(): void
    {
        $collage = Collage::factory()->create();

        $this->assertFalse($collage->is_locked);
    }

    public function test_locked_collages_show_in_frontend_data(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        $lockedCollage = Collage::factory()->create(['is_locked' => true]);
        $unlockedCollage = Collage::factory()->create(['is_locked' => false]);

        $response = $this->actingAs($user)->get(route('collages.index'));

        $response->assertOk();

        $collages = $response->viewData('page')['props']['collages'];

        $lockedCollageData = collect($collages)->firstWhere('id', $lockedCollage->id);
        $unlockedCollageData = collect($collages)->firstWhere('id', $unlockedCollage->id);

        $this->assertTrue($lockedCollageData['is_locked']);
        $this->assertFalse($unlockedCollageData['is_locked']);
    }

    public function test_archived_locked_collages_show_unlocked_status(): void
    {
        /** @var User $admin */
        $admin = User::factory()->create();
        $admin->givePermissionTo('admin');

        // Create a locked collage, then archive it
        $collage = Collage::factory()->create(['is_locked' => true]);

        $this->actingAs($admin)
            ->patch(route('collages.archive', $collage));

        $response = $this->actingAs($admin)->get(route('collages.archived'));

        $response->assertOk();

        $collages = $response->viewData('page')['props']['collages'];
        $archivedCollageData = collect($collages)->firstWhere('id', $collage->id);

        $this->assertFalse($archivedCollageData['is_locked']);
    }
}
