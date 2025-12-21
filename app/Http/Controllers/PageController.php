<?php

namespace App\Http\Controllers;

use App\Events\MessageCreated;
use App\Http\Requests\StorePageRequest;
use App\Http\Requests\UpdatePageRequest;
use App\Jobs\CreateVideoSnapshot;
use App\Jobs\IncrementPageReadCount;
use App\Jobs\StoreImage;
use App\Jobs\StoreVideo;
use App\Models\Book;
use App\Models\Collage;
use App\Models\Message;
use App\Models\Page;
use App\Models\SiteSetting;
use App\Models\Song;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Redirector;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class PageController extends Controller
{
    /**
     * Determine the type of page based on its media properties
     */
    private function getPageType($page): string
    {
        if ($page->media_poster) {
            return 'video';
        } elseif ($page->media_path && str_contains($page->media_path, 'snapshot')) {
            return 'screenshot';
        }

        return 'page';
    }

    /**
     * Map a page model to array format for the feed
     */
    private function mapPageToArray($page): array
    {
        return [
            'id' => $page->id,
            'type' => $this->getPageType($page),
            'content' => $page->content,
            'media_path' => $page->media_path,
            'media_poster' => $page->media_poster,
            'video_link' => $page->video_link,
            'book' => $page->book,
            'created_at' => $page->created_at,
            'read_count' => $page->read_count,
        ];
    }

    /**
     * Get items based on filter type
     */
    private function getFilteredItems($pagesQuery, $songsQuery, $filter, $perPage, $currentPage)
    {
        $offset = ($currentPage - 1) * $perPage;

        switch ($filter) {
            case 'popular':
                // Get total count efficiently
                $pagesCount = $pagesQuery->count();
                $songsCount = $songsQuery->count();
                $total = $pagesCount + $songsCount;

                // Fetch more than needed, then sort and slice
                $fetchLimit = min($offset + $perPage + 50, $pagesCount + $songsCount);

                $pages = $pagesQuery->orderBy('read_count', 'desc')->limit($fetchLimit)->get()->map(fn ($page) => $this->mapPageToArray($page));
                $songs = $songsQuery->orderBy('read_count', 'desc')->limit($fetchLimit)->get()->map(function ($song) {
                    $song->type = 'song';

                    return $song;
                });

                $items = $pages->concat($songs)->sortByDesc('read_count')->values();

                return [
                    'items' => $items->slice($offset, $perPage)->values(),
                    'total' => $total,
                ];

            case 'random':
                // For random, we need to fetch and shuffle, but limit the initial fetch
                $pagesCount = $pagesQuery->count();
                $songsCount = $songsQuery->count();
                $total = $pagesCount + $songsCount;

                // Fetch a reasonable amount to randomize from
                $fetchLimit = min(100, $total);

                $pages = $pagesQuery->inRandomOrder()->limit($fetchLimit)->get()->map(fn ($page) => $this->mapPageToArray($page));
                $songs = $songsQuery->inRandomOrder()->limit($fetchLimit)->get()->map(function ($song) {
                    $song->type = 'song';

                    return $song;
                });

                $items = $pages->concat($songs)->shuffle()->slice($offset, $perPage)->values();

                return [
                    'items' => $items,
                    'total' => $total,
                ];

            case 'old':
                $yearAgo = now()->subYear();

                // Get counts for old items
                $pagesQueryOld = clone $pagesQuery;
                $songsQueryOld = clone $songsQuery;

                $oldPagesCount = $pagesQueryOld->whereDate('created_at', '<=', $yearAgo)->count();
                $oldSongsCount = $songsQueryOld->whereDate('created_at', '<=', $yearAgo)->count();

                if ($oldPagesCount + $oldSongsCount > 0) {
                    // We have old items
                    $total = $oldPagesCount + $oldSongsCount;
                    $fetchLimit = $offset + $perPage + 50;

                    $pages = $pagesQuery->whereDate('created_at', '<=', $yearAgo)->orderBy('created_at', 'desc')->limit($fetchLimit)->get()->map(fn ($page) => $this->mapPageToArray($page));
                    $songs = $songsQuery->whereDate('created_at', '<=', $yearAgo)->orderBy('created_at', 'desc')->limit($fetchLimit)->get()->map(function ($song) {
                        $song->type = 'song';

                        return $song;
                    });

                    $items = $pages->concat($songs)->sortByDesc('created_at')->values();

                    return [
                        'items' => $items->slice($offset, $perPage)->values(),
                        'total' => $total,
                    ];
                } else {
                    // Fallback to oldest
                    $total = $pagesQuery->count() + $songsQuery->count();
                    $fetchLimit = $offset + $perPage + 50;

                    $pages = $pagesQuery->oldest()->limit($fetchLimit)->get()->map(fn ($page) => $this->mapPageToArray($page));
                    $songs = $songsQuery->oldest()->limit($fetchLimit)->get()->map(function ($song) {
                        $song->type = 'song';

                        return $song;
                    });

                    $items = $pages->concat($songs)->sortBy('created_at')->values();

                    return [
                        'items' => $items->slice($offset, $perPage)->values(),
                        'total' => $total,
                    ];
                }

            default:
                // Latest items - most common case, optimize heavily
                $pagesCount = $pagesQuery->count();
                $songsCount = $songsQuery->count();
                $total = $pagesCount + $songsCount;

                // Fetch enough records to properly interleave by date
                $fetchLimit = $offset + $perPage + 50;

                $pages = $pagesQuery->latest()->limit($fetchLimit)->get()->map(fn ($page) => $this->mapPageToArray($page));
                $songs = $songsQuery->latest()->limit($fetchLimit)->get()->map(function ($song) {
                    $song->type = 'song';

                    return $song;
                });

                $items = $pages->concat($songs)->sortByDesc('created_at')->values();

                return [
                    'items' => $items->slice($offset, $perPage)->values(),
                    'total' => $total,
                ];
        }
    }

    public function index(Request $request): Response
    {
        $search = $request->search;
        $filter = $request->filter;
        $youtubeEnabled = SiteSetting::where('key', 'youtube_enabled')->first()->value;
        $musicEnabled = SiteSetting::where('key', 'music_enabled')->first()->value;

        // Build the pages query
        $pagesQuery = Page::with('book')
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
            ->when($filter === 'music', function ($query) {
                // Music filter only shows songs, not pages
                $query->whereRaw('1 = 0');
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
            });

        // Build the songs query
        $songsQuery = Song::query()
            ->when($filter === 'snapshot', function ($query) {
                // Exclude songs from snapshot filter
                $query->whereRaw('1 = 0');
            })
            ->when($filter === 'youtube', function ($query) {
                // Exclude songs from youtube filter
                $query->whereRaw('1 = 0');
            })
            ->when($filter === 'music', function ($query) use ($musicEnabled) {
                // If music is disabled, exclude all songs
                if (! $musicEnabled) {
                    $query->whereRaw('1 = 0');
                }
            })
            ->when(! $musicEnabled, function ($query) {
                // When music is disabled, exclude all songs from all filters
                $query->whereRaw('1 = 0');
            })
            ->when($search, function ($query) use ($search) {
                $query->where(function ($query) use ($search) {
                    $query->where('title', 'LIKE', '%'.$search.'%')
                        ->orWhere('description', 'LIKE', '%'.$search.'%');
                });
            });

        // Apply ordering/filtering
        $perPage = 25;
        $currentPage = $request->input('page', 1);

        // Get filtered items with pagination
        $result = $this->getFilteredItems($pagesQuery, $songsQuery, $filter, $perPage, $currentPage);

        $photos = new \Illuminate\Pagination\LengthAwarePaginator(
            $result['items'],
            $result['total'],
            $perPage,
            $currentPage,
            ['path' => $request->url(), 'query' => $request->query()]
        );

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
            // Per-actor throttle: only count one view per user/session/IP per 5 minutes (cache only)
            $cacheKey = \App\Support\ReadThrottle::cacheKey('page', $page->id, $request);
            $throttleSeconds = 5 * 60;
            $fingerprint = \App\Support\ReadThrottle::fingerprint($request);
            try {
                if (Cache::add($cacheKey, 1, now()->addSeconds($throttleSeconds))) {
                    \App\Support\ReadThrottle::dispatchJob(new IncrementPageReadCount($page, $fingerprint));
                }
            } catch (\Throwable $e) {
                // If cache is unavailable/misconfigured, skip increment to avoid inflation
            }
        }

        $page->load(['book', 'book.coverImage']);

        $query = Page::where('book_id', $page->book_id);

        if (! $youtubeEnabled) {
            $query->whereNull('video_link');
        }

        $siblingPages = $query->orderBy('created_at')->pluck('id');

        $nextPageId = null;
        $previousPageId = null;

        if (! $siblingPages->isEmpty()) {
            $currentIndex = $siblingPages->search($page->id);

            // Get next and previous indices, handling wrap-around
            $nextIndex = ($currentIndex + 1) % $siblingPages->count();
            $previousIndex = ($currentIndex - 1 + $siblingPages->count()) % $siblingPages->count();

            $nextPageId = $nextIndex !== $currentIndex ? $siblingPages[$nextIndex] : null;
            $previousPageId = $previousIndex !== $currentIndex ? $siblingPages[$previousIndex] : null;
        }

        // Fetch full page objects with relationships if IDs exist
        $nextPage = $nextPageId ? Page::with('book')->find($nextPageId) : null;
        $previousPage = $previousPageId ? Page::with('book')->find($previousPageId) : null;

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
    public function store(StorePageRequest $request): Redirector|RedirectResponse
    {
        $book = Book::find($request->book_id);
        $successMessage = 'Page created successfully!';

        if ($request->hasFile('image')) {
            $file = $request->file('image');

            if ($file->isValid()) {
                $mimeType = $file->getMimeType();
                $originalName = $file->getClientOriginalName();
                $filePath = Storage::disk('local')->put('temp', $file);

                if (Str::startsWith($mimeType, 'image/')) {
                    $filename = pathinfo($file->hashName(), PATHINFO_FILENAME);
                    $mediaPath = 'books/'.$book->slug.'/'.$filename.'.webp';
                    // Use book location as default if page doesn't have location
                    $latitude = $request->input('latitude') ?? $book->latitude;
                    $longitude = $request->input('longitude') ?? $book->longitude;
                    StoreImage::dispatch($filePath, $mediaPath, $book, $request->input('content'), $request->input('video_link'), null, null, null, $latitude, $longitude);
                    $successMessage = 'Queued image: '.$originalName.'. It may take a few minutes to process.';
                } elseif (Str::startsWith($mimeType, 'video/')) {
                    $mediaPath = 'books/'.$book->slug.'/'.$originalName;

                    try {
                        // Use book location as default if page doesn't have location
                        $latitude = $request->input('latitude') ?? $book->latitude;
                        $longitude = $request->input('longitude') ?? $book->longitude;
                        StoreVideo::dispatch($filePath, $mediaPath, $book, $request->input('content'), $request->input('video_link'), null, null, null, $latitude, $longitude);
                        $successMessage = 'Queued video: '.$originalName.'. It may take a few minutes to process.';
                    } catch (\Exception $e) {
                        Log::error('Failed to dispatch StoreVideo job', [
                            'exception' => $e->getMessage(),
                            'trace' => $e->getTraceAsString(),
                            'file_path' => $filePath,
                            'media_path' => $mediaPath,
                        ]);
                        throw $e;
                    }
                }
            }
        } else {
            // If no file is uploaded, create the page immediately
            // Use book location as default if page doesn't have location
            $latitude = $request->input('latitude') ?? $book->latitude;
            $longitude = $request->input('longitude') ?? $book->longitude;

            $book->pages()->create([
                'content' => $request->input('content'),
                'video_link' => $request->input('video_link') ? trim($request->input('video_link')) : null,
                'latitude' => $latitude,
                'longitude' => $longitude,
            ]);
        }

        return redirect(route('books.show', $book))->with('success', $successMessage);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdatePageRequest $request, Page $page): Redirector|RedirectResponse
    {
        if ($request->hasFile('image')) {
            $file = $request->file('image');

            if ($file->isValid()) {
                // Get raw database values, not the accessor-transformed URLs
                $oldMediaPath = $page->getAttributes()['media_path'] ?? null;
                $oldPosterPath = $page->getAttributes()['media_poster'] ?? null;

                $mimeType = $file->getMimeType();
                $filePath = Storage::disk('local')->put('temp', $file);

                if (Str::startsWith($mimeType, 'image/')) {
                    $filename = pathinfo($file->hashName(), PATHINFO_FILENAME);
                    $mediaPath = 'books/'.$page->book->slug.'/'.$filename.'.webp';
                    // Preserve page location if not provided in request, fall back to book location if page has none
                    $latitude = $request->input('latitude') ?? $page->latitude ?? $page->book->latitude;
                    $longitude = $request->input('longitude') ?? $page->longitude ?? $page->book->longitude;
                    StoreImage::dispatch(
                        $filePath,
                        $mediaPath,
                        $page->book,
                        $request->input('content'),
                        $request->input('video_link'),
                        $page,
                        $oldMediaPath,
                        $oldPosterPath,
                        $latitude,
                        $longitude
                    );
                } elseif (Str::startsWith($mimeType, 'video/')) {
                    $mediaPath = 'books/'.$page->book->slug.'/'.$file->getClientOriginalName();

                    try {
                        // Preserve page location if not provided in request, fall back to book location if page has none
                        $latitude = $request->input('latitude') ?? $page->latitude ?? $page->book->latitude;
                        $longitude = $request->input('longitude') ?? $page->longitude ?? $page->book->longitude;
                        StoreVideo::dispatch(
                            $filePath,
                            $mediaPath,
                            $page->book,
                            $request->input('content'),
                            $request->input('video_link'),
                            $page,
                            $oldMediaPath,
                            $oldPosterPath,
                            $latitude,
                            $longitude
                        );
                    } catch (\Exception $e) {
                        Log::error('Failed to dispatch StoreVideo job for update', [
                            'exception' => $e->getMessage(),
                            'trace' => $e->getTraceAsString(),
                            'file_path' => $filePath,
                            'media_path' => $mediaPath,
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

            // Handle location: update only provided coordinates, preserve existing values for others
            // Check if keys exist in request (allows null values to clear coordinates)
            if ($request->has('latitude')) {
                $page->latitude = $request->input('latitude');
            }

            if ($request->has('longitude')) {
                $page->longitude = $request->input('longitude');
            }

            // If page has no location after update and book has location, inherit from book
            // Use explicit null checks to handle coordinates of 0 (Equator/Prime Meridian)
            if (is_null($page->latitude) && is_null($page->longitude) && ! is_null($page->book->latitude) && ! is_null($page->book->longitude)) {
                $page->latitude = $page->book->latitude;
                $page->longitude = $page->book->longitude;
            }

            if ($request->has('video_link') && ! is_null($request->video_link)) {
                // Get raw database values, not the accessor-transformed URLs
                $oldMediaPath = $page->getAttributes()['media_path'] ?? null;
                $oldPosterPath = $page->getAttributes()['media_poster'] ?? null;

                $page->media_path = '';
                $page->media_poster = '';
                $newVideoLink = trim((string) $request->video_link);
                $page->video_link = $newVideoLink !== '' ? $newVideoLink : null;
                $page->save();

                // Delete old media/poster inline
                try {
                    if ($oldMediaPath) {
                        Storage::disk('s3')->delete($oldMediaPath);
                    }
                } catch (\Throwable $e) {
                    Log::warning('Failed to delete old media after switching to video_link', [
                        'path' => $oldMediaPath,
                        'exception' => $e->getMessage(),
                    ]);
                }
                try {
                    if ($oldPosterPath) {
                        Storage::disk('s3')->delete($oldPosterPath);
                    }
                } catch (\Throwable $e) {
                    Log::warning('Failed to delete old poster after switching to video_link', [
                        'path' => $oldPosterPath,
                        'exception' => $e->getMessage(),
                    ]);
                }
            } else {
                $page->save();
            }
        }

        return redirect(route('pages.show', $page))->with('success', 'Page updated successfully!');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Page $page): Redirector|RedirectResponse
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

        return redirect(route('books.show', $page->book))->with('success', 'Page deleted successfully!');
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

    /**
     * Handle bulk actions on pages
     */
    public function bulkAction(Request $request): Redirector|RedirectResponse
    {
        $request->validate([
            'page_ids' => 'required|array|min:1',
            'page_ids.*' => 'integer|exists:pages,id',
            'action' => 'required|string|in:delete,move_to_top,move_to_book',
            'target_book_id' => 'required_if:action,move_to_book|nullable|integer|exists:books,id',
        ]);

        $pageIds = $request->page_ids;
        $action = $request->action;
        $targetBookId = $request->target_book_id;

        $pages = Page::whereIn('id', $pageIds)->get();

        $firstPage = $pages->first();
        $book = $firstPage->book;

        switch ($action) {
            case 'delete':
                foreach ($pages as $page) {
                    if ($page->media_path) {
                        Storage::disk('public')->delete($page->media_path);
                    }
                    if ($page->media_poster) {
                        Storage::disk('public')->delete($page->media_poster);
                    }
                    $page->delete();
                }
                $message = count($pages).' page(s) deleted successfully.';
                break;

            case 'move_to_top':
                foreach ($pages as $page) {
                    $page->update(['created_at' => now()]);
                }
                $message = count($pages).' page(s) moved to top successfully.';
                break;

            case 'move_to_book':
                $targetBook = Book::findOrFail($targetBookId);
                foreach ($pages as $page) {
                    $page->update(['book_id' => $targetBookId]);
                }
                $message = count($pages).' page(s) moved to "'.$targetBook->title.'" successfully.';
                break;
        }

        return redirect(route('books.show', $book))->with('success', $message);
    }

    /**
     * Share a page to the timeline.
     */
    public function share(Page $page, Request $request): RedirectResponse
    {
        // Check if messaging is enabled
        $setting = SiteSetting::where('key', 'messaging_enabled')->first();
        $messagingEnabled = $setting && ($setting->getAttributes()['value'] ?? $setting->value) === '1';

        if (! $messagingEnabled) {
            return back()->withErrors(['message' => 'Messaging is currently disabled.']);
        }

        $page->load('book');

        $bookTitle = $page->book?->title ?? __('messages.unknown_book');

        $message = Message::create([
            'user_id' => $request->user()->id,
            'message' => __('messages.page_shared', ['book' => $bookTitle]),
            'page_id' => $page->id,
        ]);

        $message->load('page');
        event(new MessageCreated($message));

        return back()->with('success', 'Page shared successfully!');
    }
}
