<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | The NewMoon system serves two clients:
    |
    |  1. React/Vite web app  — same domain as Laravel (no CORS needed for
    |     same-origin requests, but the SPA may call /api/* cross-origin in
    |     development, so we still apply the policy below).
    |
    |  2. Expo mobile app     — HTTP requests originate from a native device,
    |     not a browser. Expo does NOT send an Origin header for most requests,
    |     so CORS browser restrictions do not apply in the same way. We still
    |     allow '*' here so that any web-based Expo Go traffic or Expo web
    |     preview works without extra configuration.
    |
    | Authentication uses Sanctum Bearer tokens (stateless), NOT cookies.
    | Because no session cookies are involved, CSRF does not apply to the API.
    | 'supports_credentials' is therefore false (cookies are never sent).
    |
    | If you add cookie-based (SPA) auth in the future, narrow
    | 'allowed_origins' to your exact production domain(s) and set
    | 'supports_credentials' => true.
    |
    */

    // 'broadcasting/*' must be listed or the web admin's Echo private-channel
    // auth POST is rejected by the browser: the SPA lives on
    // newmoon-web.onrender.com and calls nmlmlh5.onrender.com, so the response
    // needs an Access-Control-Allow-Origin header. Without it the REST calls
    // still work (they are under api/*) but every private channel silently
    // fails to authenticate and order updates never arrive.
    'paths' => ['api/*', 'broadcasting/*', 'storage/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    // '*' is safe here because:
    //  - All protected endpoints require a Bearer token.
    //  - No session cookies are used by the API.
    //  - The Expo mobile app may not send Origin headers at all.
    'allowed_origins' => ['*'],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];
