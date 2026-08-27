<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('unblock_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            // Null means the request is still live; once set, every link
            // issued for the request stops working.
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            // The sweep filters on resolved_at alone, so it leads; user_id
            // has its own index from the foreign key.
            $table->index(['resolved_at', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('unblock_requests');
    }
};
