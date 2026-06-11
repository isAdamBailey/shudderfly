<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class SetLocale
{
    /**
     * Supported application locales.
     *
     * @var array<int, string>
     */
    public const SUPPORTED_LOCALES = ['en', 'es'];

    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     * @return Response
     */
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        if ($user && in_array($user->locale, self::SUPPORTED_LOCALES, true)) {
            app()->setLocale($user->locale);
        } else {
            $preferred = $request->getPreferredLanguage(self::SUPPORTED_LOCALES);
            app()->setLocale($preferred ?? config('app.locale'));
        }

        return $next($request);
    }
}
