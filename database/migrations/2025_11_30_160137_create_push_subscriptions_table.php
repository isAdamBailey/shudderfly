<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('push_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('endpoint', 500);
            $table->text('keys'); // JSON string containing p256dh and auth keys
            $table->timestamps();
        });
        
        // Create unique index with prefix on endpoint to stay within MySQL key length limit (3072 bytes)
        // Using prefix of 255 chars (max 1020 bytes with utf8mb4) + user_id (8 bytes) = 1028 bytes < 3072
        DB::statement('ALTER TABLE `push_subscriptions` ADD UNIQUE `push_subscriptions_user_id_endpoint_unique` (`user_id`, `endpoint`(255))');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('push_subscriptions');
    }
};
