<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CameraEnrollController;
use App\Http\Controllers\CameraAuthenticateController;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/', function () {
    return Inertia::render('welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

Route::get('dashboard', function () {
    return Inertia::render('dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::post('/capture-and-enroll', [CameraEnrollController::class, 'store']);
Route::post('/capture-and-authenticate', [CameraAuthenticateController::class, 'store']);

require __DIR__.'/settings.php';
