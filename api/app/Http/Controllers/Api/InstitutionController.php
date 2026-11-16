<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

/** Institution admin: their institution's details (Settings). */
class InstitutionController extends Controller
{
    public function show(Request $request)
    {
        return $this->payload($request->user()->tenant);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'min:2', 'max:120'],
            'phone' => ['nullable', 'string', 'max:30'],
            'address' => ['nullable', 'string', 'max:200'],
            'academic_year' => ['nullable', 'string', 'max:20'],
            'default_fee' => ['nullable', 'numeric', 'min:0', 'max:10000000'],
        ]);
        $tenant = $request->user()->tenant;
        $tenant->update($data);

        return $this->payload($tenant->fresh());
    }

    private function payload($t): array
    {
        $count = fn (string $role) => User::where('tenant_id', $t->id)->where('role', $role)->count();

        return [
            'id' => $t->id, 'name' => $t->name, 'code' => $t->code, 'plan' => $t->plan, 'active' => (bool) $t->active,
            'phone' => $t->phone, 'address' => $t->address, 'academic_year' => $t->academic_year,
            'default_fee' => $t->default_fee !== null ? (float) $t->default_fee : null,
            'counts' => ['students' => $count('student'), 'teachers' => $count('teacher'), 'admins' => $count('admin')],
        ];
    }
}
