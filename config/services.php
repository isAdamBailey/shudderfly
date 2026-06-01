<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'mailgun' => [
        'domain' => env('MAILGUN_DOMAIN'),
        'secret' => env('MAILGUN_SECRET'),
        'endpoint' => env('MAILGUN_ENDPOINT', 'api.mailgun.net'),
        'scheme' => 'https',
    ],

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'youtube' => [
        'api_key' => env('YOUTUBE_API_KEY'),
        'oauth_access_token' => env('YOUTUBE_OAUTH_ACCESS_TOKEN'),
    ],

    'webpush' => [
        'public_key' => env('VAPID_PUBLIC_KEY'),
        'private_key' => env('VAPID_PRIVATE_KEY'),
    ],

    'huggingface' => [
        'api_token' => env('HUGGINGFACE_API_TOKEN'),
        'user_overview_model' => env('HUGGINGFACE_USER_OVERVIEW_MODEL', 'Qwen/Qwen2.5-1.5B-Instruct'),
        'user_overview_endpoint' => env('HUGGINGFACE_USER_OVERVIEW_ENDPOINT', 'https://router.huggingface.co/featherless-ai/v1/chat/completions'),
    ],

    'tmdb' => [
        'api_key' => env('TMDB_API_KEY'),
        'base_api_url' => env('TMDB_BASE_API_URL', 'https://api.themoviedb.org/3'),
        'base_image_url' => env('TMDB_BASE_IMAGE_URL', 'https://image.tmdb.org/t/p/w200'),
    ],
];
