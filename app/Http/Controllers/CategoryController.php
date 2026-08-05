<?php

namespace App\Http\Controllers;

use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Requests\StoreCategoryRequest;
use App\Http\Requests\UpdateCategoryRequest;
use App\Models\Book;
use App\Models\Category;
use App\Models\Page;
use App\Support\MonthBooks;
use App\Support\ThemeBooks;
use Illuminate\Foundation\Application;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Redirector;
use Inertia\Inertia;
use Inertia\Response;

class CategoryController extends Controller
{
    /**
     * Display all books for a specific category.
     */
    public function show(Request $request, string $categoryName): Response
    {
        $sort = $request->query('sort', 'newest');
        $isSpecialCategory = in_array($categoryName, ['popular', 'forgotten', 'themed', 'month'], true);

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
            'month' => MonthBooks::getBooksForMonthPaginated(),
            default => Category::where('name', $categoryName)
                ->firstOrFail()
                ->books()
                ->with('coverImage')
                ->when($sort === 'popular', fn ($query) => $query->reorder()->orderBy('read_count', 'desc'))
                ->when($sort === 'oldest', fn ($query) => $query->reorder()->orderBy('created_at', 'asc'))
                ->paginate()
                ->withQueryString()
        };

        // Get all pages with locations for ALL books in this category (not just current page)
        $allBookIds = match ($categoryName) {
            'popular', 'forgotten' => Book::query()->pluck('id'),
            'themed' => ThemeBooks::getBookIds(HandleInertiaRequests::getCurrentTheme() ?? ''),
            'month' => MonthBooks::getBookIds(),
            default => Category::where('name', $categoryName)
                ->firstOrFail()
                ->books()
                ->pluck('id')
        };

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
            'sort' => $sort,
            'isSpecialCategory' => $isSpecialCategory,
            'categoryLabel' => match ($categoryName) {
                'themed' => ThemeBooks::getLabel(HandleInertiaRequests::getCurrentTheme() ?? ''),
                'month' => MonthBooks::getLabel(),
                default => null,
            },
        ]);
    }

    public function store(StoreCategoryRequest $request): Application|Redirector|RedirectResponse
    {
        Category::create($request->validated());

        return redirect(route('welcome'));
    }

    public function update(UpdateCategoryRequest $request, Category $category): Application|RedirectResponse|Redirector
    {
        $category->update($request->validated());

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

        return redirect(route('welcome'));
    }
}
