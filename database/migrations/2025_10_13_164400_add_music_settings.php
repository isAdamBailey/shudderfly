<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('site_settings')->insert([
            [
                'key' => 'music_enabled',
                'value' => '1',
                'description' => 'Enable or disable the Music tab and YouTube sync',
                'type' => 'boolean',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'youtube_playlist_id',
                'value' => config('services.youtube.playlist_id', ''),
                'description' => 'YouTube Playlist ID for syncing music',
                'type' => 'text',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('site_settings')->whereIn('key', ['music_enabled', 'youtube_playlist_id'])->delete();
    }
};
