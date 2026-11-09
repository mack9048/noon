<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Super admin: manage madrasas (tenants) and create their first admin. */
class TenantController extends Controller
{
    public function index()
    {
        return Tenant::withCount([
            'users as students_count' => fn ($q) => $q->where('role', 'student'),
            'users as teachers_count' => fn ($q) => $q->where('role', 'teacher'),
        ])->latest()->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'plan' => ['sometimes', 'in:basic,pro,enterprise'],
            'admin_name' => ['required', 'string', 'max:80'],
            'admin_email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'admin_password' => ['required', 'string', 'min:8'],
        ]);
        $tenant = Tenant::create([
            'name' => $data['name'],
            'plan' => $data['plan'] ?? 'basic',
            'code' => $this->newCode(),
        ]);
        User::create([
            'tenant_id' => $tenant->id,
            'name' => $data['admin_name'],
            'email' => strtolower($data['admin_email']),
            'password' => $data['admin_password'],
            'role' => 'admin',
        ]);

        return $tenant->loadCount([
            'users as students_count' => fn ($q) => $q->where('role', 'student'),
            'users as teachers_count' => fn ($q) => $q->where('role', 'teacher'),
        ]);
    }

    /** 6 letters/digits, without look-alikes (0/O, 1/I). */
    private function newCode(): string
    {
        do {
            $code = collect(range(1, 6))->map(fn () => '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'[random_int(0, 31)])->implode('');
        } while (Tenant::where('code', $code)->exists());

        return $code;
    }

    public function update(Request $request, Tenant $tenant)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'plan' => ['sometimes', 'in:basic,pro,enterprise'],
            'active' => ['sometimes', 'boolean'],
            'leave_quota' => ['sometimes', 'integer', 'between:0,365'],
            // Optional: reset the password of the madrasa's first admin
            'admin_password' => ['sometimes', 'nullable', 'string', 'min:8'],
        ]);
        $tenant->update(collect($data)->except('admin_password')->all());
        if (! empty($data['admin_password'])) {
            $admin = $tenant->users()->where('role', 'admin')->orderBy('id')->first();
            abort_unless($admin, 422, 'This madrasa has no admin yet.');
            $admin->update(['password' => $data['admin_password']]);
            $admin->tokens()->delete();
        }

        return $tenant->loadCount([
            'users as students_count' => fn ($q) => $q->where('role', 'student'),
            'users as teachers_count' => fn ($q) => $q->where('role', 'teacher'),
        ]);
    }

    /**
     * Suspends the madrasa. With ?permanent=1 it is deleted for good,
     * together with all its people and data. That cannot be undone.
     */
    public function destroy(Request $request, Tenant $tenant)
    {
        if (! $request->boolean('permanent')) {
            $tenant->update(['active' => false]);

            return response()->noContent();
        }
        DB::transaction(function () use ($tenant) {
            $ids = $tenant->users()->pluck('id');
            DB::table('personal_access_tokens')->where('tokenable_type', User::class)->whereIn('tokenable_id', $ids)->delete();
            User::whereIn('id', $ids)->delete();
            $tenant->delete();
        });

        return response()->noContent();
    }
}
