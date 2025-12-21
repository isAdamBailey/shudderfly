<?php

namespace App\Http\Controllers;

use App\Models\Book;
use App\Models\Page;
use App\Models\Song;
use App\Services\VoiceSearchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

class SearchController extends Controller
{
    protected VoiceSearchService $voiceSearchService;

    public function __construct(VoiceSearchService $voiceSearchService)
    {
        $this->voiceSearchService = $voiceSearchService;
    }

    /**
     * Search books with autocomplete
     * Supports voice search with query expansion for accessibility
     */
    public function searchBooks(Request $request): JsonResponse
    {
        $query = $request->input('q', '');
        $isVoice = $request->boolean('voice', false);

        if (empty($query)) {
            return response()->json([]);
        }

        // Preprocess and optionally expand query for voice search
        $processedQuery = $this->voiceSearchService->preprocessQuery($query);
        $queries = $isVoice
            ? $this->voiceSearchService->expandQuery($processedQuery)
            : [$processedQuery];

        // Limit results per variation to ensure diversity when multiple variations exist
        $variationLimit = count($queries) > 1 ? (int) ceil(15 / count($queries)) : 15;
        $maxResults = 15;

        // Search with all query variations and merge results
        $allResults = new Collection;
        $seenIds = [];

        foreach ($queries as $searchQuery) {
            // Stop if we've reached the total limit
            if ($allResults->count() >= $maxResults) {
                break;
            }

            $results = Book::search($searchQuery)
                ->take($variationLimit)
                ->get();

            foreach ($results as $book) {
                // Stop if we've reached the total limit
                if ($allResults->count() >= $maxResults) {
                    break;
                }

                if (! in_array($book->id, $seenIds)) {
                    $seenIds[] = $book->id;
                    $allResults->push([
                        'id' => $book->id,
                        'title' => strip_tags($book->title ?? ''),
                        'excerpt' => strip_tags($book->excerpt ?? ''),
                        'slug' => $book->slug,
                        'type' => 'book',
                    ]);
                }
            }
        }

        return response()->json($allResults->values());
    }

    /**
     * Search uploads (pages and songs) with autocomplete
     * Supports voice search with query expansion for accessibility
     */
    public function searchUploads(Request $request): JsonResponse
    {
        $query = $request->input('q', '');
        $isVoice = $request->boolean('voice', false);

        if (empty($query)) {
            return response()->json([]);
        }

        // Preprocess and optionally expand query for voice search
        $processedQuery = $this->voiceSearchService->preprocessQuery($query);
        $queries = $isVoice
            ? $this->voiceSearchService->expandQuery($processedQuery)
            : [$processedQuery];

        // Limit results per variation to ensure diversity when multiple variations exist
        $pageVariationLimit = count($queries) > 1 ? (int) ceil(8 / count($queries)) : 8;
        $songVariationLimit = count($queries) > 1 ? (int) ceil(8 / count($queries)) : 8;
        $maxPages = 8;
        $maxSongs = 8;
        $maxTotal = 15;

        $allPages = new Collection;
        $allSongs = new Collection;
        $seenPageIds = [];
        $seenSongIds = [];

        // Search with all query variations and merge results
        foreach ($queries as $searchQuery) {
            // Stop if we've reached limits for both types
            if ($allPages->count() >= $maxPages && $allSongs->count() >= $maxSongs) {
                break;
            }

            // Search pages
            if ($allPages->count() < $maxPages) {
                $pages = Page::search($searchQuery)
                    ->take($pageVariationLimit)
                    ->get()
                    ->load('book');

                foreach ($pages as $page) {
                    if ($allPages->count() >= $maxPages) {
                        break;
                    }

                    if (! in_array($page->id, $seenPageIds)) {
                        $seenPageIds[] = $page->id;
                        $allPages->push([
                            'id' => $page->id,
                            'content' => strip_tags($page->content ?? ''),
                            'book_title' => $page->book ? strip_tags($page->book->title ?? '') : null,
                            'book_id' => $page->book_id,
                            'type' => 'page',
                        ]);
                    }
                }
            }

            // Search songs
            if ($allSongs->count() < $maxSongs) {
                $songs = Song::search($searchQuery)
                    ->take($songVariationLimit)
                    ->get();

                foreach ($songs as $song) {
                    if ($allSongs->count() >= $maxSongs) {
                        break;
                    }

                    if (! in_array($song->id, $seenSongIds)) {
                        $seenSongIds[] = $song->id;
                        $allSongs->push([
                            'id' => $song->id,
                            'title' => strip_tags($song->title ?? ''),
                            'description' => strip_tags($song->description ?? ''),
                            'type' => 'song',
                        ]);
                    }
                }
            }
        }

        // Combine and limit total results to 15
        $results = $allPages->concat($allSongs)->take($maxTotal)->values();

        return response()->json($results);
    }

    /**
     * Reverse geocode: get address from coordinates
     * Proxies request to Nominatim to avoid CORS issues
     */
    public function reverseGeocode(Request $request): JsonResponse
    {
        $lat = $request->input('lat');
        $lng = $request->input('lng');

        if ($lat === null || $lng === null) {
            return response()->json(['error' => __('messages.search.lat_lng_required')], 400);
        }

        // Validate that lat and lng are numeric
        if (! is_numeric($lat) || ! is_numeric($lng)) {
            return response()->json(['error' => __('messages.search.lat_lng_numeric')], 400);
        }

        // Convert to float and validate ranges
        $lat = (float) $lat;
        $lng = (float) $lng;

        // Validate coordinate ranges
        if ($lat < -90 || $lat > 90) {
            return response()->json(['error' => __('messages.search.latitude_range')], 400);
        }

        if ($lng < -180 || $lng > 180) {
            return response()->json(['error' => __('messages.search.longitude_range')], 400);
        }

        try {
            // Use Guzzle's query parameter handling to properly encode values
            $client = new \GuzzleHttp\Client;
            $response = $client->get('https://nominatim.openstreetmap.org/reverse', [
                'query' => [
                    'format' => 'json',
                    'lat' => $lat,
                    'lon' => $lng,
                    'addressdetails' => 1,
                ],
                'headers' => [
                    'User-Agent' => 'Shudderfly App',
                ],
                'timeout' => 10,
            ]);

            $data = json_decode($response->getBody(), true);

            if ($data && isset($data['display_name'])) {
                return response()->json([
                    'displayName' => $data['display_name'],
                    'address' => $data['address'] ?? [],
                    'lat' => floatval($data['lat'] ?? $lat),
                    'lng' => floatval($data['lon'] ?? $lng),
                    'raw' => $data,
                ]);
            }

            return response()->json(['error' => __('messages.search.no_address')], 404);
        } catch (\Exception $e) {
            Log::error('Reverse geocode error: '.$e->getMessage());

            return response()->json(['error' => __('messages.search.reverse_geocode_failed')], 500);
        }
    }
}
