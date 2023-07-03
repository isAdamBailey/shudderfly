<?php

use App\Models\Book;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('books', function (Blueprint $table) {
            $table->unsignedBigInteger('cover_page')->nullable();
            $table->foreign('cover_page')->references('id')->on('pages')->onDelete('set null');
        });

        foreach (Book::all() as $book) {
            $page = null;
            $page = $book->pages()->whereNotNull('image_path')->where('image_path', 'like', '%.jpg')->first();

            if ($page) {
                $book->cover_page = $page->id;
                $book->save();
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('books', function (Blueprint $table) {
            $table->dropForeign(['cover_page']);
            $table->dropColumn('cover_page');
        });
    }
};
