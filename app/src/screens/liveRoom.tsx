// Noon Live: the interactive live classroom (LiveKit). Web for now; phones open it in the browser.
// Teacher: Class Tools (textbook, worksheet, videos, activities from the course's lessons), whiteboard,
// screen share, drawing on top of anything, students list (mute / remove / lower hand), end class.
// Students see the same thing in real time: synced video, the same PDF page, and their own copy of
// the game or activity to play. Everyone: mic, camera, raise hand, reactions, own pen, devices,
// background, focus / gallery layout and full screen.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Modal, Platform, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { LocalVideoTrack, Participant, RemoteParticipant, Room, Track } from 'livekit-client';
import { Button, T } from '@/components/ui';
import { Logo } from '@/components/Logo';
import { NooniAvatar } from '@/components/Nooni';
import { api, API_BASE, ApiError, TOKEN_KEY } from '@/lib/api';
import { storage } from '@/lib/storage';
import { confirmBox } from '@/lib/dialog';
import type { CourseDetail, CourseItem } from '@/lib/types';
import { colors, fonts } from '@/theme/tokens';

export type LivePass = { provider: 'livekit'; url: string; token: string; room: string; host: boolean; course: { id: number; title: string } };

// The pass from "Join live class", so the room does not ask again.
let handoff: LivePass | null = null;
export const setLivePass = (p: LivePass) => { handoff = p; };

type Lk = typeof import('livekit-client');
const INK = '#1E1B4B';
const VIOLET = '#6D4CF0';
const PAGE = '#F4F2FF';
const CARD = '#FFFFFF';
const LINE = '#E7E3FA';
const PANEL = '#18263B'; // settings sheet (dark)
const hostOf = (p?: Participant | null) => { try { return !!p && !!JSON.parse(p.metadata || '{}').host; } catch { return false; } };
const el = (tag: string, props: any, ...kids: any[]) => React.createElement(tag, props, ...kids);
const youTubeId = (url: string) => url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/)?.[1] ?? null;

/* ---------- what is on the stage, shared by the teacher ---------- */
type StageItem = { id: number; kind: 'video' | 'pdf' | 'html' | 'image'; title: string; url: string | null; lesson?: string | null };
type Shared = { kind: 'none' } | { kind: 'board' } | { kind: 'item'; item: StageItem };
type Mode = 'pen' | 'hl' | 'erase';
type Stroke = { id: string; c: string; w: number; m: Mode; pts: number[] };
type Msg =
  | { t: 'show'; s: Shared; page?: number } | { t: 'page'; n: number } | { t: 'vid'; playing: boolean; pos: number }
  | { t: 'wb-clear' } | { t: 'wb-undo'; id: string }
  | { t: 'wb-seg'; id: string; c: string; w: number; m: Mode; pts: number[] } | { t: 'wb-full'; id: string; c: string; w: number; m: Mode; pts: number[] }
  | { t: 'hello' } | { t: 'rx'; e: string } | { t: 'hand'; up: boolean } | { t: 'lower'; id: string };
const enc = (m: Msg) => new TextEncoder().encode(JSON.stringify(m));
const REACTIONS = ['👍', '❤️', '👏', '😂', '🎉', '🤲'];
const PENS = ['#111827', '#2563EB', '#16A34A', '#F59E0B', '#DC2626', '#9333EA'];

