<?php

namespace App\Http\Controllers;

use App\Events\MessageCreated;
use App\Jobs\IncrementSongReadCount;
use App\Jobs\SyncYouTubePlaylist;
use App\Models\Message;
use App\Models\SiteSetting;
use App\Models\Song;
use App\Models\User;
use App\Services\UserTaggingService;
use App\Services\YouTubeService;
use App\Support\MusicJobStatus;
use App\Support\ReadThrottle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class MusicController extends Controller
{
    /**
     * Create a new controller instance.
     */
    public function __construct(
        protected UserTaggingService $userTaggingService,
        protected YouTubeService $youTubeService
    ) {
        $this->middleware(function ($request, $next) {
            $musicEnabled = SiteSetting::where('key', 'music_enabled')->first()?->value ?? true;

            if (! $musicEnabled) {
                abort(404, 'Music feature is currently disabled.');
            }

            return $next($request);
        });
    }

    /**
     * Get songs data for flyout (JSON for fetch/axios). Browser visits redirect to home.
     */
    public function index(Request $request): JsonResponse|RedirectResponse
    {
        if ($request->expectsJson() && ! $request->header('X-Inertia')) {
            return $this->indexJson($request);
        }

        return redirect()->route('welcome');
    }

    private function indexJson(Request $request): JsonResponse
    {
        $search = $request->search;
        $filter = $request->filter;
        $songId = $request->song;

        $songsQuery = Song::query();

        if ($search) {
            $songsQuery = $songsQuery->filterBySearch($search);
        }

        // Apply filters
        $songsQuery->unless($filter, fn ($query) => $query->orderBy('created_at', 'desc'))
            ->when($filter === 'favorites', fn ($query) => $query->orderBy('read_count', 'desc'))
            ->when($filter === 'newest', fn ($query) => $query->orderBy('published_at', 'desc'))
            ->when($filter === 'oldest', fn ($query) => $query->orderBy('published_at', 'asc'));

        $songs = $songsQuery->paginate(15)->withQueryString();

        // If a specific song is requested, load it separately
        $specificSong = null;
        if ($songId) {
            $specificSong = Song::find($songId);
        }

        return response()->json([
            'songs' => $songs,
            'search' => $search,
            'filter' => $filter,
            'canSync' => auth()->user()?->can('admin') ?? false,
            'specificSong' => $specificSong,
        ]);
    }

    /**
     * JSON for API clients (axios/fetch). Browser/Inertia visits redirect home with flash so no extra page chunk is required.
     */
    public function show(Request $request, Song $song): JsonResponse|RedirectResponse
    {
        if ($request->expectsJson() && ! $request->header('X-Inertia')) {
            return response()->json([
                'song' => $song,
            ]);
        }

        return redirect()->route('welcome')->with('open_song_id', $song->id);
    }

    /**
     * Queue a YouTube playlist sync. The work itself is long enough to time out
     * a web request, so the outcome is reported through syncStatus() instead.
     */
    public function sync(): JsonResponse
    {
        $this->authorize('admin');

        SyncYouTubePlaylist::enqueue();

        // JSON rather than back(): the flyout already renders the status it
        // polls for, so a redirect would only re-resolve every shared prop to
        // deliver a message that is on screen before the request is sent.
        return response()->json(['status' => MusicJobStatus::get()], 202);
    }

    /**
     * Current state of the queued playlist sync, polled by the music flyout.
     */
    public function syncStatus(): JsonResponse
    {
        $this->authorize('admin');

        return response()->json([
            'status' => MusicJobStatus::get(),
        ]);
    }

    public function destroy(Song $song)
    {
        $this->authorize('admin');

        try {
            if (! $song->is_manual) {
                $result = $this->youTubeService->removeFromPlaylist($song->youtube_video_id);

                if (! $result['success']) {
                    \Log::warning('YouTube playlist removal failed for song '.$song->id.': '.($result['error'] ?? 'Unknown error'));
                }
            }

            $song->delete();

            return response()->json(['success' => true, 'message' => 'Song deleted successfully']);
        } catch (\Exception $e) {
            \Log::error('Error deleting song: '.$e->getMessage());

            return response()->json(['error' => 'Failed to delete song'], 500);
        }
    }

    /**
     * Add a song directly by video ID/URL, bypassing the playlist. For videos YouTube
     * disallows from being added to a playlist but that can still be embedded.
     */
    public function store(Request $request): JsonResponse
    {
        $this->authorize('admin');

        $validated = $request->validate([
            'youtube_video_id' => ['required', 'string', 'max:1000'],
        ]);

        $result = $this->youTubeService->addManualSong($validated['youtube_video_id']);

        if (! $result['success']) {
            return response()->json(['error' => $result['error']], 422);
        }

        return response()->json([
            'song' => $result['song'],
            'warning' => $result['warning'] ?? null,
        ]);
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

    public function share(Song $song, Request $request): RedirectResponse
    {
        $setting = SiteSetting::where('key', 'messaging_enabled')->first();
        $messagingEnabled = $setting && ($setting->getAttributes()['value'] ?? $setting->value) === '1';

        if (! $messagingEnabled) {
            return back()->withErrors(['message' => __('messages.messaging.disabled')]);
        }

        $validated = $request->validate([
            'tagged_user_ids' => ['sometimes', 'array'],
            'tagged_user_ids.*' => ['integer', 'exists:users,id'],
        ]);

        $taggedUserIds = $validated['tagged_user_ids'] ?? [];
        if (! is_array($taggedUserIds)) {
            $taggedUserIds = [];
        }

        $taggedUser = null;
        if (! empty($taggedUserIds)) {
            $taggedUser = User::select('id', 'name')->find($taggedUserIds[0]);
        }

        $shareMessage = __('messages.song_shared', ['title' => $song->title]);
        if ($taggedUser) {
            $shareMessage = $shareMessage.' @'.$taggedUser->name;
        }

        $message = Message::create([
            'user_id' => $request->user()->id,
            'message' => $shareMessage,
            'song_id' => $song->id,
        ]);

        if (! empty($taggedUserIds)) {
            $this->userTaggingService->notifyTaggedUsers(
                $taggedUserIds,
                $request->user(),
                $message,
                'message'
            );
        }

        $message->load(['song', 'user']);
        event(new MessageCreated($message));

        return redirect()
            ->to(route('messages.index').'#message-'.$message->id)
            ->with('success', __('messages.song.shared'));
    }
}
