<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('message_comments', function (Blueprint $table) {
            // A voice-only comment has no text.
            $table->text('comment')->nullable()->change();
            $table->string('voice_clip_path')->nullable()->after('comment');
            $table->unsignedSmallInteger('voice_clip_duration')->nullable()->after('voice_clip_path');
            $table->string('voice_clip_status', 20)->nullable()->after('voice_clip_duration');
        });
    }

    public function down(): void
    {
        // Voice-only comments have no text; give them some before the column
        // goes back to NOT NULL.
        DB::table('message_comments')->whereNull('comment')->update(['comment' => '']);

        Schema::table('message_comments', function (Blueprint $table) {
            $table->dropColumn(['voice_clip_path', 'voice_clip_duration', 'voice_clip_status']);
            $table->text('comment')->nullable(false)->change();
        });
    }
};
