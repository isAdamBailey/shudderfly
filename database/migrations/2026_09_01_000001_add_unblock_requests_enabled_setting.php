<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('site_settings')->insert([
            'key' => 'unblock_requests_enabled',
            'value' => '1',
            'type' => 'boolean',
            'description' => 'Allow users without the edit pages permission to ask an admin to unblock their content',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('site_settings')->where('key', 'unblock_requests_enabled')->delete();
    }
};
