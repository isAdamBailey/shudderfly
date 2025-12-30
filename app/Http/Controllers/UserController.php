<?php

namespace App\Http\Controllers;

use App\Models\Book;
use App\Models\Message;
use App\Models\User;
use App\Services\PopularityService;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function __construct(
        private PopularityService $popularityService
    ) {}

    /**
     * Display the specified user's profile.
     */
    public function show(User $user): Response
    {
        $totalBooksCount = Book::where('author', $user->name)->count();

        // Calculate total reads across ALL user's books
        $totalReads = Book::where('author', $user->name)->sum('read_count');

        $topBooks = $this->popularityService->addPopularityToCollection(
            Book::where('author', $user->name)
                ->with('coverImage')
                ->orderBy('read_count', 'desc')
                ->orderBy('created_at', 'desc')
                ->take(5)
                ->get(),
            Book::class
        );

        $recentBooks = $this->popularityService->addPopularityToCollection(
            Book::where('author', $user->name)
                ->with('coverImage')
                ->orderBy('created_at', 'desc')
                ->take(5)
                ->get(),
            Book::class
        );

        $messagesCount = Message::where('user_id', $user->id)->count();

        $recentMessages = Message::where('user_id', $user->id)
            ->with(['page', 'user'])
            ->orderBy('created_at', 'desc')
            ->take(10)
            ->get();

        // Make created_at visible for the profile user
        $user->makeVisible('created_at');

        return Inertia::render('Users/Show', [
            'profileUser' => $user,
            'stats' => [
                'totalBooksCount' => $totalBooksCount,
                'totalReads' => $totalReads,
                'topBooks' => $topBooks,
                'recentBooks' => $recentBooks,
                'messagesCount' => $messagesCount,
            ],
            'recentMessages' => $recentMessages,
        ]);
    }
}