/* ---------- one person: camera (or screen), or their initial ---------- */
function Tile({ lk, p, w, h, host, hand, screen, label, onMute, onRemove, onLower }: {
  lk: Lk; p: Participant; w: number | string; h?: number; host: boolean; hand?: boolean; screen?: boolean; label?: string; onMute?: () => void; onRemove?: () => void; onLower?: () => void;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const pub = p.getTrackPublication(screen ? lk.Track.Source.ScreenShare : lk.Track.Source.Camera);
  const cam = pub?.track;
  const camOn = !!cam && !pub?.isMuted;
  const micOn = !!p.getTrackPublication(lk.Track.Source.Microphone) && !p.getTrackPublication(lk.Track.Source.Microphone)?.isMuted;
  const isTeacher = hostOf(p);
  useEffect(() => {
    const v = ref.current;
    if (!cam || !v) return;
    cam.attach(v);
    return () => { cam.detach(v); };
  }, [cam]);
  const name = p.name || p.identity;
  const big = typeof w === 'string' || w > 260;
  const small = { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' } as const;
  return (
    <View style={{ width: w as any, height: h, aspectRatio: h ? undefined : 16 / 11, borderRadius: 18, overflow: 'hidden', backgroundColor: screen ? '#000' : '#D9D3F7', borderWidth: 3, borderColor: hand ? '#FFC93C' : p.isSpeaking && !screen ? '#22C55E' : isTeacher && !screen ? '#C9BEFF' : 'transparent' }}>
      {cam ? el('video', { ref, autoPlay: true, playsInline: true, muted: p.isLocal, style: { width: '100%', height: '100%', objectFit: screen ? 'contain' : 'cover', display: camOn ? 'block' : 'none', transform: p.isLocal && !screen ? 'scaleX(-1)' : undefined } }) : null}
      {!camOn ? (
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: big ? 84 : 48, height: big ? 84 : 48, borderRadius: 42, backgroundColor: isTeacher ? colors.teal : VIOLET, alignItems: 'center', justifyContent: 'center' }}>
            <T style={{ color: '#FFF', fontFamily: fonts.semibold, fontSize: big ? 34 : 20 }}>{name.slice(0, 1).toUpperCase()}</T>
          </View>
        </View>
      ) : null}
      {hand ? <View style={{ position: 'absolute', top: 6, right: 6, backgroundColor: '#FFC93C', borderRadius: 12, paddingHorizontal: 7, height: 24, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <T style={{ fontSize: 13 }}>✋</T>
        {host && !p.isLocal && onLower ? <Pressable accessibilityLabel={`Lower ${name}'s hand`} onPress={onLower}><T style={{ color: '#2A1600', fontSize: 11, fontFamily: fonts.semibold }}>Lower</T></Pressable> : null}
      </View> : null}
      <View style={{ position: 'absolute', left: 6, bottom: 6, right: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <View style={{ flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: isTeacher && !screen ? VIOLET : 'rgba(17,24,39,0.6)', borderRadius: 10, paddingHorizontal: 7, height: 24 }}>
          <Ionicons name={screen ? 'desktop-outline' : micOn ? 'mic' : 'mic-off'} size={12} color={screen || micOn ? '#FFF' : '#FCA5A5'} />
          <T numberOfLines={1} style={{ color: '#FFF', fontSize: 11.5, fontFamily: fonts.semibold, flexShrink: 1 }}>{label ?? (isTeacher && !p.isLocal ? 'Teacher' : p.isLocal ? `${name} (you)` : name)}{screen ? ' · screen' : ''}</T>
        </View>
        <View style={{ flex: 1 }} />
        {host && !p.isLocal && !isTeacher && !screen && onRemove ? (
          <>
            {micOn && onMute ? <Pressable accessibilityLabel={`Mute ${name}`} onPress={onMute} style={[small, { backgroundColor: 'rgba(17,24,39,0.6)' }]}><Ionicons name="mic-off" size={13} color="#FFF" /></Pressable> : null}
            <Pressable accessibilityLabel={`Remove ${name}`} onPress={onRemove} style={[small, { backgroundColor: 'rgba(194,48,79,0.85)' }]}><Ionicons name="exit-outline" size={13} color="#FFF" /></Pressable>
          </>
        ) : null}
      </View>
    </View>
  );
}

/* ---------- drawing layer (on top of the board, a video, a PDF or a game) ---------- */
function drawStrokes(c: HTMLCanvasElement, strokes: Stroke[], live?: Stroke | null) {
  const r = c.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1;
  if (c.width !== Math.round(r.width * dpr) || c.height !== Math.round(r.height * dpr)) { c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr); }
  const g = c.getContext('2d'); if (!g) return;
  g.clearRect(0, 0, c.width, c.height);
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (const s of live ? [...strokes.filter((x) => x.id !== live.id), live] : strokes) {
    if (s.pts.length < 2) continue;
    g.globalCompositeOperation = s.m === 'erase' ? 'destination-out' : 'source-over';
    g.globalAlpha = s.m === 'hl' ? 0.35 : 1;
    g.strokeStyle = s.m === 'erase' ? '#000' : s.c; g.lineWidth = Math.max(1, s.w * c.width);
    g.beginPath(); g.moveTo(s.pts[0] * c.width, s.pts[1] * c.height);
    for (let i = 2; i < s.pts.length; i += 2) g.lineTo(s.pts[i] * c.width, s.pts[i + 1] * c.height);
    if (s.pts.length === 2) g.lineTo(s.pts[0] * c.width + 0.1, s.pts[1] * c.height);
    g.stroke();
  }
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
}

function InkLayer({ strokes, tool, color, onStroke, onEnd, tick }: {
  strokes: Stroke[]; tool: Mode | null; color: string; tick: number;
  onStroke?: (s: Stroke, newPts: number[], first: boolean) => void; onEnd?: (s: Stroke) => void;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const cur = useRef<{ s: Stroke; sent: number; last: number } | null>(null);
  const redraw = () => { if (ref.current) drawStrokes(ref.current, strokes, cur.current?.s); };
  useEffect(redraw, [strokes, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const f = () => redraw(); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }); // eslint-disable-line react-hooks/exhaustive-deps
  const at = (e: any) => { const r = ref.current!.getBoundingClientRect(); return [Math.round(((e.clientX - r.left) / r.width) * 1000) / 1000, Math.round(((e.clientY - r.top) / r.height) * 1000) / 1000]; };
  const flush = (force: boolean) => {
    const k = cur.current; if (!k || !onStroke) return;
    if (!force && Date.now() - k.last < 60) return;
    if (k.sent < k.s.pts.length) { onStroke(k.s, k.s.pts.slice(k.sent), k.sent === 0); k.sent = k.s.pts.length; }
    k.last = Date.now();
  };
  const up = () => { if (!cur.current) return; flush(true); onEnd?.(cur.current.s); cur.current = null; };
  const handlers = tool ? {
    onPointerDown: (e: any) => {
      e.preventDefault(); e.target.setPointerCapture?.(e.pointerId);
      const w = tool === 'hl' ? 0.022 : tool === 'erase' ? 0.035 : 0.004;
      cur.current = { s: { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, c: color, w, m: tool, pts: at(e) }, sent: 0, last: 0 };
      flush(true); redraw();
    },
    onPointerMove: (e: any) => { if (!cur.current) return; cur.current.s.pts.push(...at(e)); flush(false); redraw(); },
    onPointerUp: up, onPointerLeave: up,
  } : {};
  return el('canvas', { ref, ...handlers, style: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', touchAction: tool ? 'none' : 'auto', pointerEvents: tool ? 'auto' : 'none', cursor: tool === 'erase' ? 'cell' : tool ? 'crosshair' : 'default' } });
}

/** The drawing toolbar: a pen button that opens into pen, highlighter, eraser, colours, undo / redo, clear. */
function DrawBar({ open, setOpen, tool, setTool, color, setColor, onUndo, onRedo, onClear, compact }: {
  open: boolean; setOpen: (v: boolean) => void; tool: Mode; setTool: (m: Mode) => void; color: string; setColor: (c: string) => void;
  onUndo: () => void; onRedo: () => void; onClear: () => void; compact?: boolean;
}) {
  if (!open) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel="Draw" onPress={() => setOpen(true)}
        style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: VIOLET, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFF', shadowColor: VIOLET, shadowOpacity: 0.35, shadowRadius: 10 }}>
        <Ionicons name="pencil" size={20} color="#FFF" />
      </Pressable>
    );
  }
  const btn = (icon: keyof typeof Ionicons.glyphMap, label: string, on: boolean, f: () => void) => (
    <Pressable key={label} accessibilityRole="button" accessibilityLabel={label} onPress={f}
      style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: on ? '#EDE9FE' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icon} size={19} color={on ? VIOLET : INK} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: compact ? 2 : 4, backgroundColor: CARD, borderRadius: 26, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: LINE, shadowColor: '#4C1D95', shadowOpacity: 0.12, shadowRadius: 14 }}>
      {btn('arrow-undo', 'Undo', false, onUndo)}{btn('arrow-redo', 'Redo', false, onRedo)}
      <View style={{ width: 1, height: 24, backgroundColor: LINE, marginHorizontal: 2 }} />
      {btn('pencil', 'Pen', tool === 'pen', () => setTool('pen'))}{btn('color-wand-outline', 'Highlighter', tool === 'hl', () => setTool('hl'))}{btn('backspace-outline', 'Eraser', tool === 'erase', () => setTool('erase'))}
      <View style={{ width: 1, height: 24, backgroundColor: LINE, marginHorizontal: 2 }} />
      {PENS.map((c) => (
        <Pressable key={c} accessibilityRole="button" accessibilityLabel={`Colour ${c}`} onPress={() => { setColor(c); if (tool === 'erase') setTool('pen'); }}
          style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: c, margin: 2, borderWidth: color === c ? 3 : 0, borderColor: '#DDD6FE' }} />
      ))}
      <View style={{ width: 1, height: 24, backgroundColor: LINE, marginHorizontal: 2 }} />
      {btn('trash-outline', 'Clear drawing', false, onClear)}{btn('close', 'Close drawing tools', false, () => setOpen(false))}
    </View>
  );
}

