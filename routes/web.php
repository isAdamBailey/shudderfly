<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\BookController;
use App\Http\Controllers\PageController;
use App\Http\Controllers\ProfileController;
use App\Models\User;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::middleware('auth')->group(function () {
    Route::get('/dashboard', function () {
        return Inertia::render('Dashboard/Index', [
            'users' => ['data' => User::all()],
        ]);
    })->name('dashboard');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('/books', [BookController::class, 'index'])->name('books.index');
    Route::get('/book/{book}', [BookController::class, 'show'])->name('books.show');

    Route::get('/photos', [PageController::class, 'index'])->name('pictures.index');

    Route::group(['middleware' => ['can:edit pages']], function () {
        Route::post('/books', [BookController::class, 'store'])->name('books.store');
        Route::put('/books/{book}', [BookController::class, 'update'])->name('books.update');
        Route::delete('/books/{book}', [BookController::class, 'destroy'])->name('books.destroy');

        Route::post('/pages', [PageController::class, 'store'])->name('pages.store');
        Route::post('/pages/{page}', [PageController::class, 'update'])->name('pages.update');
        Route::delete('/pages/{page}', [PageController::class, 'destroy'])->name('pages.destroy');

        Route::put('/admin/permissions', [AdminController::class, 'update'])->name('admin.permissions');
        Route::delete('/admin', [AdminController::class, 'destroy'])->name('admin.destroy');
    });
});

Route::fallback(function () {
    return Inertia::render('Error', ['status' => 404]);
})->name('404.show');

require __DIR__.'/auth.php';
