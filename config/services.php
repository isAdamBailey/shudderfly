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
        'vision_model' => env('HUGGINGFACE_VISION_MODEL', 'Qwen/Qwen2.5-VL-72B-Instruct'),
        'vision_endpoint' => env('HUGGINGFACE_VISION_ENDPOINT', 'https://router.huggingface.co/v1/chat/completions'),
    ],

    /*
     * Which provider MediaDescriptionService and UserWeeklyOverviewService
     * call: 'huggingface' or 'anthropic'. Swapping this back to
     * 'huggingface' fully reverts both services with no code changes.
     */
    'ai_provider' => env('AI_PROVIDER', 'huggingface'),

    'anthropic' => [
        'api_key' => env('ANTHROPIC_API_KEY'),
        'api_version' => '2023-06-01',
        'endpoint' => env('ANTHROPIC_ENDPOINT', 'https://api.anthropic.com/v1/messages'),
        'vision_model' => env('ANTHROPIC_VISION_MODEL', 'claude-haiku-4-5'),
        'text_model' => env('ANTHROPIC_TEXT_MODEL', 'claude-haiku-4-5'),
    ],

    /*
     * Text-to-speech for the AI voice (AiVoiceService). Names stay
     * model-agnostic: a different model is a config change here, and since
     * the model is part of each clip's hash, the cache refills itself.
     *
     * voices: per-locale allow-list; the first entry is that locale's default.
     */
    'ai_voice' => [
        'provider' => env('AI_VOICE_PROVIDER', 'deepinfra'),
        'api_key' => env('AI_VOICE_API_KEY'),
        'endpoint' => env('AI_VOICE_ENDPOINT', 'https://api.deepinfra.com/v1/audio/speech'),
        'model' => env('AI_VOICE_MODEL', 'hexgrad/Kokoro-82M'),
        'timeout' => (int) env('AI_VOICE_TIMEOUT') ?: 10,
        // Dollars per 1M input characters; only used to estimate cost in reports.
        'price_per_million' => (float) env('AI_VOICE_PRICE_PER_MILLION') ?: 0.62,
        'voices' => [
            'en' => ['af_heart', 'af_bella', 'af_nova', 'am_puck', 'am_michael', 'bf_emma', 'bm_george', 'am_santa'],
            'es' => ['ef_dora', 'em_alex', 'em_santa'],
            'fr' => ['ff_siwis'],
        ],
    ],

    'tmdb' => [
        'api_key' => env('TMDB_API_KEY'),
        'base_api_url' => env('TMDB_BASE_API_URL', 'https://api.themoviedb.org/3'),
        'base_image_url' => env('TMDB_BASE_IMAGE_URL', 'https://image.tmdb.org/t/p/w200'),
    ],
];
