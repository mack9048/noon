<?php

use Illuminate\Support\Facades\Route;

// API-only: the app (Expo) runs on phones and on Vercel for web.
Route::get('/', fn () => response()->json(['app' => 'Noon Learn API', 'health' => url('/api/health')]));
