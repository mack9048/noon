// Nooni, the AI voice assistant. A floating button on every screen opens a panel where the user
// talks (or types) in Malayalam, English or Arabic; Nooni answers out loud and can open screens.
// Voice uses the browser's speech recognition and speech synthesis; typing works everywhere.
import React, { useEffect, useRef, useState } from 'react';
import { Image, Modal, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Row, T } from './ui';
import { useAuth } from '@/lib/auth';
import { useLayout } from '@/lib/useLayout';
import { ApiError } from '@/lib/api';
import { askNooni, NooniLang, NooniMsg, SPEECH_LANG } from '@/lib/nooni';
import { colors, fonts, shadow } from '@/theme/tokens';

const web = Platform.OS === 'web';
const W: any = web ? globalThis : {};
const Recognition = web ? (W.SpeechRecognition || W.webkitSpeechRecognition) : null;
const canSpeak = web && !!W.speechSynthesis;
const LANGS: { key: NooniLang; label: string }[] = [{ key: 'ml', label: 'മലയാളം' }, { key: 'en', label: 'English' }, { key: 'ar', label: 'العربية' }];
const HELLO: Record<NooniLang, string> = {
  ml: 'അസ്സലാമു അലൈക്കും! ഞാൻ നൂനി. ഇന്ന് നമുക്ക് ഒരുമിച്ച് എന്ത് പഠിക്കാം? മൈക്കിൽ തൊട്ട് പറയൂ.',
  en: "Assalamu alaikum! I'm Nooni, your learning friend. What shall we learn together today? Tap the mic and tell me.",
  ar: 'السلام عليكم! أنا نوني، صديقك في التعلّم. ماذا نتعلّم معًا اليوم؟ اضغط على الميكروفون وأخبرني.',
};
const SUGGEST: Record<NooniLang, string[]> = {
  ml: ['ഇന്നത്തെ പാഠം വിശദീകരിക്കൂ', 'വുദുവിന്റെ ഫർളുകൾ ഏതൊക്കെ?', 'എന്റെ കോഴ്സുകൾ തുറക്കൂ'],
  en: ['Explain this lesson simply', 'Teach me a dua before sleeping', 'Open my courses'],
  ar: ['اشرح لي هذا الدرس', 'علمني دعاء قبل النوم', 'افتح دوراتي'],
};
const LANG_KEY = 'noon.nooni.lang';
const readLang = (): NooniLang => { try { const v = W.localStorage?.getItem(LANG_KEY); return v === 'en' || v === 'ar' || v === 'ml' ? v : 'ml'; } catch { return 'ml'; } };
const saveLang = (l: NooniLang) => { try { W.localStorage?.setItem(LANG_KEY, l); } catch { /* private mode */ } };

function speak(text: string, lang: NooniLang, onEnd: () => void) {
  if (!canSpeak) return onEnd();
  const synth = W.speechSynthesis;
  synth.cancel();
  const u = new W.SpeechSynthesisUtterance(text);
  u.lang = SPEECH_LANG[lang];
  const voice = synth.getVoices().find((v: any) => v.lang?.toLowerCase().startsWith(lang));
  if (voice) u.voice = voice;
  u.rate = 0.95;
  u.onend = onEnd; u.onerror = onEnd;
  synth.speak(u);
}

/** Nooni's palette (Nooni Visual World Guide v2). */
export const NOONI = { deep: '#176C78', teal: '#278588', ivory: '#F6F0E5', coral: '#D77A66', blue: '#96B9D0', mustard: '#D8AE45' };
export type NooniMood = 'wave' | 'smile' | 'thinking' | 'listening' | 'delight';
const FACES: Record<NooniMood, any> = {
  wave: require('../../assets/nooni/face.png'),
  smile: require('../../assets/nooni/smile.png'),
  thinking: require('../../assets/nooni/thinking.png'),
  listening: require('../../assets/nooni/listening.png'),
  delight: require('../../assets/nooni/delight.png'),
};
export const NOONI_FULL = require('../../assets/nooni/nooni-full.png');

/** Nooni's face (the 5-year-old learning friend from the guide), with an expression for what he is doing. */
export function NooniAvatar({ size = 44, mood = 'wave' }: { size?: number; mood?: NooniMood }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: NOONI.ivory, overflow: 'hidden', borderWidth: size > 40 ? 2 : 1.5, borderColor: '#FFF' }}>
      <Image source={FACES[mood]} accessibilityLabel="Nooni" style={{ width: size, height: size }} resizeMode="cover" />
    </View>
  );
}

