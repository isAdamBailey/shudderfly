<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * created_at serves the daily budget and usage sums; last_played_at
     * serves ai-voice:prune.
     */
    public function up(): void
    {
        Schema::table('ai_voice_clips', function (Blueprint $table) {
            $table->index(['created_at', 'characters']);
            $table->index('last_played_at');
        });
    }

    public function down(): void
    {
        Schema::table('ai_voice_clips', function (Blueprint $table) {
            $table->dropIndex(['created_at', 'characters']);
            $table->dropIndex(['last_played_at']);
        });
    }
};