/* ---------- synced video (file or YouTube) ---------- */
type Vid = { playing: boolean; pos: number };
function SharedVideo({ item, host, vid, onVid }: { item: StageItem; host: boolean; vid: Vid | null; onVid: (v: Vid) => void }) {
  const url = item.url ?? '';
  const yt = youTubeId(url);
  const vref = useRef<HTMLVideoElement | null>(null);
  const fref = useRef<HTMLIFrameElement | null>(null);
  const ytState = useRef<{ time: number; playing: boolean }>({ time: 0, playing: false });
  // File video: the teacher's player reports play / pause / seek, and a heartbeat while playing.
  useEffect(() => {
    if (!host) return;
    const t = setInterval(() => {
      if (yt) { if (ytState.current.playing) onVid({ playing: true, pos: ytState.current.time }); return; }
      const v = vref.current; if (v && !v.paused) onVid({ playing: true, pos: v.currentTime });
    }, 4000);
    return () => clearInterval(t);
  }, [host, yt]); // eslint-disable-line react-hooks/exhaustive-deps
  // YouTube: listen to the player (the teacher) and send it commands (students).
  useEffect(() => {
    if (!yt) return;
    const onMsg = (e: MessageEvent) => {
      if (!/youtube/.test(e.origin)) return;
      let d: any; try { d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch { return; }
      const info = d?.info; if (!info) return;
      if (typeof info.currentTime === 'number') ytState.current.time = info.currentTime;
      if (typeof info.playerState === 'number' && host) {
        const playing = info.playerState === 1;
        if (playing !== ytState.current.playing && (info.playerState === 1 || info.playerState === 2)) { ytState.current.playing = playing; onVid({ playing, pos: ytState.current.time }); }
      }
    };
    window.addEventListener('message', onMsg);
    const hi = setInterval(() => fref.current?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 1 }), '*'), 1000);
    return () => { window.removeEventListener('message', onMsg); clearInterval(hi); };
  }, [yt, host]); // eslint-disable-line react-hooks/exhaustive-deps
  // Students follow the teacher.
  useEffect(() => {
    if (host || !vid) return;
    if (yt) {
      const cmd = (func: string, args: any[] = []) => fref.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
      if (Math.abs(ytState.current.time - vid.pos) > 1.5) cmd('seekTo', [vid.pos, true]);
      cmd(vid.playing ? 'playVideo' : 'pauseVideo');
      return;
    }
    const v = vref.current; if (!v) return;
    if (Math.abs(v.currentTime - vid.pos) > 1.2) v.currentTime = vid.pos;
    if (vid.playing && v.paused) v.play().catch(() => {});
    if (!vid.playing && !v.paused) v.pause();
  }, [vid, host, yt]);
  const fill = { width: '100%', height: '100%', border: 0, display: 'block', background: '#000' };
  if (yt) {
    return el('iframe', { ref: fref, src: `https://www.youtube-nocookie.com/embed/${yt}?enablejsapi=1&rel=0&modestbranding=1&controls=${host ? 1 : 0}&origin=${encodeURIComponent(window.location.origin)}`,
      title: item.title, allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen', style: { ...fill, pointerEvents: host ? 'auto' : 'none' } });
  }
  if (!url) return <T style={{ color: '#FFF', margin: 20 }}>This video has no file yet.</T>;
  const report = () => { const v = vref.current; if (host && v) onVid({ playing: !v.paused, pos: v.currentTime }); };
  return el('video', { ref: vref, src: url, controls: host, playsInline: true, controlsList: 'nodownload', onPlay: report, onPause: report, onSeeked: report, style: { ...fill, objectFit: 'contain' } });
}

/* ---------- PDF pages, drawn with pdf.js so every phone and computer shows the same page ---------- */
// pdf.js (3.11.174) is served from our own site: app/public/pdfjs.
const PDFJS = typeof window !== 'undefined' ? `${window.location.origin}/pdfjs` : '/pdfjs';
let pdfjsLoading: Promise<any> | null = null;
function loadPdfJs(): Promise<any> {
  const w = window as any;
  if (w.pdfjsLib) return Promise.resolve(w.pdfjsLib);
  if (!pdfjsLoading) {
    pdfjsLoading = new Promise((ok, no) => {
      const s = document.createElement('script');
      s.src = `${PDFJS}/pdf.min.js`; s.async = true;
      s.onload = () => { w.pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS}/pdf.worker.min.js`; ok(w.pdfjsLib); };
      s.onerror = () => { pdfjsLoading = null; no(new Error('pdf.js')); };
      document.head.appendChild(s);
    });
  }
  return pdfjsLoading;
}

function PdfPage({ item, page, onPages }: { item: StageItem; page: number; onPages?: (n: number) => void }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const box = useRef<HTMLDivElement | null>(null);
  const doc = useRef<any>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'fallback'>('loading');
  const [, setReady] = useState(0);
  useEffect(() => {
    let live = true; doc.current = null; setState('loading');
    (async () => {
      try {
        const lib = await loadPdfJs();
        const token = await storage.get(TOKEN_KEY);
        const d = await lib.getDocument({ url: `${API_BASE}/course-items/${item.id}/pdf`, httpHeaders: token ? { Authorization: `Bearer ${token}` } : {} }).promise;
        if (!live) return;
        doc.current = d; onPages?.(d.numPages); setState('ok'); setReady((n) => n + 1);
      } catch { if (live) setState('fallback'); }
    })();
    return () => { live = false; };
  }, [item.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const d = doc.current; const c = ref.current; const b = box.current;
    if (!d || !c || !b || state !== 'ok') return;
    let task: any = null; let live = true;
    (async () => {
      const p = await d.getPage(Math.min(Math.max(1, page), d.numPages));
      if (!live) return;
      const base = p.getViewport({ scale: 1 });
      const r = b.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1;
      const scale = Math.min(r.width / base.width, r.height / base.height);
      const vp = p.getViewport({ scale: scale * dpr });
      c.width = vp.width; c.height = vp.height; c.style.width = `${vp.width / dpr}px`; c.style.height = `${vp.height / dpr}px`;
      task = p.render({ canvasContext: c.getContext('2d'), viewport: vp });
      await task.promise.catch(() => {});
    })();
    return () => { live = false; task?.cancel?.(); };
  });
  if (state === 'fallback') {
    // A PDF link (not an uploaded file): the browser's own viewer.
    return item.url ? el('iframe', { key: `${item.id}-${page}`, src: `${item.url}#page=${page}&toolbar=0&navpanes=0&view=Fit`, title: item.title, style: { width: '100%', height: '100%', border: 0, background: '#FFF' } }) : null;
  }
  return el('div', { ref: box, style: { width: '100%', height: '100%', background: '#F8F7FF', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
    state === 'loading' ? el('span', { style: { color: '#64748B', fontFamily: 'sans-serif' } }, 'Opening the book…') : null,
    el('canvas', { ref, style: { display: state === 'ok' ? 'block' : 'none', boxShadow: '0 2px 12px rgba(30,27,75,0.12)', background: '#FFF' } }));
}

/** A game or activity: every student gets their own copy to play (sandboxed). */
function SharedHtml({ item }: { item: StageItem }) {
  const [src, setSrc] = useState<string | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    setSrc(null); setErr('');
    api.get<{ url: string }>(`/course-items/${item.id}/open`).then((r) => setSrc(r.url)).catch((e) => setErr(e instanceof ApiError ? e.friendly : 'This activity could not be opened.'));
  }, [item.id]);
  if (err) return <T style={{ margin: 20, color: colors.red }}>{err}</T>;
  if (!src) return <T style={{ margin: 20 }}>Opening…</T>;
  return el('iframe', { src, title: item.title, sandbox: 'allow-scripts allow-pointer-lock allow-modals allow-forms', allow: 'autoplay; fullscreen', style: { width: '100%', height: '100%', border: 0, display: 'block', background: '#FFF' } });
}

/* ---------- virtual backgrounds, drawn on the device (no files to download) ---------- */
function makeBackground(kind: 'madrasa' | 'sky' | 'library'): string {
  const c = document.createElement('canvas'); c.width = 1280; c.height = 720;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 1280, 720);
  const cols = { madrasa: ['#0F766E', '#134E4A'], sky: ['#7DD3FC', '#C4B5FD'], library: ['#F5E6CC', '#D6B98C'] }[kind];
  grad.addColorStop(0, cols[0]); grad.addColorStop(1, cols[1]); g.fillStyle = grad; g.fillRect(0, 0, 1280, 720);
  if (kind === 'madrasa') {
    g.fillStyle = 'rgba(255,255,255,0.08)';
    for (let x = 40; x < 1280; x += 240) { g.beginPath(); g.moveTo(x, 720); g.lineTo(x, 300); g.arc(x + 90, 300, 90, Math.PI, 0); g.lineTo(x + 180, 720); g.fill(); }
  } else if (kind === 'sky') {
    g.fillStyle = 'rgba(255,255,255,0.7)';
    for (const [x, y, r] of [[200, 160, 60], [270, 150, 75], [340, 170, 55], [900, 260, 70], [980, 240, 85], [1060, 265, 60]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  } else {
    for (let y = 120; y < 720; y += 170) {
      g.fillStyle = '#8B5E34'; g.fillRect(0, y + 110, 1280, 14);
      for (let x = 20; x < 1280; x += 34) { g.fillStyle = ['#B45309', '#0F766E', '#7C3AED', '#DC2626', '#2563EB'][(x + y) % 5]; g.fillRect(x, y + 20 + ((x * 7) % 30), 26, 90 - ((x * 7) % 30)); }
    }
  }
  return c.toDataURL('image/jpeg', 0.85);
}
type Bg = 'none' | 'blur' | 'madrasa' | 'sky' | 'library';

function Sheet({ title, onClose, children, light }: { title: string; onClose: () => void; children: React.ReactNode; light?: boolean }) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(17,12,46,0.45)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
        <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 460, maxHeight: '90%', backgroundColor: light ? PAGE : PANEL, borderRadius: 22, padding: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <T style={{ color: light ? INK : '#FFF', fontFamily: fonts.semibold, fontSize: 18, flex: 1 }}>{title}</T>
            <Pressable accessibilityLabel="Close" onPress={onClose}><Ionicons name="close" size={24} color={light ? INK : '#FFF'} /></Pressable>
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

/* ---------- Class Tools: the course's lessons and what is in them ---------- */
const GROUPS: { key: string; title: string; icon: keyof typeof Ionicons.glyphMap; tint: [string, string]; test: (i: CourseItem) => boolean }[] = [
  { key: 'book', title: 'Textbook', icon: 'book-outline', tint: ['#E0F2FE', '#0369A1'], test: (i) => i.kind === 'pdf' && !/work\s*sheet|activity sheet/i.test(i.title) },
  { key: 'sheet', title: 'Worksheet', icon: 'clipboard-outline', tint: ['#EDE9FE', '#6D28D9'], test: (i) => i.kind === 'pdf' && /work\s*sheet|activity sheet/i.test(i.title) },
  { key: 'video', title: 'Learning Videos', icon: 'play-circle', tint: ['#FEE2E2', '#DC2626'], test: (i) => i.kind === 'video' },
  { key: 'game', title: 'Interactive Activities', icon: 'game-controller-outline', tint: ['#FEF3C7', '#B45309'], test: (i) => i.kind === 'html' },
  { key: 'pic', title: 'Pictures', icon: 'image-outline', tint: ['#DCFCE7', '#15803D'], test: (i) => i.kind === 'image' },
];
const toStage = (i: CourseItem, lesson?: string | null): StageItem => ({ id: i.id, kind: i.kind as StageItem['kind'], title: i.title, url: i.url ?? null, lesson });

function ClassTools({ course, shared, onShow, sharing, onShare }: { course: CourseDetail | null; shared: Shared; onShow: (s: Shared) => void; sharing: boolean; onShare: () => void }) {
  const lessons = (course?.lessons ?? []).filter((l) => l.items.length);
  const [lessonId, setLessonId] = useState<number | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => { if (lessonId === null && lessons.length) setLessonId(lessons[0].id); }, [lessons.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const lesson = lessons.find((l) => l.id === lessonId) ?? null;
  const items = lesson ? lesson.items : (course?.items ?? []);
  const curId = shared.kind === 'item' ? shared.item.id : null;
  const quick = (icon: keyof typeof Ionicons.glyphMap, label: string, on: boolean, f: () => void) => (
    <Pressable key={label} accessibilityRole="button" onPress={f}
      style={{ flex: 1, minWidth: 80, alignItems: 'center', gap: 4, paddingVertical: 10, borderRadius: 16, backgroundColor: on ? VIOLET : CARD, borderWidth: 1, borderColor: on ? VIOLET : LINE }}>
      <Ionicons name={icon} size={20} color={on ? '#FFF' : VIOLET} /><T style={{ fontSize: 12, fontFamily: fonts.semibold, color: on ? '#FFF' : INK }}>{label}</T>
    </Pressable>
  );
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {quick('easel-outline', 'Whiteboard', shared.kind === 'board', () => onShow(shared.kind === 'board' ? { kind: 'none' } : { kind: 'board' }))}
        {quick('desktop-outline', sharing ? 'Stop share' : 'Share screen', sharing, onShare)}
        {quick('eye-off-outline', 'Clear stage', false, () => onShow({ kind: 'none' }))}
      </View>
      {lessons.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {lessons.map((l, i) => (
            <Pressable key={l.id} onPress={() => setLessonId(l.id)} style={{ height: 32, paddingHorizontal: 12, borderRadius: 16, justifyContent: 'center', backgroundColor: l.id === lessonId ? '#EDE9FE' : CARD, borderWidth: 1, borderColor: l.id === lessonId ? VIOLET : LINE }}>
              <T numberOfLines={1} style={{ fontSize: 12.5, fontFamily: fonts.semibold, color: l.id === lessonId ? VIOLET : INK, maxWidth: 180 }}>{`${i + 1}. ${l.title}`}</T>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      {!items.length ? (
        <View style={{ backgroundColor: CARD, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: LINE }}>
          <T v="small">No lesson materials yet. Add a textbook (PDF), worksheet, videos and activities in Course management → Lessons & materials.</T>
        </View>
      ) : GROUPS.map((g) => {
        const list = items.filter(g.test);
        if (!list.length) return null;
        const isOpen = open === g.key || list.some((i) => i.id === curId);
        return (
          <View key={g.key} style={{ backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: LINE, overflow: 'hidden' }}>
            <Pressable accessibilityRole="button" onPress={() => setOpen(open === g.key ? null : g.key)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 }}>
              <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: g.tint[0], alignItems: 'center', justifyContent: 'center' }}><Ionicons name={g.icon} size={21} color={g.tint[1]} /></View>
              <T style={{ flex: 1, fontFamily: fonts.semibold, color: INK }}>{g.title}</T>
              <T v="small">{list.length}</T>
              <Ionicons name={isOpen ? 'chevron-down' : 'chevron-forward'} size={18} color={INK} />
            </Pressable>
            {isOpen ? list.map((i) => {
              const on = i.id === curId;
              return (
                <Pressable key={i.id} accessibilityRole="button" accessibilityLabel={`Show ${i.title}`} onPress={() => onShow({ kind: 'item', item: toStage(i, lesson?.title) })}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, paddingHorizontal: 12, backgroundColor: on ? '#F5F3FF' : 'transparent', borderTopWidth: 1, borderTopColor: '#F3F1FC' }}>
                  <Ionicons name={on ? 'radio-button-on' : 'play-outline'} size={15} color={on ? VIOLET : '#64748B'} />
                  <T numberOfLines={1} style={{ flex: 1, fontSize: 13.5, color: INK, fontFamily: on ? fonts.semibold : fonts.regular }}>{i.title}</T>
                  {on ? <T style={{ fontSize: 11, color: VIOLET, fontFamily: fonts.semibold }}>ON SCREEN</T> : null}
                </Pressable>
              );
            }) : null}
          </View>
        );
      })}
    </View>
  );
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const clock = (s: number) => `${pad2(Math.floor(s / 3600))}:${pad2(Math.floor(s / 60) % 60)}:${pad2(s % 60)}`;

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
  const [sheet, setSheet] = useState<'none' | 'settings' | 'react' | 'tools' | 'people' | 'more'>('none');
  const [bg, setBg] = useState<Bg>('none');
  const [hands, setHands] = useState<Set<string>>(new Set());
  const [bubbles, setBubbles] = useState<{ k: number; e: string; who: string }[]>([]);
  const [panel, setPanel] = useState<'tools' | 'students'>('tools');
  const [layout, setLayout] = useState<'focus' | 'gallery'>('focus');
  const [full, setFull] = useState(false);
  const [since] = useState(() => Date.now());
  const [now, setNow] = useState(Date.now());
  const [course, setCourse] = useState<CourseDetail | null>(null);
  // Shared stage (teacher decides), page and video state; teacher ink is shared, a student's ink stays on their screen.
  const stage = useRef<{ shared: Shared; page: number; vid: Vid | null; ink: Stroke[] }>({ shared: { kind: 'none' }, page: 1, vid: null, ink: [] });
  const [mine, setMine] = useState<Stroke[]>([]);
  const pages = useRef(0);
  const redo = useRef<Stroke[]>([]);
  const [drawOpen, setDrawOpen] = useState(false);
  const [tool, setTool] = useState<Mode>('pen');
  const [color, setColor] = useState(PENS[4]);
  const processor = useRef<any>(null);
  const audioEls = useRef(new Map<string, HTMLMediaElement>());
  const win = useWindowDimensions();
  const bump = () => setTick((n) => n + 1);
  const leave = () => { room?.disconnect(); if (typeof document !== 'undefined' && document.fullscreenElement) document.exitFullscreen().catch(() => {}); router.canGoBack() ? router.back() : router.replace('/' as any); };
  const send = (r: Room | null, m: Msg, to?: string[]) => { r?.localParticipant.publishData(enc(m), { reliable: true, topic: 'noon', destinationIdentities: to }).catch(() => {}); };
  const flash = (s: string) => { setNote(s); setTimeout(() => setNote(null), 3500); };
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const f = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', f); return () => document.removeEventListener('fullscreenchange', f);
  }, []);

  // 1. The pass (from the Join button, or ask the server again after a refresh).
  useEffect(() => {
    handoff = null;
    if (pass) return;
    api.post<LivePass | { provider: 'meet'; url: string }>(kind === 'meeting' ? `/meetings/${id}/join` : kind === 'session' ? `/live-sessions/${id}/join` : `/courses/${id}/live/join`)
      .then((r) => { if (r.provider === 'meet') { Linking.openURL(r.url); leave(); } else setPass(r); })
      .catch((e) => setErr(e instanceof ApiError ? e.friendly : 'Could not open the class.'));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // The teacher's Class Tools: the course's lessons and materials.
  useEffect(() => {
    if (!pass?.host || kind !== 'course') return;
    api.get<CourseDetail>(`/courses/${pass.course.id}`).then(setCourse).catch(() => setCourse(null));
  }, [pass?.host, pass?.course.id, kind]);

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
      [E.ParticipantConnected, E.TrackPublished, E.TrackUnpublished, E.TrackMuted, E.TrackUnmuted,
        E.LocalTrackPublished, E.LocalTrackUnpublished, E.ActiveSpeakersChanged, E.ParticipantMetadataChanged, E.ConnectionStateChanged].forEach((ev) => r!.on(ev as any, bump));
      // A teacher catches a newcomer up: what is on the stage, the page, the video and the drawing.
      const catchUp = (identity: string) => {
        if (!pass.host) return;
        const st = stage.current;
        send(r, { t: 'show', s: st.shared, page: st.page }, [identity]);
        if (st.vid) send(r, { t: 'vid', ...st.vid }, [identity]);
        for (const s of st.ink) for (let i = 0; i < s.pts.length; i += 400) send(r, { t: i ? 'wb-seg' : 'wb-full', id: s.id, c: s.c, w: s.w, m: s.m, pts: s.pts.slice(i, i + 400) }, [identity]);
      };
      r.on(E.ParticipantDisconnected, (p: RemoteParticipant) => { setHands((h) => { const n = new Set(h); n.delete(p.identity); return n; }); bump(); });
      r.on(E.DataReceived, (payload: Uint8Array, p?: RemoteParticipant) => {
        let m: any; try { m = JSON.parse(new TextDecoder().decode(payload)); } catch { return; }
        if (!m || typeof m.t !== 'string') return;
        const st = stage.current;
        if (m.t === 'hello') { if (p) catchUp(p.identity); return; }
        const fromTeacher = hostOf(p);
        if (['show', 'page', 'vid'].includes(m.t) || m.t.startsWith('wb-')) { if (!fromTeacher) return; } // only teachers change the stage
        if (m.t === 'show') { st.shared = m.s ?? { kind: 'none' }; st.page = m.page ?? 1; st.vid = null; st.ink = []; setMine([]); }
        else if (m.t === 'page') { st.page = m.n; st.ink = []; }
        else if (m.t === 'vid') st.vid = { playing: !!m.playing, pos: Number(m.pos) || 0 };
        else if (m.t === 'wb-clear') st.ink = [];
        else if (m.t === 'wb-undo') st.ink = st.ink.filter((s) => s.id !== m.id);
        else if (m.t === 'wb-full') st.ink = [...st.ink.filter((s) => s.id !== m.id), { id: m.id, c: m.c, w: m.w, m: m.m ?? 'pen', pts: m.pts }];
        else if (m.t === 'wb-seg') {
          const s = st.ink.find((x) => x.id === m.id);
          if (s) s.pts.push(...m.pts); else st.ink.push({ id: m.id, c: m.c, w: m.w, m: m.m ?? 'pen', pts: [...m.pts] });
          st.ink = [...st.ink];
        } else if (m.t === 'rx' && REACTIONS.includes(m.e)) {
          const k = Date.now() + Math.random();
          setBubbles((x) => [...x.slice(-5), { k, e: m.e, who: p?.name || p?.identity || '' }]);
          setTimeout(() => setBubbles((x) => x.filter((y) => y.k !== k)), 3500);
        } else if (m.t === 'hand' && p) setHands((h) => { const n = new Set(h); if (m.up) n.add(p.identity); else n.delete(p.identity); return n; });
        else if (m.t === 'lower' && fromTeacher) setHands((h) => { const n = new Set(h); n.delete(m.id); return n; });
        bump();
      });
      r.on(E.TrackSubscribed, (track: Track, _pub, p: RemoteParticipant) => {
        if (track.kind === mod.Track.Kind.Audio) { const a = track.attach(); a.style.display = 'none'; document.body.appendChild(a); audioEls.current.set(`${p.identity}-${track.sid}`, a); }
        bump();
      });
      r.on(E.TrackUnsubscribed, (track: Track, _pub, p: RemoteParticipant) => {
        const k = `${p.identity}-${track.sid}`; const a = audioEls.current.get(k);
        if (a) { track.detach(a); a.remove(); audioEls.current.delete(k); }
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
        // Ask the teacher what is on the stage, in case the class already started.
        if (!pass.host) setTimeout(() => send(r, { t: 'hello' }), 1200);
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
    return () => { gone = true; r?.disconnect(); audioEls.current.forEach((a) => a.remove()); audioEls.current.clear(); };
  }, [pass]); // eslint-disable-line react-hooks/exhaustive-deps

  if (Platform.OS !== 'web') {
    return (
      <View style={{ flex: 1, backgroundColor: PAGE, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 }}>
        <NooniAvatar size={90} mood="smile" />
        <T style={{ color: INK, fontFamily: fonts.semibold, fontSize: 18, textAlign: 'center' }}>Open the live class on noonlearn.com</T>
        <Button title="Open in browser" icon="open-outline" onPress={() => Linking.openURL(`https://www.noonlearn.com/live/${id}`)} />
      </View>
    );
  }
  if (err || ended) {
    return (
      <View style={{ flex: 1, backgroundColor: PAGE, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 }}>
        <NooniAvatar size={90} mood={ended ? 'wave' : 'thinking'} />
        <T style={{ color: INK, fontFamily: fonts.semibold, fontSize: 18, textAlign: 'center', maxWidth: 420 }}>{err ?? ended}</T>
        <Button title="Back" icon="arrow-back" onPress={leave} />
      </View>
    );
  }
  if (!room || !lk || !pass) {
    return (
      <View style={{ flex: 1, backgroundColor: PAGE, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <NooniAvatar size={90} mood="listening" />
        <T style={{ color: INK, fontFamily: fonts.semibold, fontSize: 17 }}>Joining the class…</T>
      </View>
    );
  }

  /* ---------- who is here ---------- */
  const me = room.localParticipant;
  const people: Participant[] = [me, ...Array.from(room.remoteParticipants.values())];
  const teacher = people.find((p) => hostOf(p) && !p.isLocal) ?? (pass.host ? me : null);
  const sharer = people.find((p) => p.getTrackPublication(lk.Track.Source.ScreenShare)?.track);
  const others = people.filter((p) => p !== teacher);
  const micOn = me.isMicrophoneEnabled; const camOn = me.isCameraEnabled; const sharing = me.isScreenShareEnabled;
  const myHand = hands.has(me.identity);
  const st = stage.current;
  const lessonName = st.shared.kind === 'item' ? st.shared.item.lesson : null;
  const moderate = async (action: 'mute' | 'remove' | 'end', identity?: string, name?: string) => {
    if (action === 'remove' && !(await confirmBox(`Remove ${name} from this class?`))) return;
    if (action === 'end' && !(await confirmBox(`End the ${kind === 'meeting' ? 'meeting' : 'class'} for everyone?`))) return;
    try { await api.post(kind === 'meeting' ? `/meetings/${id}/moderate` : kind === 'session' ? `/live-sessions/${id}/moderate` : `/courses/${pass.course.id}/live/moderate`, { action, identity }); } catch (e) { setErr(e instanceof ApiError ? e.friendly : 'Could not do that.'); }
  };

  /* ---------- teacher actions ---------- */
  const show = (s: Shared) => {
    st.shared = s; st.page = 1; st.vid = null; st.ink = []; redo.current = [];
    send(room, { t: 'show', s, page: 1 }); setSheet('none'); bump();
  };
  const setPage = (n: number) => { st.page = Math.max(1, pages.current ? Math.min(n, pages.current) : n); st.ink = []; send(room, { t: 'page', n: st.page }); bump(); };
  const onVid = (v: Vid) => { st.vid = v; send(room, { t: 'vid', ...v }); };
  const toggleShare = async () => {
    try { await me.setScreenShareEnabled(!sharing, { audio: true, selfBrowserSurface: 'exclude' } as any); bump(); }
    catch { /* the person cancelled the browser's share window */ }
  };
  // Ink: the teacher's goes to everyone; a student's stays on their own screen.
  const onStroke = (s: Stroke, newPts: number[], first: boolean) => {
    if (!pass.host) {
      setMine((list) => first ? [...list.filter((x) => x.id !== s.id), { ...s, pts: [...s.pts] }] : list.map((x) => (x.id === s.id ? { ...x, pts: [...s.pts] } : x)));
      return;
    }
    if (first) st.ink = [...st.ink.filter((x) => x.id !== s.id), { ...s, pts: [...s.pts] }];
    else { const x = st.ink.find((y) => y.id === s.id); if (x) x.pts = [...s.pts]; }
    send(room, first ? { t: 'wb-full', id: s.id, c: s.c, w: s.w, m: s.m, pts: s.pts } : { t: 'wb-seg', id: s.id, c: s.c, w: s.w, m: s.m, pts: newPts });
  };
  const onEnd = () => { redo.current = []; bump(); };
  const undo = () => {
    if (!pass.host) { setMine((l) => { const last = l[l.length - 1]; if (last) redo.current.push(last); return l.slice(0, -1); }); return; }
    const last = st.ink[st.ink.length - 1]; if (!last) return;
    st.ink = st.ink.slice(0, -1); redo.current.push(last); send(room, { t: 'wb-undo', id: last.id }); bump();
  };
  const redoIt = () => {
    const s = redo.current.pop(); if (!s) return;
    if (!pass.host) { setMine((l) => [...l, s]); return; }
    st.ink = [...st.ink, s];
    for (let i = 0; i < s.pts.length; i += 400) send(room, { t: i ? 'wb-seg' : 'wb-full', id: s.id, c: s.c, w: s.w, m: s.m, pts: s.pts.slice(i, i + 400) });
    bump();
  };
  const clearInk = () => { if (!pass.host) { setMine([]); return; } st.ink = []; send(room, { t: 'wb-clear' }); bump(); };

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
  const toggleFull = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen?.().catch(() => flash('Full screen is not available in this browser.'));
  };
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

  /* ---------- sizes ---------- */
  const wide = win.width >= 1000;
  const gallery0 = layout === 'gallery';
  const phone = win.width < 700;
  const leftW = pass.host && wide ? 300 : 0;
  const sideW = !pass.host && wide && teacher ? Math.min(300, win.width * 0.22) : 0; // student: teacher beside the stage
  const availW = win.width - leftW - sideW - (wide ? 56 : 24);
  // Room left for the stage: minus the header, the control bar, the drawing bar and the people above / below it.
  const peopleH = gallery0 ? 0 : pass.host && wide ? 175 : wide ? 125 : phone ? 240 : 300;
  const availH = win.height - 64 - 96 - 56 - peopleH - (needAudio ? 50 : 0);
  const stageW = Math.max(phone ? win.width - 24 : 300, Math.min(availW, availH * 1.6, 1100));
  const stageH = stageW / 1.6;

  /* ---------- the stage ---------- */
  const canDraw = drawOpen ? tool : null;
  const stageBody = () => {
    if (sharer) return <Tile lk={lk} p={sharer} w="100%" h={stageH} screen host={pass.host} />;
    const s = st.shared;
    if (s.kind === 'board') return <View style={{ flex: 1, backgroundColor: '#FFF' }} />;
    if (s.kind === 'item') {
      const it = s.item;
      if (it.kind === 'video') return <SharedVideo key={it.id} item={it} host={pass.host} vid={st.vid} onVid={onVid} />;
      if (it.kind === 'html') return <SharedHtml key={it.id} item={it} />;
      if (it.kind === 'image') return it.url ? el('img', { src: it.url, alt: it.title, style: { width: '100%', height: '100%', objectFit: 'contain', background: '#FFF' } }) : null;
      if (it.kind === 'pdf') return <PdfPage key={it.id} item={it} page={st.page} onPages={(n) => { pages.current = n; bump(); }} />;
    }
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#EEF2FF', padding: 16 }}>
        <NooniAvatar size={phone ? 64 : 84} mood="wave" />
        <T style={{ color: INK, fontFamily: fonts.semibold, textAlign: 'center' }}>{pass.host ? 'Pick a textbook, video or activity from Class Tools, or open the whiteboard.' : 'Your teacher will share the lesson here.'}</T>
        {pass.host && !wide ? <Button title="Class Tools" icon="apps-outline" onPress={() => setSheet('tools')} /> : null}
      </View>
    );
  };
  const stageBox = (
    <View style={{ width: stageW, gap: 8, alignItems: 'center' }}>
      <View style={{ width: stageW, height: stageH, borderRadius: 22, overflow: 'hidden', backgroundColor: '#000', borderWidth: 3, borderColor: '#FFF', shadowColor: '#4C1D95', shadowOpacity: 0.12, shadowRadius: 18 }}>
        {stageBody()}
        {!sharer ? <InkLayer strokes={st.ink} tool={pass.host ? canDraw : null} color={color} tick={tick} onStroke={onStroke} onEnd={onEnd} /> : null}
        {!pass.host && !sharer ? <InkLayer strokes={mine} tool={canDraw} color={color} tick={tick} onStroke={onStroke} onEnd={onEnd} /> : null}
        {st.shared.kind === 'item' && !sharer ? (
          <View style={{ position: 'absolute', left: 10, top: 10, maxWidth: '70%', backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 14, paddingHorizontal: 10, height: 28, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name={st.shared.item.kind === 'video' ? 'play-circle' : st.shared.item.kind === 'html' ? 'game-controller' : st.shared.item.kind === 'pdf' ? 'book' : 'image'} size={14} color={VIOLET} />
            <T numberOfLines={1} style={{ fontSize: 12, fontFamily: fonts.semibold, color: INK }}>{st.shared.item.title}</T>
          </View>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        {pass.host && st.shared.kind === 'item' && st.shared.item.kind === 'pdf' && !sharer ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: CARD, borderRadius: 22, paddingHorizontal: 6, height: 44, borderWidth: 1, borderColor: LINE }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Previous page" onPress={() => setPage(st.page - 1)} style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="chevron-back" size={20} color={INK} /></Pressable>
            <T style={{ fontFamily: fonts.semibold, color: INK }}>Page {st.page}{pages.current ? ` / ${pages.current}` : ''}</T>
            <Pressable accessibilityRole="button" accessibilityLabel="Next page" onPress={() => setPage(st.page + 1)} style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="chevron-forward" size={20} color={INK} /></Pressable>
          </View>
        ) : null}
        {!sharer ? <DrawBar open={drawOpen} setOpen={setDrawOpen} tool={tool} setTool={setTool} color={color} setColor={setColor} onUndo={undo} onRedo={redoIt} onClear={clearInk} compact={phone} /> : null}
      </View>
      {!pass.host && drawOpen ? <T v="small">Your drawing is only on your screen.</T> : null}
    </View>
  );

  /* ---------- people ---------- */
  const stripMax = phone ? 4 : wide ? 5 : 6;
  const tileW = phone ? Math.floor((win.width - 24 - 8 * 3) / 4) : 150;
  const strip = (list: Participant[], withTeacher: boolean) => {
    const all = withTeacher && teacher ? [teacher, ...list] : list;
    const shown = all.slice(0, stripMax);
    const more = all.length - shown.length;
    return (
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        {shown.map((p) => <Tile key={p.identity} lk={lk} p={p} w={tileW} host={pass.host} hand={hands.has(p.identity)} onLower={() => lowerHand(p.identity)}
          onMute={() => moderate('mute', p.identity)} onRemove={() => moderate('remove', p.identity, p.name || p.identity)} />)}
        {more > 0 ? (
          <Pressable accessibilityRole="button" onPress={() => (pass.host && wide ? setPanel('students') : setSheet('people'))}
            style={{ width: tileW, aspectRatio: 16 / 11, borderRadius: 18, backgroundColor: CARD, borderWidth: 1, borderColor: LINE, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <Ionicons name="people" size={20} color={VIOLET} /><T style={{ color: VIOLET, fontFamily: fonts.semibold }}>+{more}</T><T v="small">more</T>
          </Pressable>
        ) : null}
      </View>
    );
  };
  const peopleList = (
    <View style={{ gap: 6 }}>
      {people.map((p) => {
        const mic = !!p.getTrackPublication(lk.Track.Source.Microphone) && !p.getTrackPublication(lk.Track.Source.Microphone)?.isMuted;
        const isT = hostOf(p);
        return (
          <View key={p.identity} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: CARD, borderRadius: 14, padding: 8, borderWidth: 1, borderColor: hands.has(p.identity) ? '#FFC93C' : LINE }}>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: isT ? colors.teal : VIOLET, alignItems: 'center', justifyContent: 'center' }}><T style={{ color: '#FFF', fontFamily: fonts.semibold }}>{(p.name || p.identity).slice(0, 1).toUpperCase()}</T></View>
            <T numberOfLines={1} style={{ flex: 1, color: INK, fontFamily: fonts.medium }}>{p.name || p.identity}{p.isLocal ? ' (you)' : ''}{isT ? ' · Teacher' : ''}</T>
            {hands.has(p.identity) ? (pass.host && !p.isLocal ? <Pressable onPress={() => lowerHand(p.identity)} style={{ backgroundColor: '#FFC93C', borderRadius: 12, paddingHorizontal: 8, height: 26, justifyContent: 'center' }}><T style={{ fontSize: 12, fontFamily: fonts.semibold, color: '#2A1600' }}>✋ Lower</T></Pressable> : <T>✋</T>) : null}
            <Ionicons name={mic ? 'mic' : 'mic-off'} size={16} color={mic ? colors.teal : '#94A3B8'} />
            {pass.host && !p.isLocal && !isT ? (
              <>
                {mic ? <Pressable accessibilityLabel={`Mute ${p.name}`} onPress={() => moderate('mute', p.identity)} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="mic-off" size={14} color={INK} /></Pressable> : null}
                <Pressable accessibilityLabel={`Remove ${p.name}`} onPress={() => moderate('remove', p.identity, p.name || p.identity)} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="exit-outline" size={14} color={colors.red} /></Pressable>
              </>
            ) : null}
          </View>
        );
      })}
    </View>
  );

  /* ---------- header and controls ---------- */
  const pill = (bgc: string, child: React.ReactNode) => <View style={{ height: 36, borderRadius: 18, paddingHorizontal: 12, backgroundColor: bgc, flexDirection: 'row', alignItems: 'center', gap: 6 }}>{child}</View>;
  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: phone ? 12 : 20, paddingTop: phone ? 10 : 14, paddingBottom: 8, flexWrap: phone ? 'wrap' : 'nowrap' }}>
      {!phone ? <Logo height={34} /> : null}
      <View style={{ flexShrink: 1, height: 38, borderRadius: 19, paddingHorizontal: 14, backgroundColor: VIOLET, flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: phone ? 0 : 12 }}>
        <Ionicons name="easel-outline" size={16} color="#FFF" />
        <T numberOfLines={1} style={{ color: '#FFF', fontFamily: fonts.semibold, fontSize: phone ? 13.5 : 15, flexShrink: 1 }}>{kind === 'meeting' ? 'Meeting' : 'Live Class'} – {pass.course.title}</T>
      </View>
      {lessonName && !phone ? pill('#EDE9FE', <T numberOfLines={1} style={{ color: INK, fontSize: 13.5 }}><T style={{ color: '#64748B', fontSize: 13.5 }}>Chapter: </T>{lessonName}</T>) : null}
      <View style={{ flex: 1 }} />
      {pill('#EF4444', <T style={{ color: '#FFF', fontFamily: fonts.semibold, fontSize: 13 }}>● Live</T>)}
      {pill(CARD, <T style={{ color: INK, fontFamily: fonts.semibold, fontSize: 13, fontVariant: ['tabular-nums'] }}>{clock(Math.floor((now - since) / 1000))}</T>)}
      <Pressable accessibilityRole="button" accessibilityLabel={full ? 'Exit full screen' : 'Full screen'} onPress={toggleFull}
        style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: CARD, borderWidth: 1, borderColor: LINE, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={full ? 'contract-outline' : 'expand-outline'} size={18} color={INK} />
      </Pressable>
      {pass.host ? (
        <Pressable accessibilityRole="button" onPress={() => moderate('end')} style={{ height: 38, borderRadius: 19, paddingHorizontal: 16, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' }}>
          <T style={{ color: '#FFF', fontFamily: fonts.semibold }}>{kind === 'meeting' ? 'End' : 'End Class'}</T>
        </Pressable>
      ) : null}
    </View>
  );
  const ctl = (icon: keyof typeof Ionicons.glyphMap, label: string, onPress: () => void, opts: { on?: boolean; off?: boolean; active?: boolean; danger?: boolean } = {}) => (
    <Pressable key={label} accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ alignItems: 'center', gap: 3, width: phone ? 56 : 64 }}>
      <View style={{ width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: LINE,
        backgroundColor: opts.danger ? '#EF4444' : opts.active ? VIOLET : CARD }}>
        <Ionicons name={icon} size={21} color={opts.danger || opts.active ? '#FFF' : opts.off ? '#EF4444' : INK} />
      </View>
      <T numberOfLines={1} style={{ fontSize: 10.5, color: '#475569' }}>{label}</T>
    </Pressable>
  );
  const controls = (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 2, paddingVertical: 8, paddingHorizontal: 8, marginHorizontal: phone ? 8 : 0, marginBottom: 10, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 30, borderWidth: 1, borderColor: LINE }}>
      {ctl(micOn ? 'mic' : 'mic-off', micOn ? 'Mic on' : 'Mic off', () => me.setMicrophoneEnabled(!micOn).then(bump).catch(() => flash('Please allow the microphone in your browser.')), { off: !micOn })}
      {ctl(camOn ? 'videocam' : 'videocam-off', camOn ? 'Camera on' : 'Camera off', () => me.setCameraEnabled(!camOn).then(() => { bump(); if (!camOn && bg !== 'none') setTimeout(() => applyBg(bg), 300); }).catch(() => flash('Please allow the camera in your browser.')), { off: !camOn })}
      {pass.host && !wide ? ctl('apps-outline', 'Class tools', () => setSheet('tools')) : null}
      {!pass.host ? ctl('hand-left-outline', myHand ? 'Lower hand' : 'Raise hand', toggleHand, { active: myHand }) : null}
      {ctl('pencil', 'Draw', () => setDrawOpen(!drawOpen), { active: drawOpen })}
      {phone ? ctl('ellipsis-horizontal', 'More', () => setSheet('more')) : (
        <>
          {ctl(layout === 'focus' ? 'grid-outline' : 'albums-outline', layout === 'focus' ? 'Gallery' : 'Focus', () => setLayout(layout === 'focus' ? 'gallery' : 'focus'))}
          {ctl('happy-outline', 'React', () => setSheet('react'))}
          {!(pass.host && wide) ? ctl('people-outline', `People ${people.length}`, () => setSheet('people')) : null}
          {ctl('settings-outline', 'Settings', () => setSheet('settings'))}
        </>
      )}
      {ctl('exit-outline', 'Leave', leave, { danger: !pass.host })}
    </View>
  );

  /* ---------- layout ---------- */
  const gallery = layout === 'gallery';
  const galleryW = Math.min(360, Math.floor((win.width - leftW - 60) / (phone ? 2 : 3)) - 10);
  const body = gallery ? (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
      {sharer ? <Tile lk={lk} p={sharer} w={galleryW * 2 + 10} screen host={pass.host} /> : null}
      {people.map((p) => <Tile key={p.identity} lk={lk} p={p} w={galleryW} host={pass.host} hand={hands.has(p.identity)} onLower={() => lowerHand(p.identity)}
        onMute={() => moderate('mute', p.identity)} onRemove={() => moderate('remove', p.identity, p.name || p.identity)} />)}
    </View>
  ) : pass.host && wide ? (
    // Teacher, computer: teacher video and students on top, the stage below.
    <View style={{ gap: 12, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        {teacher ? <Tile lk={lk} p={teacher} w={240} host={pass.host} label="Teacher" /> : null}
        {strip(others, false)}
      </View>
      {stageBox}
    </View>
  ) : wide ? (
    // Student, computer: stage with the teacher beside it, classmates below.
    <View style={{ gap: 12, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
        {stageBox}
        {teacher ? <Tile lk={lk} p={teacher} w={sideW} h={stageH} host={false} label="Teacher" /> : null}
      </View>
      {strip(others, false)}
    </View>
  ) : (
    // Phones and tablets: teacher, stage, everyone in a row.
    <View style={{ gap: 10, alignItems: 'center' }}>
      {teacher ? <Tile lk={lk} p={teacher} w={stageW} h={Math.min(stageW * 0.5, 220)} host={pass.host} label="Teacher" /> : null}
      {stageBox}
      {strip(others, false)}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: PAGE }}>
      {header}
      {needAudio ? (
        <Pressable onPress={() => room.startAudio().then(() => setNeedAudio(false))} style={{ marginHorizontal: 16, marginBottom: 6, backgroundColor: '#FFD84D', borderRadius: 14, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="volume-high" size={18} color="#2A1600" /><T style={{ color: '#2A1600', fontFamily: fonts.semibold }}>Tap here to hear the class</T>
        </Pressable>
      ) : null}
      <View style={{ flex: 1, flexDirection: 'row' }}>
        {leftW ? (
          <View style={{ width: leftW, paddingLeft: 16, paddingBottom: 12, gap: 10 }}>
            <View style={{ flexDirection: 'row', backgroundColor: '#EDE9FE', borderRadius: 22, padding: 4 }}>
              {([['tools', 'Class Tools', 'apps-outline'], ['students', `Students · ${people.length - 1}`, 'people-outline']] as const).map(([k, l, ic]) => (
                <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: panel === k }} onPress={() => setPanel(k)}
                  style={{ flex: 1, height: 38, borderRadius: 19, backgroundColor: panel === k ? VIOLET : 'transparent', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Ionicons name={ic} size={16} color={panel === k ? '#FFF' : INK} /><T style={{ fontFamily: fonts.semibold, fontSize: 13, color: panel === k ? '#FFF' : INK }}>{l}</T>
                </Pressable>
              ))}
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 12 }}>
              {panel === 'tools' ? <ClassTools course={course} shared={st.shared} onShow={show} sharing={sharing} onShare={toggleShare} /> : peopleList}
            </ScrollView>
          </View>
        ) : null}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: phone ? 12 : 16, paddingTop: 4, alignItems: 'center' }}>{body}</ScrollView>
      </View>
      {controls}

      {/* Reactions float up from the bottom-left for a few seconds. */}
      <View pointerEvents="none" style={{ position: 'absolute', left: 16, bottom: 110, gap: 6 }}>
        {bubbles.map((b) => (
          <View key={b.k} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(30,27,75,0.75)', borderRadius: 18, paddingHorizontal: 10, height: 36 }}>
            <T style={{ fontSize: 22 }}>{b.e}</T><T style={{ color: '#FFF', fontSize: 12 }}>{b.who}</T>
          </View>
        ))}
      </View>
      {note ? <View style={{ position: 'absolute', alignSelf: 'center', bottom: 110, backgroundColor: '#FFD84D', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8 }}><T style={{ color: '#2A1600', fontFamily: fonts.semibold }}>{note}</T></View> : null}

      {sheet === 'tools' ? (
        <Sheet title="Class Tools" light onClose={() => setSheet('none')}>
          <ClassTools course={course} shared={st.shared} onShow={show} sharing={sharing} onShare={() => { setSheet('none'); toggleShare(); }} />
        </Sheet>
      ) : null}
      {sheet === 'more' ? (
        <Sheet title="More" light onClose={() => setSheet('none')}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
            {ctl(layout === 'focus' ? 'grid-outline' : 'albums-outline', layout === 'focus' ? 'Gallery' : 'Focus', () => { setLayout(layout === 'focus' ? 'gallery' : 'focus'); setSheet('none'); })}
            {ctl('happy-outline', 'React', () => setSheet('react'))}
            {ctl('people-outline', `People ${people.length}`, () => setSheet('people'))}
            {ctl('settings-outline', 'Settings', () => setSheet('settings'))}
            {ctl(full ? 'contract-outline' : 'expand-outline', full ? 'Exit full' : 'Full screen', () => { toggleFull(); setSheet('none'); })}
          </View>
        </Sheet>
      ) : null}
      {sheet === 'people' ? <Sheet title={`People · ${people.length}`} light onClose={() => setSheet('none')}>{peopleList}</Sheet> : null}
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
