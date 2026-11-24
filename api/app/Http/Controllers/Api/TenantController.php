<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Super admin: manage institutions (tenants) and create their first admin. */
class TenantController extends Controller
{
    public function index()
    {
        $admins = User::where('role', 'admin')->whereNotNull('tenant_id')->orderBy('id')->get(['id', 'tenant_id', 'email', 'name'])->unique('tenant_id')->keyBy('tenant_id');
        $batches = DB::table('batches')->select('tenant_id', DB::raw('count(*) as n'))->groupBy('tenant_id')->pluck('n', 'tenant_id');

        return Tenant::withCount([
            'users as students_count' => fn ($q) => $q->where('role', 'student'),
            'users as teachers_count' => fn ($q) => $q->where('role', 'teacher'),
        ])->latest()->get()->map(fn (Tenant $t) => $t->toArray() + [
            // For the tenant cards: the first admin (Log in as) and the number of batches.
            'admin' => ($a = $admins[$t->id] ?? null) ? ['id' => $a->id, 'name' => $a->name, 'email' => $a->email] : null,
            'batches_count' => (int) ($batches[$t->id] ?? 0),
        ]);
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

    /** Super admin: change an institution's logo. */
    public function logo(Request $request, Tenant $tenant)
    {
        $t = InstitutionController::saveLogo($request, $tenant);

        return ['logo_url' => $t->logoUrl()];
    }

    public function update(Request $request, Tenant $tenant)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'plan' => ['sometimes', 'in:basic,pro,enterprise'],
            'active' => ['sometimes', 'boolean'],
            'leave_quota' => ['sometimes', 'integer', 'between:0,365'],
            // Optional: reset the password of the institution's first admin
            'admin_password' => ['sometimes', 'nullable', 'string', 'min:8'],
        ]);
        // Country, currency, phone code and school details, as the institution itself can set them.
        $tenant->update(collect($data)->except('admin_password')->all() + collect(InstitutionController::rules($request))->except('name')->all());
        if (! empty($data['admin_password'])) {
            $admin = $tenant->users()->where('role', 'admin')->orderBy('id')->first();
            abort_unless($admin, 422, 'This institution has no admin yet.');
            $admin->update(['password' => $data['admin_password']]);
            $admin->tokens()->delete();
        }

        return $tenant->loadCount([
            'users as students_count' => fn ($q) => $q->where('role', 'student'),
            'users as teachers_count' => fn ($q) => $q->where('role', 'teacher'),
        ]);
    }

    /**
     * Suspends the institution. With ?permanent=1 it is deleted for good,
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
