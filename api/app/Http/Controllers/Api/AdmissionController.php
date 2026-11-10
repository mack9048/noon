<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Admission;
use App\Models\AdmissionCampaign;
use App\Models\Lead;
use App\Services\Enrolment;
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
        [$tenant, $campaign] = $this->resolve($code);
        abort_if($campaign && ! $campaign->isOpen(), 422, 'Admissions for this campaign are closed.');

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
            'email' => ['nullable', 'email', 'max:255'],
            'docs' => ['nullable', 'array'],
            'docs.*' => ['boolean'],
        ]);
        $phone = Phone::normalize($data['phone']);
        if (! $phone || strlen(preg_replace('/\D/', '', $data['phone'])) < 9) {
            throw \Illuminate\Validation\ValidationException::withMessages(['phone' => 'Please enter a valid WhatsApp number.']);
        }

        $admission = Admission::create([
            'tenant_id' => $tenant->id, 'campaign_id' => $campaign?->id, 'email' => isset($data['email']) ? strtolower($data['email']) : null,
            'ref' => 'APL-'.now()->year.'-'.strtoupper(Str::random(6)),
            'student_name' => $data['name'], 'gender' => $data['gender'], 'dob' => $data['dob'] ?? null,
            'board' => $data['board'], 'class_label' => $data['cls'],
            'parent_name' => $data['parent'], 'relation' => $data['relation'] ?? 'Parent', 'phone' => $phone, 'city' => $data['city'] ?? null,
            'docs' => array_intersect_key($data['docs'] ?? [], array_flip(['birth', 'tc', 'photo'])),
            'status' => 'new',
            'timeline' => [['Form submitted via the online form', now()->format('j M, g:i A')]],
        ]);

        // An enquiry from the same phone becomes "applied"
        Lead::withoutGlobalScopes()->where('tenant_id', $tenant->id)->where('phone', $phone)->whereNull('admission_id')
            ->whereNotIn('status', ['admitted', 'lost'])->get()->each(function (Lead $l) use ($admission) {
                $l->forceFill(['admission_id' => $admission->id, 'status' => 'applied']);
                $l->addNote('Applied online: '.$admission->ref);
                $l->save();
            });

        return response()->json(['id' => $admission->ref, 'madrasa' => $tenant->name, 'institution' => $tenant->name], 201);
    }

    /** GET /portal/{code} — public admission page: an institution code or a campaign code. */
    public function portal(string $code)
    {
        [$tenant, $campaign] = $this->resolve($code);
        $open = AdmissionCampaign::withoutGlobalScopes()->where('tenant_id', $tenant->id)->where('status', 'open')->latest()->get()
            ->filter(fn ($c) => $c->isOpen())->values();

        return [
            'institution' => ['name' => $tenant->name, 'code' => $tenant->code],
            'campaign' => $campaign ? $this->publicCampaign($campaign) : null,
            'campaigns' => $open->map(fn ($c) => $this->publicCampaign($c)),
        ];
    }

    /** POST /portal/{code}/enquire — public quick enquiry → a lead for the office. */
    public function enquire(Request $request, string $code)
    {
        [$tenant, $campaign] = $this->resolve($code);
        $data = $request->validate([
            'student_name' => ['required', 'string', 'min:2', 'max:80'],
            'parent_name' => ['required', 'string', 'min:2', 'max:80'],
            'phone' => ['required', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
            'cls' => ['nullable', 'string', 'max:4'],
            'message' => ['nullable', 'string', 'max:500'],
        ]);
        $phone = Phone::normalize($data['phone']);
        if (! $phone || strlen(preg_replace('/\D/', '', $data['phone'])) < 9) {
            throw \Illuminate\Validation\ValidationException::withMessages(['phone' => 'Please enter a valid WhatsApp number.']);
        }
        $lead = new Lead([
            'tenant_id' => $tenant->id, 'campaign_id' => $campaign?->id, 'student_name' => $data['student_name'], 'parent_name' => $data['parent_name'],
            'phone' => $phone, 'email' => isset($data['email']) ? strtolower($data['email']) : null, 'class_label' => $data['cls'] ?? null,
            'source' => 'portal', 'status' => 'new', 'follow_up_on' => today()->addDay(),
        ]);
        $lead->addNote('Enquiry from the admission page'.(! empty($data['message']) ? ': '.$data['message'] : ''));
        $lead->save();

        return response()->json(['ok' => true, 'institution' => $tenant->name], 201);
    }

    /** POST /admin/admissions/{ref}/admit — admit and create the student's and parent's logins. */
    public function admit(Request $request, string $ref, Enrolment $enrolment)
    {
        $a = Admission::where('ref', $ref)->firstOrFail();
        abort_if($a->student_id, 422, 'This student is already admitted.');
        $data = $request->validate([
            'admission_no' => ['nullable', 'string', 'max:40'],
            'batch_id' => ['nullable', 'integer'],
            'parent_email' => ['nullable', 'email', 'max:255'],
        ]);
        $r = $enrolment->admit($request->user()->tenant, [
            'name' => $a->student_name, 'board' => $a->board, 'cls' => $a->class_label, 'dob' => $a->dob?->toDateString(),
            'parent_name' => $a->parent_name, 'parent_phone' => $a->phone, 'parent_email' => $data['parent_email'] ?? $a->email,
            'admission_no' => $data['admission_no'] ?? null, 'batch_id' => $data['batch_id'] ?? null,
        ]);
        $a->update([
            'status' => 'admitted', 'student_id' => $r['student']->id,
            'timeline' => [...($a->timeline ?? []), ['Admitted · admission no. '.$r['student']->admission_no, now()->format('j M, g:i A')]],
        ]);
        Lead::where('admission_id', $a->id)->get()->each(function (Lead $l) use ($request) {
            $l->status = 'admitted';
            $l->addNote('Admitted', $request->user()->name);
            $l->save();
        });

        return ['application' => $a->toApp(), 'student_id' => $r['student']->id, 'credentials' => $r['credentials']];
    }

    /** Institution code (e.g. DEMO01) or campaign code (e.g. ADM7K2QX). */
    private function resolve(string $code): array
    {
        $code = strtoupper(trim($code));
        $campaign = AdmissionCampaign::withoutGlobalScopes()->where('code', $code)->first();
        $tenant = $campaign ? Tenant::find($campaign->tenant_id) : Tenant::where('code', $code)->first();
        abort_unless($tenant && $tenant->active, 404, 'This admission link is not valid.');

        return [$tenant, $campaign];
    }

    private function publicCampaign(AdmissionCampaign $c): array
    {
        $admitted = Admission::withoutGlobalScopes()->where('campaign_id', $c->id)->where('status', 'admitted')->count();

        return [
            'code' => $c->code, 'title' => $c->title, 'year' => $c->academic_year, 'classes' => $c->classes ?? [],
            'closes_on' => $c->closes_on?->toDateString(), 'description' => $c->description, 'fee_note' => $c->fee_note,
            'is_open' => $c->isOpen(), 'seats_left' => $c->seats ? max(0, $c->seats - $admitted) : null,
        ];
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
