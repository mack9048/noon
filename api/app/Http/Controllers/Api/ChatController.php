<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * Simple polling chat. For real-time delivery add Laravel Reverb (websockets)
 * and broadcast a MessageSent event from send() — see README.
 */
class ChatController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        return $user->conversations()
            ->with(['latestMessage.user', 'users:id,name,role'])
            ->get()
            ->sortByDesc(fn ($c) => $c->latestMessage?->id)
            ->values()
            ->map(function (Conversation $c) use ($user) {
                $other = $c->users->firstWhere('id', '!=', $user->id);
                $last = $c->latestMessage;

                return [
                    'id' => $c->id,
                    'kind' => $c->kind,
                    'title' => $c->title ?? $other?->name ?? 'Chat',
                    'role_label' => match ($c->kind) {
                        'group' => 'Group',
                        'office' => 'Admin',
                        default => ucfirst($other?->role ?? 'user'),
                    },
                    'last_message' => $last ? ($c->kind === 'group' ? $last->user->name.': ' : '').$last->body : '',
                    'last_at' => $last?->created_at?->isToday() ? $last->created_at->format('g:i A') : $last?->created_at?->format('D'),
                    'unread' => Message::where('conversation_id', $c->id)
                        ->where('id', '>', $c->pivot->last_read_message_id ?? 0)
                        ->where('user_id', '!=', $user->id)->count(),
                ];
            });
    }

    public function messages(Request $request, Conversation $conversation)
    {
        $user = $request->user();
        abort_unless($conversation->users()->whereKey($user->id)->exists(), 404);

        $messages = $conversation->messages()->with('user:id,name')
            ->when($request->query('after'), fn ($q, $after) => $q->where('id', '>', $after))
            ->orderBy('id')->limit(200)->get();

        if ($last = $messages->last()) {
            $conversation->users()->updateExistingPivot($user->id, ['last_read_message_id' => $last->id]);
        }

        return $messages->map(fn (Message $m) => $this->shape($m, $user->id));
    }

    public function send(Request $request, Conversation $conversation)
    {
        $user = $request->user();
        abort_unless($conversation->users()->whereKey($user->id)->exists(), 404);
        $data = $request->validate([
            'kind' => ['required', 'in:text,voice,file,image'],
            'body' => ['required_without:file', 'nullable', 'string', 'max:4000'],
            // Files are served from public storage: only safe media and documents.
            'file' => ['nullable', 'file', 'max:20480', 'mimes:jpg,jpeg,png,webp,gif,pdf,mp3,m4a,aac,ogg,oga,wav,webm,mp4,mov'],
        ]);
        $path = $request->hasFile('file') ? $request->file('file')->store("chat/{$conversation->id}", 'public') : null;
        $message = $conversation->messages()->create([
            'user_id' => $user->id,
            'kind' => $data['kind'],
            'body' => $data['body'] ?? $request->file('file')?->getClientOriginalName() ?? '',
            'file_path' => $path,
        ]);
        $conversation->touch();

        return $this->shape($message->load('user:id,name'), $user->id);
    }

    private function shape(Message $m, int $me): array
    {
        return [
            'id' => $m->id,
            'conversation_id' => $m->conversation_id,
            'mine' => $m->user_id === $me,
            'sender_name' => $m->user->name,
            'kind' => $m->kind,
            'body' => $m->body,
            'file_url' => $m->file_path ? Storage::disk('public')->url($m->file_path) : null,
            'created_at' => $m->created_at->format('g:i A'),
        ];
    }
}
