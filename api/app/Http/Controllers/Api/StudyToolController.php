<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StudyTool;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/** Charts · Adkar · Slides · Forms */
class StudyToolController extends Controller
{
    public function index(Request $request)
    {
        $data = $request->validate(['type' => ['required', 'in:chart,adkar,slide,form']]);
        $boardId = $request->user()?->board_id;

        return StudyTool::where('type', $data['type'])
            ->where('status', 'live')
            ->when($boardId, fn ($q) => $q->where(fn ($w) => $w->whereNull('board_id')->orWhere('board_id', $boardId)))
            ->orderByDesc('is_new')->latest()
            ->get();
    }

    public function open(Request $request, StudyTool $tool)
    {
        abort_unless($tool->status === 'live' || $request->user()->hasRole('super'), 404);
        $tool->increment('views');

        return ['file_url' => $tool->file_url];
    }

    /* ---------- Super admin CRUD ---------- */

    public function superIndex()
    {
        return StudyTool::latest()->get();
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        if ($request->hasFile('file')) {
            $data['file_path'] = $request->file('file')->store('study-tools', 'public');
        }
        unset($data['file']);

        return StudyTool::create($data);
    }

    // Accepts PUT (JSON) or POST with _method=PUT (multipart, for file replace)
    public function update(Request $request, StudyTool $tool)
    {
        $data = $this->validated($request, partial: true);
        if ($request->hasFile('file')) {
            if ($tool->file_path) {
                Storage::disk('public')->delete($tool->file_path);
            }
            $data['file_path'] = $request->file('file')->store('study-tools', 'public');
        }
        unset($data['file']);
        $tool->update($data);

        return $tool->fresh();
    }

    public function destroy(StudyTool $tool)
    {
        if ($tool->file_path) {
            Storage::disk('public')->delete($tool->file_path);
        }
        $tool->delete();

        return response()->noContent();
    }

    private function validated(Request $request, bool $partial = false): array
    {
        $req = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'type' => [$req, 'in:chart,adkar,slide,form'],
            'title' => [$req, 'string', 'max:200'],
            'is_new' => ['sometimes', 'boolean'],
            'status' => ['sometimes', 'in:draft,live'],
            'board_id' => ['nullable', 'exists:boards,id'],
            'file' => ['nullable', 'file', 'max:20480', 'mimes:pdf,jpg,jpeg,png'],
        ]);
    }
}
