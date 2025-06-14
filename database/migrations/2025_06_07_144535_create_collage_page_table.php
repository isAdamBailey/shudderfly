<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('collage_page', function (Blueprint $table) {
            $table->id();
            $table->foreignId('collage_id')->constrained()->onDelete('cascade');
            $table->foreignId('page_id')->constrained()->onDelete('cascade');
            $table->timestamps();

            $table->unique(['collage_id', 'page_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('collage_page');
    }
};
