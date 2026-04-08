<?php

namespace Tests\Feature;

use App\Events\CollagePageRemoved;
use App\Models\Book;
use App\Models\Collage;
use App\Models\Page;
use App\Models\User;
use App\Support\Collage as CollageLimit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class CollagePageStoreTest extends TestCase
{
    use RefreshDatabase;

    public function test_full_collage_requires_replace_page_id(): void
    {
        $user = User::factory()->create();
        $book = Book::factory()->create();
        $collage = Collage::factory()->create(['is_locked' => false]);

        $existing = Page::factory()->for($book)->count(CollageLimit::MAX_PAGES)->create();
        $collage->pages()->attach($existing->pluck('id'));

        $newPage = Page::factory()->for($book)->create();

        $response = $this->actingAs($user)
            ->post(route('collage-page.store'), [
                'collage_id' => $collage->id,
                'page_id' => $newPage->id,
            ]);

        $response->assertSessionHasErrors(['collage']);
        $this->assertFalse($collage->fresh()->pages()->where('page_id', $newPage->id)->exists());
    }

    public function test_replace_swaps_page_when_collage_is_full(): void
    {
        Event::fake([CollagePageRemoved::class]);

        $user = User::factory()->create();
        $book = Book::factory()->create();
        $collage = Collage::factory()->create(['is_locked' => false]);

        $existing = Page::factory()->for($book)->count(CollageLimit::MAX_PAGES)->create();
        $collage->pages()->attach($existing->pluck('id'));

        $replaceId = $existing->first()->id;
        $newPage = Page::factory()->for($book)->create();

        $response = $this->actingAs($user)
            ->post(route('collage-page.store'), [
                'collage_id' => $collage->id,
                'page_id' => $newPage->id,
                'replace_page_id' => $replaceId,
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success', __('messages.page.collage_add_success'));

        $collage->refresh();
        $this->assertFalse($collage->pages()->where('page_id', $replaceId)->exists());
        $this->assertTrue($collage->pages()->where('page_id', $newPage->id)->exists());
        $this->assertSame(CollageLimit::MAX_PAGES, $collage->pages()->count());

        Event::assertDispatched(CollagePageRemoved::class);
    }

    public function test_replace_swaps_page_when_collage_is_locked_and_full(): void
    {
        Event::fake([CollagePageRemoved::class]);

        $user = User::factory()->create();
        $book = Book::factory()->create();
        $collage = Collage::factory()->create(['is_locked' => true]);

        $existing = Page::factory()->for($book)->count(CollageLimit::MAX_PAGES)->create();
        $collage->pages()->attach($existing->pluck('id'));

        $replaceId = $existing->first()->id;
        $newPage = Page::factory()->for($book)->create();

        $response = $this->actingAs($user)
            ->post(route('collage-page.store'), [
                'collage_id' => $collage->id,
                'page_id' => $newPage->id,
                'replace_page_id' => $replaceId,
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $collage->refresh();
        $this->assertFalse($collage->pages()->where('page_id', $replaceId)->exists());
        $this->assertTrue($collage->pages()->where('page_id', $newPage->id)->exists());
        Event::assertDispatched(CollagePageRemoved::class);
    }

    public function test_replace_swaps_when_locked_and_below_max_capacity(): void
    {
        Event::fake([CollagePageRemoved::class]);

        $user = User::factory()->create();
        $book = Book::factory()->create();
        $collage = Collage::factory()->create(['is_locked' => true]);

        $existing = Page::factory()->for($book)->count(4)->create();
        $collage->pages()->attach($existing->pluck('id'));

        $replaceId = $existing->first()->id;
        $newPage = Page::factory()->for($book)->create();

        $response = $this->actingAs($user)
            ->post(route('collage-page.store'), [
                'collage_id' => $collage->id,
                'page_id' => $newPage->id,
                'replace_page_id' => $replaceId,
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $collage->refresh();
        $this->assertFalse($collage->pages()->where('page_id', $replaceId)->exists());
        $this->assertTrue($collage->pages()->where('page_id', $newPage->id)->exists());
        $this->assertSame(4, $collage->pages()->count());
        Event::assertDispatched(CollagePageRemoved::class);
    }

    public function test_replace_page_id_ignored_when_collage_has_room(): void
    {
        $user = User::factory()->create();
        $book = Book::factory()->create();
        $collage = Collage::factory()->create(['is_locked' => false]);

        $existing = Page::factory()->for($book)->count(CollageLimit::MAX_PAGES - 1)->create();
        $collage->pages()->attach($existing->pluck('id'));

        $stillInCollage = $existing->first();
        $newPage = Page::factory()->for($book)->create();

        $response = $this->actingAs($user)
            ->post(route('collage-page.store'), [
                'collage_id' => $collage->id,
                'page_id' => $newPage->id,
                'replace_page_id' => $stillInCollage->id,
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $collage->refresh();
        $this->assertTrue($collage->pages()->where('page_id', $stillInCollage->id)->exists());
        $this->assertTrue($collage->pages()->where('page_id', $newPage->id)->exists());
        $this->assertSame(CollageLimit::MAX_PAGES, $collage->pages()->count());
    }

    public function test_adding_page_to_another_collage_removes_it_from_the_first(): void
    {
        Event::fake([CollagePageRemoved::class]);

        $user = User::factory()->create();
        $book = Book::factory()->create();
        $collageA = Collage::factory()->create(['is_locked' => false]);
        $collageB = Collage::factory()->create(['is_locked' => false]);

        $page = Page::factory()->for($book)->create();
        $collageA->pages()->attach($page->id);

        $response = $this->actingAs($user)
            ->post(route('collage-page.store'), [
                'collage_id' => $collageB->id,
                'page_id' => $page->id,
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertFalse($collageA->fresh()->pages()->where('page_id', $page->id)->exists());
        $this->assertTrue($collageB->fresh()->pages()->where('page_id', $page->id)->exists());
        Event::assertDispatched(CollagePageRemoved::class);
    }

    public function test_cannot_replace_with_page_not_in_collage(): void
    {
        $user = User::factory()->create();
        $book = Book::factory()->create();
        $collage = Collage::factory()->create(['is_locked' => false]);

        $existing = Page::factory()->for($book)->count(CollageLimit::MAX_PAGES)->create();
        $collage->pages()->attach($existing->pluck('id'));

        $outsidePage = Page::factory()->for($book)->create();
        $newPage = Page::factory()->for($book)->create();

        $response = $this->actingAs($user)
            ->post(route('collage-page.store'), [
                'collage_id' => $collage->id,
                'page_id' => $newPage->id,
                'replace_page_id' => $outsidePage->id,
            ]);

        $response->assertSessionHasErrors(['replace_page_id']);
        $this->assertFalse($collage->fresh()->pages()->where('page_id', $newPage->id)->exists());
    }
}
