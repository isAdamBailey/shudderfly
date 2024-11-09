<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCategoryRequest;
use App\Http\Requests\UpdateCategoryRequest;
use App\Models\Category;
use Illuminate\Foundation\Application;
use Illuminate\Http\RedirectResponse;
use Illuminate\Routing\Redirector;

class CategoryController extends Controller
{
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
