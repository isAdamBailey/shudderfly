<?php

namespace App\Http\Controllers;

use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Requests\StoreCategoryRequest;
use App\Http\Requests\UpdateCategoryRequest;
use App\Models\Book;
use App\Models\Category;
use App\Models\Page;
use App\Support\ThemeBooks;
use Illuminate\Foundation\Application;
use Illuminate\Http\RedirectResponse;
use Illuminate\Routing\Redirector;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class CategoryController extends Controller
{
    /**
     * Display all books for a specific category.
     */
    public function show(string $categoryName): Response
    {
        // For special categories, don't query the database
        $books = match ($categoryName) {
            'popular' => Book::query()
                ->with('coverImage')
                ->orderBy('read_count', 'desc')
                ->paginate(),
            'forgotten' => Book::query()
                ->with('coverImage')
                ->orderBy('read_count', 'asc')
                ->paginate(),
            'themed' => ThemeBooks::getBooksForThemePaginated(
                HandleInertiaRequests::getCurrentTheme() ?? ''
            ),
            default => Category::where('name', $categoryName)
                ->firstOrFail()
                ->books()
                ->with('coverImage')
                ->paginate()
        };

        // Get all pages with locations for ALL books in this category (not just current page)
        if ($categoryName === 'themed') {
            $theme = HandleInertiaRequests::getCurrentTheme() ?? '';
            $keywords = ThemeBooks::getKeywords($theme);
            $allBookIds = empty($keywords) ? collect([]) : Book::query()
                ->where(function ($q) use ($keywords) {
                    foreach ($keywords as $keyword) {
                        $q->orWhere(function ($subQuery) use ($keyword) {
                            $subQuery->whereRaw('LOWER(title) LIKE ?', ['%'.strtolower($keyword).'%'])
                                ->orWhereRaw('LOWER(excerpt) LIKE ?', ['%'.strtolower($keyword).'%']);
                        });
                    }
                })
                ->pluck('id');
        } else {
            $allBookIds = match ($categoryName) {
                'popular' => Book::query()->pluck('id'),
                'forgotten' => Book::query()->pluck('id'),
                default => Category::where('name', $categoryName)
                    ->firstOrFail()
                    ->books()
                    ->pluck('id')
            };
        }

        // Get book locations instead of page locations
        $locations = Book::whereIn('id', $allBookIds)
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->select('id', 'title', 'latitude', 'longitude', 'slug')
            ->get()
            ->map(function ($book) {
                return [
                    'id' => $book->id,
                    'latitude' => (float) $book->latitude,
                    'longitude' => (float) $book->longitude,
                    'book_title' => $book->title ?? '',
                    'page_title' => '', // Books don't have page titles
                    'book_slug' => $book->slug ?? '',
                ];
            })
            ->toArray();

        return Inertia::render('Category/Index', [
            'categoryName' => $categoryName,
            'books' => $books,
            'locations' => $locations,
        ]);
    }

    public function store(StoreCategoryRequest $request): Application|Redirector|RedirectResponse
    {
        Category::create($request->validated());

        $this->forgetDashboardCategoryCaches();

        return redirect(route('welcome'));
    }

    public function update(UpdateCategoryRequest $request, Category $category): Application|RedirectResponse|Redirector
    {
        $category->update($request->validated());

        $this->forgetDashboardCategoryCaches();

        return redirect(route('welcome'));
    }

    public function destroy(Category $category): Redirector|RedirectResponse|Application
    {
        $uncategorized = Category::where('name', 'uncategorized')->first();
        foreach ($category->books as $book) {
            $book->category()->associate($uncategorized);
            $book->save();
        }

        $category->delete();

        $this->forgetDashboardCategoryCaches();

        return redirect(route('welcome'));
    }

    /**
     * Invalidate the dashboard's cached category lists (UserController::ownerProps)
     * so category changes show up immediately instead of after the cache TTL.
     */
    private function forgetDashboardCategoryCaches(): void
    {
        Cache::forget('dashboard-categories');
        Cache::forget('dashboard-book-categories');
    }
}
