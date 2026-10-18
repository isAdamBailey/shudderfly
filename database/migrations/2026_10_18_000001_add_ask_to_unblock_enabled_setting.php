<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('site_settings')->insert([
            'key' => 'ask_to_unblock_enabled',
            'value' => '1',
            'type' => 'boolean',
            'description' => 'Show the "ask an admin to unblock" button to users without the edit pages permission (blocking itself stays on)',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('site_settings')->where('key', 'ask_to_unblock_enabled')->delete();
    }
};
