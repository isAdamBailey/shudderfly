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
                $table->dropUnique('collage_page_page_id_unique');
            });
        } catch (\Throwable $e) {
            $message = strtolower($e->getMessage());

            if (
                str_contains($message, 'doesn\'t exist')
                || str_contains($message, 'does not exist')
                || str_contains($message, 'unknown key')
                || str_contains($message, 'unknown index')
                || str_contains($message, 'check that it exists')
                || str_contains($message, 'no such index')
            ) {
                return;
            }

            throw $e;
        }
    }

    public function down(): void
    {
        Schema::table('collage_page', function (Blueprint $table) {
            $table->unique('page_id');
        });
    }
};
