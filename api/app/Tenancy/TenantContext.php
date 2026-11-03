<?php

namespace App\Tenancy;

use App\Models\Tenant;

/**
 * Holds the institute (tenant) for the current request.
 * Set by the ResolveTenant middleware; read by the BelongsToTenant global scope.
 */
class TenantContext
{
    private ?Tenant $tenant = null;

    public function set(?Tenant $tenant): void
    {
        $this->tenant = $tenant;
    }

    public function tenant(): ?Tenant
    {
        return $this->tenant;
    }

    public function id(): ?int
    {
        return $this->tenant?->getKey();
    }

    public function has(): bool
    {
        return $this->tenant !== null;
    }

    /** Run a callback as another tenant (seeders, queued jobs, tests), then restore. */
    public function runAs(?Tenant $tenant, callable $callback): mixed
    {
        $previous = $this->tenant;
        $this->tenant = $tenant;
        try {
            return $callback();
        } finally {
            $this->tenant = $previous;
        }
    }
}
