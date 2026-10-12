<?php

use App\Http\Controllers\CameraUploadController;
use Illuminate\Support\Facades\Route;

Route::post('/upload-camera-image', [CameraUploadController::class, 'store']);