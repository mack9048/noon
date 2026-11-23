// Noon Live: the live class inside the app (LiveKit). Web for now; phones open it in the browser.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { Participant, RemoteParticipant, Room, Track } from 'livekit-client';
import { Button, T } from '@/components/ui';
import { NooniAvatar } from '@/components/Nooni';
import { api, ApiError } from '@/lib/api';
import { confirmBox } from '@/lib/dialog';
import { colors, fonts } from '@/theme/tokens';

export type LivePass = { provider: 'livekit'; url: string; token: string; room: string; host: boolean; course: { id: number; title: string } };

// The pass from "Join live class", so the room does not ask again.
let handoff: LivePass | null = null;
export const setLivePass = (p: LivePass) => { handoff = p; };

type Lk = typeof import('livekit-client');
const BG = '#0F1B2D';

/** One person: their camera, or their initial when the camera is off. */
function Tile({ lk, p, big, host, onMute, onRemove }: { lk: Lk; p: Participant; big?: boolean; host: boolean; onMute: () => void; onRemove: () => void }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const cam = p.getTrackPublication(lk.Track.Source.ScreenShare)?.track ?? p.getTrackPublication(lk.Track.Source.Camera)?.track;
  const camOn = !!cam && !p.getTrackPublication(lk.Track.Source.Camera)?.isMuted;
  const micOn = !!p.getTrackPublication(lk.Track.Source.Microphone) && !p.getTrackPublication(lk.Track.Source.Microphone)?.isMuted;
  const meta = useMemo(() => { try { return JSON.parse(p.metadata || '{}'); } catch { return {}; } }, [p.metadata]);
  useEffect(() => {
    const el = ref.current;
    if (!cam || !el) return;
    cam.attach(el);
    return () => { cam.detach(el); };
  }, [cam]);
  const name = p.name || p.identity;
  return (
    <View style={{ width: big ? '100%' : 220, aspectRatio: 16 / 10, borderRadius: 18, overflow: 'hidden', backgroundColor: '#1D2B42', borderWidth: 3, borderColor: p.isSpeaking ? '#4ED68A' : 'transparent' }}>
      {cam ? React.createElement('video', { ref, autoPlay: true, playsInline: true, muted: p.isLocal, style: { width: '100%', height: '100%', objectFit: 'cover', display: camOn ? 'block' : 'none', transform: p.isLocal ? 'scaleX(-1)' : undefined } }) : null}
      {!camOn ? (
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: big ? 96 : 64, height: big ? 96 : 64, borderRadius: 48, backgroundColor: meta.host ? colors.teal : '#5B43E0', alignItems: 'center', justifyContent: 'center' }}>
            <T style={{ color: '#FFF', fontFamily: fonts.semibold, fontSize: big ? 38 : 26 }}>{name.slice(0, 1).toUpperCase()}</T>
          </View>
        </View>
      ) : null}
      <View style={{ position: 'absolute', left: 8, bottom: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10, paddingHorizontal: 8, height: 26 }}>
          <Ionicons name={micOn ? 'mic' : 'mic-off'} size={13} color={micOn ? '#FFF' : '#FF8A8A'} />
          <T numberOfLines={1} style={{ color: '#FFF', fontSize: 12, fontFamily: fonts.semibold, flexShrink: 1 }}>{p.isLocal ? `${name} (you)` : name}{meta.host ? ' · Teacher' : ''}</T>
        </View>
        <View style={{ flex: 1 }} />
        {host && !p.isLocal && !meta.host ? (
          <>
            {micOn ? <Pressable accessibilityLabel={`Mute ${name}`} onPress={onMute} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="mic-off" size={15} color="#FFF" /></Pressable> : null}
            <Pressable accessibilityLabel={`Remove ${name}`} onPress={onRemove} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(194,48,79,0.85)', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="exit-outline" size={15} color="#FFF" /></Pressable>
          </>
        ) : null}
      </View>
    </View>
  );
}

function RoundBtn({ icon, label, on = true, danger, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; on?: boolean; danger?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ alignItems: 'center', gap: 4 }}>
      <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: danger ? '#D6336C' : on ? '#FFFFFF' : '#3A4A63', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={24} color={danger ? '#FFF' : on ? BG : '#FFF'} />
      </View>
      <T style={{ color: '#C9D4E5', fontSize: 11 }}>{label}</T>
    </Pressable>
  );
}

