<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreBookRequest;
use App\Http\Requests\UpdateBookRequest;
use App\Models\Book;
use App\Models\Category;
use App\Models\User;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Redirector;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
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
        $categories = Category::query()
            ->with(['books' => fn ($book) => $book
                ->with(['pages' => fn ($q) => $q->hasImage()])
                ->when($search,
                    fn ($query) => $query->where('title', 'LIKE', '%'.$search.'%')
                        ->orWhere('excerpt', 'LIKE', '%'.$search.'%')
                ),
            ])
            ->orderBy('name')
            ->get();

        $mostPopular = ! $search ? Book::query()
            ->with(['pages' => fn ($q) => $q->hasImage()])
            ->orderBy('read_count', 'desc')
            ->take(10)
            ->get() : null;

        return Inertia::render('Books/Index', [
            'categories' => [
                'data' => $categories,
                'mostPopular' => $mostPopular,
                'search' => $search,
            ],
        ]);
    }

    /**
     * Display books by category.
     */
    public function category(Request $request): Response
    {
        $categoryName = $request->categoryName;
        $category = Category::where('name', $categoryName)->first();
        if ($category) {
            $books = $category->books()
                ->with(['pages' => fn ($q) => $q->hasImage()])
                ->paginate();
        } else {
            $books = match ($categoryName) {
                'popular' => Book::query()
                    ->with(['pages' => fn ($q) => $q->hasImage()])
                    ->orderBy('read_count', 'desc')
                    ->paginate(),
                default => Book::query()
                    ->with(['pages' => fn ($q) => $q->hasImage()])
                    ->paginate()
            };
        }
        $books->appends($request->all())->links();

        return Inertia::render('Books/Index', [
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

        return redirect(route('books.show', $book));
    }

    /**
     * Display the specified resource.
     */
    public function show(Book $book, Request $request): Response
    {
        if (! $request->has('page')) {
            $book->increment('read_count');
        }

        return Inertia::render('Book/Show', [
            'book' => $book,
            'pages' => $book->pages()->paginate(2),
            'authors' => User::all()->toArray(),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateBookRequest $request, Book $book): Application|RedirectResponse|Redirector
    {
        $book->update($request->validated());

        return redirect(route('books.show', Book::find($book->id)));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Book $book): Redirector|RedirectResponse|Application
    {
        foreach ($book->pages() as $page) {
            Storage::disk('s3')->delete($page->image_path);
        }
        $book->pages()->delete();
        $book->delete();

        return redirect(route('dashboard'));
    }
}
