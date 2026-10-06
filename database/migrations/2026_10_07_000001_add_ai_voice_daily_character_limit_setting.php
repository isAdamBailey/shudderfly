<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('site_settings')->insert([
            'key' => 'ai_voice_daily_character_limit',
            'value' => '200000',
            'type' => 'text',
            'description' => 'Most characters the AI voice may send for new clips per day; 0 stops new clips, cached clips always play',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('site_settings')->where('key', 'ai_voice_daily_character_limit')->delete();
    }
};
