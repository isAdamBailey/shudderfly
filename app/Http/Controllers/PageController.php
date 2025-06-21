<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePageRequest;
use App\Http\Requests\UpdatePageRequest;
use App\Jobs\CreateVideoSnapshot;
use App\Jobs\DeleteOldMedia;
use App\Jobs\IncrementPageReadCount;
use App\Jobs\StoreImage;
use App\Jobs\StoreVideo;
use App\Models\Book;
use App\Models\Collage;
use App\Models\Page;
use App\Models\SiteSetting;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Redirector;
use Illuminate\Support\Facades\Log;
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
                if (! $youtubeEnabled) {
                    $query->whereRaw('1 = 0');
                } else {
                    $query->whereNotNull('video_link');
                }
            })
            ->when($filter === 'snapshot', function ($query) {
                $query->where('media_path', 'like', '%snapshot%');
            })
            ->when(! $youtubeEnabled, function ($query) {
                $query->whereNull('video_link');
            })
            ->when($search, function ($query) use ($search) {
                $query->where(function ($query) use ($search) {
                    $query->where('content', 'LIKE', '%'.$search.'%')
                        ->orWhereHas('book', function ($query) use ($search) {
                            $query->where('title', 'LIKE', '%'.$search.'%');
                        });
                });
            })
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

        if (! $youtubeEnabled && $page->video_link) {
            abort(404);
        }

        $canEditPages = $request->user()?->can('edit pages');
        $canIncrement = $request->user()?->cannot('edit profile');

        if ($canIncrement) {
            IncrementPageReadCount::dispatch($page);
        }

        $page->load(['book', 'book.coverImage']);

        $query = Page::where('book_id', $page->book_id);

        if (! $youtubeEnabled) {
            $query->whereNull('video_link');
        }

        $siblingPages = $query->orderBy('created_at')->pluck('id');

        $nextPage = null;
        $previousPage = null;

        if (! $siblingPages->isEmpty()) {
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

        $collages = Collage::with('pages')->latest()->limit(4)->get();

        return Inertia::render('Page/Show', [
            'page' => $page,
            'previousPage' => $previousPage,
            'nextPage' => $nextPage,
            'books' => $books,
            'collages' => $collages,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StorePageRequest $request): Redirector|RedirectResponse|Application
    {
        $book = Book::find($request->book_id);

        if ($request->hasFile('image')) {
            $file = $request->file('image');

            if ($file->isValid()) {
                $mimeType = $file->getMimeType();
                $filePath = Storage::disk('local')->put('temp', $file);

                if (Str::startsWith($mimeType, 'image/')) {
                    $filename = pathinfo($file->hashName(), PATHINFO_FILENAME);
                    $mediaPath = 'books/'.$book->slug.'/'.$filename.'.webp';
                    StoreImage::dispatch($filePath, $mediaPath, $book, $request->input('content'), $request->input('video_link'));
                } elseif (Str::startsWith($mimeType, 'video/')) {
                    $mediaPath = 'books/'.$book->slug.'/'.$file->getClientOriginalName();
                    try {
                        StoreVideo::dispatch($filePath, $mediaPath, $book, $request->input('content'), $request->input('video_link'));
                    } catch (\Exception $e) {
                        Log::error('Failed to dispatch StoreVideo job', [
                            'exception' => $e->getMessage(),
                            'trace' => $e->getTraceAsString(),
                        ]);
                        throw $e;
                    }
                }
            }
        } else {
            // If no file is uploaded, create the page immediately
            $book->pages()->create([
                'content' => $request->input('content'),
                'video_link' => $request->input('video_link') ? trim($request->input('video_link')) : null,
            ]);
        }

        return redirect(route('books.show', $book))->with('success', 'New upload queued! It may take a few minutes to process.');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdatePageRequest $request, Page $page): Redirector|RedirectResponse|Application
    {
        if ($request->hasFile('image')) {
            $file = $request->file('image');
            Log::info('File received for update', [
                'is_valid' => $file->isValid(),
                'mime_type' => $file->getMimeType(),
                'original_name' => $file->getClientOriginalName(),
                'size' => $file->getSize(),
            ]);

            if ($file->isValid()) {
                // Get raw database values, not the accessor-transformed URLs
                $oldMediaPath = $page->getAttributes()['media_path'] ?? null;
                $oldPosterPath = $page->getAttributes()['media_poster'] ?? null;

                $mimeType = $file->getMimeType();
                $filePath = Storage::disk('local')->put('temp', $file);

                if (Str::startsWith($mimeType, 'image/')) {
                    $filename = pathinfo($file->hashName(), PATHINFO_FILENAME);
                    $mediaPath = 'books/'.$page->book->slug.'/'.$filename.'.webp';
                    StoreImage::dispatch($filePath, $mediaPath, $page->book, $request->input('content'), $request->input('video_link'), $page)
                        ->chain([
                            new DeleteOldMedia($oldMediaPath, $oldPosterPath),
                        ]);
                } elseif (Str::startsWith($mimeType, 'video/')) {
                    $mediaPath = 'books/'.$page->book->slug.'/'.$file->getClientOriginalName();

                    try {
                        StoreVideo::dispatch($filePath, $mediaPath, $page->book, $request->input('content'), $request->input('video_link'), $page)
                            ->chain([
                                new DeleteOldMedia($oldMediaPath, $oldPosterPath),
                            ]);
                    } catch (\Exception $e) {
                        Log::error('Failed to dispatch StoreVideo job for update', [
                            'exception' => $e->getMessage(),
                            'trace' => $e->getTraceAsString(),
                        ]);
                        throw $e;
                    }
                }
            }
        } else {
            if ($request->has('content')) {
                $page->content = $request->input('content');
            }

            if ($request->has('book_id')) {
                $page->book_id = $request->book_id;
            }

            if ($request->has('created_at')) {
                $page->created_at = $request->created_at;
            }

            if ($request->has('video_link') && ! is_null($request->video_link)) {
                // Get raw database values, not the accessor-transformed URLs
                $oldMediaPath = $page->getAttributes()['media_path'] ?? null;
                $oldPosterPath = $page->getAttributes()['media_poster'] ?? null;

                $page->media_path = '';
                $page->media_poster = '';
                $page->video_link = $request->video_link;
                $page->save();

                DeleteOldMedia::dispatch($oldMediaPath, $oldPosterPath);
            } else {
                $page->save();
            }
        }

        return redirect(route('pages.show', $page));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Page $page): Redirector|RedirectResponse|Application
    {
        // Get raw database values, not the accessor-transformed URLs
        $rawMediaPoster = $page->getAttributes()['media_poster'] ?? null;
        $rawMediaPath = $page->getAttributes()['media_path'] ?? null;

        if (! empty($rawMediaPoster)) {
            Storage::disk('s3')->delete($rawMediaPoster);
        }
        if (! empty($rawMediaPath)) {
            Storage::disk('s3')->delete($rawMediaPath);
        }
        $page->delete();

        return redirect(route('books.show', $page->book));
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
