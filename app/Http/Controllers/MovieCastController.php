<?php

namespace App\Http\Controllers;

use App\Events\MessageCreated;
use App\Models\Message;
use App\Models\MovieFavorite;
use App\Models\SiteSetting;
use App\Models\User;
use App\Services\UserTaggingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;
use Inertia\Response;

class MovieCastController extends Controller
{
    private const DISALLOWED_CERTIFICATIONS = ['R', 'NC-17', 'X', 'TV-MA'];

    public function __construct(
        private UserTaggingService $userTaggingService
    ) {}

    public function index(Request $request): Response
    {
        $movieId = $request->query('movieId');

        return Inertia::render('MovieCast/Index', [
            'tmdbImageBaseUrl' => config('services.tmdb.base_image_url'),
            'favorites' => MovieFavorite::query()
                ->orderByDesc('created_at')
                ->get()
                ->map(fn (MovieFavorite $favorite) => $favorite->toFrontendArray())
                ->values()
                ->all(),
            'title' => $request->query('title'),
            'movieId' => is_numeric($movieId) ? (int) $movieId : null,
        ]);
    }

    public function search(Request $request): JsonResponse
    {
        $query = $request->query('query');

        if (! is_string($query) || trim($query) === '') {
            return response()->json(['message' => 'Query parameter is required.'], 400);
        }

        $apiKey = config('services.tmdb.api_key');
        if (! $apiKey) {
            return response()->json(['message' => 'TMDB API key is not configured.'], 500);
        }

        $baseUrl = config('services.tmdb.base_api_url');

        $response = Http::get("{$baseUrl}/search/movie", [
            'api_key' => $apiKey,
            'query' => trim($query),
        ]);

        if (! $response->successful()) {
            return response()->json(['message' => 'Unable to fetch movie data right now.'], 502);
        }

        $mappedResults = collect($response->json('results', []))
            ->take(15)
            ->map(fn (array $movie) => [
                'id' => $movie['id'],
                'title' => $movie['title'],
                'release_date' => $movie['release_date'] ?? '',
                'poster_path' => $movie['poster_path'] ?? null,
            ])
            ->all();

        $allowedMovies = [];

        foreach ($mappedResults as $movie) {
            if ($this->isMovieAllowed($movie['id'], $baseUrl, $apiKey)) {
                $allowedMovies[] = $movie;
            }

            if (count($allowedMovies) >= 10) {
                break;
            }
        }

        return response()->json($allowedMovies);
    }

    public function credits(int $id): JsonResponse
    {
        if ($id <= 0) {
            return response()->json(['message' => 'Movie id must be a numeric value.'], 400);
        }

        $apiKey = config('services.tmdb.api_key');
        if (! $apiKey) {
            return response()->json(['message' => 'TMDB API key is not configured.'], 500);
        }

        $baseUrl = config('services.tmdb.base_api_url');

        $response = Http::get("{$baseUrl}/movie/{$id}/credits", [
            'api_key' => $apiKey,
        ]);

        if (! $response->successful()) {
            return response()->json(['message' => 'Unable to fetch movie data right now.'], 502);
        }

        return response()->json([
            'cast' => collect($response->json('cast', []))
                ->map(fn (array $member) => [
                    'id' => $member['id'],
                    'name' => $member['name'],
                    'character' => $member['character'] ?? '',
                    'profile_path' => $member['profile_path'] ?? null,
                ])
                ->values()
                ->all(),
        ]);
    }

    public function details(int $id): JsonResponse
    {
        if ($id <= 0) {
            return response()->json(['message' => 'Movie id must be a numeric value.'], 400);
        }

        $apiKey = config('services.tmdb.api_key');
        if (! $apiKey) {
            return response()->json(['message' => 'TMDB API key is not configured.'], 500);
        }

        $baseUrl = config('services.tmdb.base_api_url');

        $response = Http::get("{$baseUrl}/movie/{$id}", [
            'api_key' => $apiKey,
            'append_to_response' => 'videos',
        ]);

        if (! $response->successful()) {
            return response()->json(['message' => 'Unable to fetch movie data right now.'], 502);
        }

        $data = $response->json();
        $videos = collect($data['videos']['results'] ?? []);

        $trailer = $videos->first(
            fn (array $video) => ($video['site'] ?? '') === 'YouTube'
                && ($video['type'] ?? '') === 'Trailer'
                && ($video['official'] ?? false)
        ) ?? $videos->first(
            fn (array $video) => ($video['site'] ?? '') === 'YouTube'
                && ($video['type'] ?? '') === 'Trailer'
        );

        return response()->json([
            'id' => $data['id'],
            'title' => $data['title'],
            'overview' => $data['overview'] ?? '',
            'release_date' => $data['release_date'] ?? '',
            'poster_path' => $data['poster_path'] ?? null,
            'backdrop_path' => $data['backdrop_path'] ?? null,
            'trailer_key' => $trailer['key'] ?? null,
        ]);
    }

