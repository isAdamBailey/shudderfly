<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ config('app.name') }} - Maintenance Mode</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #111827;
            background-image:
                radial-gradient(at 20% 30%, rgba(59, 130, 246, 0.15) 0, transparent 50%),
                radial-gradient(at 80% 70%, rgba(147, 51, 234, 0.15) 0, transparent 50%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            color: white;
        }

        .container {
            text-align: center;
            max-width: 600px;
            background: rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(20px);
            border-radius: 20px;
            padding: 3rem 2rem;
            box-shadow:
                0 8px 32px rgba(0, 0, 0, 0.4),
                0 0 0 1px rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.1);
            position: relative;
            overflow: hidden;
        }

        .container::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(
                90deg,
                transparent,
                rgba(255, 255, 255, 0.3),
                transparent
            );
        }

        .icon {
            font-size: 80px;
            margin-bottom: 30px;
            animation: pulse 2s ease-in-out infinite;
            filter: drop-shadow(0 2px 8px rgba(255, 255, 255, 0.3));
        }

        @keyframes pulse {
            0%, 100% {
                transform: scale(1);
                opacity: 1;
            }
            50% {
                transform: scale(1.1);
                opacity: 0.8;
            }
        }

        h1 {
            font-size: 36px;
            margin-bottom: 20px;
            font-weight: 700;
            color: rgba(255, 255, 255, 0.98);
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
        }

        p {
            font-size: 18px;
            margin-bottom: 15px;
            line-height: 1.6;
            color: rgba(255, 255, 255, 0.92);
        }

        .message {
            background: rgba(59, 130, 246, 0.15);
            border: 1px solid rgba(59, 130, 246, 0.3);
            border-radius: 12px;
            padding: 20px;
            margin-top: 30px;
            backdrop-filter: blur(10px);
        }

        .message p {
            margin: 0;
            color: rgba(147, 197, 253, 0.98);
            font-weight: 600;
        }

        .spinner {
            margin: 30px auto 0;
            width: 50px;
            height: 50px;
            border: 4px solid rgba(255, 255, 255, 0.2);
            border-top-color: rgba(59, 130, 246, 1);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            to {
                transform: rotate(360deg);
            }
        }

        .app-name {
            color: rgba(251, 191, 36, 0.95);
            font-weight: 600;
        }

        @media (max-width: 600px) {
            .container {
                padding: 2rem 1.5rem;
                border-radius: 16px;
            }

            h1 {
                font-size: 28px;
            }

            p {
                font-size: 16px;
            }

            .icon {
                font-size: 60px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">🔧</div>
        <h1>We'll be right back!</h1>
        <p><span class="app-name">{{ config('app.name') }}</span> is currently deploying updates.</p>
        <p>We're making some improvements and will be back online shortly.</p>

        @if(isset($retry))
        <div class="message">
            <p>Expected back at: {{ \Carbon\Carbon::createFromTimestamp($retry)->format('g:i A') }}</p>
        </div>
        @endif

        <div class="spinner"></div>
    </div>
</body>
</html>
