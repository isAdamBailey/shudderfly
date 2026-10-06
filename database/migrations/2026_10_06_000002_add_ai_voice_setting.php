<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('site_settings')->insert([
            'key' => 'ai_voice_enabled',
            'value' => '0',
            'type' => 'boolean',
            'description' => 'Speak text with an AI voice instead of the device voice (sends spoken text to a third-party AI service)',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('site_settings')->where('key', 'ai_voice_enabled')->delete();
    }
};
