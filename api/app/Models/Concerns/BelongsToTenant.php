<?php

namespace App\Models\Concerns;

use App\Models\Tenant;
use App\Tenancy\TenantContext;
use App\Tenancy\TenantScope;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

/**
 * Keeps an institution's rows inside that institution (shared MySQL database).
 *
 * - Queries are limited to the current institution (global scope).
 * - New rows get the current tenant_id.
 * - Saving a row into another institution throws.
 *
 * The current institution is set by the `tenant` middleware from the signed-in
 * user. Super admin routes run without one on purpose.
 */
trait BelongsToTenant
{
    public static function bootBelongsToTenant(): void
    {
        static::addGlobalScope(new TenantScope);

        // `saving` runs before `creating`, so fill and check in one place.
        static::saving(function ($model) {
            $context = app(TenantContext::class);
            if (! $context->has()) {
                return;
            }
            $model->tenant_id ??= $context->id();
            if ((int) $model->tenant_id !== $context->id()) {
                throw new LogicException('Refusing to save '.static::class.' into another institution.');
            }
        });
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
