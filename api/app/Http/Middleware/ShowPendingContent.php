<?php

namespace App\Http\Middleware;

use App\Support\Review;
use Closure;
use Illuminate\Http\Request;

/** Course editors (super admin and Course Management) see lessons and content still waiting for approval. */
class ShowPendingContent
{
    public function handle(Request $request, Closure $next)
    {
        Review::showAll(true);
        try {
            return $next($request);
        } finally {
            Review::showAll(false);
        }
    }
}
