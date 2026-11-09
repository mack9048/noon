<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\Request;

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

        return $tenant;
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
        $tenant->update($request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'plan' => ['sometimes', 'in:basic,pro,enterprise'],
            'active' => ['sometimes', 'boolean'],
            'leave_quota' => ['sometimes', 'integer', 'between:0,365'],
        ]));

        return $tenant;
    }

    public function destroy(Tenant $tenant)
    {
        $tenant->update(['active' => false]); // soft-disable; never hard-delete a school's data from the app

        return response()->noContent();
    }
}
