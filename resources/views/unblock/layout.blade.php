<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex">
    <title>{{ config('app.name') }} - @yield('title')</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Spicy+Rice&display=swap" rel="stylesheet">
    <style>
        :root {
            --stage-night: #111827;
            --backstage: #1f2937;
            --amber: #fbbf24;
            --amber-bulb: #f59e0b;
            --mist: #f3f4f6;
            --muted: #9ca3af;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { height: 100%; }

        body {
            font-family: 'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--stage-night);
            background-image: radial-gradient(at 50% 18%, rgba(251, 191, 36, 0.18) 0, transparent 55%);
            color: var(--mist);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.5rem;
        }

        .card {
            background: var(--backstage);
            border: 1px solid rgba(251, 191, 36, 0.25);
            border-radius: 1rem;
            box-shadow: 0 20px 45px rgba(0, 0, 0, 0.45);
            padding: 2rem;
            max-width: 30rem;
            width: 100%;
            text-align: center;
        }

        h1 {
            font-family: 'Spicy Rice', cursive;
            font-weight: 400;
            font-size: clamp(1.75rem, 5vw, 2.25rem);
            color: var(--amber);
            line-height: 1.2;
            margin-bottom: 0.75rem;
        }

        p { color: var(--mist); line-height: 1.6; margin-bottom: 1.5rem; }

        button {
            font: inherit;
            font-weight: 800;
            cursor: pointer;
            display: block;
            width: 100%;
            min-height: 3rem;
            padding: 0.75rem 1.25rem;
            border: none;
            border-radius: 0.5rem;
            background: var(--amber-bulb);
            color: #442c00;
            transition: background-color 0.15s ease;
        }

        button:hover { background: var(--amber); }

        .secondary {
            display: inline-block;
            margin-top: 1.25rem;
            color: var(--muted);
            font-size: 0.875rem;
            text-decoration: underline;
        }

        .secondary:hover { color: var(--mist); }
    </style>
</head>
<body>
    <main class="card">
        @yield('content')
        <a class="secondary" href="{{ config('app.url') }}">
            {{ __('messages.unblock_request.back_to_app', ['app' => config('app.name')]) }}
        </a>
    </main>
</body>
</html>