    public function storeFavorite(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'id' => ['required', 'integer', 'min:1'],
            'title' => ['required', 'string', 'max:255'],
            'image_path' => ['nullable', 'string', 'max:255'],
        ]);

        MovieFavorite::query()->updateOrCreate(
            ['tmdb_id' => $validated['id']],
            [
                'title' => $validated['title'],
                'image_path' => $validated['image_path'] ?? null,
            ]
        );

        return response()->json($this->favoritesPayload());
    }

    public function destroyFavorite(int $tmdbId): JsonResponse
    {
        MovieFavorite::query()->where('tmdb_id', $tmdbId)->delete();

        return response()->json($this->favoritesPayload());
    }

    public function share(Request $request): RedirectResponse
    {
        $setting = SiteSetting::where('key', 'messaging_enabled')->first();
        $messagingEnabled = $setting && ($setting->getAttributes()['value'] ?? $setting->value) === '1';

        if (! $messagingEnabled) {
            return back()->withErrors(['message' => __('messages.messaging.disabled')]);
        }

        $validated = $request->validate([
            'tmdb_id' => ['required', 'integer', 'min:1'],
            'title' => ['required', 'string', 'max:255'],
            'image_path' => ['nullable', 'string', 'max:255'],
            'tagged_user_ids' => ['sometimes', 'array'],
            'tagged_user_ids.*' => ['integer', 'exists:users,id'],
        ]);

        $taggedUserIds = $validated['tagged_user_ids'] ?? [];
        if (! is_array($taggedUserIds)) {
            $taggedUserIds = [];
        }

        $taggedUser = null;
        if ($taggedUserIds !== []) {
            $taggedUser = User::select('id', 'name')->find($taggedUserIds[0]);
        }

        $shareMessage = __('messages.movie_shared', ['title' => $validated['title']]);
        if ($taggedUser) {
            $shareMessage = $shareMessage.' @'.$taggedUser->name;
        }

        $message = Message::create([
            'user_id' => $request->user()->id,
            'message' => $shareMessage,
            'movie_tmdb_id' => $validated['tmdb_id'],
            'movie_title' => $validated['title'],
            'movie_image_path' => $validated['image_path'] ?? null,
        ]);

        if ($taggedUserIds !== []) {
            $this->userTaggingService->notifyTaggedUsers(
                $taggedUserIds,
                $request->user(),
                $message,
                'message'
            );
        }

        $message->load('user');
        event(new MessageCreated($message));

        return redirect()
            ->to(route('messages.index').'#message-'.$message->id)
            ->with('success', __('messages.movie.shared'));
    }

    private function favoritesPayload(): array
    {
        return MovieFavorite::query()
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (MovieFavorite $favorite) => $favorite->toFrontendArray())
            ->values()
            ->all();
    }

    private function isMovieAllowed(int $movieId, string $baseUrl, string $apiKey): bool
    {
        try {
            $response = Http::get("{$baseUrl}/movie/{$movieId}/release_dates", [
                'api_key' => $apiKey,
            ]);

            if (! $response->successful()) {
                return true;
            }

            $usReleaseInfo = collect($response->json('results', []))
                ->first(fn (array $entry) => ($entry['iso_3166_1'] ?? '') === 'US');

            if (! $usReleaseInfo) {
                return true;
            }

            $certifications = collect($usReleaseInfo['release_dates'] ?? [])
                ->map(fn (array $releaseDate) => strtoupper(trim($releaseDate['certification'] ?? '')))
                ->filter()
                ->values()
                ->all();

            if ($certifications === []) {
                return true;
            }

            foreach ($certifications as $certification) {
                if (in_array($certification, self::DISALLOWED_CERTIFICATIONS, true)) {
                    return false;
                }
            }

            return true;
        } catch (\Throwable) {
            return true;
        }
    }
}
