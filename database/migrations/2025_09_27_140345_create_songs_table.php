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
        Schema::create('songs', function (Blueprint $table) {
            $table->id();
            $table->string('youtube_video_id')->unique();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('thumbnail_default')->nullable();
            $table->string('thumbnail_medium')->nullable();
            $table->string('thumbnail_high')->nullable();
            $table->string('thumbnail_standard')->nullable();
            $table->string('thumbnail_maxres')->nullable();
            $table->string('duration')->nullable();
            $table->string('channel_title')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->integer('view_count')->default(0);
            $table->decimal('read_count', 10, 2)->default(0.00);
            $table->json('tags')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('songs');
    }
};