export function LiveRoomScreen({ kind = 'course' }: { kind?: 'course' | 'meeting' | 'session' }) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [pass, setPass] = useState<LivePass | null>(handoff && String(handoff.course.id) === String(id) ? handoff : null);
  const [err, setErr] = useState<string | null>(null);
  const [lk, setLk] = useState<Lk | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [, setTick] = useState(0);
  const [needAudio, setNeedAudio] = useState(false);
  const [ended, setEnded] = useState<string | null>(null);
  const audioEls = useRef(new Map<string, HTMLMediaElement>());
  const win = useWindowDimensions();
  // The teacher's video fits above the children's row and the buttons.
  const stageW = Math.max(280, Math.min(900, win.width - 32, (win.height - (Platform.OS === 'web' ? 330 : 300)) * 1.6));
  const leave = () => { room?.disconnect(); router.canGoBack() ? router.back() : router.replace('/' as any); };

  // 1. The pass (from the Join button, or ask the server again after a refresh).
  useEffect(() => {
    handoff = null;
    if (pass) return;
    api.post<LivePass | { provider: 'meet'; url: string }>(kind === 'meeting' ? `/meetings/${id}/join` : kind === 'session' ? `/live-sessions/${id}/join` : `/courses/${id}/live/join`)
      .then((r) => { if (r.provider === 'meet') { Linking.openURL(r.url); leave(); } else setPass(r); })
      .catch((e) => setErr(e instanceof ApiError ? e.friendly : 'Could not open the class.'));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // 2. Connect. Children start with mic and camera off; the teacher starts with both on.
  useEffect(() => {
    if (!pass || Platform.OS !== 'web') return;
    let r: Room | null = null; let gone = false;
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod: Lk = require('livekit-client');
      if (gone) return;
      setLk(mod);
      r = new mod.Room({ adaptiveStream: true, dynacast: true });
      const bump = () => setTick((n) => n + 1);
      const E = mod.RoomEvent;
      [E.ParticipantConnected, E.ParticipantDisconnected, E.TrackPublished, E.TrackUnpublished, E.TrackMuted, E.TrackUnmuted,
        E.LocalTrackPublished, E.LocalTrackUnpublished, E.ActiveSpeakersChanged, E.ParticipantMetadataChanged, E.ConnectionStateChanged].forEach((ev) => r!.on(ev as any, bump));
      r.on(E.TrackSubscribed, (track: Track, _pub, p: RemoteParticipant) => {
        if (track.kind === mod.Track.Kind.Audio) { const el = track.attach(); el.style.display = 'none'; document.body.appendChild(el); audioEls.current.set(`${p.identity}-${track.sid}`, el); }
        bump();
      });
      r.on(E.TrackUnsubscribed, (track: Track, _pub, p: RemoteParticipant) => {
        const k = `${p.identity}-${track.sid}`; const el = audioEls.current.get(k);
        if (el) { track.detach(el); el.remove(); audioEls.current.delete(k); }
        bump();
      });
      r.on(E.AudioPlaybackStatusChanged, () => setNeedAudio(!r!.canPlaybackAudio));
      r.on(E.Disconnected, (reason?: number) => {
        setEnded(reason === mod.DisconnectReason.PARTICIPANT_REMOVED ? 'The teacher removed you from this class.' : reason === mod.DisconnectReason.ROOM_DELETED ? (kind === 'meeting' ? 'The meeting has ended. JazakAllah khair!' : 'The class has ended. JazakAllah khair!') : 'You left the class.');
      });
      try {
        await r.connect(pass.url, pass.token);
        if (gone) { r.disconnect(); return; }
        setRoom(r);
        if (pass.host) { await r.localParticipant.setMicrophoneEnabled(true).catch(() => {}); await r.localParticipant.setCameraEnabled(true).catch(() => {}); }
        setNeedAudio(!r.canPlaybackAudio);
        bump();
      } catch { setErr('Could not connect to the class. Check your internet and try again.'); }
    })();
    return () => { gone = true; r?.disconnect(); audioEls.current.forEach((el) => el.remove()); audioEls.current.clear(); };
  }, [pass]);

  if (Platform.OS !== 'web') {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 }}>
        <NooniAvatar size={90} mood="smile" />
        <T style={{ color: '#FFF', fontFamily: fonts.semibold, fontSize: 18, textAlign: 'center' }}>Open the live class on noonlearn.com</T>
        <Button title="Open in browser" icon="open-outline" onPress={() => Linking.openURL(`https://www.noonlearn.com/live/${id}`)} />
      </View>
    );
  }
  if (err || ended) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 }}>
        <NooniAvatar size={90} mood={ended ? 'wave' : 'thinking'} />
        <T style={{ color: '#FFF', fontFamily: fonts.semibold, fontSize: 18, textAlign: 'center', maxWidth: 420 }}>{err ?? ended}</T>
        <Button title="Back" icon="arrow-back" onPress={leave} />
      </View>
    );
  }
  if (!room || !lk || !pass) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <NooniAvatar size={90} mood="listening" />
        <T style={{ color: '#FFF', fontFamily: fonts.semibold, fontSize: 17 }}>Joining the class…</T>
      </View>
    );
  }

  const me = room.localParticipant;
  const people: Participant[] = [me, ...Array.from(room.remoteParticipants.values())];
  const isHost = (p: Participant) => { try { return !!JSON.parse(p.metadata || '{}').host; } catch { return false; } };
  const teacher = people.find((p) => isHost(p) && !p.isLocal) ?? (pass.host ? me : null);
  const others = people.filter((p) => p !== teacher);
  const micOn = me.isMicrophoneEnabled; const camOn = me.isCameraEnabled;
  const moderate = async (action: 'mute' | 'remove' | 'end', identity?: string, name?: string) => {
    if (action === 'remove' && !(await confirmBox(`Remove ${name} from this class?`))) return;
    if (action === 'end' && !(await confirmBox(`End the ${kind === 'meeting' ? 'meeting' : 'class'} for everyone?`))) return;
    try { await api.post(kind === 'meeting' ? `/meetings/${id}/moderate` : kind === 'session' ? `/live-sessions/${id}/moderate` : `/courses/${pass.course.id}/live/moderate`, { action, identity }); } catch (e) { setErr(e instanceof ApiError ? e.friendly : 'Could not do that.'); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, height: 60 }}>
        <View style={{ backgroundColor: '#D6336C', borderRadius: 8, paddingHorizontal: 8, height: 24, justifyContent: 'center' }}><T style={{ color: '#FFF', fontSize: 12, fontFamily: fonts.semibold }}>● LIVE</T></View>
        <T numberOfLines={1} style={{ color: '#FFF', fontFamily: fonts.semibold, fontSize: 17, flex: 1 }}>{pass.course.title}</T>
        <Ionicons name="people" size={16} color="#C9D4E5" /><T style={{ color: '#C9D4E5' }}>{people.length}</T>
      </View>
      {needAudio ? (
        <Pressable onPress={() => room.startAudio().then(() => setNeedAudio(false))} style={{ marginHorizontal: 16, marginBottom: 8, backgroundColor: '#FFD84D', borderRadius: 14, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="volume-high" size={18} color="#2A1600" /><T style={{ color: '#2A1600', fontFamily: fonts.semibold }}>Tap here to hear the class</T>
        </Pressable>
      ) : null}
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, alignItems: 'center' }}>
        <View style={{ width: stageW }}>
          {teacher ? <Tile lk={lk} p={teacher} big host={pass.host} onMute={() => {}} onRemove={() => {}} />
            : <View style={{ width: '100%', aspectRatio: 16 / 10, borderRadius: 18, backgroundColor: '#1D2B42', alignItems: 'center', justifyContent: 'center', gap: 10 }}><NooniAvatar size={80} mood="wave" /><T style={{ color: '#FFF' }}>Waiting for the teacher…</T></View>}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', maxWidth: 900 }}>
          {others.map((p) => <Tile key={p.identity} lk={lk} p={p} host={pass.host} onMute={() => moderate('mute', p.identity)} onRemove={() => moderate('remove', p.identity, p.name || p.identity)} />)}
        </View>
      </ScrollView>
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: 22, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#22324C' }}>
        <RoundBtn icon={micOn ? 'mic' : 'mic-off'} label={micOn ? 'Mic on' : 'Mic off'} on={micOn} onPress={() => me.setMicrophoneEnabled(!micOn).then(() => setTick((n) => n + 1)).catch(() => setErr('Please allow the microphone in your browser.'))} />
        <RoundBtn icon={camOn ? 'videocam' : 'videocam-off'} label={camOn ? 'Camera on' : 'Camera off'} on={camOn} onPress={() => me.setCameraEnabled(!camOn).then(() => setTick((n) => n + 1)).catch(() => setErr('Please allow the camera in your browser.'))} />
        {pass.host ? <RoundBtn icon="stop-circle" label={kind === 'meeting' ? 'End meeting' : 'End class'} danger onPress={() => moderate('end')} /> : null}
        <RoundBtn icon="exit-outline" label="Leave" danger={!pass.host} on={false} onPress={leave} />
      </View>
    </View>
  );
}
