<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->text('weekly_profile_overview')->nullable()->after('avatar');
            $table->timestamp('weekly_profile_overview_generated_at')->nullable()->after('weekly_profile_overview');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['weekly_profile_overview', 'weekly_profile_overview_generated_at']);
        });
    }
};
