<?php

namespace App\Services;

use App\Models\Song;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class YouTubeService
{
    private $apiKey;
    private $playlistId;

    public function __construct()
    {
        $this->apiKey = config('services.youtube.api_key');
        $this->playlistId = config('services.youtube.playlist_id');
    }

    /**
     * Sync playlist videos from YouTube
     */
    public function syncPlaylist()
    {
        if (!$this->apiKey || !$this->playlistId) {
            throw new \Exception('YouTube API key or playlist ID not configured');
        }

        $nextPageToken = null;
        $totalSynced = 0;
        $quotaExceeded = false;

        do {
            $response = $this->getPlaylistItems($nextPageToken);

            if (!$response->successful()) {
                $error = $response->json();

                // Check if quota exceeded
                if (isset($error['error']['errors'][0]['reason']) &&
                    $error['error']['errors'][0]['reason'] === 'quotaExceeded') {
                    Log::warning('YouTube API quota exceeded. Stopping sync.');
                    $quotaExceeded = true;
                    break;
                }

                Log::error('YouTube API error: ' . $response->body());
                break;
            }

            $data = $response->json();

            if (empty($data['items'])) {
                Log::info('No items found in playlist response');
                break;
            }

            foreach ($data['items'] as $item) {
                try {
                    $this->createOrUpdateSong($item);
                    $totalSynced++;
                } catch (\Exception $e) {
                    Log::error('Error creating song: ' . $e->getMessage());
                    continue;
                }
            }

            $nextPageToken = $data['nextPageToken'] ?? null;

            // Add small delay to avoid rate limiting
            if ($nextPageToken) {
                usleep(100000); // 100ms delay
            }

        } while ($nextPageToken && !$quotaExceeded);

        if ($quotaExceeded) {
            throw new \Exception('YouTube API quota exceeded. Please try again tomorrow or request a quota increase.');
        }

        return $totalSynced;
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
     * Create or update song from YouTube item
     */
    private function createOrUpdateSong($item)
    {
        $snippet = $item['snippet'];
        $videoId = $snippet['resourceId']['videoId'];

        $songData = [
            'youtube_video_id' => $videoId,
            'title' => $snippet['title'],
            'description' => $snippet['description'],
            'channel_title' => $snippet['channelTitle'],
            'published_at' => $snippet['publishedAt'],
            'view_count' => 0, // Default value, can be updated later if needed
        ];

        // Add thumbnails
        if (isset($snippet['thumbnails'])) {
            foreach (['default', 'medium', 'high', 'standard', 'maxres'] as $quality) {
                if (isset($snippet['thumbnails'][$quality])) {
                    $songData["thumbnail_$quality"] = $snippet['thumbnails'][$quality]['url'];
                }
            }
        }

        // Check if song already exists to avoid unnecessary updates
        $existingSong = Song::where('youtube_video_id', $videoId)->first();

        if ($existingSong) {
            // Only update the title and description in case they changed
            $existingSong->update([
                'title' => $songData['title'],
                'description' => $songData['description'],
            ]);
            return $existingSong;
        }

        return Song::create($songData);
    }

    /**
     * Get additional video details (optional, uses more quota)
     * Only call this method if you specifically need duration, view count, and tags
     */
    private function getVideoDetails($videoId)
    {
        $response = Http::withHeaders([
            'User-Agent' => 'Laravel-App/1.0',
            'Accept' => 'application/json',
        ])->get('https://www.googleapis.com/youtube/v3/videos', [
            'part' => 'contentDetails,statistics,snippet',
            'id' => $videoId,
            'key' => $this->apiKey,
        ]);

        if (!$response->successful() || empty($response->json()['items'])) {
            return null;
        }

        $video = $response->json()['items'][0];

        return [
            'duration' => $video['contentDetails']['duration'] ?? null,
            'view_count' => $video['statistics']['viewCount'] ?? 0,
            'tags' => $video['snippet']['tags'] ?? null,
        ];
    }

    /**
     * Batch update video details for existing songs
     * This method can be called separately to add duration/view counts without affecting the main sync
     */
    public function updateVideoDetails($limit = 50)
    {
        $songs = Song::whereNull('duration')
            ->orWhere('view_count', 0)
            ->limit($limit)
            ->get();

        $updated = 0;
        foreach ($songs as $song) {
            try {
                $details = $this->getVideoDetails($song->youtube_video_id);
                if ($details) {
                    $song->update($details);
                    $updated++;
                }

                // Add delay to avoid rate limiting
                usleep(200000); // 200ms delay

            } catch (\Exception $e) {
                Log::error("Error updating details for video {$song->youtube_video_id}: " . $e->getMessage());
            }
        }

        return $updated;
    }
}
