<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreBookRequest;
use App\Http\Requests\UpdateBookRequest;
use App\Models\Book;
use App\Models\Category;
use App\Models\User;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Http\JsonResponse;
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
    public function index(): Response
    {
        return Inertia::render('Books/Index');
    }

    /**
     * Display a listing of the resource.
     */
    public function search(Request $request): Response|RedirectResponse
    {
        $search = $request->search;
        if (! $search) {
            return redirect()->route('books.index');
        }

        $categories = Category::query()
            ->with(['books' => fn ($book) => $book
                ->where('title', 'LIKE', '%'.$search.'%')
                ->orWhere('excerpt', 'LIKE', '%'.$search.'%')
                ->with('coverImage'),
            ])
            ->orderBy('name')
            ->get();

        return Inertia::render('Books/Index', [
            'searchCategories' => $categories,
            'search' => $search,
        ]);
    }

    /**
     * Display books by category.
     */
    public function category(Request $request): JsonResponse
    {
        $categoryName = $request->categoryName;
        $category = Category::where('name', $categoryName)->first();
        $books = match ($categoryName) {
            'popular' => Book::query()
                ->with('coverImage')
                ->orderBy('read_count', 'desc')
                ->paginate(10),
            'forgotten' => Book::query()
                ->with('coverImage')
                ->orderBy('read_count')
                ->paginate(10),
            default => $category
                ? $category->books()
                    ->with('coverImage')
                    ->paginate(10)
                : Book::query()
                    ->with('coverImage')
                    ->paginate(10)
        };

        $books->appends($request->all())->links();

        return response()->json([
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
        if (! auth()->user()->can('edit pages') && ! $request->has('page')) {
            $book->increment('read_count');
        }

        $pages = $book->pages()->paginate();

        return Inertia::render('Book/Show', [
            'book' => $book->load('coverImage'),
            'pages' => $pages,
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
            Storage::disk('s3')->delete($page->media_path);
        }
        $book->pages()->delete();
        $book->delete();

        return redirect(route('dashboard'));
    }
}
