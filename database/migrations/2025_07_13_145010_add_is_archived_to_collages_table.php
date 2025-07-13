<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('collages', function (Blueprint $table) {
            $table->boolean('is_archived')->default(false)->after('storage_path');
            $table->dropSoftDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('collages', function (Blueprint $table) {
            $table->dropColumn('is_archived');
            $table->softDeletes();
        });
    }
};
