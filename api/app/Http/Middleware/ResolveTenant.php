<?php

namespace App\Http\Middleware;

use App\Tenancy\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Institution routes: the signed-in user's institution becomes the current tenant,
 * so tenant-owned models (leave, chat, ...) only ever load that institution's rows.
 * Runs before route-model binding (see bootstrap/app.php).
 */
class ResolveTenant
{
    public function __construct(private TenantContext $context) {}

    public function handle(Request $request, Closure $next): Response
    {
        $this->context->set(null);
        $tenant = $request->user()?->tenant;

        if (! $tenant) {
            return response()->json(['message' => 'Join an institution to use this.'], 403);
        }
        if (! $tenant->active) {
            return response()->json(['message' => 'Your institution account is not active.'], 403);
        }

        $this->context->set($tenant);
        try {
            return $next($request);
        } finally {
            $this->context->set(null);
        }
    }
}
