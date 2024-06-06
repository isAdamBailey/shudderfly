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
use Illuminate\Support\Facades\Log;

class PageController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->search;
        $filter = $request->filter;

        $photos = Page::with('book')
            ->where(function ($query) {
                $query->where('image_path', '!=', '')
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
        Log::info('Queue configuration:', config('queue.connections.sqs'));
        $book = Book::find($request->book_id);

        $imagePath = '';

        if ($request->hasFile('image')) {
            $file = $request->file('image');
            if ($file->isValid()) {
                $mimeType = $file->getMimeType();
                if (Str::startsWith($mimeType, 'image/')) {
                    $filename = pathinfo($file->hashName(), PATHINFO_FILENAME);
                    $imagePath = 'book/'.$book->slug.'/'.$filename.'.webp';
                    StoreImage::dispatch($file, $imagePath);
                } elseif (Str::startsWith($mimeType, 'video/')) {
                    $imagePath = $request->file('image')->storePublicly('book/'.$book->slug);
                }
            }
        }

        $book->pages()->create([
            'content' => $request->input('content'),
            'image_path' => $imagePath,
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
                $imagePath = '';
                $mimeType = $file->getMimeType();
                if (Str::startsWith($mimeType, 'image/')) {
                    $filename = pathinfo($file->hashName(), PATHINFO_FILENAME);
                    $imagePath = 'book/'.$page->book->slug.'/'.$filename.'.webp';
                    StoreImage::dispatch($file, $imagePath);
                } elseif (Str::startsWith($mimeType, 'video/')) {
                    $imagePath = $request->file('image')->storePublicly('book/'.$page->book->slug);
                }
                $page->image_path = $imagePath;
                $page->video_link = null;
            }
            if ($page->image_path && Storage::exists($page->image_path)) {
                Storage::delete($page->image_path);
            }
        }

        if ($request->has('content')) {
            $page->content = $request->input('content');
        }

        if ($request->has('book_id')) {
            $page->book_id = $request->book_id;
        }

        if ($request->has('video_link') && ! is_null($request->video_link)) {
            if ($page->image_path) {
                if (Storage::exists($page->image_path)) {
                    Storage::delete($page->image_path);
                }
                $page->image_path = '';
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
        Storage::disk('s3')->delete($page->image_path);
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
            ->whereNotNull('image_path')
            ->where(function ($query) {
                $query->where('image_path', 'like', '%.jpg')
                    ->orWhere('image_path', 'like', '%.png');
            })
            ->first();

        if ($page) {
            $book->update(['cover_page' => $page->id]);
        }
    }
}
