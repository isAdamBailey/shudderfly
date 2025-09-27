<?php

namespace Database\Seeders;

use App\Models\Song;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
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

        // Generate additional song titles to mix with embeddable videos
        $songTitles = [
            'Dancing in the Dark', 'Midnight Dreams', 'Golden Hour', 'Electric Nights',
            'Heartbreak Hotel', 'Summer Vibes', 'Neon Lights', 'Fading Away',
            'Better Days', 'Lost in Time', 'Fire and Ice', 'Sweet Escape',
            'City Lights', 'Ocean Waves', 'Mountain High', 'Desert Rose',
            'Starlight', 'Moonbeam', 'Sunshine', 'Rainbow',
            'Love Me Tonight', 'Break My Heart', 'Stay With Me', 'Let Me Go',
            'Run Away', 'Come Back Home', 'Never Give Up', 'Always Remember',
            'First Kiss', 'Last Dance', 'New Beginning', 'Final Chapter',
            'Wild Spirit', 'Free Bird', 'Caged Heart', 'Open Road',
            'Perfect Storm', 'Calm Waters', 'Thunder Roll', 'Lightning Strike',
        ];

        $artists = [
            'The Beatles', 'Taylor Swift', 'Ed Sheeran', 'Drake', 'Billie Eilish',
            'Post Malone', 'Ariana Grande', 'The Weeknd', 'Dua Lipa', 'Harry Styles',
            'Olivia Rodrigo', 'Lorde', 'Imagine Dragons', 'Coldplay', 'Maroon 5',
            'OneRepublic', 'Bruno Mars', 'John Mayer', 'Adele', 'Sam Smith',
        ];

        $songs = [];
        $videoIdChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_';

        for ($i = 0; $i < 500; $i++) {
            // Use embeddable video for first 20 entries, then generate fake ones
            if ($i < count($embeddableVideos)) {
                $video = $embeddableVideos[$i];
                $videoId = $video['id'];
                $title = $video['title'];
                $artist = $video['artist'];
                $duration = $video['duration'];
            } else {
                // Generate fake video ID for additional entries
                $videoId = '';
                for ($j = 0; $j < 11; $j++) {
                    $videoId .= $videoIdChars[rand(0, strlen($videoIdChars) - 1)];
                }
                $title = $songTitles[array_rand($songTitles)];
                $artist = $artists[array_rand($artists)];
                $minutes = rand(2, 6);
                $seconds = rand(0, 59);
                $duration = "PT{$minutes}M{$seconds}S";
            }

            // Generate view count and date
            $viewCount = rand(1000, 1000000000);
            $publishedAt = date('Y-m-d H:i:s', strtotime('-' . rand(0, 3650) . ' days'));

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
                'tags' => json_encode(['music', 'official', strtolower($artist)]),
                'created_at' => now(),
                'updated_at' => now(),
            ];

            // Insert in batches of 100
            if (count($songs) >= 100) {
                Song::insert($songs);
                $songs = [];
            }
        }

        // Insert remaining songs
        if (!empty($songs)) {
            Song::insert($songs);
        }

        $this->command->info('Created 500 test songs (first 20 with embeddable YouTube videos) for pagination testing');
    }
}
