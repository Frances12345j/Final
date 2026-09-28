<?php

use Illuminate\Support\Facades\Route;

// The admin SPA lives in Newmoon-Web and is served separately.
// This backend is API-only; no catch-all web routes are registered.

// Landing page showing the framework version. Handy as a liveness check when the
// Vite dev server proxies /api and reports ECONNREFUSED on the API target.
Route::get('/', fn () => view('app'));
