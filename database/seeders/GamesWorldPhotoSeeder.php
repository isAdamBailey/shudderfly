<?php

namespace Database\Seeders;

use App\Models\Book;
use App\Models\Page;
use App\Support\GamesWorld;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Photos for the Games World's frames, so they aren't blank locally: a
 * Hank book (GamesWorld::HANK_BOOK) for the Cockroach's House and a Guster
 * book (found by GamesWorld::GUSTER_SEARCH) for Guster's House. Safe to
 * run again: a book already there is left as it is.
 */
class GamesWorldPhotoSeeder extends Seeder
{
    private const PHOTOS = 8;

    public function run(): void
    {
        foreach (['Hank', 'Guster'] as $title) {
            // By slug, as the Cockroach's House finds Hank's.
            if (Book::where('slug', Str::slug($title))->exists()) {
                continue;
            }

            // Without model events, so their words don't make AI voice clips
            // (AiVoiceWarmingObserver), which a sync queue would do on the
            // spot. The slug is given, as it's made in an event too, and
            // they're put in the search index by hand.
            $book = Model::withoutEvents(fn () => Book::factory()
                ->has(Page::factory()->count(self::PHOTOS))
                ->create(['title' => $title, 'slug' => Str::slug($title)]));
            $book->searchable();
            $book->pages()->searchable();
        }

        // The world's frames keep a day's pick; let today's see these.
        GamesWorld::forgetPhotoPicks();
    }
}
