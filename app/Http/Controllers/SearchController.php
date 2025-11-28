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
                    'title' => $book->title,
                    'excerpt' => $book->excerpt,
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

        // Search pages
        $pages = Page::search($query)
            ->take(10)
            ->get()
            ->load('book')
            ->map(function ($page) {
                return [
                    'id' => $page->id,
                    'content' => $page->content,
                    'book_title' => $page->book ? $page->book->title : null,
                    'book_id' => $page->book_id,
                    'type' => 'page',
                ];
            });

        // Search songs
        $songs = Song::search($query)
            ->take(10)
            ->get()
            ->map(function ($song) {
                return [
                    'id' => $song->id,
                    'title' => $song->title,
                    'description' => $song->description,
                    'type' => 'song',
                ];
            });

        // Combine and limit total results
        $results = $pages->concat($songs)->take(15);

        return response()->json($results);
    }
}
