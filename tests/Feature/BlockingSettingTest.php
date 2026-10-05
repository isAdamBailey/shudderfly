<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\Message;
use App\Models\Page;
use App\Models\SiteSetting;
use App\Models\Sound;
use App\Models\User;
use App\Services\ContentBlockService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * With unblock_requests_enabled off, blocking is switched off as a whole:
 * nothing new can be blocked and already-blocked items show again, while
 * the admin "unblock all" still works.
 */
class BlockingSettingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('s3');

        SiteSetting::where('key', 'sounds_enabled')->update(['value' => '1']);
        SiteSetting::where('key', 'messaging_enabled')->update(['value' => '1']);
        SiteSetting::where('key', ContentBlockService::SETTING)->update(['value' => '0']);
    }

    public function test_blocking_stays_on_when_the_setting_row_is_missing(): void
    {
        SiteSetting::where('key', ContentBlockService::SETTING)->delete();

        $this->assertTrue(ContentBlockService::enabled());
    }

    public function test_page_cannot_be_blocked_when_disabled(): void
    {
        $this->actingAs(User::factory()->create());

        $page = Page::factory()->for(Book::factory())->create(['blocked' => false]);

        $this->patch(route('pages.block', $page))->assertForbidden();
        $this->assertFalse($page->fresh()->blocked);
    }

    public function test_sound_cannot_be_blocked_when_disabled(): void
    {
        $this->actingAs(User::factory()->create());

        $sound = Sound::factory()->create(['blocked' => false]);

        $this->patch(route('sounds.block', $sound))->assertForbidden();
        $this->assertFalse($sound->fresh()->blocked);
    }

    public function test_blocked_pages_show_everywhere_when_disabled(): void
    {
        $this->actingAs(User::factory()->create());

        $book = Book::factory()->create();
        Page::factory()->for($book)->create(['blocked' => false]);
        $blockedPage = Page::factory()->for($book)->create(['blocked' => true]);

        $this->get(route('books.show', $book))->assertInertia(
            fn (Assert $page) => $page->has('pages.data', 2)
        );

        $this->get(route('pictures.index'))->assertInertia(
            fn (Assert $page) => $page->has('photos.data', 2)
        );

        $this->get(route('pages.show', $blockedPage))->assertOk();
    }

    public function test_blocked_sounds_show_when_disabled(): void
    {
        $this->actingAs(User::factory()->create());

        Sound::factory()->create(['blocked' => true]);

        $this->get(route('sounds.index'))->assertInertia(
            fn (Assert $page) => $page->has('sounds', 1)
        );
    }

    public function test_messages_with_blocked_pages_show_when_disabled(): void
    {
        $user = User::factory()->create();
        $blockedPage = Page::factory()->for(Book::factory())->create(['blocked' => true]);
        $message = Message::factory()->create([
            'user_id' => $user->id,
            'page_id' => $blockedPage->id,
        ]);

        $this->actingAs($user);

        $this->get(route('messages.index'))->assertInertia(
            fn (Assert $page) => $page->has('messages.data', 1)
        );

        $this->getJson(route('messages.show', $message))->assertOk();
    }

    public function test_admin_can_still_unblock_all_when_disabled(): void
    {
        $user = User::factory()->create();
        $user->givePermissionTo('edit pages');
        $this->actingAs($user);

        Page::factory()->for(Book::factory())->count(2)->create(['blocked' => true]);
        Sound::factory()->create(['blocked' => true]);

        $this->post(route('pages.unblock-all'))->assertRedirect();

        $this->assertSame(0, Page::blocked()->count() + Sound::blocked()->count());
    }

    public function test_reenabling_hides_previously_blocked_items_again(): void
    {
        $this->actingAs(User::factory()->create());

        $blockedPage = Page::factory()->for(Book::factory())->create(['blocked' => true]);

        $this->get(route('pages.show', $blockedPage))->assertOk();

        SiteSetting::where('key', ContentBlockService::SETTING)->update(['value' => '1']);

        $this->get(route('pages.show', $blockedPage))->assertNotFound();
    }
}
