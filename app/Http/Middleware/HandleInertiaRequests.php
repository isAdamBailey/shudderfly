<?php

namespace App\Http\Middleware;

use App\Models\SiteSetting;
use Illuminate\Http\Request;
use Inertia\Middleware;
use Tightenco\Ziggy\Ziggy;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     *
     * @return string|null
     */
    public function version(Request $request)
    {
        return parent::version($request);
    }

    public function handle(Request $request, \Closure $next)
    {
        if ($request->is('broadcasting/*')) {
            return $next($request);
        }

        return parent::handle($request, $next);
    }

    /**
     * Get the current theme based on the date.
     */
    public static function getCurrentTheme(): string
    {
        return match (now()->month) {
            12 => 'christmas',
            7 => 'fireworks',
            10 => 'halloween',
            default => '',
        };
    }

    /**
     * Define the props that are shared by default.
     *
     * @return mixed[]
     */
    public function share(Request $request): array
    {
        return array_merge(parent::share($request), [
            'auth' => [
                'user' => $request->user(),
            ],
            'unread_notifications_count' => function () use ($request) {
                if (! $request->user()) {
                    return 0;
                }

                return $request->user()->unreadNotifications()->count();
            },
            'csrf_token' => csrf_token(),
            'ziggy' => function () use ($request) {
                return array_merge((new Ziggy)->toArray(), [
                    'location' => $request->url(),
                ]);
            },
            'settings' => SiteSetting::all()->mapWithKeys(function ($setting) {
                $rawValue = $setting->getAttributes()['value'] ?? $setting->value;

                return [$setting->key => $rawValue];
            }),
            'theme' => self::getCurrentTheme(),
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'warning' => fn () => $request->session()->get('warning'),
                'info' => fn () => $request->session()->get('info'),
                'quota_exceeded' => fn () => $request->session()->get('quota_exceeded'),
            ],
        ]);
    }
}
