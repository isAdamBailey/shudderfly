<?php

namespace App\Services;

use App\Models\SiteSetting;
use App\Models\Song;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class YouTubeService
{
    private $apiKey;

    private $playlistId;

    private const BATCH_SIZE = 50; // YouTube allows up to 50 video IDs per request

    public function __construct()
    {
        $this->apiKey = config('services.youtube.api_key');

        // Get playlist ID from site settings, fallback to config
        $playlistIdSetting = SiteSetting::where('key', 'youtube_playlist_id')->first();
        $this->playlistId = $playlistIdSetting?->value ?: config('services.youtube.playlist_id');
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
                $title = $item['snippet']['title'];

                // Skip if we already have this video and it hasn't been updated recently
                if ($this->shouldSkipVideo($videoId, $item['snippet']['publishedAt'], $title)) {
                    continue;
                }

                $videoIds[] = $videoId;
                $playlistItems[$videoId] = $item;
            }

            $nextPageToken = $data['nextPageToken'] ?? null;

        } while ($nextPageToken && ! $quotaExceeded);

        if (empty($videoIds)) {
            Log::info('No new videos to sync');

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
                    $isNew = $this->createOrUpdateSongWithDetails($playlistItem, $details);
                    if ($isNew) {
                        $totalSynced++;
                    }
                }
            } catch (\Exception $e) {
                Log::error("Error creating song for video {$videoId}: ".$e->getMessage());

                continue;
            }
        }

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
    private function shouldSkipVideo($videoId, $publishedAt, $title = null)
    {
        // Skip if the title is 'Private video'
        if ($title !== null && strtolower(trim($title)) === 'private video') {
            return true;
        }
        $existingSong = Song::where('youtube_video_id', $videoId)->first();

        if (! $existingSong) {
            return false; // New video, don't skip
        }

        // Skip if we have complete data and video hasn't been updated recently
        $hasCompleteData = ! empty($existingSong->duration) &&
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

        foreach ($batches as $batchIndex => $batch) {
            try {
                $response = Http::withHeaders([
                    'User-Agent' => 'Laravel-App/1.0',
                    'Accept' => 'application/json',
                ])->get('https://www.googleapis.com/youtube/v3/videos', [
                    'part' => 'contentDetails,snippet',
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
                        'published_at' => $video['snippet']['publishedAt'] ?? null,
                        'tags' => isset($video['snippet']['tags']) ? json_encode($video['snippet']['tags']) : null,
                    ];
                }

                if ($batchIndex < count($batches) - 1) {
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
     * Returns true if a new song was created, false otherwise
     */
    private function createOrUpdateSongWithDetails($playlistItem, $videoDetails = null)
    {
        $snippet = $playlistItem['snippet'];
        $title = strtolower(trim($snippet['title']));
        if ($title === 'private video') {
            return false; // Explicitly return false for skipped videos
        }
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
            // Build update data, only including fields that have actually changed
            $updateData = [];

            // Check if title or description changed
            if ($existingSong->title !== $songData['title']) {
                $updateData['title'] = $songData['title'];
            }
            if ($existingSong->description !== $songData['description']) {
                $updateData['description'] = $songData['description'];
            }

            // Add video details if we have them and they're missing or different
            if ($videoDetails) {
                if (empty($existingSong->duration) && ! empty($videoDetails['duration'])) {
                    $updateData['duration'] = $videoDetails['duration'];
                }
                if (empty($existingSong->tags) && ! empty($videoDetails['tags'])) {
                    $updateData['tags'] = $videoDetails['tags'];
                }
                // Update published_at only if we have the real video publish date and it's different
                if (! empty($videoDetails['published_at'])) {
                    $newPublishedAt = Carbon::parse($videoDetails['published_at']);
                    $existingPublishedAt = $existingSong->published_at ? Carbon::parse($existingSong->published_at) : null;

                    if (! $existingPublishedAt || ! $newPublishedAt->equalTo($existingPublishedAt)) {
                        $updateData['published_at'] = $videoDetails['published_at'];
                    }
                }
            }

            // Only perform update if there's actually something to update
            if (! empty($updateData)) {
                $existingSong->update($updateData);
            }

            return false; // Not a new song
        }

        Song::create($songData);

        return true; // New song created
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
}
