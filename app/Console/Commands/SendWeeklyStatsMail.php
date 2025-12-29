<?php

namespace App\Console\Commands;

use App\Mail\WeeklyStatsMail;
use App\Models\Book;
use App\Models\Page;
use App\Models\Song;
use App\Models\User;
use App\Services\PopularityService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;
use Spatie\Permission\Models\Permission;

class SendWeeklyStatsMail extends Command
{
    protected $signature = 'send:weekly-stats-mail';

    protected $description = 'Send weekly stats email to users with edit pages permission';

    public function handle()
    {
        $popularityService = app(PopularityService::class);

        $permission = Permission::findByName('edit pages');
        $users = $permission->users;

        $totalBooks = Book::count();
        $totalPages = Page::count();
        $totalSongs = Song::count();
        $leastPages = Book::withCount('pages')
            ->orderBy('pages_count')
            ->orderBy('created_at')
            ->first();
        $mostPages = Book::withCount('pages')
            ->orderBy('pages_count', 'desc')
            ->orderBy('created_at')
            ->first();
        $mostRead = $popularityService->addPopularityToCollection(
            Book::query()
                ->orderBy('read_count', 'desc')
                ->orderBy('created_at')
                ->take(5)
                ->get(),
            Book::class
        );
        $leastRead = Book::query()
            ->orderBy('read_count')
            ->orderBy('created_at')
            ->first();

        $bookCounts = [];
        foreach (User::all() as $user) {
            $bookCounts[$user->name] = Book::where('author', $user->name)->count();
        }

        $oneWeekAgo = Carbon::now()->subWeek();
        $booksThisWeek = Book::where('created_at', '>=', $oneWeekAgo)->get();
        $screenshotsThisWeek = Page::where('media_path', 'like', '%snapshot%')->where('created_at', '>=', $oneWeekAgo)->get();
        $youTubeVideosThisWeek = Page::whereNotNull('video_link')->where('created_at', '>=', $oneWeekAgo)->get();
        $videosThisWeek = Page::where('media_path', 'like', '%.mp4')->where('created_at', '>=', $oneWeekAgo)->get();
        $imagesThisWeek = Page::where('media_path', 'like', '%.webp')
            ->where('media_path', 'not like', '%snapshot%')
            ->where('created_at', '>=', $oneWeekAgo)
            ->get();
        $songsThisWeek = Song::where('created_at', '>=', $oneWeekAgo)->get();
        $mostReadSongs = $popularityService->addPopularityToCollection(
            Song::query()
                ->orderBy('read_count', 'desc')
                ->take(5)
                ->get(),
            Song::class
        );

        foreach ($users as $user) {
            Mail::to($user->email)->send(new WeeklyStatsMail(
                $user,
                $totalBooks,
                $totalPages,
                $leastPages,
                $mostPages,
                $mostRead,
                $leastRead,
                $booksThisWeek,
                $bookCounts,
                $screenshotsThisWeek,
                $youTubeVideosThisWeek,
                $videosThisWeek,
                $imagesThisWeek,
                $totalSongs,
                $mostReadSongs,
                $songsThisWeek
            ));
        }
    }
}
