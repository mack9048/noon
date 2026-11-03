<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/** Super admin: manage madrasas (tenants) and create their first admin. */
class TenantController extends Controller
{
    public function index()
    {
        return Tenant::withCount(['users as students_count' => fn ($q) => $q->where('role', 'student')])->latest()->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'plan' => ['sometimes', 'in:basic,pro,enterprise'],
            'admin_name' => ['required', 'string', 'max:80'],
            'admin_email' => ['required', 'email', 'unique:users,email'],
            'admin_password' => ['required', 'string', 'min:8'],
        ]);
        $tenant = Tenant::create([
            'name' => $data['name'],
            'plan' => $data['plan'] ?? 'basic',
            'code' => strtoupper(Str::random(6)),
        ]);
        User::create([
            'tenant_id' => $tenant->id,
            'name' => $data['admin_name'],
            'email' => $data['admin_email'],
            'password' => $data['admin_password'],
            'role' => 'admin',
        ]);
        return $tenant;
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
