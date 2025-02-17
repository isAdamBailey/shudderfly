<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\Page;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PagesTest extends TestCase
{
    use RefreshDatabase;
    use WithFaker;

    public function test_pictures_are_returned(): void
    {
        $this->actingAs(User::factory()->create());

        Book::factory()->has(Page::factory(10))->count(3)->create();

        $this->get(route('pictures.index'))->assertInertia(
            fn (Assert $page) => $page
                ->component('Uploads/Index')
                ->url('/photos')
                ->has('photos.data', 25)
        );
    }

    public function test_youtube_videos_are_hidden_when_disabled(): void
    {
        $this->actingAs(User::factory()->create());

        // Create a book with both regular pages and video pages
        $book = Book::factory()->create();
        Page::factory()->for($book)->count(3)->create(); // Regular pages
        Page::factory()->for($book)->count(2)->state(['video_link' => 'https://youtube.com/watch?v=123'])->create(); // Video pages

        // Set youtube_enabled to false
        \App\Models\SiteSetting::where('key', 'youtube_enabled')->update(['value' => '0']);

        // Test index page - should only show regular pages
        $this->get(route('pictures.index'))->assertInertia(
            fn (Assert $page) => $page
                ->component('Uploads/Index')
                ->has('photos.data', 3) // Only regular pages
        );

        // Test youtube filter - should return empty
        $this->get(route('pictures.index', ['filter' => 'youtube']))->assertInertia(
            fn (Assert $page) => $page
                ->component('Uploads/Index')
                ->has('photos.data', 0) // No videos when disabled
        );

        // Enable YouTube
        \App\Models\SiteSetting::where('key', 'youtube_enabled')->update(['value' => '1']);

        // Test index page again - should now show all pages
        $this->get(route('pictures.index'))->assertInertia(
            fn (Assert $page) => $page
                ->component('Uploads/Index')
                ->has('photos.data', 5) // All pages
        );

        // Test youtube filter - should now show video pages
        $this->get(route('pictures.index', ['filter' => 'youtube']))->assertInertia(
            fn (Assert $page) => $page
                ->component('Uploads/Index')
                ->has('photos.data', 2) // Only video pages
        );
    }

    public function test_video_pages_are_not_accessible_when_youtube_disabled(): void
    {
        $this->actingAs(User::factory()->create());

        $book = Book::factory()->create();
        $regularPage = Page::factory()->for($book)->create();
        $videoPage = Page::factory()->for($book)->state(['video_link' => 'https://youtube.com/watch?v=123'])->create();

        // Set youtube_enabled to false
        \App\Models\SiteSetting::where('key', 'youtube_enabled')->update(['value' => '0']);

        // Regular page should be accessible
        $this->get(route('pages.show', $regularPage))->assertStatus(200);

        // Video page should return 404 when YouTube is disabled
        $this->get(route('pages.show', $videoPage))->assertStatus(404);

        // Test sibling navigation - video page should not be included
        $response = $this->get(route('pages.show', $regularPage));
        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('Page/Show')
                ->where('nextPage', null) // No next page since video page is excluded
        );
    }

    public function test_pictures_can_be_searched(): void
    {
        $this->actingAs(User::factory()->create());

        $searchTerm = 'Adam';

        Book::factory()->has(Page::factory(10))->count(3)->create();
        Page::first()->update(['content' => 'lorem '.$searchTerm.' ipsum dolor sit amet']);

        $this->get(route('pictures.index', ['search' => $searchTerm]))->assertInertia(
            fn (Assert $page) => $page
                ->component('Uploads/Index')
                ->url('/photos?search=Adam')
                ->has('photos.data', 1)

        );
    }

    public function test_page_is_returned()
    {
        $this->actingAs(User::factory()->create());

        $book = Book::factory()->has(Page::factory())->create();
        $page = $book->pages->first();

        $this->get(route('pages.show', $page))->assertInertia(
            fn (Assert $page) => $page
                ->component('Page/Show')
                ->has('page.content')
                ->has('page.media_path')
                ->has('page.video_link')
                ->has('page.book')
                ->has('page.book.cover_image')
                ->has('previousPage')
                ->has('nextPage')
                ->has('books')
        );

        $this->assertSame(1.0, $page->fresh()->read_count);
    }

    public function test_page_cannot_be_stored_without_permissions()
    {
        $this->actingAs(User::factory()->create());

        $this->post(route('pages.store'))->assertStatus(403);
    }

    public function test_page_is_stored_to_book()
    {
        Storage::fake('s3');

        $this->actingAs($user = User::factory()->create());
        $user->givePermissionTo('edit pages');
        $book = Book::factory()->create();

        $payload = [
            'book_id' => $book->id,
            'content' => $this->faker->paragraph(),
            'image' => UploadedFile::fake()->image('photo1.jpg'),
        ];

        $response = $this->post(route('pages.store'), $payload);

        $filePath = 'books/'.$book->slug.'/'.pathinfo($payload['image']->hashName(), PATHINFO_FILENAME).'.webp';
        Storage::disk('s3')->assertExists($filePath);

        $page = Book::find($book->id)->pages->first();
        $this->assertSame('/storage'.$page->media_path, Storage::disk('s3')->url($filePath));
        $this->assertSame($page->content, $payload['content']);

        $response->assertRedirect(route('books.show', $book));
    }

    public function test_page_cannot_be_updated_without_permissions()
    {
        $this->actingAs(User::factory()->create());

        $book = Book::factory()->has(Page::factory())->create();
        $page = $book->pages->first();

        $this->post(route('pages.update', $page))->assertStatus(403);
    }

    public function test_page_is_updated()
    {
        Storage::fake('s3');

        $this->actingAs($user = User::factory()->create());
        $user->givePermissionTo('edit pages');

        $book = Book::factory()->has(Page::factory())->create();
        $page = $book->pages->first();

        $payload = [
            'content' => $this->faker->sentence(3),
            'image' => UploadedFile::fake()->image('photo1.jpg'),
        ];

        $response = $this->post(route('pages.update', $page), $payload);

        $filePath = 'books/'.$book->slug.'/'.pathinfo($payload['image']->hashName(), PATHINFO_FILENAME).'.webp';
        Storage::disk('s3')->assertExists($filePath);

        $freshPage = Page::where('book_id', $book->id)->first();
        $this->assertSame($freshPage->content, $payload['content']);
        $this->assertSame('/storage'.$freshPage->media_path, Storage::disk('s3')->url($filePath));

        $response->assertRedirect(route('pages.show', $freshPage));
    }

    public function test_page_can_be_moved_to_different_book()
    {
        $this->actingAs($user = User::factory()->create());
        $user->givePermissionTo('edit pages');

        $book = Book::factory()->has(Page::factory())->create();
        $page = $book->pages->first();
        $this->assertSame($book->id, $page->book_id);

        $newBook = Book::factory()->create();

        $payload = [
            'book_id' => $newBook->id,
        ];

        $response = $this->post(route('pages.update', $page), $payload);

        $freshPage = $page->fresh();
        $this->assertSame($newBook->id, $freshPage->book_id);

        // takes us to the new book
        $response->assertRedirect(route('pages.show', $page));
    }

    public function test_page_is_destroyed()
    {
        Storage::fake('s3');

        $this->actingAs($user = User::factory()->create());
        $user->givePermissionTo('edit pages');

        $book = Book::factory()->has(Page::factory())->create();
        $page = $book->pages->first();

        $response = $this->delete(route('pages.destroy', $page));
        Storage::disk('s3')->assertMissing($page->media_path);

        $this->assertNull(Page::find($page->id));

        $response->assertRedirect(route('books.show', $book));
    }
}
