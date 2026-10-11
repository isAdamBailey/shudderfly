<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * foreignIdFor() in create_pages_table made no index, so every
     * book-scoped query scanned the table. `blocked` rides along for
     * notBlocked().
     */
    public function up(): void
    {
        Schema::table('pages', function (Blueprint $table) {
            $table->index(['book_id', 'blocked']);
        });
    }

    public function down(): void
    {
        Schema::table('pages', function (Blueprint $table) {
            $table->dropIndex(['book_id', 'blocked']);
        });
    }
};
