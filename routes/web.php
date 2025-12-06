<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\BookController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\CollageController;
use App\Http\Controllers\CollagePageController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\MusicController;
use App\Http\Controllers\PageController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SettingsController;
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

Route::middleware('auth')->group(function () {
    Route::get('/', [BookController::class, 'index'])->name('welcome');
    Route::get('/books', [BookController::class, 'index'])->name('books.index');
    Route::get('/books-category', [BookController::class, 'category'])->name('books.category');
    Route::get('/categories/{categoryName}', [CategoryController::class, 'show'])->name('categories.show');
    Route::get('/book/{book}', [BookController::class, 'show'])->name('books.show');
    Route::get('/rules', function () {
        return Inertia::render('Rules', [
            'appName' => config('app.name'),
        ]);
    })->name('rules');

    Route::get('/dashboard', [DashboardController::class, 'show'])->name('dashboard');

    Route::get('/photos', [PageController::class, 'index'])->name('pictures.index');

    Route::get('/pages/{page}', [PageController::class, 'show'])->name('pages.show');
    Route::post('/pages/snapshot', [PageController::class, 'snapshot'])->name('pages.snapshot');
    Route::post('/contact-admins-email', [ProfileController::class, 'contactAdminsEmail'])
        ->name('profile.contact-admins-email');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');

    Route::group(['middleware' => ['can:edit profile']], function () {
        Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
        Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    });

    Route::get('/collages', [CollageController::class, 'index'])->name('collages.index');
    Route::get('/collages/archived', [CollageController::class, 'archived'])->name('collages.archived');
    Route::post('/collage-page', [CollagePageController::class, 'store'])->name('collage-page.store');

    Route::get('/music', [MusicController::class, 'index'])->name('music.index');
    Route::get('/music/{song}', [MusicController::class, 'show'])->name('music.show');
    Route::post('/music/{song}/increment-read-count', [MusicController::class, 'incrementReadCount'])->name('music.increment-read-count');

    Route::get('/messages', [MessageController::class, 'index'])->name('messages.index');
    Route::post('/messages', [MessageController::class, 'store'])->name('messages.store');
    Route::get('/profile/notifications', [ProfileController::class, 'notifications'])->name('profile.notifications');
    Route::post('/notifications/{id}/read', [ProfileController::class, 'markNotificationAsRead'])->name('notifications.read');

    Route::group(['middleware' => ['can:edit pages']], function () {
        Route::post('/books', [BookController::class, 'store'])->name('books.store');
        Route::put('/books/{book}', [BookController::class, 'update'])->name('books.update');
        Route::delete('/books/{book}', [BookController::class, 'destroy'])->name('books.destroy');

        Route::post('/pages', [PageController::class, 'store'])->name('pages.store');
        Route::post('/pages/bulk-action', [PageController::class, 'bulkAction'])->name('pages.bulk-action');
        Route::post('/pages/{page}', [PageController::class, 'update'])->name('pages.update');
        Route::delete('/pages/{page}', [PageController::class, 'destroy'])->name('pages.destroy');

        Route::delete('/collage-page/{collage}/{page}', [CollagePageController::class, 'destroy'])->name('collage-page.destroy');
        Route::patch('/collage-page/{collage}/{page}', [CollagePageController::class, 'update'])->name('collage-page.update');
    });

    Route::group(['middleware' => ['can:admin']], function () {
        Route::get('/categories', [CategoryController::class, 'index'])->name('categories.index');
        Route::post('/categories', [CategoryController::class, 'store'])->name('categories.store');
        Route::put('/categories/{category}', [CategoryController::class, 'update'])->name('categories.update');
        Route::delete('/categories/{category}', [CategoryController::class, 'destroy'])->name('categories.destroy');

        Route::post('/collages', [CollageController::class, 'store'])->name('collages.store');
        Route::patch('/collages/{collage}/archive', [CollageController::class, 'archive'])->name('collages.archive');
        Route::delete('/collages/{collage}', [CollageController::class, 'destroy'])->name('collages.destroy');
        Route::patch('/collages/{collage}/restore', [CollageController::class, 'restore'])->name('collages.restore');
        Route::put('/collages/{collage}', [CollageController::class, 'update'])->name('collages.update');
        Route::post('/collages/{collage}/generate-pdf', [CollageController::class, 'generatePdf'])->name('collages.generate-pdf');

        Route::post('/music/sync', [MusicController::class, 'sync'])->name('music.sync');

        Route::put('/admin/permissions', [AdminController::class, 'update'])->name('admin.permissions');
        Route::delete('/admin', [AdminController::class, 'destroy'])->name('admin.destroy');

        Route::put('/settings', [SettingsController::class, 'update'])->name('settings.update');

        Route::delete('/messages/{message}', [MessageController::class, 'destroy'])->name('messages.destroy');
    });
});

Route::fallback(function () {
    return Inertia::render('Error', ['status' => 404]);
})->name('404.show');

require __DIR__.'/auth.php';
