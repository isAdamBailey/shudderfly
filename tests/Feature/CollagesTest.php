<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\Collage;
use App\Models\Page;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
                ->has('collages', 4) // Limited to 4 in controller
                ->has('collages.0.pages')
        );
    }

    public function test_deleted_collages_page_is_displayed(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $this->actingAs($user);

        // Create a book first
        $book = Book::factory()->create();

        // Create some collages and soft delete them
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
            $collage->delete();
        }

        $response = $this->get(route('collages.deleted'));

        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('Collages/Deleted')
                ->has('collages', 3)
                ->has('collages.0.pages')
        );
    }

    public function test_collage_can_be_created(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $this->actingAs($user);
        $user->givePermissionTo('edit pages'); // Add permission for collage creation

        $response = $this->post(route('collages.store'));

        $this->assertDatabaseCount('collages', 1);
        $this->assertDatabaseHas('collages', [
            'storage_path' => null
        ]);

        $response->assertRedirect(route('collages.index'));
    }

    public function test_collage_can_be_deleted(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $this->actingAs($user);
        $user->givePermissionTo('edit pages'); // Add permission for collage deletion

        $collage = Collage::factory()->create();

        $response = $this->delete(route('collages.destroy', $collage));

        $this->assertSoftDeleted($collage);

        $response->assertRedirect(route('collages.index'));
    }

    public function test_collage_pdf_generation_can_be_queued(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $this->actingAs($user);
        $user->givePermissionTo('edit pages'); // Add permission for PDF generation

        $collage = Collage::factory()->create();

        $response = $this->post(route('collages.generate-pdf', $collage));

        $response->assertRedirect(route('collages.index'))
            ->assertSessionHas('success', 'PDF generation has been queued. You will receive an email when it\'s ready.');
    }
} 