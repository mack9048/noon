<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdmissionCampaign;
use Illuminate\Http\Request;

/** Institution admin: admission campaigns, each with its own public link. */
class CampaignController extends Controller
{
    public function index()
    {
        return AdmissionCampaign::withCount(['leads', 'admissions', 'admissions as admissions_admitted_count' => fn ($q) => $q->where('status', 'admitted')])
            ->latest()->get()->map(fn (AdmissionCampaign $c) => $c->toApp());
    }

    public function show(int $id)
    {
        return AdmissionCampaign::findOrFail($id)->toApp();
    }

    public function store(Request $request)
    {
        $c = AdmissionCampaign::create($this->data($request) + ['code' => $this->newCode()]);

        return response()->json($c->toApp(), 201);
    }

    public function update(Request $request, int $id)
    {
        $c = AdmissionCampaign::findOrFail($id);
        $c->update($this->data($request, true));

        return $c->toApp();
    }

    public function destroy(int $id)
    {
        AdmissionCampaign::findOrFail($id)->delete(); // leads and applications stay, without the campaign

        return response()->noContent();
    }

    private function data(Request $request, bool $partial = false): array
    {
        $req = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'title' => [$req, 'string', 'min:3', 'max:120'],
            'academic_year' => ['nullable', 'string', 'max:12'],
            'classes' => ['nullable', 'array', 'max:20'],
            'classes.*' => ['string', 'max:4'],
            'seats' => ['nullable', 'integer', 'min:1', 'max:100000'],
            'opens_on' => ['nullable', 'date'],
            'closes_on' => ['nullable', 'date', 'after_or_equal:opens_on'],
            'description' => ['nullable', 'string', 'max:600'],
            'fee_note' => ['nullable', 'string', 'max:200'],
            'status' => ['sometimes', 'in:open,closed'],
        ]);
    }

    /** 8 letters/digits without look-alikes, e.g. ADM7K2QX. */
    private function newCode(): string
    {
        do {
            $code = 'ADM'.collect(range(1, 5))->map(fn () => '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'[random_int(0, 31)])->implode('');
        } while (AdmissionCampaign::withoutGlobalScopes()->where('code', $code)->exists());

        return $code;
    }
}
