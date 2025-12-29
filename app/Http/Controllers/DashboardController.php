<?php

namespace App\Http\Controllers;

use App\Models\Book;
use App\Models\Category;
use App\Models\Page;
use App\Models\Song;
use App\Models\User;
use App\Services\PopularityService;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function __construct(
        private SettingsController $settingsController,
        private PopularityService $popularityService
    ) {}

    public function show()
    {
        return Inertia::render('Dashboard/Index', [
            'users' => Inertia::defer(fn () => User::all()),
            'categories' => Inertia::defer(fn () => Category::withCount('books')->get()),
            'stats' => Inertia::defer(fn () => [
                'numberOfBooks' => Book::count(),
                'numberOfPages' => Page::count(),
                'numberOfSongs' => Song::count(),
                'numberOfYouTubeVideos' => Page::whereNotNull('video_link')->count(),
                'numberOfVideos' => Page::where('media_path', 'like', '%.mp4')->count(),
                'numberOfImages' => Page::where('media_path', 'like', '%.webp')
                    ->where('media_path', 'not like', '%snapshot%')
                    ->count(),
                'numberOfScreenshots' => Page::where('media_path', 'like', '%snapshot%')->count(),
                'mostReadBooks' => $this->popularityService->addPopularityToCollection(
                    Book::query()
                        ->with('coverImage')
                        ->orderBy('read_count', 'desc')
                        ->orderBy('created_at')
                        ->take(5)
                        ->get(),
                    Book::class
                )->toArray(),
                'mostReadSongs' => $this->popularityService->addPopularityToCollection(
                    Song::query()
                        ->orderBy('read_count', 'desc')
                        ->take(5)
                        ->get(),
                    Song::class
                )->toArray(),
                'leastPages' => Book::with('coverImage')
                    ->withCount('pages')
                    ->orderBy('pages_count')
                    ->orderBy('created_at')
                    ->first()
                    ->toArray(),
                'mostPages' => Book::with('coverImage')
                    ->withCount('pages')
                    ->orderBy('pages_count', 'desc')
                    ->orderBy('created_at')
                    ->first()
                    ->toArray(),
            ]),
            'adminSettings' => $this->settingsController->index(),
        ]);
    }
}
