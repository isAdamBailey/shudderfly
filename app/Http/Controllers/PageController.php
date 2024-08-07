<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePageRequest;
use App\Http\Requests\UpdatePageRequest;
use App\Jobs\StoreImage;
use App\Models\Book;
use App\Models\Page;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Redirector;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class PageController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->search;
        $filter = $request->filter;

        $photos = Page::with('book')
            ->where(function ($query) {
                $query->where('media_path', '!=', '')
                    ->orWhereNotNull('media_path')
                    ->orWhereNotNull('video_link');
            })
            ->when($search, fn ($query) => $query->where('content', 'LIKE', '%'.$search.'%'))
            ->unless($filter, fn ($query) => $query->latest())
            ->when($filter === 'old', function ($query) {
                $yearAgo = clone $query;
                $yearAgo->whereDate('created_at', '<=', today()->subYear());
                if (! $yearAgo->exists()) {
                    return $query->oldest();
                }

                return $yearAgo->orderBy('created_at', 'desc');
            })
            ->when($filter === 'random', fn ($query) => $query->inRandomOrder())
            ->when($filter === 'youtube', fn ($query) => $query->whereNotNull('video_link')->latest())
            ->paginate(20);

        $photos->appends($request->all());

        return Inertia::render('Uploads/Index', [
            'photos' => $photos,
            'search' => $search,
            'filter' => $filter,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StorePageRequest $request): Redirector|RedirectResponse|Application
    {
        $book = Book::find($request->book_id);

        $imagePath = '';

        if ($request->hasFile('image')) {
            $file = $request->file('image');
            if ($file->isValid()) {
                $mimeType = $file->getMimeType();
                if (Str::startsWith($mimeType, 'image/')) {
                    $filename = pathinfo($file->hashName(), PATHINFO_FILENAME);
                    $imagePath = 'books/'.$book->slug.'/'.$filename.'.webp';
                    StoreImage::dispatch($file, $imagePath);
                } elseif (Str::startsWith($mimeType, 'video/')) {
                    $imagePath = $request->file('image')->storePublicly('books/'.$book->slug);
                }
            }
        }

        $book->pages()->create([
            'content' => $request->input('content'),
            'media_path' => $imagePath,
            'video_link' => $request->input('video_link') ? trim($request->input('video_link')) : null,
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
        if ($request->hasFile('image')) {
            $file = $request->file('image');
            if ($file->isValid()) {
                if ($page->media_path && Storage::disk('s3')->exists($page->media_path)) {
                    Storage::disk('s3')->delete($page->media_path);
                }
                $imagePath = '';
                $mimeType = $file->getMimeType();
                if (Str::startsWith($mimeType, 'image/')) {
                    $filename = pathinfo($file->hashName(), PATHINFO_FILENAME);
                    $imagePath = 'books/'.$page->book->slug.'/'.$filename.'.webp';
                    StoreImage::dispatch($file, $imagePath);
                } elseif (Str::startsWith($mimeType, 'video/')) {
                    $imagePath = $request->file('image')->storePublicly('books/'.$page->book->slug);
                }
                $page->media_path = $imagePath;
                $page->video_link = null;
            }
        }

        if ($request->has('content')) {
            $page->content = $request->input('content');
        }

        if ($request->has('book_id')) {
            $page->book_id = $request->book_id;
        }

        if ($request->has('video_link') && ! is_null($request->video_link)) {
            if ($page->media_path) {
                if (Storage::disk('s3')->exists($page->media_path)) {
                    Storage::disk('s3')->delete($page->media_path);
                }
                $page->media_path = '';
            }
            $page->video_link = $request->video_link;
        }

        $page->save();

        return redirect(route('books.show', $page->book));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Page $page): Redirector|RedirectResponse|Application
    {
        Storage::disk('s3')->delete($page->media_path);
        $page->delete();

        if ($page->book->cover_page === $page->id) {
            $this->resetCoverImage($page->book_id);
        }

        return redirect(route('books.show', $page->book));
    }

    private function resetCoverImage(int $bookId): void
    {
        $book = Book::find($bookId);
        if (! $book) {
            return;
        }

        $page = $book->pages()
            ->whereNotNull('media_path')
            ->where(function ($query) {
                $query->where('media_path', 'like', '%.jpg')
                    ->orWhere('media_path', 'like', '%.png')
                    ->orWhere('media_path', 'like', '%.webp');
            })
            ->first();

        if ($page) {
            $book->update(['cover_page' => $page->id]);
        }
    }

    public function incrementReadCount(Page $page): void
    {
        if (! auth()->user()->can('edit pages')) {
            $page->increment('read_count');
        }
    }
}
