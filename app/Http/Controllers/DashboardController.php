<?php

namespace App\Http\Controllers;

use App\Models\Book;
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
        $leastRead = Book::query()
            ->orderBy('read_count')
            ->orderBy('created_at')
            ->first();

        return Inertia::render('Dashboard/Index', [
            'users' => ['data' => User::all()],
            'stats' => [
                'numberOfBooks' => Book::count(),
                'numberOfPages' => Page::count(),
                'leastPages' => $leastPages->toArray(),
                'mostPages' => $mostPages->toArray(),
                'mostRead' => $mostRead->toArray(),
                'leastRead' => $leastRead->toArray(),
            ],
        ]);
    }
}
