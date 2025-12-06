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

        // Create unique index on user_id and endpoint
        // For MySQL, use prefix to stay within key length limit (3072 bytes)
        // For other databases (SQLite, PostgreSQL), use full endpoint
        $driver = DB::connection()->getDriverName();
        if ($driver === 'mysql') {
            Schema::table('push_subscriptions', function (Blueprint $table) {
                $table->unique(['user_id', DB::raw('endpoint(255)')], 'push_subscriptions_user_id_endpoint_unique');
            });
        } else {
            Schema::table('push_subscriptions', function (Blueprint $table) {
                $table->unique(['user_id', 'endpoint'], 'push_subscriptions_user_id_endpoint_unique');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('push_subscriptions');
    }
};
