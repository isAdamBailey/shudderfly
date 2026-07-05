<?php

namespace Tests\Feature\Console;

use App\Models\Book;
use App\Models\Message;
use App\Models\MessageReaction;
use App\Models\Page;
use App\Models\SiteStatistic;
use App\Models\Song;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AggregateSiteStatisticsTest extends TestCase
{
    use RefreshDatabase;

    public function test_command_creates_a_snapshot_for_today(): void
    {
        $book = Book::factory()->create();
        Book::factory()->create();
        Page::factory()->count(3)->create(['book_id' => $book->id, 'media_path' => 'foo.webp']);
        Song::factory()->count(1)->create();

        $this->artisan('stats:aggregate-site-statistics')->assertSuccessful();

        $snapshot = SiteStatistic::query()->first();

        $this->assertNotNull($snapshot);
        $this->assertSame(today()->toDateString(), $snapshot->date);
        $this->assertSame(2, $snapshot->payload['numberOfBooks']);
        $this->assertSame(3, $snapshot->payload['numberOfPages']);
        $this->assertSame(1, $snapshot->payload['numberOfSongs']);
    }

    public function test_command_updates_todays_snapshot_instead_of_duplicating(): void
    {
        $this->artisan('stats:aggregate-site-statistics')->assertSuccessful();
        Book::factory()->create();
        $this->artisan('stats:aggregate-site-statistics')->assertSuccessful();

        $this->assertSame(1, SiteStatistic::query()->count());
        $this->assertSame(1, SiteStatistic::query()->first()->payload['numberOfBooks']);
    }

    public function test_command_captures_most_reacted_message(): void
    {
        $message = Message::factory()->create(['message' => 'Hello world']);
        MessageReaction::factory()->count(3)->create(['message_id' => $message->id]);

        $otherMessage = Message::factory()->create();
        MessageReaction::factory()->count(1)->create(['message_id' => $otherMessage->id]);

        $this->artisan('stats:aggregate-site-statistics')->assertSuccessful();

        $payload = SiteStatistic::query()->first()->payload;

        $this->assertSame($message->id, $payload['mostReactedMessage']['id']);
        $this->assertSame(3, $payload['mostReactedMessage']['reactions_count']);
        $this->assertSame($message->created_at->toIso8601String(), $payload['mostReactedMessage']['created_at']);
    }

    public function test_command_strips_game_share_marker_from_most_reacted_message(): void
    {
        $message = Message::factory()->create([
            'message' => "I scored 1000 in Costco Pizza Poop!\u{E000}g:costco-pizza-poop\u{E000}",
        ]);
        MessageReaction::factory()->create(['message_id' => $message->id]);

        $this->artisan('stats:aggregate-site-statistics')->assertSuccessful();

        $payload = SiteStatistic::query()->first()->payload;

        $this->assertSame('I scored 1000 in Costco Pizza Poop!', $payload['mostReactedMessage']['text']);
    }

    public function test_command_handles_empty_database(): void
    {
        $this->artisan('stats:aggregate-site-statistics')->assertSuccessful();

        $payload = SiteStatistic::query()->first()->payload;

        $this->assertSame(0, $payload['numberOfBooks']);
        $this->assertNull($payload['mostReactedMessage']);
        $this->assertNull($payload['busiestUploadDayOfWeek']);
    }
}
