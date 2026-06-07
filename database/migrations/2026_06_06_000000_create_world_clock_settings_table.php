<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('world_clock_settings', function (Blueprint $table) {
            $table->id();
            $table->json('cities')->nullable();              // [{name,timezone,country}]
            $table->string('face_preset')->default('theme');
            $table->string('hand_preset')->default('classic');
            $table->string('numerals')->default('arabic');
            $table->string('second_hand_mode')->default('smooth');
            $table->json('logo')->nullable();                // {enabled,cityName,timezone}
            $table->timestamp('timer_ends_at')->nullable();  // absolute expiry; null = no timer
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('world_clock_settings');
    }
};
