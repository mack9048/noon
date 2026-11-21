<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
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
        $tenant = $request->user()->tenant;
        $tenant->update(self::rules($request));

        return $this->payload($tenant->fresh());
    }

    /** The institution logo (shown in the app, on receipts and to students). */
    public function logo(Request $request)
    {
        return $this->payload(self::saveLogo($request, $request->user()->tenant));
    }

    /** Details an institution can change (also used by super admin's tenant edit). */
    public static function rules(Request $request): array
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'min:2', 'max:120'],
            'tagline' => ['nullable', 'string', 'max:120'],
            'website' => ['nullable', 'string', 'max:160'],
            'phone' => ['nullable', 'string', 'max:30', 'regex:/^[0-9 +\-]{6,30}$/'],
            'email' => ['nullable', 'email', 'max:160'],
            'address' => ['nullable', 'string', 'max:200'],
            'registration_no' => ['nullable', 'string', 'max:60'],
            'affiliation_no' => ['nullable', 'string', 'max:60'],
            'principal' => ['nullable', 'string', 'max:80'],
            'established' => ['nullable', 'string', 'max:10'],
            'academic_year' => ['nullable', 'string', 'max:20'],
            'default_fee' => ['nullable', 'numeric', 'min:0', 'max:10000000'],
            'country' => ['sometimes', 'in:'.implode(',', array_keys(Tenant::COUNTRIES))],
            'currency' => ['sometimes', 'in:'.implode(',', array_keys(Tenant::CURRENCIES))],
            'dial_code' => ['sometimes', 'regex:/^\+[0-9]{1,4}$/'],
            'timezone' => ['sometimes', 'timezone'],
        ], ['phone.regex' => 'Enter the phone number with digits only.', 'dial_code.regex' => 'Enter the country code like +971.']);
        // Choosing a country fills its currency, phone code and time zone unless they were set too.
        if (isset($data['country'])) {
            [, $cur, $dial, $tz] = Tenant::COUNTRIES[$data['country']];
            $data += ['currency' => $cur, 'dial_code' => $dial, 'timezone' => $tz];
        }

        return $data;
    }

    public static function saveLogo(Request $request, Tenant $tenant): Tenant
    {
        $request->validate(['logo' => ['nullable', 'file', 'max:2048', 'extensions:png,jpg,jpeg,webp,svg'], 'remove' => ['sometimes', 'boolean']]);
        $tenant->logo_path && Storage::disk('public')->delete($tenant->logo_path);
        $tenant->update(['logo_path' => $request->hasFile('logo') ? $request->file('logo')->store("tenants/{$tenant->id}", 'public') : null]);

        return $tenant->fresh();
    }

    public static function details(Tenant $t): array
    {
        return [
            'logo_url' => $t->logoUrl(), 'tagline' => $t->tagline, 'website' => $t->website, 'email' => $t->email,
            'registration_no' => $t->registration_no, 'affiliation_no' => $t->affiliation_no, 'principal' => $t->principal, 'established' => $t->established,
            'country' => $t->country ?? 'IN', 'currency' => $t->currency ?? 'INR', 'dial_code' => $t->dial_code ?? '+91', 'timezone' => $t->timezone ?? 'Asia/Kolkata',
        ];
    }

    private function payload($t): array
    {
        $count = fn (string $role) => User::where('tenant_id', $t->id)->where('role', $role)->count();

        return [
            'id' => $t->id, 'name' => $t->name, 'code' => $t->code, 'plan' => $t->plan, 'active' => (bool) $t->active,
            'phone' => $t->phone, 'address' => $t->address, 'academic_year' => $t->academic_year,
            'default_fee' => $t->default_fee !== null ? (float) $t->default_fee : null,
            'counts' => ['students' => $count('student'), 'teachers' => $count('teacher'), 'admins' => $count('admin')],
        ] + self::details($t) + ['countries' => collect(Tenant::COUNTRIES)->map(fn ($c, $k) => ['code' => $k, 'name' => $c[0], 'currency' => $c[1], 'dial_code' => $c[2], 'timezone' => $c[3]])->values()];
    }
}
