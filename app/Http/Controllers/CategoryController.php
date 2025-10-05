<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCategoryRequest;
use App\Http\Requests\UpdateCategoryRequest;
use App\Models\Book;
use App\Models\Category;
use Illuminate\Foundation\Application;
use Illuminate\Http\RedirectResponse;
use Illuminate\Routing\Redirector;
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
            default => Category::where('name', $categoryName)
                ->firstOrFail()
                ->books()
                ->with('coverImage')
                ->paginate()
        };

        return Inertia::render('Category/Index', [
            'categoryName' => $categoryName,
            'books' => $books,
        ]);
    }

    public function store(StoreCategoryRequest $request): Application|Redirector|RedirectResponse
    {
        Category::create($request->validated());

        return redirect(route('dashboard'));
    }

    public function update(UpdateCategoryRequest $request, Category $category): Application|RedirectResponse|Redirector
    {
        $category->update($request->validated());

        return redirect(route('dashboard'));
    }

    public function destroy(Category $category): Redirector|RedirectResponse|Application
    {
        $uncategorized = Category::where('name', 'uncategorized')->first();
        foreach ($category->books as $book) {
            $book->category()->associate($uncategorized);
            $book->save();
        }

        $category->delete();

        return redirect(route('dashboard'));
    }
}
