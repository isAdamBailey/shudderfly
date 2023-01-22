<?php

use App\Models\Category;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->text('name')->nullable();
            $table->timestamps();
        });

        $categories = [
            'people',
            'places',
            'holidays',
            'movies',
            'shows',
            'activities',
            'music',
            'animals',
            'uncategorized',
        ];

        foreach ($categories as $category) {
            Category::create([
                'name' => $category,
            ]);
        }

        $default = Category::query()
            ->where(['name' => 'uncategorized'])->first();

        Schema::table('books', function (Blueprint $table) use ($default) {
            $table->foreignidFor(Category::class)->default($default->id);
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('categories');

        Schema::table('books', function (Blueprint $table) {
            $table->dropColumn('category_id');
        });
    }
};
