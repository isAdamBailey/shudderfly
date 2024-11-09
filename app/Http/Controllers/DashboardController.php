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
        $mostRead = Book::query()
            ->orderBy('read_count', 'desc')
            ->orderBy('created_at')
            ->first();
        $mostReadPage = Page::query()
            ->orderBy('read_count', 'desc')
            ->orderBy('created_at')
            ->first();
        $leastRead = Book::query()
            ->orderBy('read_count')
            ->orderBy('created_at')
            ->first();

        $categories = Category::withCount('books')->get();

        return Inertia::render('Dashboard/Index', [
            'users' => ['data' => User::all()],
            'categories' => ['data' => $categories],
            'stats' => [
                'numberOfBooks' => Book::count(),
                'numberOfPages' => Page::count(),
                'leastPages' => $leastPages->toArray(),
                'mostPages' => $mostPages->toArray(),
                'mostRead' => $mostRead->toArray(),
                'mostReadPage' => $mostReadPage->toArray(),
                'leastRead' => $leastRead->toArray(),
            ],
        ]);
    }
}
