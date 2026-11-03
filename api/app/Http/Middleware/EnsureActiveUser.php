<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Blocked users and users of a switched-off madrasa lose access at once, even with a valid token. */
class EnsureActiveUser
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if ($user && ($user->blocked || ($user->tenant && ! $user->tenant->active))) {
            $user->currentAccessToken()?->delete();

            return response()->json(['message' => $user->blocked
                ? 'This account is blocked. Please contact your madrasa.'
                : 'Your madrasa account is not active.'], 403);
        }

        return $next($request);
    }
}
