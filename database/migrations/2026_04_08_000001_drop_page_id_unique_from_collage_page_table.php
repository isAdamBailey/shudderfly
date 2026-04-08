<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Earlier revisions added unique('page_id'), which blocks the same page from appearing
     * in different collages and is stricter than the original composite unique on
     * (collage_id, page_id). Drop that index when present (e.g. already migrated DBs).
     */
    public function up(): void
    {
        try {
            Schema::table('collage_page', function (Blueprint $table) {
                $table->dropUnique(['page_id']);
            });
        } catch (\Throwable) {
        }
    }

    public function down(): void
    {
        Schema::table('collage_page', function (Blueprint $table) {
            $table->unique('page_id');
        });
    }
};
