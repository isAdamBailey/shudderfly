<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('site_settings', function (Blueprint $table) {
            $table->string('type')->default('text')->after('value');
        });

        // Set initial types for existing settings
        DB::table('site_settings')
            ->where('key', 'snapshot_enabled')
            ->update(['type' => 'boolean']);

        DB::table('site_settings')
            ->where('key', 'snapshot_cooldown')
            ->update(['type' => 'text']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('site_settings', function (Blueprint $table) {
            $table->dropColumn('type');
        });
    }
}; 