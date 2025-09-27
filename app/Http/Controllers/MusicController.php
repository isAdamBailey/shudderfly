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

        try {
            $youTubeService = new \App\Services\YouTubeService();
            $result = $youTubeService->syncPlaylist();

            if (!$result['success']) {
                if (isset($result['quota_exceeded']) && $result['quota_exceeded']) {
                    return back()->with('error', $result['error'])->with('quota_exceeded', true);
                }
                return back()->with('error', $result['error']);
            }

            // Handle successful sync with different message types
            $message = $result['message'];

            // Check if quota was exceeded during sync (partial success)
            if (isset($result['quota_exceeded']) && $result['quota_exceeded']) {
                return back()->with('warning', $message . ' YouTube API quota limit was reached, but sync will continue tomorrow.')->with('quota_exceeded', true);
            }

            // Check if sync was skipped due to recent sync
            if (isset($result['synced']) && $result['synced'] === 0 && strpos($message, 'recently') !== false) {
                return back()->with('info', $message);
            }

            // Normal successful sync
            return back()->with('success', $message);

        } catch (\Exception $e) {
            \Log::error('Sync error: ' . $e->getMessage());
            return back()->with('error', 'An unexpected error occurred during sync. Please try again later.');
        }
    }
}
