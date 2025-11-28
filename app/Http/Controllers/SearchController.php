<?php

namespace App\Http\Controllers;

use App\Models\Book;
use App\Models\Page;
use App\Models\Song;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
}
