<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('site_settings')->insert([
            'key' => 'ai_descriptions_enabled',
            'value' => '0',
            'type' => 'boolean',
            'description' => 'Generate AI descriptions for uploaded images and videos (sends uploads to a third-party AI service)',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('site_settings')->where('key', 'ai_descriptions_enabled')->delete();
    }
};
