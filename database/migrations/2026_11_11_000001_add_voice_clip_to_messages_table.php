<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            // A voice-only message has no text.
            $table->text('message')->nullable()->change();
            $table->string('voice_clip_path')->nullable()->after('collage_id');
            $table->unsignedSmallInteger('voice_clip_duration')->nullable()->after('voice_clip_path');
            $table->string('voice_clip_status', 20)->nullable()->after('voice_clip_duration');
        });
    }

    public function down(): void
    {
        // Voice-only messages have no text; give them some before the column
        // goes back to NOT NULL.
        DB::table('messages')->whereNull('message')->update(['message' => '']);

        Schema::table('messages', function (Blueprint $table) {
            $table->dropColumn(['voice_clip_path', 'voice_clip_duration', 'voice_clip_status']);
            $table->text('message')->nullable(false)->change();
        });
    }
};
