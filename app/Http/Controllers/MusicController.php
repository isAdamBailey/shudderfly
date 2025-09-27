<?php

namespace App\Http\Controllers;

use App\Jobs\SyncYouTubePlaylist;
use App\Models\Song;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MusicController extends Controller
{
    /**
     * Display the music page with songs
     */
    public function index(Request $request): Response
    {
        $search = $request->search;

        $songsQuery = Song::query()
            ->orderBy('created_at', 'desc');

        if ($search) {
            $songsQuery->search($search);
        }

        $songs = $songsQuery->paginate(20)->withQueryString();

        return Inertia::render('Music/Index', [
            'songs' => [
                'data' => $songs->items(),
                'links' => $songs->linkCollection()->toArray(),
                'from' => $songs->firstItem(),
                'to' => $songs->lastItem(),
                'total' => $songs->total(),
                'current_page' => $songs->currentPage(),
                'last_page' => $songs->lastPage(),
                'per_page' => $songs->perPage(),
            ],
            'search' => $search,
            'canSync' => auth()->user()->can('admin'),
        ]);
    }

    /**
     * Sync YouTube playlist
     */
    public function sync()
    {
        $this->authorize('admin');

        SyncYouTubePlaylist::dispatch();

        return back()->with('success', 'YouTube playlist sync started. This may take a few minutes.');
    }
}
