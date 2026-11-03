<?php

// Allow the Vercel web app (and local Expo web) to call the API.
return [
    'paths' => ['api/*'],
    'allowed_methods' => ['*'],
    'allowed_origins' => array_filter(array_map('trim', explode(',', env('CORS_ALLOWED_ORIGINS', 'http://localhost:8081')))),
    'allowed_origins_patterns' => array_filter([env('CORS_ALLOWED_PATTERN')]), // e.g. #^https://noon-learn-.*\.vercel\.app$#
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 3600,
    'supports_credentials' => false, // we use Bearer tokens, not cookies
];
