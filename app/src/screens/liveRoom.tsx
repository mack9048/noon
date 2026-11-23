// Noon Live: the live class inside the app (LiveKit). Web for now; phones open it in the browser.
// Teachers: screen share, whiteboard, mute/remove, end. Everyone: devices, background, reactions, raise hand.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Modal, Platform, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { LocalVideoTrack, Participant, RemoteParticipant, Room, Track } from 'livekit-client';
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
const PANEL = '#18263B';
const hostOf = (p?: Participant | null) => { try { return !!p && !!JSON.parse(p.metadata || '{}').host; } catch { return false; } };

/* ---------- messages between people in the room (LiveKit data channel) ---------- */
type Stroke = { id: string; c: string; w: number; pts: number[] };
type Msg =
  | { t: 'wb-open' } | { t: 'wb-close' } | { t: 'wb-clear' } | { t: 'wb-undo'; id: string }
  | { t: 'wb-seg'; id: string; c: string; w: number; pts: number[] } | { t: 'wb-full'; id: string; c: string; w: number; pts: number[] }
  | { t: 'wb-hello' } | { t: 'rx'; e: string } | { t: 'hand'; up: boolean } | { t: 'lower'; id: string };
const enc = (m: Msg) => new TextEncoder().encode(JSON.stringify(m));

/** One person: their camera (or screen), or their initial when the camera is off. */
function Tile({ lk, p, big, host, hand, screen, onMute, onRemove, onLower }: {
  lk: Lk; p: Participant; big?: boolean; host: boolean; hand?: boolean; screen?: boolean; onMute: () => void; onRemove: () => void; onLower?: () => void;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const pub = p.getTrackPublication(screen ? lk.Track.Source.ScreenShare : lk.Track.Source.Camera);
  const cam = pub?.track;
  const camOn = !!cam && !pub?.isMuted;
  const micOn = !!p.getTrackPublication(lk.Track.Source.Microphone) && !p.getTrackPublication(lk.Track.Source.Microphone)?.isMuted;
  const isTeacher = hostOf(p);
  useEffect(() => {
    const el = ref.current;
    if (!cam || !el) return;
    cam.attach(el);
    return () => { cam.detach(el); };
  }, [cam]);
  const name = p.name || p.identity;
  const small = { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' } as const;
  return (
    <View style={{ width: big ? '100%' : 220, aspectRatio: 16 / 10, borderRadius: 18, overflow: 'hidden', backgroundColor: screen ? '#000' : '#1D2B42', borderWidth: 3, borderColor: hand ? '#FFD84D' : p.isSpeaking && !screen ? '#4ED68A' : 'transparent' }}>
      {cam ? React.createElement('video', { ref, autoPlay: true, playsInline: true, muted: p.isLocal, style: { width: '100%', height: '100%', objectFit: screen ? 'contain' : 'cover', display: camOn ? 'block' : 'none', transform: p.isLocal && !screen ? 'scaleX(-1)' : undefined } }) : null}
      {!camOn ? (
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: big ? 96 : 64, height: big ? 96 : 64, borderRadius: 48, backgroundColor: isTeacher ? colors.teal : '#5B43E0', alignItems: 'center', justifyContent: 'center' }}>
            <T style={{ color: '#FFF', fontFamily: fonts.semibold, fontSize: big ? 38 : 26 }}>{name.slice(0, 1).toUpperCase()}</T>
          </View>
        </View>
      ) : null}
      {hand ? <View style={{ position: 'absolute', top: 8, right: 8, backgroundColor: '#FFD84D', borderRadius: 14, paddingHorizontal: 8, height: 28, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <T style={{ fontSize: 15 }}>✋</T>
        {host && !p.isLocal && onLower ? <Pressable accessibilityLabel={`Lower ${name}'s hand`} onPress={onLower}><T style={{ color: '#2A1600', fontSize: 12, fontFamily: fonts.semibold }}>Lower</T></Pressable> : null}
      </View> : null}
      <View style={{ position: 'absolute', left: 8, bottom: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10, paddingHorizontal: 8, height: 26 }}>
          <Ionicons name={screen ? 'desktop-outline' : micOn ? 'mic' : 'mic-off'} size={13} color={screen || micOn ? '#FFF' : '#FF8A8A'} />
          <T numberOfLines={1} style={{ color: '#FFF', fontSize: 12, fontFamily: fonts.semibold, flexShrink: 1 }}>{p.isLocal ? `${name} (you)` : name}{screen ? ' · screen' : isTeacher ? ' · Teacher' : ''}</T>
        </View>
        <View style={{ flex: 1 }} />
        {host && !p.isLocal && !isTeacher && !screen ? (
          <>
            {micOn ? <Pressable accessibilityLabel={`Mute ${name}`} onPress={onMute} style={[small, { backgroundColor: 'rgba(0,0,0,0.6)' }]}><Ionicons name="mic-off" size={15} color="#FFF" /></Pressable> : null}
            <Pressable accessibilityLabel={`Remove ${name}`} onPress={onRemove} style={[small, { backgroundColor: 'rgba(194,48,79,0.85)' }]}><Ionicons name="exit-outline" size={15} color="#FFF" /></Pressable>
          </>
        ) : null}
      </View>
    </View>
  );
}

function RoundBtn({ icon, label, on = true, danger, active, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; on?: boolean; danger?: boolean; active?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ alignItems: 'center', gap: 4, width: 62 }}>
      <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: danger ? '#D6336C' : active ? '#4ED68A' : on ? '#FFFFFF' : '#3A4A63', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={22} color={danger ? '#FFF' : active ? '#0B2A1A' : on ? BG : '#FFF'} />
      </View>
      <T numberOfLines={1} style={{ color: '#C9D4E5', fontSize: 11 }}>{label}</T>
    </Pressable>
  );
}

