<?php

namespace Tests\Feature;

use App\Events\CollagePageRemoved;
use App\Models\Book;
use App\Models\Collage;
use App\Models\Page;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CollagesTest extends TestCase
{
    use RefreshDatabase;

    public function test_collages_index_page_is_displayed(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $this->actingAs($user);

        // Create a book first
        $book = Book::factory()->create();

        // Create some collages with pages
        $collages = Collage::factory()
            ->count(5)
            ->create();

        // Attach pages to collages
        foreach ($collages as $collage) {
            $pages = Page::factory()
                ->for($book)
                ->count(2)
                ->create();
            $collage->pages()->attach($pages);
        }

        $response = $this->get(route('collages.index'));

        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('Collages/Index')
                ->has('collages', 5)
                ->has('collages.0.pages')
        );
    }

    public function test_archived_collages_page_is_displayed(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $this->actingAs($user);

        // Create a book first
        $book = Book::factory()->create();

        // Create some collages and archive them
        $collages = Collage::factory()
            ->count(3)
            ->create();

        // Attach pages to collages
        foreach ($collages as $collage) {
            $pages = Page::factory()
                ->for($book)
                ->count(2)
                ->create();
            $collage->pages()->attach($pages);
            $collage->update(['is_archived' => true]);
        }

        $response = $this->get(route('collages.archived'));

        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('Collages/Archived')
                ->has('collages', 3)
                ->has('collages.0.pages')
        );
    }

    public function test_collage_can_be_created(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $this->actingAs($user);
        $user->givePermissionTo('admin'); // Add permission for collage creation

        $response = $this->post(route('collages.store'));

        $this->assertDatabaseCount('collages', 1);
        $this->assertDatabaseHas('collages', [
            'storage_path' => null,
            'is_archived' => false,
        ]);

        $response->assertRedirect(route('collages.index'));
    }

    public function test_collage_can_be_archived(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $this->actingAs($user);
        $user->givePermissionTo('admin'); // Add permission for collage archiving

        $collage = Collage::factory()->create(['is_archived' => false]);

        $response = $this->patch(route('collages.archive', $collage));

        $this->assertDatabaseHas('collages', [
            'id' => $collage->id,
            'is_archived' => true,
        ]);

        $response->assertRedirect(route('collages.archived'));
    }

    public function test_collage_can_be_restored(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $this->actingAs($user);
        $user->givePermissionTo('admin'); // Add permission for collage restoration

        $collage = Collage::factory()->create(['is_archived' => true]);

        $response = $this->patch(route('collages.restore', $collage));

        $this->assertDatabaseHas('collages', [
            'id' => $collage->id,
            'is_archived' => false,
        ]);

        $response->assertRedirect(route('collages.index'));
    }

    public function test_collage_can_be_permanently_deleted(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $this->actingAs($user);
        $user->givePermissionTo('admin'); // Add permission for collage deletion

        $collage = Collage::factory()->create();

        $response = $this->delete(route('collages.destroy', $collage));

        $this->assertDatabaseMissing('collages', [
            'id' => $collage->id,
        ]);

        $response->assertRedirect(route('collages.archived'));
    }

    public function test_archived_collage_can_be_permanently_deleted(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $this->actingAs($user);
        $user->givePermissionTo('admin'); // Add permission for collage deletion

        $collage = Collage::factory()->create(['is_archived' => true]);

        $response = $this->delete(route('collages.destroy', $collage));

        $this->assertDatabaseMissing('collages', [
            'id' => $collage->id,
        ]);

        $response->assertRedirect(route('collages.archived'));
    }

    public function test_index_only_shows_non_archived_collages(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $this->actingAs($user);

        // Create active collages
        $activeCollages = Collage::factory()->count(2)->create(['is_archived' => false]);

        // Create archived collages
        $archivedCollages = Collage::factory()->count(3)->create(['is_archived' => true]);

        $response = $this->get(route('collages.index'));

        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('Collages/Index')
                ->has('collages', 2) // Only active collages
        );
    }

    public function test_archived_page_only_shows_archived_collages(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $this->actingAs($user);

        // Create active collages
        $activeCollages = Collage::factory()->count(2)->create(['is_archived' => false]);

        // Create archived collages
        $archivedCollages = Collage::factory()->count(3)->create(['is_archived' => true]);

        $response = $this->get(route('collages.archived'));

        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('Collages/Archived')
                ->has('collages', 3) // Only archived collages
        );
    }

    public function test_unauthorized_user_cannot_archive_collage(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $this->actingAs($user);
        // No admin permission

        $collage = Collage::factory()->create(['is_archived' => false]);

        $response = $this->patch(route('collages.archive', $collage));

        $response->assertStatus(403);

        $this->assertDatabaseHas('collages', [
            'id' => $collage->id,
            'is_archived' => false, // Should remain unchanged
        ]);
    }

    public function test_unauthorized_user_cannot_restore_collage(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $this->actingAs($user);
        // No admin permission

        $collage = Collage::factory()->create(['is_archived' => true]);

        $response = $this->patch(route('collages.restore', $collage));

        $response->assertStatus(403);

        $this->assertDatabaseHas('collages', [
            'id' => $collage->id,
            'is_archived' => true, // Should remain unchanged
        ]);
    }

    public function test_unauthorized_user_cannot_delete_collage(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $this->actingAs($user);
        // No admin permission

        $collage = Collage::factory()->create();

        $response = $this->delete(route('collages.destroy', $collage));

        $response->assertStatus(403);

        $this->assertDatabaseHas('collages', [
            'id' => $collage->id, // Should still exist
        ]);
    }

    public function test_collage_pdf_generation_can_be_queued(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $this->actingAs($user);
        $user->givePermissionTo('admin'); // Add permission for PDF generation

        $collage = Collage::factory()->create();

        $response = $this->post(route('collages.generate-pdf', $collage));

        $response->assertRedirect(route('collages.archived'))
            ->assertSessionHas('success', 'PDF generation has been queued. You will receive an email when it\'s ready.');
    }

    public function test_collage_page_removed_event_is_broadcast_on_page_removal(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $this->actingAs($user);
        $user->givePermissionTo('edit pages');

        $book = Book::factory()->create();
        $collage = Collage::factory()->create();
        $page = Page::factory()->for($book)->create();
        $collage->pages()->attach($page);

        Event::fake();

        $response = $this->delete(route('collage-page.destroy', [$collage, $page]));

        $response->assertRedirect();
        $this->assertDatabaseMissing('collage_page', [
            'collage_id' => $collage->id,
            'page_id' => $page->id,
        ]);

        Event::assertDispatched(CollagePageRemoved::class, function ($event) use ($collage) {
            if ($event->collage->id !== $collage->id) {
                return false;
            }

            // Assert broadcast channel
            $channels = $event->broadcastOn();
            $this->assertCount(1, $channels);
            $this->assertEquals('private-collages', $channels[0]->name);

            // Assert broadcast name
            $this->assertEquals('CollagePageRemoved', $event->broadcastAs());

            // Assert broadcast payload
            $payload = $event->broadcastWith();
            $this->assertArrayHasKey('collage', $payload);
            $this->assertEquals($collage->id, $payload['collage']['id']);
            $this->assertArrayHasKey('is_archived', $payload['collage']);
            $this->assertArrayHasKey('is_locked', $payload['collage']);
            $this->assertArrayHasKey('pages', $payload['collage']);
            $this->assertIsArray($payload['collage']['pages']);

            return true;
        });
    }

    public function test_collage_page_removed_event_is_not_broadcast_when_page_was_not_in_collage(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $this->actingAs($user);
        $user->givePermissionTo('edit pages');

        $book = Book::factory()->create();
        $collage = Collage::factory()->create();
        $page = Page::factory()->for($book)->create();
        // Intentionally NOT attaching $page to $collage

        Event::fake();

        $response = $this->delete(route('collage-page.destroy', [$collage, $page]));

        $response->assertRedirect();
        Event::assertNotDispatched(CollagePageRemoved::class);
    }
}
