<?php

namespace App\Http\Controllers;

use App\Models\Book;
use App\Models\Page;
use App\Models\Song;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SearchController extends Controller
{
    /**
     * Search books with autocomplete
     */
    public function searchBooks(Request $request): JsonResponse
    {
        $query = $request->input('q', '');

        if (empty($query)) {
            return response()->json([]);
        }

        $results = Book::search($query)
            ->take(15)
            ->get()
            ->map(function ($book) {
                return [
                    'id' => $book->id,
                    'title' => strip_tags($book->title ?? ''),
                    'excerpt' => strip_tags($book->excerpt ?? ''),
                    'slug' => $book->slug,
                    'type' => 'book',
                ];
            });

        return response()->json($results);
    }

    /**
     * Search uploads (pages and songs) with autocomplete
     */
    public function searchUploads(Request $request): JsonResponse
    {
        $query = $request->input('q', '');

        if (empty($query)) {
            return response()->json([]);
        }

        // Search pages and songs with equal representation
        // Fetch 8 of each to ensure fair distribution when limiting to 15 total
        $pages = Page::search($query)
            ->take(8)
            ->get()
            ->load('book')
            ->map(function ($page) {
                return [
                    'id' => $page->id,
                    'content' => strip_tags($page->content ?? ''),
                    'book_title' => $page->book ? strip_tags($page->book->title ?? '') : null,
                    'book_id' => $page->book_id,
                    'type' => 'page',
                ];
            });

        // Search songs
        $songs = Song::search($query)
            ->take(8)
            ->get()
            ->map(function ($song) {
                return [
                    'id' => $song->id,
                    'title' => strip_tags($song->title ?? ''),
                    'description' => strip_tags($song->description ?? ''),
                    'type' => 'song',
                ];
            });

        // Combine and limit total results to 15
        // This ensures fair representation: up to 8 pages and 8 songs, totaling max 15
        // Use values() to re-index the collection to ensure JSON array serialization
        $results = $pages->concat($songs)->take(15)->values();

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
            return response()->json(['error' => 'Latitude and longitude are required'], 400);
        }

        // Validate that lat and lng are numeric
        if (! is_numeric($lat) || ! is_numeric($lng)) {
            return response()->json(['error' => 'Latitude and longitude must be numeric'], 400);
        }

        // Convert to float and validate ranges
        $lat = (float) $lat;
        $lng = (float) $lng;

        // Validate coordinate ranges
        if ($lat < -90 || $lat > 90) {
            return response()->json(['error' => 'Latitude must be between -90 and 90'], 400);
        }

        if ($lng < -180 || $lng > 180) {
            return response()->json(['error' => 'Longitude must be between -180 and 180'], 400);
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

            return response()->json(['error' => 'No address found for coordinates'], 404);
        } catch (\Exception $e) {
            Log::error('Reverse geocode error: '.$e->getMessage());

            return response()->json(['error' => 'Failed to reverse geocode'], 500);
        }
    }
}
