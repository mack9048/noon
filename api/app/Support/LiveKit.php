<?php

namespace App\Support;

use App\Models\Course;
use Illuminate\Support\Facades\Http;

/**
 * Noon Live: classes on LiveKit Cloud. Signs short-lived room passes (JWT, HS256) and calls
 * LiveKit's room service for teacher controls. The key and secret stay on the server.
 */
class LiveKit
{
    public const PASS_MINUTES = 150;

    public static function configured(): bool
    {
        return (bool) (config('services.livekit.url') && config('services.livekit.key') && config('services.livekit.secret'));
    }

    public static function url(): string
    {
        return (string) config('services.livekit.url');
    }

    /** One room per live course. */
    public static function room(Course $course): string
    {
        return 'noon-course-'.$course->id;
    }

    /** A pass to join one room. Teachers can also run the room. Children can use mic and camera; a teacher can mute them. */
    public static function token(string $room, string $identity, string $name, bool $host, array $meta = []): string
    {
        return self::sign([
            'sub' => $identity, 'name' => $name, 'metadata' => json_encode($meta + ['host' => $host]),
            'video' => [
                'room' => $room, 'roomJoin' => true, 'canPublish' => true, 'canSubscribe' => true, 'canPublishData' => true,
                'roomAdmin' => $host, 'canUpdateOwnMetadata' => false,
            ],
        ], self::PASS_MINUTES * 60);
    }

    /** Call LiveKit's room service (Twirp over HTTPS) with an admin pass for that room. */
    public static function call(string $method, array $body, string $room): array
    {
        $admin = self::sign(['sub' => 'noon-server', 'video' => ['room' => $room, 'roomAdmin' => true, 'roomList' => true, 'roomCreate' => true]], 300);
        $base = preg_replace('#^ws#', 'http', rtrim(self::url(), '/'));
        $res = Http::withToken($admin)->acceptJson()->timeout(10)->post("$base/twirp/livekit.RoomService/$method", (object) $body);
        abort_unless($res->successful(), 422, 'The class could not be changed. Please try again.');

        return $res->json() ?? [];
    }

    /** Mute every microphone the participant is sending. */
    public static function muteMic(string $room, string $identity): void
    {
        $p = self::call('GetParticipant', ['room' => $room, 'identity' => $identity], $room);
        foreach ($p['tracks'] ?? [] as $t) {
            if (($t['type'] ?? '') === 'AUDIO' || ($t['source'] ?? '') === 'MICROPHONE') {
                self::call('MutePublishedTrack', ['room' => $room, 'identity' => $identity, 'track_sid' => $t['sid'], 'muted' => true], $room);
            }
        }
    }

    private static function sign(array $claims, int $ttl): string
    {
        $now = time();
        $payload = $claims + ['iss' => config('services.livekit.key'), 'nbf' => $now - 10, 'exp' => $now + $ttl, 'jti' => bin2hex(random_bytes(8))];
        $b64 = fn ($v) => rtrim(strtr(base64_encode(is_string($v) ? $v : json_encode($v, JSON_UNESCAPED_SLASHES)), '+/', '-_'), '=');
        $head = $b64(['alg' => 'HS256', 'typ' => 'JWT']).'.'.$b64($payload);

        return $head.'.'.$b64(hash_hmac('sha256', $head, (string) config('services.livekit.secret'), true));
    }
}
