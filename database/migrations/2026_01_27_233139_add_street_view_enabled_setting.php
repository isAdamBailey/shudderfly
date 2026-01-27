<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('site_settings')->insert([
            'key' => 'street_view_enabled',
            'value' => '1',
            'description' => 'Enable or disable the Street View accordion in map components',
            'type' => 'boolean',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('site_settings')->where('key', 'street_view_enabled')->delete();
    }
};