/** Floating button; hidden on pages that already are Nooni or need the whole screen. */
export function NooniButton() {
  const path = usePathname();
  const { device } = useLayout();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  if (/\/ai$/.test(path) || /\/play$/.test(path) && device === 'phone') return null;
  const bottom = device === 'phone' ? Math.max(insets.bottom, 12) + 96 : 24;
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel="Ask Nooni" onPress={() => setOpen(true)}
        style={({ pressed }) => ({ position: 'absolute', right: 16, bottom, flexDirection: 'row', alignItems: 'center', gap: 8, height: 56, paddingLeft: 6, paddingRight: device === 'phone' ? 6 : 18, borderRadius: 28, backgroundColor: NOONI.teal, opacity: pressed ? 0.9 : 1, ...shadow.lifted })}>
        <NooniAvatar size={44} />
        {device !== 'phone' ? <T style={{ color: '#FFF', fontFamily: fonts.semibold }}>Ask Nooni</T> : null}
      </Pressable>
      {open ? (
        <Modal transparent animationType="slide" onRequestClose={() => setOpen(false)}>
          <Pressable accessibilityLabel="Close Nooni" onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(16,48,58,0.35)' }} />
          <View style={{ position: 'absolute', right: device === 'phone' ? 0 : 24, left: device === 'phone' ? 0 : undefined, bottom: device === 'phone' ? 0 : 24, top: device === 'phone' ? 60 : undefined,
            width: device === 'phone' ? undefined : 420, height: device === 'phone' ? undefined : 640, maxHeight: device === 'phone' ? undefined : '90%' as any,
            backgroundColor: colors.bg, borderRadius: device === 'phone' ? 0 : 28, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', ...shadow.lifted }}>
            <NooniChat onClose={() => setOpen(false)} />
          </View>
        </Modal>
      ) : null}
    </>
  );
}

/** The conversation itself: used in the pop-up panel and as the full "Ask AI" page. */
export function NooniChat({ onClose }: { onClose?: () => void }) {
  const { user } = useAuth();
  const path = usePathname();
  const [lang, setLangState] = useState<NooniLang>(readLang);
  const [msgs, setMsgs] = useState<NooniMsg[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState('');
  const [talking, setTalking] = useState(false);
  const [voiceOn, setVoiceOn] = useState(canSpeak);
  const [err, setErr] = useState('');
  const rec = useRef<any>(null);
  const scroll = useRef<ScrollView>(null);
  const setLang = (l: NooniLang) => { setLangState(l); saveLang(l); };
  useEffect(() => () => { rec.current?.abort?.(); if (canSpeak) W.speechSynthesis.cancel(); }, []);
  useEffect(() => { setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50); }, [msgs.length, busy]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy || !user) return;
    setErr(''); setDraft(''); setHeard('');
    const next: NooniMsg[] = [...msgs, { role: 'user', content: q }];
    setMsgs(next); setBusy(true);
    try {
      const r = await askNooni(user.role, next, lang, path);
      setMsgs([...next, { role: 'assistant', content: r.reply }]);
      if (voiceOn) { setTalking(true); speak(r.reply, lang, () => setTalking(false)); }
      if (r.href) setTimeout(() => { onClose?.(); router.push(r.href as any); }, voiceOn ? 1200 : 400);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Nooni could not answer. Check your internet and try again.');
      setMsgs(msgs);
      setDraft(q);
    } finally { setBusy(false); }
  };

  const listen = () => {
    if (listening) { rec.current?.stop(); return; }
    if (!Recognition) { setErr('Voice is not available in this browser. Please type your question, or use Chrome.'); return; }
    if (canSpeak) W.speechSynthesis.cancel();
    setTalking(false); setErr(''); setHeard('');
    const r = new Recognition();
    r.lang = SPEECH_LANG[lang]; r.interimResults = true; r.maxAlternatives = 1; r.continuous = false;
    let final = '';
    r.onresult = (e: any) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript; else interim += e.results[i][0].transcript;
      }
      setHeard(final + interim);
    };
    r.onerror = (e: any) => { setListening(false); if (e.error === 'not-allowed') setErr('Please allow the microphone to talk to Nooni.'); else if (e.error !== 'no-speech' && e.error !== 'aborted') setErr('I could not hear that. Please try again.'); };
    r.onend = () => { setListening(false); if (final.trim()) send(final); };
    rec.current = r;
    try { r.start(); setListening(true); } catch { setListening(false); }
  };

  const list = msgs.length ? msgs : [{ role: 'assistant' as const, content: HELLO[lang] }];
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: NOONI.deep }}>
        <NooniAvatar size={50} mood={listening ? 'listening' : busy ? 'thinking' : talking ? 'delight' : msgs.length ? 'smile' : 'wave'} />
        <View style={{ flex: 1 }}>
          <T style={{ color: '#FFF', fontFamily: fonts.fun, fontSize: 20 }}>Nooni</T>
          <T style={{ color: '#D5ECEE', fontSize: 12 }}>{listening ? 'Listening…' : busy ? 'Thinking…' : talking ? 'Speaking…' : 'Your learning friend'}</T>
        </View>
        {canSpeak ? (
          <Pressable accessibilityRole="switch" accessibilityState={{ checked: voiceOn }} accessibilityLabel="Read answers aloud" onPress={() => { if (voiceOn && canSpeak) W.speechSynthesis.cancel(); setVoiceOn(!voiceOn); setTalking(false); }}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={voiceOn ? 'volume-high' : 'volume-mute'} size={20} color="#FFF" />
          </Pressable>
        ) : null}
        {onClose ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Close Nooni" onPress={onClose} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="close" size={22} color="#FFF" />
          </Pressable>
        ) : null}
      </View>
      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 14, paddingTop: 10 }}>
        {LANGS.map((l) => (
          <Pressable key={l.key} accessibilityRole="radio" accessibilityState={{ checked: lang === l.key }} onPress={() => setLang(l.key)}
            style={{ height: 32, paddingHorizontal: 12, borderRadius: 16, justifyContent: 'center', backgroundColor: lang === l.key ? NOONI.deep : '#FFF', borderWidth: 1, borderColor: lang === l.key ? NOONI.deep : colors.line }}>
            <T style={{ fontSize: 13, fontFamily: fonts.semibold, color: lang === l.key ? '#FFF' : colors.ink }}>{l.label}</T>
          </Pressable>
        ))}
      </View>
      <ScrollView ref={scroll} style={{ flex: 1, backgroundColor: NOONI.ivory }} contentContainerStyle={{ padding: 14, gap: 10 }}>
        {list.map((m, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 8, alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%' }}>
            {m.role === 'assistant' ? <NooniAvatar size={30} mood={i === list.length - 1 && talking ? 'delight' : 'smile'} /> : null}
            <View style={{ flexShrink: 1, backgroundColor: m.role === 'user' ? NOONI.teal : '#FFF', borderRadius: 20, borderTopLeftRadius: m.role === 'user' ? 20 : 6, borderTopRightRadius: m.role === 'user' ? 6 : 20, paddingHorizontal: 14, paddingVertical: 10, borderWidth: m.role === 'user' ? 0 : 1, borderColor: colors.line }}>
              <T style={{ color: m.role === 'user' ? '#FFF' : colors.ink, fontSize: 15, lineHeight: 23 }} auto>{m.content}</T>
            </View>
            {m.role === 'assistant' && canSpeak && msgs.length ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Read this aloud" onPress={() => { setTalking(true); speak(m.content, lang, () => setTalking(false)); }} style={{ alignSelf: 'flex-end', padding: 4 }}>
                <Ionicons name="volume-medium-outline" size={18} color={colors.muted} />
              </Pressable>
            ) : null}
          </View>
        ))}
        {busy ? <Row gap={8} style={{ alignSelf: 'flex-start' }}><NooniAvatar size={30} mood="thinking" /><View style={{ backgroundColor: '#FFF', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: colors.line }}><T style={{ color: colors.muted }}>Nooni is thinking…</T></View></Row> : null}
        {!msgs.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {SUGGEST[lang].map((s) => (
              <Pressable key={s} accessibilityRole="button" onPress={() => send(s)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: '#E3F1F2', borderWidth: 1, borderColor: '#BFDDE0' }}>
                <T style={{ fontSize: 13, color: NOONI.deep, fontFamily: fonts.semibold }} auto>{s}</T>
              </Pressable>
            ))}
          </View>
        ) : null}
        {err ? <T style={{ color: colors.red }}>{err}</T> : null}
      </ScrollView>
      {listening || heard ? <T style={{ textAlign: 'center', color: colors.violet, paddingHorizontal: 14, paddingBottom: 6, fontFamily: fonts.medium }} auto>{heard || 'Listening… speak now'}</T> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: colors.line }}>
        <TextInput value={draft} onChangeText={setDraft} onSubmitEditing={() => send(draft)} placeholder="Type or tap the mic…" placeholderTextColor={colors.faint} accessibilityLabel="Message to Nooni"
          editable={!busy} returnKeyType="send"
          style={{ flex: 1, height: 48, borderRadius: 24, backgroundColor: colors.bg, paddingHorizontal: 16, fontFamily: fonts.regular, fontSize: 15, color: colors.ink, ...(web ? { outlineStyle: 'none' } : {}) } as any} />
        {draft.trim() ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Send" disabled={busy} onPress={() => send(draft)} style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="send" size={20} color="#FFF" />
          </Pressable>
        ) : (
          <Pressable accessibilityRole="button" accessibilityLabel={listening ? 'Stop listening' : 'Talk to Nooni'} disabled={busy} onPress={listen}
            style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: listening ? NOONI.coral : NOONI.teal, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.5 : 1 }}>
            <Ionicons name={listening ? 'stop' : 'mic'} size={24} color="#FFF" />
          </Pressable>
        )}
      </View>
    </View>
  );
}
