<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('site_settings')->insert([
            'key' => 'voice_messages_enabled',
            'value' => '0',
            'type' => 'boolean',
            'description' => 'Let people record their own voice in the Message Builder (only while messaging is on)',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('site_settings')->where('key', 'voice_messages_enabled')->delete();
    }
};
