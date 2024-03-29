<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePageRequest;
use App\Http\Requests\UpdatePageRequest;
use App\Models\Book;
use App\Models\Page;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Redirector;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class PageController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->search;

        $photos = Page::with('book')
            ->where('image_path', '!=', '')
            ->when($search, fn ($query) => $query->where('content', 'LIKE', '%'.$search.'%'))
            ->unless($request->filter, fn ($query) => $query->latest())
            ->when($request->filter === 'old', function ($query) {
                $yearAgo = clone $query;
                $yearAgo->whereDate('created_at', '<=', today()->subYear());
                if (! $yearAgo->exists()) {
                    return $query->oldest();
                }

                return $yearAgo->orderBy('created_at', 'desc');
            })
            ->when($request->filter === 'random', fn ($query) => $query->inRandomOrder())
            ->paginate(25);

        return Inertia::render('Uploads/Index', [
            'photos' => $photos,
            'search' => $search,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StorePageRequest $request): Redirector|RedirectResponse|Application
    {
        $book = Book::find($request->book_id);
        $image = $request->hasFile('image')
            ? $request->file('image')->storePublicly('book/'.$book->slug)
            : '';

        $book->pages()->create([
            'content' => $request->input('content'),
            'image_path' => $image,
        ]);

        if (! $book->cover_page) {
            $this->resetCoverImage($book->id);
        }

        return redirect(route('books.show', $book));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdatePageRequest $request, Page $page): Redirector|RedirectResponse|Application
    {
        $bookId = $page->book_id;
        if ($request->hasFile('image')) {
            if (Storage::exists($page->image_path)) {
                Storage::delete($page->image_path);
            }
            $image = $request->file('image')->storePublicly('book/'.$page->book->slug);
            $page->image_path = $image;
        }

        if ($request->has('content')) {
            $page->content = $request->input('content');
        }

        if ($request->has('book_id')) {
            $page->book_id = $request->book_id;
        }

        $page->save();

        if ($request->has('book_id') && $bookId !== $page->book_id) {
            // if we are changing the book, we need to reset the cover image
            // for both the book we removed from and the book we added to
            $this->resetCoverImage($bookId);
            $this->resetCoverImage($page->book_id);
        }

        return redirect(route('books.show', $page->book));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Page $page): Redirector|RedirectResponse|Application
    {
        Storage::disk('s3')->delete($page->image_path);
        $page->delete();

        $this->resetCoverImage($page->book_id);

        return redirect(route('books.show', $page->book));
    }

    private function resetCoverImage(int $bookId): void
    {
        $book = Book::find($bookId);
        if (! $book) {
            return;
        }

        $search = '%.jpg';
        if (app()->environment('local')) {
            // the seeded images are pngs
            $search = '%.png%';
        }
        $page = $book->pages()
            ->whereNotNull('image_path')
            ->where('image_path', 'like', $search)
            ->first();

        if ($page) {
            $book->update(['cover_page' => $page->id]);
        }
    }
}
