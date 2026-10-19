<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('site_settings')->insert([
            'key' => 'world_together_enabled',
            'value' => '0',
            'type' => 'boolean',
            'description' => 'Let logged-in people in the Games World see each other (uses Pusher messages)',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('site_settings')->where('key', 'world_together_enabled')->delete();
    }
};
