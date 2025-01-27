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
            $table->text('description')->nullable()->after('value');
        });

        // Add descriptions to existing settings
        DB::table('site_settings')
            ->where('key', 'snapshot_enabled')
            ->update(['description' => 'Enable or disable the snapshot feature globally']);

        DB::table('site_settings')
            ->where('key', 'snapshot_cooldown')
            ->update(['description' => 'Cooldown period in minutes between snapshots']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('site_settings', function (Blueprint $table) {
            $table->dropColumn('description');
        });
    }
};
