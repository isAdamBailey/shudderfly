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

        Book::factory()->has(Page::factory(13))->count(3)->create();

        $this->get(route('pictures.index'))->assertInertia(
            fn (Assert $page) => $page
                ->component('Photos/Index')
                ->url('/photos')
                ->has('photos.data', 10)

        );
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

        $filePath = 'book/'.$book->slug.'/'.$payload['image']->hashName();
        Storage::disk('s3')->assertExists($filePath);

        $page = Book::find($book->id)->pages->first();
        $this->assertSame($page->image_path, Storage::url($filePath));
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

        $filePath = 'book/'.$book->slug.'/'.$payload['image']->hashName();
        Storage::disk('s3')->assertExists($filePath);

        $freshPage = Page::where('book_id', $book->id)->first();
        $this->assertSame($freshPage->content, $payload['content']);
        $this->assertSame($freshPage->image_path, Storage::url($filePath));

        $response->assertRedirect(route('books.show', $book));
    }

    public function test_page_is_destroyed()
    {
        Storage::fake('s3');

        $this->actingAs($user = User::factory()->create());
        $user->givePermissionTo('edit pages');

        $book = Book::factory()->has(Page::factory())->create();
        $page = $book->pages->first();

        $response = $this->delete(route('pages.destroy', $page));
        Storage::disk('s3')->assertMissing($page->image_path);

        $this->assertNull(Page::find($page->id));

        $response->assertRedirect(route('books.show', $book));
    }
}
