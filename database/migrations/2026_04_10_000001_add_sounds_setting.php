<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('site_settings')->insert([
            'key' => 'sounds_enabled',
            'value' => '0',
            'type' => 'boolean',
            'description' => 'Enable or disable the Sounds page',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('site_settings')->where('key', 'sounds_enabled')->delete();
    }
};
