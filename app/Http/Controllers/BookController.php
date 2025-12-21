<?php

namespace App\Http\Controllers;

use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Requests\StoreBookRequest;
use App\Http\Requests\UpdateBookRequest;
use App\Jobs\IncrementBookReadCount;
use App\Models\Book;
use App\Models\Category;
use App\Models\User;
use App\Support\ThemeBooks;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Redirector;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class BookController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): Response
    {
        $search = $request->search;

        if ($search) {
            $searchCategories = Category::query()
                ->with(['books' => fn ($book) => $book
                    ->where('title', 'LIKE', '%'.$search.'%')
                    ->orWhere('excerpt', 'LIKE', '%'.$search.'%')
                    ->with('coverImage'),
                ])
                ->orderBy('name')
                ->get();
        }

        $authors = auth()->user()->can('edit pages') ? User::all() : [];
        $categories = Category::all()->map->only(['id', 'name'])->sortBy('name')->values()->toArray();

        // Get theme label if a theme is active
        $currentTheme = HandleInertiaRequests::getCurrentTheme();
        $themeLabel = null;
        if ($currentTheme) {
            $themeLabel = ThemeBooks::getLabel($currentTheme);
        }

        return Inertia::render('Books/Index', [
            'authors' => $authors,
            'categories' => $categories,
            'searchCategories' => $searchCategories ?? null,
            'search' => $search,
            'themeLabel' => $themeLabel,
        ]);
    }

    /**
     * Display books by category.
     */
    public function category(Request $request): JsonResponse
    {
        $categoryName = $request->categoryName;
        $category = Category::where('name', $categoryName)->first();
        $books = match ($categoryName) {
            'popular' => Book::query()
                ->with('coverImage')
                ->orderBy('read_count', 'desc')
                ->paginate(10),
            'forgotten' => Book::query()
                ->with('coverImage')
                ->orderBy('read_count')
                ->paginate(10),
            'themed' => ThemeBooks::getBooksForThemePaginated(
                HandleInertiaRequests::getCurrentTheme() ?? '',
                10
            ),
            default => $category
                ? $category->books()
                    ->with('coverImage')
                    ->paginate(10)
                : Book::query()
                    ->with('coverImage')
                    ->paginate(10)
        };

        $books->appends($request->all())->links();

        return response()->json([
            'books' => $books,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     *
     *
     * @throws ValidationException
     */
    public function store(StoreBookRequest $request): Redirector|RedirectResponse|Application
    {
        $book = Book::create($request->validated());

        return redirect(route('books.show', $book))->with('success', __('messages.book.created', ['title' => $book->title]));
    }

    /**
     * Display the specified resource.
     */
    public function show(Book $book, Request $request): Response
    {
        $canEditPages = auth()->user()->can('edit pages');
        $canIncrement = auth()->user()->cannot('edit profile')
            && ! $request->has('page');

        if ($canIncrement) {
            // Per-actor throttle: only count one view per user/session/IP per 5 minutes (cache only)
            $cacheKey = \App\Support\ReadThrottle::cacheKey('book', $book->id, $request);
            $throttleSeconds = 5 * 60;
            $fingerprint = \App\Support\ReadThrottle::fingerprint($request);
            try {
                if (Cache::add($cacheKey, 1, now()->addSeconds($throttleSeconds))) {
                    // Added successfully => no recent view by this actor
                    \App\Support\ReadThrottle::dispatchJob(new IncrementBookReadCount($book, $fingerprint));
                }
            } catch (\Throwable $e) {
                // If cache is unavailable/misconfigured, skip increment to avoid inflation
            }
        }

        $youtubeEnabled = \App\Models\SiteSetting::where('key', 'youtube_enabled')->first()->value;

        $pages = $book->pages()
            ->when(! $youtubeEnabled, fn ($query) => $query->whereNull('video_link'))
            ->paginate();

        // when at the last page, return all books that contain words
        $similarBooks = null;
        if ($pages->currentPage() == $pages->lastPage()) {
            $similarBooks = $this->getSimilarBooks($book);
        }

        $categories = $canEditPages
            ? Category::all()->map->only(['id', 'name'])->sortBy('name')->values()->toArray()
            : null;

        $authors = $canEditPages
            ? User::all()->toArray()
            : [];

        $books = $canEditPages
            ? Book::all()->map->only(['id', 'title'])->sortBy('title')->values()->toArray()
            : [];

        return Inertia::render('Book/Show', [
            'book' => $book->load(['coverImage', 'category']),
            'pages' => $pages,
            'authors' => $authors,
            'categories' => $categories,
            'books' => $books,
            'similarBooks' => Inertia::defer(fn () => $similarBooks),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateBookRequest $request, Book $book): Application|RedirectResponse|Redirector
    {
        $book->update($request->validated());

        // If book location was updated, keep all pages in sync with the book's location
        if ($request->has('latitude') || $request->has('longitude')) {
            $book->pages()->update([
                'latitude' => $book->latitude,
                'longitude' => $book->longitude,
            ]);
        }

        return redirect(route('books.show', Book::find($book->id)))->with('success', __('messages.book.updated', ['title' => $book->title]));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Book $book): Redirector|RedirectResponse|Application
    {
        // Get all pages and delete their S3 assets
        foreach ($book->pages as $page) {
            // Get raw database values, not the accessor-transformed URLs
            $rawMediaPoster = $page->getAttributes()['media_poster'] ?? null;
            $rawMediaPath = $page->getAttributes()['media_path'] ?? null;

            if (! empty($rawMediaPoster)) {
                Storage::disk('s3')->delete($rawMediaPoster);
            }
            if (! empty($rawMediaPath)) {
                Storage::disk('s3')->delete($rawMediaPath);
            }
        }

        $book->pages()->delete();
        $book->delete();

        return redirect(route('books.index'))->with('success', __('messages.book.deleted', ['title' => $book->title]));
    }

    /**
     * Get books with similar words in title or excerpt.
     */
    private function getSimilarBooks(Book $book): ?Collection
    {
        $words = array_unique(array_merge(
            explode(' ', strtolower($book->title)),
            explode(' ', strtolower($book->excerpt))
        ));

        $ignoreWords = [
            'all', 'the', 'on', 'in', 'and', 'or', 'of', 'to', 'a', 'an', 'up', 'down', 'is', 'it', 'as', 'at', 'by',
            'for', 'from', 'with', 'be', 'are', 'were', 'was', 'will', 'can', 'may', 'have', 'has', 'had', 'do', 'does',
            'did', 'not', 'no', 'so', 'if', 'but', 'how', 'why', 'what', 'who', 'we', 'me', 'wa', 'ny', 'az', 'mo',
            'ca', 'la', 'out', 'over', 'under', 'again', 'further',
        ];
        $words = array_filter($words, fn ($word) => ! is_numeric($word) && ! empty($word) && ! in_array(strtolower($word), $ignoreWords));
        if (empty($words)) {
            return null;
        }

        $query = Book::query()
            ->where('id', '!=', $book->id)
            ->with('coverImage')
            ->where(function ($q) use ($words) {
                foreach ($words as $word) {
                    $q->orWhereRaw('LOWER(title) LIKE ?', ['%'.$word.'%']);
                }
            });

        $similarBooks = $query->get();

        return $similarBooks->isEmpty() ? null : $similarBooks;
    }
}
