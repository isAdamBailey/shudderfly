<?php

use App\Http\Controllers\PushNotificationController;
use App\Http\Controllers\SearchController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/search/books', [SearchController::class, 'searchBooks'])->name('api.search.books');
    Route::get('/search/uploads', [SearchController::class, 'searchUploads'])->name('api.search.uploads');
    Route::get('/geocode/reverse', [SearchController::class, 'reverseGeocode'])->name('api.geocode.reverse');
    
    // Push notification routes
    Route::post('/push/subscribe', [PushNotificationController::class, 'subscribe'])->name('api.push.subscribe');
    Route::post('/push/unsubscribe', [PushNotificationController::class, 'unsubscribe'])->name('api.push.unsubscribe');
});
