<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('site_settings')->insert([
            [
                'key' => 'messaging_enabled',
                'value' => '0',
                'type' => 'boolean',
                'description' => 'Enable or disable the messaging system globally',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'messaging_retention_days',
                'value' => '30',
                'type' => 'text',
                'description' => 'Number of days to retain messages before automatic cleanup',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('site_settings')
            ->whereIn('key', ['messaging_enabled', 'messaging_retention_days'])
            ->delete();
    }
};
