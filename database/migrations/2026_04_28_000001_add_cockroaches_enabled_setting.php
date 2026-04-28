<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('site_settings')->insert([
            'key' => 'cockroaches_enabled',
            'value' => '0',
            'type' => 'boolean',
            'description' => 'Show little cockroaches crawling in the header and footer',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('site_settings')->where('key', 'cockroaches_enabled')->delete();
    }
};
