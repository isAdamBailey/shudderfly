<?php

namespace Database\Seeders;

use App\Models\Song;
use Illuminate\Database\Seeder;

class SongSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // YouTube videos confirmed to allow embedding (tested working)
        $embeddableVideos = [
            ['id' => 'dQw4w9WgXcQ', 'title' => 'Rick Astley - Never Gonna Give You Up', 'artist' => 'Rick Astley', 'duration' => 'PT3M33S'],
            ['id' => 'ZZ5LpwO-An4', 'title' => 'HEYYEYAAEYAAAEYAEYAA', 'artist' => 'fabulous secret powers', 'duration' => 'PT1M4S'],
            ['id' => 'oHg5SJYRHA0', 'title' => 'RickRoll\'d', 'artist' => 'cotter548', 'duration' => 'PT3M33S'],
            ['id' => 'j5a0jTc9S10', 'title' => 'Charlie bit my finger - again !', 'artist' => 'HDCYT', 'duration' => 'PT56S'],
            ['id' => 'qrO4YZeyl0I', 'title' => 'Bad Apple!! - Shadowplay', 'artist' => 'Alstroemeria Records', 'duration' => 'PT3M39S'],
            ['id' => 'BROWqjuTM0g', 'title' => 'Pokémon Theme Song', 'artist' => 'Pokémon', 'duration' => 'PT1M23S'],
            ['id' => 'moSFlvxnbgk', 'title' => 'Let it Go from Frozen', 'artist' => 'DisneyMusicVEVO', 'duration' => 'PT3M44S'],
            ['id' => 'hFcLyDb6niA', 'title' => 'Walk Like an Egyptian', 'artist' => 'The Bangles', 'duration' => 'PT3M24S'],
            ['id' => 'ZbZSe6N_BXs', 'title' => 'Happy Birthday Song', 'artist' => 'Super Simple Songs', 'duration' => 'PT1M4S'],
            ['id' => 'L_jWHffIx5E', 'title' => 'All Star', 'artist' => 'Smash Mouth', 'duration' => 'PT3M20S'],
            ['id' => 'y6120QOlsfU', 'title' => 'Sandstorm', 'artist' => 'Darude', 'duration' => 'PT5M35S'],
            ['id' => 'XqZsoesa55w', 'title' => 'Baby Shark Dance', 'artist' => 'Pinkfong Baby Shark', 'duration' => 'PT2M17S'],
            ['id' => 'M7lc1UVf-VE', 'title' => 'Blue (Da Ba Dee)', 'artist' => 'Eiffel 65', 'duration' => 'PT4M43S'],
            ['id' => 'SQoA_wjmE9w', 'title' => 'Ice Ice Baby', 'artist' => 'Vanilla Ice', 'duration' => 'PT4M31S'],
            ['id' => 'CD-E-LDc384', 'title' => 'Kiss from a Rose', 'artist' => 'Seal', 'duration' => 'PT4M49S'],
            ['id' => 'pAgnJDJN4VA', 'title' => 'All About That Bass', 'artist' => 'Meghan Trainor', 'duration' => 'PT3M11S'],
            ['id' => 'pRpeEdMmmQ0', 'title' => 'Whenever, Wherever', 'artist' => 'Shakira', 'duration' => 'PT3M16S'],
            ['id' => 'astISOttCQ0', 'title' => 'Numa Numa', 'artist' => 'Gary Brolsma', 'duration' => 'PT2M4S'],
            ['id' => 'kffacxfA7G4', 'title' => 'Baby One More Time', 'artist' => 'Britney Spears', 'duration' => 'PT3M30S'],
            ['id' => 'tbNlMtqrYS0', 'title' => 'Africa', 'artist' => 'Toto', 'duration' => 'PT4M55S'],
        ];

        $songs = [];

        foreach ($embeddableVideos as $video) {
            $videoId = $video['id'];
            $title = $video['title'];
            $artist = $video['artist'];
            $duration = $video['duration'];

            // Generate realistic view count and date
            $viewCount = rand(1000000, 1000000000); // Higher view counts for real videos
            $publishedAt = date('Y-m-d H:i:s', strtotime('-'.rand(365, 3650).' days')); // 1-10 years ago

            $descriptions = [
                "Official music video for \"{$title}\" by {$artist}",
                "The official audio for \"{$title}\" from {$artist}",
                "{$artist} - {$title} (Official Video)",
                "Stream \"{$title}\" by {$artist} now available everywhere",
                "{$artist} presents \"{$title}\" - the latest single",
            ];

            $songs[] = [
                'youtube_video_id' => $videoId,
                'title' => $title,
                'description' => $descriptions[array_rand($descriptions)],
                'thumbnail_default' => "https://i.ytimg.com/vi/{$videoId}/default.jpg",
                'thumbnail_medium' => "https://i.ytimg.com/vi/{$videoId}/mqdefault.jpg",
                'thumbnail_high' => "https://i.ytimg.com/vi/{$videoId}/hqdefault.jpg",
                'thumbnail_standard' => "https://i.ytimg.com/vi/{$videoId}/sddefault.jpg",
                'thumbnail_maxres' => "https://i.ytimg.com/vi/{$videoId}/maxresdefault.jpg",
                'duration' => $duration,
                'channel_title' => $artist,
                'published_at' => $publishedAt,
                'view_count' => $viewCount,
                'read_count' => rand(0, 100) / 10, // Add some initial read counts
                'tags' => json_encode(['music', 'official', strtolower($artist)]),
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        // Insert all embeddable songs
        Song::insert($songs);

        $this->command->info('Created '.count($embeddableVideos).' songs with confirmed embeddable YouTube videos');
    }
}
