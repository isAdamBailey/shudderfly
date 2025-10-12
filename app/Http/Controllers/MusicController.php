<?php

namespace App\Http\Controllers;

use App\Jobs\IncrementSongReadCount;
use App\Models\Song;
use App\Services\YouTubeService;
use App\Support\ReadThrottle;
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
        $filter = $request->filter;
        $songId = $request->song;

        $songsQuery = Song::query();

        if ($search) {
            $songsQuery->search($search);
        }

        // Apply filters
        $songsQuery->unless($filter, fn ($query) => $query->orderBy('created_at', 'desc'))
            ->when($filter === 'favorites', fn ($query) => $query->orderBy('read_count', 'desc'));

        $songs = $songsQuery->paginate(20)->withQueryString();

        // If a specific song is requested, load it separately
        $specificSong = null;
        if ($songId) {
            $specificSong = Song::find($songId);
        }

        return Inertia::render('Music/Index', [
            'songs' => $songs,
            'search' => $search,
            'filter' => $filter,
            'canSync' => auth()->user()->can('admin'),
            'specificSong' => $specificSong,
        ]);
    }

    /**
     * Get a single song by ID - redirects to music index with song parameter
     */
    public function show(Song $song)
    {
        return redirect()->route('music.index', ['song' => $song->id]);
    }

    /**
     * Sync YouTube playlist
     */
    public function sync()
    {
        $this->authorize('admin');

        try {
            $youTubeService = new YouTubeService;
            $result = $youTubeService->syncPlaylist();

            if (! $result['success']) {
                if (isset($result['quota_exceeded']) && $result['quota_exceeded']) {
                    return back()->with('error', $result['error'])->with('quota_exceeded', true);
                }

                return back()->with('error', $result['error']);
            }

            // Handle successful sync with different message types
            $message = $result['message'];

            // Check if quota was exceeded during sync (partial success)
            if (isset($result['quota_exceeded']) && $result['quota_exceeded']) {
                return back()->with('warning', $message.' YouTube API quota limit was reached, but sync will continue tomorrow.')->with('quota_exceeded', true);
            }

            // Check if sync was skipped due to recent sync
            if (isset($result['synced']) && $result['synced'] === 0 && strpos($message, 'recently') !== false) {
                return back()->with('info', $message);
            }

            // Normal successful sync
            return back()->with('success', $message);

        } catch (\Exception $e) {
            \Log::error('Sync error: '.$e->getMessage());

            return back()->with('error', 'An unexpected error occurred during sync. Please try again later.');
        }
    }

    /**
     * Increment read count for a song when it's played
     */
    public function incrementReadCount(Song $song, Request $request)
    {
        // Only increment for users who cannot edit profile (regular users, not admins)
        if (auth()->user()->cannot('edit profile')) {
            $fingerprint = ReadThrottle::fingerprint($request);
            ReadThrottle::dispatchJob(new IncrementSongReadCount($song, $fingerprint));
        }

        return response()->json(['success' => true]);
    }
}
