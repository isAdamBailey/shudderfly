<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // The index of generated AI voice clips: a lookup is one query on the
        // unique hash, never an S3 HEAD. The audio itself lives on S3 at path.
        Schema::create('ai_voice_clips', function (Blueprint $table) {
            $table->id();
            $table->char('hash', 64)->unique();
            $table->string('locale', 8);
            $table->string('voice');
            $table->string('model');
            $table->decimal('speed', 3, 2);
            $table->unsignedInteger('characters');
            $table->string('path');
            $table->unsignedInteger('hits')->default(0);
            $table->timestamp('last_played_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_voice_clips');
    }
};
