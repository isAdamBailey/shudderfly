<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCategoryRequest;
use App\Models\Category;
use Illuminate\Foundation\Application;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Routing\Redirector;

class CategoryController extends Controller
{
    public function index(): JsonResponse
    {
        $categories = Category::all();

        return response()->json([
            'categories' => $categories,
        ]);
    }

    public function store(StoreCategoryRequest $request): Application|Redirector|RedirectResponse
    {
        Category::create($request->validated());

        return redirect(route('dashboard'));
    }
}
