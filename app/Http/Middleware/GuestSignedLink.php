<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Routing\Exceptions\InvalidSignatureException;

/**
 * Validates a signed URL, but renders a standalone page when the signature is
 * bad instead of letting the failure reach the Inertia error shell.
 *
 * For links that are mailed out and opened from an email client's browser, the
 * recipient is usually logged out, so the SPA is the wrong thing to show them.
 *
 * The catch has to live here rather than in a middleware wrapping the route
 * group: Illuminate\Pipeline\Pipeline::carry catches each pipe's throwable and
 * renders it through the exception handler, so it never propagates outward to
 * an earlier middleware. Overriding the signature check itself puts the catch
 * in the same frame as the throw, which is innermost and therefore wins.
 */
class GuestSignedLink extends ValidateSignature
{
    public function handle($request, Closure $next, ...$args)
    {
        try {
            return parent::handle($request, $next, ...$args);
        } catch (InvalidSignatureException) {
            return response()->view('unblock.status', ['status' => 'expired'], 403);
        }
    }
}
