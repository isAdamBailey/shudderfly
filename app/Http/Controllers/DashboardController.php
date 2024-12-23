<?php

namespace App\Http\Controllers;

use App\Models\Book;
use App\Models\Category;
use App\Models\Page;
use App\Models\User;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function show()
    {
        $leastPages = Book::withCount('pages')
            ->orderBy('pages_count')
            ->orderBy('created_at')
            ->first();
        $mostPages = Book::withCount('pages')
            ->orderBy('pages_count', 'desc')
            ->orderBy('created_at')
            ->first();

        return Inertia::render('Dashboard/Index', [
            'users' => Inertia::defer(fn () => User::all()),
            'categories' => Inertia::defer(fn () =>  Category::withCount('books')->get()),
            'stats' => Inertia::defer(fn () => [
                'numberOfBooks' => Book::count(),
                'numberOfPages' => Page::count(),
                'leastPages' => $leastPages->toArray(),
                'mostPages' => $mostPages->toArray(),
            ]),
        ]);
    }
}
