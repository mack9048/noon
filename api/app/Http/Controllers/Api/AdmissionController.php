<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Admission;
use App\Models\Tenant;
use App\Support\Phone;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Admissions: the public form parents fill from the shared link (no login),
 * and the institute admin's list where applications are admitted or rejected.
 */
class AdmissionController extends Controller
{
    private const STATUS_NOTE = ['review' => 'Interview booked', 'admitted' => 'Admitted', 'rejected' => 'Application rejected', 'new' => 'Moved back to new'];

    /** POST /apply/{code} — public. */
    public function apply(Request $request, string $code)
    {
        $tenant = Tenant::where('code', strtoupper($code))->where('active', true)->first();
        abort_unless($tenant, 404, 'This admission link is not valid.');

        $data = $request->validate([
            'name' => ['required', 'string', 'min:3', 'max:80'],
            'gender' => ['required', Rule::in(['Boy', 'Girl'])],
            'dob' => ['nullable', 'date', 'before:today', 'after:-25 years'],
            'board' => ['required', 'string', 'max:10'],
            'cls' => ['required', 'string', 'max:4'],
            'parent' => ['required', 'string', 'min:3', 'max:80'],
            'relation' => ['nullable', 'string', 'max:20'],
            'phone' => ['required', 'string', 'max:30'],
            'city' => ['nullable', 'string', 'max:80'],
            'docs' => ['nullable', 'array'],
            'docs.*' => ['boolean'],
        ]);
        $phone = Phone::normalize($data['phone']);
        if (! $phone || strlen(preg_replace('/\D/', '', $data['phone'])) < 9) {
            throw \Illuminate\Validation\ValidationException::withMessages(['phone' => 'Please enter a valid WhatsApp number.']);
        }

        $admission = Admission::create([
            'tenant_id' => $tenant->id,
            'ref' => 'APL-'.now()->year.'-'.strtoupper(Str::random(6)),
            'student_name' => $data['name'], 'gender' => $data['gender'], 'dob' => $data['dob'] ?? null,
            'board' => $data['board'], 'class_label' => $data['cls'],
            'parent_name' => $data['parent'], 'relation' => $data['relation'] ?? 'Parent', 'phone' => $phone, 'city' => $data['city'] ?? null,
            'docs' => array_intersect_key($data['docs'] ?? [], array_flip(['birth', 'tc', 'photo'])),
            'status' => 'new',
            'timeline' => [['Form submitted via the online form', now()->format('j M, g:i A')]],
        ]);

        return response()->json(['id' => $admission->ref, 'madrasa' => $tenant->name], 201);
    }

    /** GET /admin/admissions — this madrasa only (tenant scope). */
    public function index()
    {
        return Admission::latest()->limit(500)->get()->map(fn (Admission $a) => $a->toApp());
    }

    public function show(string $ref)
    {
        return Admission::where('ref', $ref)->firstOrFail()->toApp();
    }

    /** PATCH /admin/admissions/{ref} — admit, book an interview or reject. */
    public function update(Request $request, string $ref)
    {
        $a = Admission::where('ref', $ref)->firstOrFail();
        $data = $request->validate(['status' => ['required', Rule::in(['new', 'review', 'admitted', 'rejected'])]]);
        $a->update([
            'status' => $data['status'],
            'timeline' => [...($a->timeline ?? []), [self::STATUS_NOTE[$data['status']], now()->format('j M, g:i A')]],
        ]);

        return $a->toApp();
    }
}
