<?php

namespace App\Services;

use App\Models\Song;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class YouTubeService
{
    private $apiKey;

    private $playlistId;

    private const BATCH_SIZE = 50; // YouTube allows up to 50 video IDs per request

    private const CACHE_TTL = 3600; // 1 hour cache for playlist data

    public function __construct()
    {
        $this->apiKey = config('services.youtube.api_key');
        $this->playlistId = config('services.youtube.playlist_id');
    }

    /**
     * Sync playlist videos from YouTube with quota optimization
     */
    public function syncPlaylist()
    {
        if (! $this->apiKey || ! $this->playlistId) {
            return [
                'success' => false,
                'error' => 'YouTube API key or playlist ID not configured',
                'quota_exceeded' => false,
                'synced' => 0,
            ];
        }

        // Check if we've synced recently to avoid unnecessary API calls
        $lastSyncKey = "youtube_playlist_last_sync_{$this->playlistId}";
        $lastSync = Cache::get($lastSyncKey);

        if ($lastSync && $lastSync > now()->subHours(1)) {
            return [
                'success' => true,
                'message' => 'Playlist synced recently, skipping to save quota',
                'synced' => 0,
                'quota_exceeded' => false,
            ];
        }

        $nextPageToken = null;
        $totalSynced = 0;
        $videoIds = [];
        $playlistItems = [];
        $quotaExceeded = false;

        // First pass: Collect all video IDs from playlist without fetching details
        do {
            $response = $this->getPlaylistItems($nextPageToken);

            if (! $response->successful()) {
                $errorResult = $this->handleApiError($response);
                if ($errorResult['quota_exceeded']) {
                    $quotaExceeded = true;
                    break;
                } else {
                    return $errorResult;
                }
            }

            $data = $response->json();

            if (empty($data['items'])) {
                break;
            }

            foreach ($data['items'] as $item) {
                $videoId = $item['snippet']['resourceId']['videoId'];

                // Skip if we already have this video and it hasn't been updated recently
                if ($this->shouldSkipVideo($videoId, $item['snippet']['publishedAt'])) {
                    continue;
                }

                $videoIds[] = $videoId;
                $playlistItems[$videoId] = $item;
            }

            $nextPageToken = $data['nextPageToken'] ?? null;

        } while ($nextPageToken && ! $quotaExceeded);

        if (empty($videoIds)) {
            Log::info('No new videos to sync');
            Cache::put($lastSyncKey, now(), self::CACHE_TTL);

            return [
                'success' => true,
                'message' => 'No new videos to sync',
                'synced' => 0,
                'quota_exceeded' => $quotaExceeded,
            ];
        }

        // Second pass: Batch fetch video details for new/updated videos only
        if (! $quotaExceeded) {
            $videoDetailsResult = $this->batchGetVideoDetails($videoIds);

            if (isset($videoDetailsResult['quota_exceeded']) && $videoDetailsResult['quota_exceeded']) {
                $quotaExceeded = true;
                $videoDetails = $videoDetailsResult['data'] ?? [];
            } else {
                $videoDetails = $videoDetailsResult;
            }
        } else {
            $videoDetails = [];
        }

        // Create or update songs with combined data
        foreach ($videoIds as $videoId) {
            try {
                if (isset($playlistItems[$videoId])) {
                    $playlistItem = $playlistItems[$videoId];
                    $details = $videoDetails[$videoId] ?? null;

                    $this->createOrUpdateSongWithDetails($playlistItem, $details);
                    $totalSynced++;
                }
            } catch (\Exception $e) {
                Log::error("Error creating song for video {$videoId}: ".$e->getMessage());

                continue;
            }
        }

        Cache::put($lastSyncKey, now(), self::CACHE_TTL);

        return [
            'success' => true,
            'synced' => $totalSynced,
            'quota_exceeded' => $quotaExceeded,
            'message' => $quotaExceeded
                ? "Synced {$totalSynced} songs before quota limit reached"
                : "Successfully synced {$totalSynced} songs",
        ];
    }

    /**
     * Check if we should skip syncing a video (already exists and unchanged)
     */
    private function shouldSkipVideo($videoId, $publishedAt)
    {
        $existingSong = Song::where('youtube_video_id', $videoId)->first();

        if (! $existingSong) {
            return false; // New video, don't skip
        }

        // Skip if we have complete data and video hasn't been updated recently
        $hasCompleteData = ! empty($existingSong->duration) &&
                          ! empty($existingSong->view_count) &&
                          ! is_null($existingSong->tags);

        if ($hasCompleteData) {
            $videoPublished = Carbon::parse($publishedAt);
            $lastUpdated = $existingSong->updated_at;

            // Skip if video is old and we've updated it recently
            if ($videoPublished->lt(now()->subDays(30)) && $lastUpdated->gt(now()->subDays(7))) {
                return true;
            }
        }

        return false;
    }

    /**
     * Batch fetch video details to minimize API calls
     */
    private function batchGetVideoDetails($videoIds)
    {
        if (empty($videoIds)) {
            return [];
        }

        $allVideoDetails = [];
        $batches = array_chunk($videoIds, self::BATCH_SIZE);

        foreach ($batches as $batch) {
            try {
                $response = Http::withHeaders([
                    'User-Agent' => 'Laravel-App/1.0',
                    'Accept' => 'application/json',
                ])->get('https://www.googleapis.com/youtube/v3/videos', [
                    'part' => 'contentDetails,statistics,snippet',
                    'id' => implode(',', $batch),
                    'key' => $this->apiKey,
                ]);

                if (! $response->successful()) {
                    Log::error('Error fetching video details batch: '.$response->body());

                    continue;
                }

                $data = $response->json();

                foreach ($data['items'] ?? [] as $video) {
                    $allVideoDetails[$video['id']] = [
                        'duration' => $video['contentDetails']['duration'] ?? null,
                        'view_count' => (int) ($video['statistics']['viewCount'] ?? 0),
                        'tags' => isset($video['snippet']['tags']) ? json_encode($video['snippet']['tags']) : null,
                    ];
                }

                if ($i < count($batches) - 1) {
                    usleep(200000); // 200ms delay
                }

            } catch (\Exception $e) {
                Log::error('Error in batch video details request: '.$e->getMessage());

                continue;
            }
        }

        return $allVideoDetails;
    }

    /**
     * Create or update song with playlist and video details combined
     */
    private function createOrUpdateSongWithDetails($playlistItem, $videoDetails = null)
    {
        $snippet = $playlistItem['snippet'];
        $videoId = $snippet['resourceId']['videoId'];

        $songData = [
            'youtube_video_id' => $videoId,
            'title' => $snippet['title'],
            'description' => $snippet['description'],
            'published_at' => $snippet['publishedAt'],
        ];

        // Add video details if available
        if ($videoDetails) {
            $songData = array_merge($songData, $videoDetails);
        }

        // Add thumbnails with fallback URL generation
        if (isset($snippet['thumbnails'])) {
            foreach (['default', 'medium', 'high', 'standard', 'maxres'] as $quality) {
                if (isset($snippet['thumbnails'][$quality])) {
                    $songData["thumbnail_{$quality}"] = $snippet['thumbnails'][$quality]['url'];
                }
            }
        }

        // Fallback thumbnail URL if none provided
        if (empty($songData['thumbnail_high'])) {
            $songData['thumbnail_url'] = "https://img.youtube.com/vi/{$videoId}/hqdefault.jpg";
        }

        $existingSong = Song::where('youtube_video_id', $videoId)->first();

        if ($existingSong) {
            // Only update fields that might have changed
            $updateData = [
                'title' => $songData['title'],
                'description' => $songData['description'],
            ];

            // Add video details if we have them and they're missing
            if ($videoDetails) {
                if (empty($existingSong->duration) && ! empty($videoDetails['duration'])) {
                    $updateData['duration'] = $videoDetails['duration'];
                }
                if (empty($existingSong->view_count) && ! empty($videoDetails['view_count'])) {
                    $updateData['view_count'] = $videoDetails['view_count'];
                }
                if (empty($existingSong->tags) && ! empty($videoDetails['tags'])) {
                    $updateData['tags'] = $videoDetails['tags'];
                }
            }

            $existingSong->update($updateData);

            return $existingSong;
        }

        return Song::create($songData);
    }

    /**
     * Handle API errors with quota awareness
     */
    private function handleApiError($response)
    {
        $error = $response->json();

        if (isset($error['error']['errors'][0]['reason'])) {
            $reason = $error['error']['errors'][0]['reason'];

            if ($reason === 'quotaExceeded') {
                Log::warning('YouTube API quota exceeded. Stopping sync.');

                return [
                    'success' => false,
                    'error' => 'YouTube API quota exceeded. Please try again tomorrow or request a quota increase.',
                    'quota_exceeded' => true,
                ];
            }

            if ($reason === 'rateLimitExceeded') {
                Log::warning('YouTube API rate limit exceeded. Adding delay and retrying.');
                sleep(5); // Wait 5 seconds before retry

                return [
                    'success' => false,
                    'error' => 'YouTube API rate limit exceeded. Please wait and retry.',
                    'quota_exceeded' => false,
                ];
            }
        }

        Log::error('YouTube API error: '.$response->body());

        return [
            'success' => false,
            'error' => 'YouTube API error: '.($error['error']['message'] ?? 'Unknown error'),
            'quota_exceeded' => false,
        ];
    }

    /**
     * Get playlist items from YouTube API
     */
    private function getPlaylistItems($pageToken = null)
    {
        $params = [
            'part' => 'snippet,contentDetails',
            'playlistId' => $this->playlistId,
            'key' => $this->apiKey,
            'maxResults' => 50,
        ];

        if ($pageToken) {
            $params['pageToken'] = $pageToken;
        }

        return Http::withHeaders([
            'User-Agent' => 'Laravel-App/1.0',
            'Accept' => 'application/json',
        ])->get('https://www.googleapis.com/youtube/v3/playlistItems', $params);
    }

    /**
     * Batch update video details for existing songs (quota-efficient version)
     */
    public function batchUpdateVideoDetails($limit = 50)
    {
        // Get songs that need details updated
        $songs = Song::where(function ($query) {
            $query->whereNull('duration')
                ->orWhere('view_count', 0)
                ->orWhereNull('tags');
        })->limit($limit)->get();

        if ($songs->isEmpty()) {
            return 0;
        }

        $videoIds = $songs->pluck('youtube_video_id')->toArray();
        Log::info("Found {$songs->count()} songs needing video details update");

        // Batch fetch all video details at once
        $videoDetails = $this->batchGetVideoDetails($videoIds);

        $updated = 0;
        foreach ($songs as $song) {
            if (isset($videoDetails[$song->youtube_video_id])) {
                $details = $videoDetails[$song->youtube_video_id];

                $updateData = [];
                if (empty($song->duration) && ! empty($details['duration'])) {
                    $updateData['duration'] = $details['duration'];
                }
                if (empty($song->view_count) && ! empty($details['view_count'])) {
                    $updateData['view_count'] = $details['view_count'];
                }
                if (empty($song->tags) && ! empty($details['tags'])) {
                    $updateData['tags'] = $details['tags'];
                }

                if (! empty($updateData)) {
                    $song->update($updateData);
                    $updated++;
                }
            }
        }

        return $updated;
    }
}
