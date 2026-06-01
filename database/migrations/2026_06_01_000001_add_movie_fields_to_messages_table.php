<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->unsignedBigInteger('movie_tmdb_id')->nullable()->after('song_id');
            $table->string('movie_title')->nullable()->after('movie_tmdb_id');
            $table->string('movie_image_path')->nullable()->after('movie_title');
        });
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropColumn(['movie_tmdb_id', 'movie_title', 'movie_image_path']);
        });
    }
};
