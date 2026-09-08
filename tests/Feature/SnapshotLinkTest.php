<?php

namespace Tests\Feature;

use App\Jobs\CreateVideoSnapshot;
use App\Models\Book;
use App\Models\Page;
use App\Models\SiteSetting;
use App\Models\User;
use App\Support\PageContentLinks;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class SnapshotLinkTest extends TestCase
{
    use RefreshDatabase;

    private function user(): User
    {
        return User::factory()->create();
    }

    private function snapshotOf(Page $source, ?Book $book = null): Page
    {
        return Page::factory()->for($book ?? $source->book)->create([
            'content' => PageContentLinks::snapshotAttribution('Adam', $source->id),
            'media_path' => 'books/test/snapshot_1.0_abcd1234.webp',
        ]);
    }

    public function test_attribution_links_to_the_page_the_frame_came_from(): void
    {
        $source = Page::factory()->for(Book::factory())->create();

        $content = PageContentLinks::snapshotAttribution('Adam', $source->id);

        $this->assertStringContainsString("href='/pages/{$source->id}'", $content);
        $this->assertStringContainsString('<strong>Adam</strong> took this screenshot from', $content);

        $this->actingAs($this->user())->get('/pages/'.$source->id)->assertOk();
    }

    public function test_attribution_has_no_link_when_the_source_page_is_already_gone(): void
    {
        $source = Page::factory()->for(Book::factory())->create();
        $sourceId = $source->id;
        $source->delete();

        $content = PageContentLinks::snapshotAttribution('Adam', $sourceId);

        $this->assertStringNotContainsString('<a ', $content);
        $this->assertStringContainsString('took this screenshot from <strong>this video</strong>.', $content);
    }

    public function test_snapshot_page_keeps_the_link_while_the_source_is_viewable(): void
    {
        $source = Page::factory()->for(Book::factory())->create();
        $snapshot = $this->snapshotOf($source);

        $this->actingAs($this->user())
            ->get('/pages/'.$snapshot->id)
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('page.content', fn ($content) => str_contains($content, "href='/pages/{$source->id}'")
            )
            );
    }

    public function test_link_to_a_deleted_source_page_is_dropped_but_the_sentence_stays(): void
    {
        $book = Book::factory()->create();
        $source = Page::factory()->for($book)->create();
        $snapshot = $this->snapshotOf($source, $book);

        $source->delete();

        $this->actingAs($this->user())
            ->get('/pages/'.$snapshot->id)
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('page.content', fn ($content) => ! str_contains($content, '<a ')
                    && str_contains($content, 'took this screenshot from <strong>this video</strong>.')
            )
            );
    }

    public function test_link_to_a_blocked_source_page_is_dropped(): void
    {
        $book = Book::factory()->create();
        $source = Page::factory()->for($book)->create();
        $snapshot = $this->snapshotOf($source, $book);

        $source->update(['blocked' => true]);

        $this->actingAs($this->user())
            ->get('/pages/'.$snapshot->id)
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('page.content', fn ($content) => ! str_contains($content, '<a ')
                    && str_contains($content, 'this video')
            )
            );
    }

    public function test_link_to_a_youtube_page_is_dropped_while_youtube_is_disabled(): void
    {
        $book = Book::factory()->create();
        $source = Page::factory()->for($book)->create([
            'video_link' => 'https://www.youtube.com/watch?v=abc123',
        ]);
        $snapshot = $this->snapshotOf($source, $book);

        SiteSetting::where('key', 'youtube_enabled')->update(['value' => '0']);

        $this->actingAs($this->user())
            ->get('/pages/'.$snapshot->id)
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('page.content', fn ($content) => ! str_contains($content, '<a ')));
    }

    public function test_other_links_in_content_are_left_alone(): void
    {
        $book = Book::factory()->create();
        $snapshot = Page::factory()->for($book)->create([
            'content' => '<p>See <a href="https://example.com/pages/999">the docs</a>.</p>',
        ]);

        $this->actingAs($this->user())
            ->get('/pages/'.$snapshot->id)
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('page.content', fn ($content) => str_contains($content, 'https://example.com/pages/999')));
    }

    public function test_snapshot_request_is_rejected_when_the_source_page_does_not_exist(): void
    {
        Queue::fake();

        $book = Book::factory()->create();

        $this->actingAs($this->user())
            ->post(route('pages.snapshot'), [
                'book_id' => $book->id,
                'page_id' => 999999,
                'video_time' => 2.5,
                'video_url' => 'https://example.com/clip.mp4',
            ])
            ->assertSessionHasErrors('page_id');

        Queue::assertNothingPushed();
    }

    public function test_snapshot_request_queues_the_job_for_the_page_being_watched(): void
    {
        Queue::fake();

        $book = Book::factory()->create();
        $source = Page::factory()->for($book)->create([
            'media_path' => 'books/test/clip.mp4',
        ]);

        $this->actingAs($this->user())
            ->post(route('pages.snapshot'), [
                'book_id' => $book->id,
                'page_id' => $source->id,
                'video_time' => 2.5,
                'video_url' => 'https://example.com/clip.mp4',
            ])
            ->assertSessionHasNoErrors();

        Queue::assertPushed(CreateVideoSnapshot::class, function (CreateVideoSnapshot $job) use ($source) {
            $pageId = new \ReflectionProperty($job, 'pageId');

            return $pageId->getValue($job) === $source->id;
        });
    }
}
