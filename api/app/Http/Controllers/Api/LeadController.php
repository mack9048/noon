<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Admission;
use App\Models\Lead;
use App\Support\Phone;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** Institution admin: admission leads (enquiries) and their follow-up. */
class LeadController extends Controller
{
    public function index(Request $request)
    {
        $data = $request->validate([
            'status' => ['nullable', Rule::in(Lead::STATUSES)],
            'campaign_id' => ['nullable', 'integer'],
            'q' => ['nullable', 'string', 'max:80'],
        ]);

        return Lead::with('campaign')
            ->when($data['status'] ?? null, fn ($q, $s) => $q->where('status', $s))
            ->when($data['campaign_id'] ?? null, fn ($q, $c) => $q->where('campaign_id', $c))
            ->when($data['q'] ?? null, fn ($q, $s) => $q->where(fn ($w) => $w->where('student_name', 'like', "%{$s}%")->orWhere('parent_name', 'like', "%{$s}%")->orWhere('phone', 'like', "%{$s}%")))
            ->orderByRaw('follow_up_on is null')->orderBy('follow_up_on')->latest()
            ->limit(1000)->get()->map(fn (Lead $l) => $l->toApp());
    }

    public function store(Request $request)
    {
        $data = $request->validate($this->rules());
        $lead = new Lead($this->clean($data) + ['status' => $data['status'] ?? 'new', 'source' => $data['source'] ?? 'call']);
        $lead->addNote('Lead added', $request->user()->name);
        if (! empty($data['note'])) {
            $lead->addNote($data['note'], $request->user()->name);
        }
        $lead->save();

        return response()->json($lead->load('campaign')->toApp(), 201);
    }

    public function update(Request $request, int $id)
    {
        $lead = Lead::findOrFail($id);
        $data = $request->validate($this->rules(true));
        $before = $lead->status;
        $lead->fill($this->clean($data));
        if (isset($data['status']) && $data['status'] !== $before) {
            $lead->addNote('Status: '.str_replace('_', ' ', $data['status']), $request->user()->name);
        }
        if (! empty($data['note'])) {
            $lead->addNote($data['note'], $request->user()->name);
        }
        $lead->save();

        return $lead->load('campaign')->toApp();
    }

    public function destroy(int $id)
    {
        Lead::findOrFail($id)->delete();

        return response()->noContent();
    }

    /** Turn a lead into an application the office can admit. */
    public function convert(Request $request, int $id)
    {
        $lead = Lead::findOrFail($id);
        abort_if($lead->admission_id, 422, 'This lead already has an application.');
        $data = $request->validate([
            'gender' => ['required', Rule::in(['Boy', 'Girl'])],
            'board' => ['required', 'string', 'max:10'],
            'cls' => ['required', 'string', 'max:4'],
            'dob' => ['nullable', 'date', 'before:today'],
        ]);
        $a = Admission::create([
            'tenant_id' => $lead->tenant_id, 'campaign_id' => $lead->campaign_id,
            'ref' => 'APL-'.now()->year.'-'.strtoupper(Str::random(6)),
            'student_name' => $lead->student_name, 'gender' => $data['gender'], 'dob' => $data['dob'] ?? null,
            'board' => strtoupper($data['board']), 'class_label' => $data['cls'],
            'parent_name' => $lead->parent_name ?? 'Parent', 'relation' => 'Parent', 'phone' => $lead->phone, 'email' => $lead->email,
            'docs' => [], 'status' => 'new',
            'timeline' => [['Application made from a lead by '.$request->user()->name, now()->format('j M, g:i A')]],
        ]);
        $lead->forceFill(['admission_id' => $a->id, 'status' => 'applied']);
        $lead->addNote('Application '.$a->ref.' created', $request->user()->name);
        $lead->save();

        return ['lead' => $lead->load('campaign')->toApp(), 'application' => $a->toApp()];
    }

    private function rules(bool $partial = false): array
    {
        $req = $partial ? 'sometimes' : 'required';

        return [
            'student_name' => [$req, 'string', 'min:2', 'max:80'],
            'parent_name' => ['nullable', 'string', 'max:80'],
            'phone' => [$req, 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
            'cls' => ['nullable', 'string', 'max:4'],
            'campaign_id' => ['nullable', 'integer'],
            'source' => ['sometimes', Rule::in(Lead::SOURCES)],
            'status' => ['sometimes', Rule::in(Lead::STATUSES)],
            'follow_up_on' => ['nullable', 'date'],
            'note' => ['nullable', 'string', 'max:500'],
        ];
    }

    private function clean(array $d): array
    {
        $out = collect($d)->only(['student_name', 'parent_name', 'email', 'source', 'status', 'follow_up_on', 'campaign_id'])->all();
        if (array_key_exists('cls', $d)) {
            $out['class_label'] = $d['cls'];
        }
        if (isset($d['phone'])) {
            $phone = Phone::normalize($d['phone']);
            if (! $phone) {
                throw ValidationException::withMessages(['phone' => ['Please enter a valid phone number.']]);
            }
            $out['phone'] = $phone;
        }
        if (isset($out['campaign_id']) && $out['campaign_id'] && ! \App\Models\AdmissionCampaign::find($out['campaign_id'])) {
            throw ValidationException::withMessages(['campaign_id' => ['Unknown campaign.']]);
        }

        return $out;
    }
}