/* ---------- whiteboard ---------- */
function BoardBtn({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={{ height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: '#24405F', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Ionicons name={icon} size={16} color="#FFF" /><T style={{ color: '#FFF', fontFamily: fonts.semibold, fontSize: 13 }}>{label}</T>
    </Pressable>
  );
}
const PENS = ['#111827', '#DC2626', '#2563EB', '#16A34A', '#F59E0B', '#9333EA'];
function Whiteboard({ strokes, canDraw, onStroke, onEnd, tick }: { strokes: Stroke[]; canDraw: boolean; onStroke: (s: Stroke, newPts: number[], first: boolean) => void; onEnd: (s: Stroke) => void; tick: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const [pen, setPen] = useState(PENS[0]);
  const [size, setSize] = useState(0.004);
  const [eraser, setEraser] = useState(false);
  const cur = useRef<{ s: Stroke; sent: number; last: number } | null>(null);
  const draw = () => {
    const c = ref.current; if (!c) return;
    const r = c.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1;
    if (c.width !== Math.round(r.width * dpr)) { c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr); }
    const g = c.getContext('2d'); if (!g) return;
    g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, c.width, c.height);
    g.lineCap = 'round'; g.lineJoin = 'round';
    const all = cur.current ? [...strokes.filter((s) => s.id !== cur.current!.s.id), cur.current.s] : strokes;
    for (const s of all) {
      if (s.pts.length < 2) continue;
      g.strokeStyle = s.c; g.lineWidth = Math.max(1, s.w * c.width);
      g.beginPath(); g.moveTo(s.pts[0] * c.width, s.pts[1] * c.height);
      for (let i = 2; i < s.pts.length; i += 2) g.lineTo(s.pts[i] * c.width, s.pts[i + 1] * c.height);
      if (s.pts.length === 2) g.lineTo(s.pts[0] * c.width + 0.1, s.pts[1] * c.height);
      g.stroke();
    }
  };
  useEffect(draw, [strokes, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const f = () => draw(); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }); // eslint-disable-line react-hooks/exhaustive-deps
  const at = (e: any) => { const r = ref.current!.getBoundingClientRect(); return [Math.round(((e.clientX - r.left) / r.width) * 1000) / 1000, Math.round(((e.clientY - r.top) / r.height) * 1000) / 1000]; };
  const flush = (force: boolean) => {
    const k = cur.current; if (!k) return;
    if (!force && Date.now() - k.last < 60) return;
    if (k.sent < k.s.pts.length) { onStroke(k.s, k.s.pts.slice(Math.max(0, k.sent - 2)), k.sent === 0); k.sent = k.s.pts.length; }
    k.last = Date.now();
  };
  const handlers = canDraw ? {
    onPointerDown: (e: any) => { e.preventDefault(); e.target.setPointerCapture?.(e.pointerId); cur.current = { s: { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, c: eraser ? '#FFFFFF' : pen, w: eraser ? 0.03 : size, pts: at(e) }, sent: 0, last: 0 }; flush(true); draw(); },
    onPointerMove: (e: any) => { if (!cur.current) return; cur.current.s.pts.push(...at(e)); flush(false); draw(); },
    onPointerUp: () => { if (!cur.current) return; flush(true); onEnd(cur.current.s); cur.current = null; },
  } : {};
  return (
    <View style={{ width: '100%', gap: 8 }}>
      {React.createElement('canvas', { ref, ...handlers, onPointerLeave: handlers.onPointerUp, style: { width: '100%', aspectRatio: '16 / 10', borderRadius: 18, background: '#FFF', touchAction: 'none', cursor: canDraw ? 'crosshair' : 'default', display: 'block' } })}
      {canDraw ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
          {PENS.map((c) => (
            <Pressable key={c} accessibilityRole="button" accessibilityLabel={`Pen colour ${c}`} onPress={() => { setPen(c); setEraser(false); }}
              style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c, borderWidth: 3, borderColor: !eraser && pen === c ? '#FFF' : 'transparent' }} />
          ))}
          {[[0.003, 'Thin'], [0.007, 'Thick']].map(([w, l]) => (
            <Pressable key={l} onPress={() => { setSize(w as number); setEraser(false); }} style={{ height: 30, paddingHorizontal: 10, borderRadius: 15, backgroundColor: !eraser && size === w ? '#FFF' : '#3A4A63', justifyContent: 'center' }}>
              <T style={{ fontSize: 12, color: !eraser && size === w ? BG : '#FFF' }}>{l}</T>
            </Pressable>
          ))}
          <Pressable onPress={() => setEraser(!eraser)} style={{ height: 30, paddingHorizontal: 10, borderRadius: 15, backgroundColor: eraser ? '#FFF' : '#3A4A63', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="remove-circle-outline" size={14} color={eraser ? BG : '#FFF'} /><T style={{ fontSize: 12, color: eraser ? BG : '#FFF' }}>Eraser</T>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

/* ---------- virtual backgrounds, drawn on the device (no files to download) ---------- */
function makeBackground(kind: 'madrasa' | 'sky' | 'library'): string {
  const c = document.createElement('canvas'); c.width = 1280; c.height = 720;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 1280, 720);
  const cols = { madrasa: ['#0F766E', '#134E4A'], sky: ['#7DD3FC', '#C4B5FD'], library: ['#F5E6CC', '#D6B98C'] }[kind];
  grad.addColorStop(0, cols[0]); grad.addColorStop(1, cols[1]); g.fillStyle = grad; g.fillRect(0, 0, 1280, 720);
  if (kind === 'madrasa') { // arches
    g.fillStyle = 'rgba(255,255,255,0.08)';
    for (let x = 40; x < 1280; x += 240) { g.beginPath(); g.moveTo(x, 720); g.lineTo(x, 300); g.arc(x + 90, 300, 90, Math.PI, 0); g.lineTo(x + 180, 720); g.fill(); }
  } else if (kind === 'sky') { // clouds
    g.fillStyle = 'rgba(255,255,255,0.7)';
    for (const [x, y, r] of [[200, 160, 60], [270, 150, 75], [340, 170, 55], [900, 260, 70], [980, 240, 85], [1060, 265, 60]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  } else { // shelves
    for (let y = 120; y < 720; y += 170) {
      g.fillStyle = '#8B5E34'; g.fillRect(0, y + 110, 1280, 14);
      for (let x = 20; x < 1280; x += 34) { g.fillStyle = ['#B45309', '#0F766E', '#7C3AED', '#DC2626', '#2563EB'][(x + y) % 5]; g.fillRect(x, y + 20 + ((x * 7) % 30), 26, 90 - ((x * 7) % 30)); }
    }
  }
  return c.toDataURL('image/jpeg', 0.85);
}
type Bg = 'none' | 'blur' | 'madrasa' | 'sky' | 'library';

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
        <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 460, maxHeight: '90%', backgroundColor: PANEL, borderRadius: 22, padding: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <T style={{ color: '#FFF', fontFamily: fonts.semibold, fontSize: 18, flex: 1 }}>{title}</T>
            <Pressable accessibilityLabel="Close" onPress={onClose}><Ionicons name="close" size={24} color="#FFF" /></Pressable>
          </View>
          <ScrollView>{children}</ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function DeviceList({ room, lk, kind, label }: { room: Room; lk: Lk; kind: MediaDeviceKind; label: string }) {
  const [list, setList] = useState<MediaDeviceInfo[]>([]);
  const [active, setActive] = useState<string | undefined>(room.getActiveDevice(kind));
  useEffect(() => { lk.Room.getLocalDevices(kind, false).then(setList).catch(() => setList([])); }, [kind]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!list.length) return null;
  return (
    <View style={{ marginBottom: 14 }}>
      <T style={{ color: '#9FB0C8', fontSize: 12, fontFamily: fonts.semibold, marginBottom: 6 }}>{label.toUpperCase()}</T>
      {list.map((d, i) => {
        const on = (active ?? 'default') === d.deviceId || (!active && i === 0);
        return (
          <Pressable key={d.deviceId || i} onPress={() => room.switchActiveDevice(kind, d.deviceId).then(() => setActive(d.deviceId)).catch(() => {})}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 12, backgroundColor: on ? '#24405F' : 'transparent' }}>
            <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={18} color={on ? '#4ED68A' : '#9FB0C8'} />
            <T numberOfLines={1} style={{ color: '#FFF', flex: 1 }}>{d.label || `${label} ${i + 1}`}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

const REACTIONS = ['👍', '❤️', '👏', '😂', '🎉', '🤲'];

export function LiveRoomScreen({ kind = 'course' }: { kind?: 'course' | 'meeting' | 'session' }) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [pass, setPass] = useState<LivePass | null>(handoff && String(handoff.course.id) === String(id) ? handoff : null);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [lk, setLk] = useState<Lk | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [tick, setTick] = useState(0);
  const [needAudio, setNeedAudio] = useState(false);
  const [ended, setEnded] = useState<string | null>(null);
  const [sheet, setSheet] = useState<'none' | 'settings' | 'react'>('none');
  const [bg, setBg] = useState<Bg>('none');
  const [hands, setHands] = useState<Set<string>>(new Set());
  const [bubbles, setBubbles] = useState<{ k: number; e: string; who: string }[]>([]);
  const board = useRef<{ open: boolean; strokes: Stroke[] }>({ open: false, strokes: [] });
  const processor = useRef<any>(null);
  const audioEls = useRef(new Map<string, HTMLMediaElement>());
  const win = useWindowDimensions();
  const bump = () => setTick((n) => n + 1);
  // The main stage fits above the row of people and the buttons.
  const stageW = Math.max(280, Math.min(1000, win.width - 32, (win.height - (Platform.OS === 'web' ? 360 : 320)) * 1.6));
  const leave = () => { room?.disconnect(); router.canGoBack() ? router.back() : router.replace('/' as any); };
  const send = (r: Room | null, m: Msg, to?: string[]) => { r?.localParticipant.publishData(enc(m), { reliable: true, topic: 'noon', destinationIdentities: to }).catch(() => {}); };
  const flash = (s: string) => { setNote(s); setTimeout(() => setNote(null), 3500); };

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
      const E = mod.RoomEvent;
      [E.ParticipantDisconnected, E.TrackPublished, E.TrackUnpublished, E.TrackMuted, E.TrackUnmuted,
        E.LocalTrackPublished, E.LocalTrackUnpublished, E.ActiveSpeakersChanged, E.ParticipantMetadataChanged, E.ConnectionStateChanged].forEach((ev) => r!.on(ev as any, bump));
      // A teacher catches a newcomer up on the whiteboard (the newcomer asks once it has joined).
      const catchUp = (identity: string) => {
        if (!pass.host || !board.current.open) return;
        send(r, { t: 'wb-open' }, [identity]);
        for (const s of board.current.strokes) for (let i = 0; i < s.pts.length; i += 400) send(r, { t: i ? 'wb-seg' : 'wb-full', id: s.id, c: s.c, w: s.w, pts: s.pts.slice(i, i + 400) }, [identity]);
      };
      r.on(E.ParticipantConnected, bump);
      r.on(E.ParticipantDisconnected, (p: RemoteParticipant) => setHands((h) => { const n = new Set(h); n.delete(p.identity); return n; }));
      r.on(E.DataReceived, (payload: Uint8Array, p?: RemoteParticipant) => {
        let m: any; try { m = JSON.parse(new TextDecoder().decode(payload)); } catch { return; }
        if (!m || typeof m.t !== "string") return;
        const b = board.current;
        if (m.t === 'wb-hello') { if (p) catchUp(p.identity); return; }
        if (m.t.startsWith('wb-') && !hostOf(p)) return; // only teachers write on the board
        if (m.t === 'wb-open') b.open = true;
        else if (m.t === 'wb-close') b.open = false;
        else if (m.t === 'wb-clear') b.strokes = [];
        else if (m.t === 'wb-undo') b.strokes = b.strokes.filter((s) => s.id !== m.id);
        else if (m.t === 'wb-full') { b.open = true; b.strokes = [...b.strokes.filter((s) => s.id !== m.id), { id: m.id, c: m.c, w: m.w, pts: m.pts }]; }
        else if (m.t === 'wb-seg') {
          const s = b.strokes.find((x) => x.id === m.id);
          if (s) s.pts.push(...m.pts); else b.strokes = [...b.strokes, { id: m.id, c: m.c, w: m.w, pts: [...m.pts] }];
          b.strokes = [...b.strokes];
        } else if (m.t === 'rx' && REACTIONS.includes(m.e)) {
          const k = Date.now() + Math.random();
          setBubbles((x) => [...x.slice(-5), { k, e: m.e, who: p?.name || p?.identity || '' }]);
          setTimeout(() => setBubbles((x) => x.filter((y) => y.k !== k)), 3500);
        } else if (m.t === 'hand' && p) setHands((h) => { const n = new Set(h); if (m.up) n.add(p.identity); else n.delete(p.identity); return n; });
        else if (m.t === 'lower' && hostOf(p)) {
          setHands((h) => { const n = new Set(h); n.delete(m.id); return n; });
        }
        bump();
      });
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
        // Ask the teacher for the whiteboard, in case it is already open.
        if (!pass.host) setTimeout(() => send(r, { t: 'wb-hello' }), 1200);
        if (pass.host) { await r.localParticipant.setMicrophoneEnabled(true).catch(() => {}); await r.localParticipant.setCameraEnabled(true).catch(() => {}); }
        setNeedAudio(!r.canPlaybackAudio);
        bump();
      } catch (e: any) {
        const m = String(e?.message ?? e ?? '');
        // eslint-disable-next-line no-console
        console.warn('Noon Live connect failed:', m);
        setErr(/401|invalid token|unauthori|signature/i.test(m) ? 'Noon Live is not set up correctly (the LiveKit key or secret on the server is wrong). Please tell the office.'
          : /404|not found|getaddrinfo|ENOTFOUND|failed to fetch|could not establish/i.test(m) ? `Could not reach Noon Live. Check your internet; if it keeps happening, the LiveKit address on the server may be wrong. (${m.slice(0, 120)})`
          : `Could not connect to the class. Check your internet and try again. (${m.slice(0, 120)})`);
      }
    })();
    return () => { gone = true; r?.disconnect(); audioEls.current.forEach((el) => el.remove()); audioEls.current.clear(); };
  }, [pass]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const teacher = people.find((p) => hostOf(p) && !p.isLocal) ?? (pass.host ? me : null);
  const sharer = people.find((p) => p.getTrackPublication(lk.Track.Source.ScreenShare)?.track);
  const boardOpen = board.current.open;
  // On stage: the whiteboard, else a shared screen, else the teacher. Everyone else goes in the row below.
  const stagePerson = boardOpen || sharer ? null : teacher;
  const others = people.filter((p) => p !== stagePerson);
  const micOn = me.isMicrophoneEnabled; const camOn = me.isCameraEnabled; const sharing = me.isScreenShareEnabled;
  const myHand = hands.has(me.identity);
  const moderate = async (action: 'mute' | 'remove' | 'end', identity?: string, name?: string) => {
    if (action === 'remove' && !(await confirmBox(`Remove ${name} from this class?`))) return;
    if (action === 'end' && !(await confirmBox(`End the ${kind === 'meeting' ? 'meeting' : 'class'} for everyone?`))) return;
    try { await api.post(kind === 'meeting' ? `/meetings/${id}/moderate` : kind === 'session' ? `/live-sessions/${id}/moderate` : `/courses/${pass.course.id}/live/moderate`, { action, identity }); } catch (e) { setErr(e instanceof ApiError ? e.friendly : 'Could not do that.'); }
  };

  const toggleShare = async () => {
    try { await me.setScreenShareEnabled(!sharing, { audio: true, selfBrowserSurface: 'exclude' } as any); bump(); }
    catch { /* the person cancelled the browser's share window */ }
  };
  const toggleBoard = () => {
    board.current.open = !boardOpen;
    send(room, { t: boardOpen ? 'wb-close' : 'wb-open' });
    bump();
  };
  const react = (e: string) => {
    send(room, { t: 'rx', e });
    const k = Date.now() + Math.random();
    setBubbles((x) => [...x.slice(-5), { k, e, who: 'You' }]);
    setTimeout(() => setBubbles((x) => x.filter((y) => y.k !== k)), 3500);
    setSheet('none');
  };
  const toggleHand = () => {
    send(room, { t: 'hand', up: !myHand });
    setHands((h) => { const n = new Set(h); if (myHand) n.delete(me.identity); else n.add(me.identity); return n; });
  };
  const lowerHand = (identity: string) => {
    send(room, { t: 'lower', id: identity });
    setHands((h) => { const n = new Set(h); n.delete(identity); return n; });
  };
  // A teacher lowering my hand reaches me as a "lower" with my id: handled in DataReceived (removes from the set).

  const applyBg = async (b: Bg) => {
    const cam = me.getTrackPublication(lk.Track.Source.Camera)?.track as LocalVideoTrack | undefined;
    if (!cam || !camOn) { flash('Turn on your camera first.'); return; }
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const tp = require('@livekit/track-processors');
      if (!tp.supportsBackgroundProcessors()) { flash('Backgrounds do not work in this browser. Try Chrome or Edge.'); return; }
      const opts = b === 'none' ? { mode: 'disabled' } : b === 'blur' ? { mode: 'background-blur', blurRadius: 12 } : { mode: 'virtual-background', imagePath: makeBackground(b) };
      // The AI model that finds the person is served from our own site (copied in at build time).
      const assetPaths = { tasksVisionFileSet: `${window.location.origin}/mediapipe`, modelAssetPath: `${window.location.origin}/mediapipe/selfie_segmenter.tflite` };
      const slow = new Promise((_, no) => setTimeout(() => no(new Error('timeout')), 20000));
      flash('Changing the background…');
      if (!processor.current || cam.getProcessor() !== processor.current) {
        if (b === 'none') { setBg('none'); return; }
        processor.current = tp.BackgroundProcessor({ ...opts, assetPaths });
        await Promise.race([cam.setProcessor(processor.current), slow]);
      } else await Promise.race([processor.current.switchTo(opts), slow]);
      setNote(null);
      setBg(b);
    } catch { flash('Could not change the background on this device.'); }
  };

  const hostHands = pass.host ? people.filter((p) => hands.has(p.identity) && !p.isLocal) : [];

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, height: 56 }}>
        <View style={{ backgroundColor: '#D6336C', borderRadius: 8, paddingHorizontal: 8, height: 24, justifyContent: 'center' }}><T style={{ color: '#FFF', fontSize: 12, fontFamily: fonts.semibold }}>● LIVE</T></View>
        <T numberOfLines={1} style={{ color: '#FFF', fontFamily: fonts.semibold, fontSize: 17, flex: 1 }}>{pass.course.title}</T>
        {hostHands.length ? <View style={{ backgroundColor: '#FFD84D', borderRadius: 12, paddingHorizontal: 10, height: 26, justifyContent: 'center' }}><T numberOfLines={1} style={{ color: '#2A1600', fontSize: 12, fontFamily: fonts.semibold }}>✋ {hostHands.map((p) => p.name || p.identity).join(', ')}</T></View> : null}
        <Ionicons name="people" size={16} color="#C9D4E5" /><T style={{ color: '#C9D4E5' }}>{people.length}</T>
      </View>
      {needAudio ? (
        <Pressable onPress={() => room.startAudio().then(() => setNeedAudio(false))} style={{ marginHorizontal: 16, marginBottom: 8, backgroundColor: '#FFD84D', borderRadius: 14, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="volume-high" size={18} color="#2A1600" /><T style={{ color: '#2A1600', fontFamily: fonts.semibold }}>Tap here to hear the class</T>
        </Pressable>
      ) : null}
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, alignItems: 'center' }}>
        <View style={{ width: stageW }}>
          {boardOpen ? (
            <Whiteboard strokes={board.current.strokes} canDraw={pass.host} tick={tick}
              onStroke={(s, pts, first) => {
                if (first) board.current.strokes = [...board.current.strokes.filter((x) => x.id !== s.id), { ...s, pts: [...s.pts] }];
                else { const x = board.current.strokes.find((y) => y.id === s.id); if (x) x.pts = [...s.pts]; }
                send(room, first ? { t: 'wb-full', id: s.id, c: s.c, w: s.w, pts: s.pts } : { t: 'wb-seg', id: s.id, c: s.c, w: s.w, pts: pts.slice(2) });
              }}
              onEnd={(s) => { const x = board.current.strokes.find((y) => y.id === s.id); if (x) x.pts = [...s.pts]; bump(); }} />
          ) : sharer ? <Tile lk={lk} p={sharer} big screen host={pass.host} onMute={() => {}} onRemove={() => {}} />
            : stagePerson ? <Tile lk={lk} p={stagePerson} big host={pass.host} hand={hands.has(stagePerson.identity)} onMute={() => {}} onRemove={() => {}} />
            : <View style={{ width: '100%', aspectRatio: 16 / 10, borderRadius: 18, backgroundColor: '#1D2B42', alignItems: 'center', justifyContent: 'center', gap: 10 }}><NooniAvatar size={80} mood="wave" /><T style={{ color: '#FFF' }}>Waiting for the teacher…</T></View>}
          {boardOpen && pass.host ? (
            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 8 }}>
              <BoardBtn icon="arrow-undo-outline" label="Undo" onPress={() => { const last = board.current.strokes[board.current.strokes.length - 1]; if (last) { board.current.strokes = board.current.strokes.slice(0, -1); send(room, { t: 'wb-undo', id: last.id }); bump(); } }} />
              <BoardBtn icon="trash-outline" label="Clear" onPress={() => { board.current.strokes = []; send(room, { t: 'wb-clear' }); bump(); }} />
              <BoardBtn icon="close" label="Close board" onPress={toggleBoard} />
            </View>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', maxWidth: 1000 }}>
          {others.map((p) => <Tile key={p.identity} lk={lk} p={p} host={pass.host} hand={hands.has(p.identity)} onLower={() => lowerHand(p.identity)}
            onMute={() => moderate('mute', p.identity)} onRemove={() => moderate('remove', p.identity, p.name || p.identity)} />)}
        </View>
      </ScrollView>

      {/* Reactions float up from the bottom-left for a few seconds. */}
      <View pointerEvents="none" style={{ position: 'absolute', left: 16, bottom: 110, gap: 6 }}>
        {bubbles.map((b) => (
          <View key={b.k} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 18, paddingHorizontal: 10, height: 36 }}>
            <T style={{ fontSize: 22 }}>{b.e}</T><T style={{ color: '#FFF', fontSize: 12 }}>{b.who}</T>
          </View>
        ))}
      </View>
      {note ? <View style={{ position: 'absolute', alignSelf: 'center', bottom: 110, backgroundColor: '#FFD84D', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8 }}><T style={{ color: '#2A1600', fontFamily: fonts.semibold }}>{note}</T></View> : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start', gap: 6, paddingVertical: 12, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: '#22324C' }}>
        <RoundBtn icon={micOn ? 'mic' : 'mic-off'} label={micOn ? 'Mic on' : 'Mic off'} on={micOn} onPress={() => me.setMicrophoneEnabled(!micOn).then(bump).catch(() => flash('Please allow the microphone in your browser.'))} />
        <RoundBtn icon={camOn ? 'videocam' : 'videocam-off'} label={camOn ? 'Camera on' : 'Camera off'} on={camOn} onPress={() => me.setCameraEnabled(!camOn).then(() => { bump(); if (!camOn && bg !== 'none') setTimeout(() => applyBg(bg), 300); }).catch(() => flash('Please allow the camera in your browser.'))} />
        {pass.host ? <RoundBtn icon="desktop-outline" label={sharing ? 'Stop share' : 'Share'} on={false} active={sharing} onPress={toggleShare} /> : null}
        {pass.host ? <RoundBtn icon="easel-outline" label="Board" on={false} active={boardOpen} onPress={toggleBoard} /> : null}
        <RoundBtn icon="happy-outline" label="React" on={false} onPress={() => setSheet('react')} />
        <RoundBtn icon="hand-left-outline" label={myHand ? 'Lower' : 'Raise hand'} on={false} active={myHand} onPress={toggleHand} />
        <RoundBtn icon="settings-outline" label="Settings" on={false} onPress={() => setSheet('settings')} />
        {pass.host ? <RoundBtn icon="stop-circle" label={kind === 'meeting' ? 'End' : 'End class'} danger onPress={() => moderate('end')} /> : null}
        <RoundBtn icon="exit-outline" label="Leave" danger={!pass.host} on={false} onPress={leave} />
      </View>

      {sheet === 'react' ? (
        <Sheet title="Send a reaction" onClose={() => setSheet('none')}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
            {REACTIONS.map((e) => (
              <Pressable key={e} accessibilityRole="button" accessibilityLabel={`React ${e}`} onPress={() => react(e)} style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: '#24405F', alignItems: 'center', justifyContent: 'center' }}>
                <T style={{ fontSize: 30 }}>{e}</T>
              </Pressable>
            ))}
          </View>
        </Sheet>
      ) : null}
      {sheet === 'settings' ? (
        <Sheet title="Audio, video and background" onClose={() => setSheet('none')}>
          <DeviceList room={room} lk={lk} kind="audioinput" label="Microphone" />
          <DeviceList room={room} lk={lk} kind="videoinput" label="Camera" />
          <DeviceList room={room} lk={lk} kind="audiooutput" label="Speaker" />
          <T style={{ color: '#9FB0C8', fontSize: 12, fontFamily: fonts.semibold, marginBottom: 6 }}>BACKGROUND</T>
          {!camOn ? <T style={{ color: '#FFD84D', fontSize: 12, marginBottom: 6 }}>Turn on your camera to change the background.</T> : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {([['none', 'None', 'close-circle-outline'], ['blur', 'Blur', 'water-outline'], ['madrasa', 'Madrasa', 'business-outline'], ['sky', 'Sky', 'cloud-outline'], ['library', 'Library', 'library-outline']] as const).map(([k, l, ic]) => (
              <Pressable key={k} onPress={() => applyBg(k)} style={{ width: 80, height: 70, borderRadius: 14, backgroundColor: bg === k ? '#24405F' : '#0F1B2D', borderWidth: 2, borderColor: bg === k ? '#4ED68A' : '#2A3B55', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <Ionicons name={ic} size={22} color="#FFF" /><T style={{ color: '#FFF', fontSize: 12 }}>{l}</T>
              </Pressable>
            ))}
          </View>
        </Sheet>
      ) : null}
    </View>
  );
}
