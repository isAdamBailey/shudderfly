<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePageRequest;
use App\Http\Requests\UpdatePageRequest;
use App\Jobs\CreateVideoSnapshot;
use App\Jobs\IncrementPageReadCount;
use App\Jobs\StoreImage;
use App\Jobs\StoreVideo;
use App\Models\Book;
use App\Models\Page;
use App\Models\SiteSetting;
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
        $youtubeEnabled = SiteSetting::where('key', 'youtube_enabled')->first()->value;

        $photos = Page::with('book')
            ->when($filter === 'youtube', function ($query) use ($youtubeEnabled) {
                // Return empty result set if YouTube is disabled and filter is youtube
                if (!$youtubeEnabled) {
                    $query->whereRaw('1 = 0');
                } else {
                    $query->whereNotNull('video_link');
                }
            })
            ->when($filter !== 'youtube', function ($query) use ($youtubeEnabled) {
                // Show media paths for non-youtube filter
                $query->where(function ($q) {
                    $q->where('media_path', '!=', '')
                        ->orWhereNotNull('media_path');
                });
                
                // Include video links only if YouTube is enabled
                if ($youtubeEnabled) {
                    $query->orWhereNotNull('video_link');
                } else {
                    $query->whereNull('video_link');
                }
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
            ->when($filter === 'popular', fn ($query) => $query->orderBy('read_count', 'desc'))
            ->when($filter === 'snapshot', fn ($query) => $query->where('media_path', 'like', '%snapshot%')->latest())
            ->latest();

        $photos = $photos->paginate(25);
        $photos->appends($request->all());

        return Inertia::render('Uploads/Index', [
            'photos' => $photos,
            'search' => $search,
            'filter' => $filter,
        ]);
    }

    public function show(Page $page, Request $request): Response
    {
        $youtubeEnabled = SiteSetting::where('key', 'youtube_enabled')->first()->value;
        
        if (!$youtubeEnabled && $page->video_link) {
            abort(404);
        }

        $canEditPages = $request->user()?->can('edit pages');
        $canIncrement = $request->user()?->cannot('edit profile');

        if ($canIncrement) {
            IncrementPageReadCount::dispatch($page);
        }

        $page->load(['book', 'book.coverImage']);

        $query = Page::where('book_id', $page->book_id);
        
        if (!$youtubeEnabled) {
            $query->whereNull('video_link');
        }

        $siblingPages = $query->orderBy('created_at')->pluck('id');

        $nextPage = null;
        $previousPage = null;

        if (!$siblingPages->isEmpty()) {
            $currentIndex = $siblingPages->search($page->id);
            
            // Get next and previous indices, handling wrap-around
            $nextIndex = ($currentIndex + 1) % $siblingPages->count();
            $previousIndex = ($currentIndex - 1 + $siblingPages->count()) % $siblingPages->count();

            $nextPage = $nextIndex !== $currentIndex ? Page::find($siblingPages[$nextIndex]) : null;
            $previousPage = $previousIndex !== $currentIndex ? Page::find($siblingPages[$previousIndex]) : null;
        }

        $books = $canEditPages
            ? Book::all()->map->only(['id', 'title'])->sortBy('title')->values()->toArray()
            : [];

        return Inertia::render('Page/Show', [
            'page' => $page,
            'previousPage' => $previousPage,
            'nextPage' => $nextPage,
            'books' => $books,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StorePageRequest $request): Redirector|RedirectResponse|Application
    {
        $book = Book::find($request->book_id);

        $mediaPath = '';
        $posterPath = null;

        if ($request->hasFile('image')) {
            $file = $request->file('image');
            if ($file->isValid()) {
                $mimeType = $file->getMimeType();
                $filePath = Storage::disk('local')->put('temp', $file);
                if (Str::startsWith($mimeType, 'image/')) {
                    $filename = pathinfo($file->hashName(), PATHINFO_FILENAME);
                    $mediaPath = 'books/'.$book->slug.'/'.$filename.'.webp';
                    StoreImage::dispatch($filePath, $mediaPath);
                } elseif (Str::startsWith($mimeType, 'video/')) {
                    $mediaPath = 'books/'.$book->slug.'/'.$file->getClientOriginalName();
                    $posterPath = 'books/'.$book->slug.'/'.pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME).'_poster.jpg';
                    StoreVideo::dispatch($filePath, $mediaPath);
                }
            }
        }

        $book->pages()->create([
            'content' => $request->input('content'),
            'media_path' => $mediaPath,
            'media_poster' => $posterPath,
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
                $oldMediaPath = $page->media_path;

                $mediaPath = '';
                $posterPath = null;
                $mimeType = $file->getMimeType();
                $filePath = Storage::disk('local')->put('temp', $file);
                if (Str::startsWith($mimeType, 'image/')) {
                    $filename = pathinfo($file->hashName(), PATHINFO_FILENAME);
                    $mediaPath = 'books/'.$page->book->slug.'/'.$filename.'.webp';
                    StoreImage::dispatch($filePath, $mediaPath);
                } elseif (Str::startsWith($mimeType, 'video/')) {
                    $mediaPath = 'books/'.$page->book->slug.'/'.$file->getClientOriginalName();
                    $posterPath = 'books/'.$page->book->slug.'/'.pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME).'_poster.jpg';
                    StoreVideo::dispatch($filePath, $mediaPath);
                }

                if ($mediaPath && $oldMediaPath && Storage::disk('s3')->exists($oldMediaPath)) {
                    Storage::disk('s3')->delete($oldMediaPath);
                }

                $page->media_path = $mediaPath;
                $page->media_poster = $posterPath;
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
            if ($page->media_poster) {
                if (Storage::disk('s3')->exists($page->media_poster)) {
                    Storage::disk('s3')->delete($page->media_poster);
                }
                $page->media_poster = '';
            }
            $page->video_link = $request->video_link;
        }

        $page->save();

        return redirect(route('pages.show', $page));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Page $page): Redirector|RedirectResponse|Application
    {
        if (! empty($page->media_poster) && Storage::disk('s3')->exists($page->media_poster)) {
            Storage::disk('s3')->delete($page->media_poster);
        }
        if (! empty($page->media_path) && Storage::disk('s3')->exists($page->media_path)) {
            Storage::disk('s3')->delete($page->media_path);
        }
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

    public function snapshot(Request $request)
    {
        $book = Book::find($request->book_id);

        CreateVideoSnapshot::dispatch(
            videoUrl: $request->video_url,
            timeInSeconds: $request->video_time,
            book: $book,
            user: $request->user(),
            pageId: $request->page_id
        );
    }
}
