// Super admin → Website: edit everything on www.noonlearn.com (text, links, images, numbers, course cards,
// FAQs, menus…) and publish. The website build lists what can be edited in /cms-schema.json; edits are saved
// to the API as drafts and go live when published (the website rebuilds in about a minute).
import React, { useEffect, useMemo, useState } from 'react';
import { Image, Linking, Platform, Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Button, Card, Loading, ErrorBox, Row, Screen, T } from '@/components/ui';
import { Input, MiniStat } from '@/components/kit2';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { colors, fonts } from '@/theme/tokens';

type Field = { type: 'field'; key: string; kind: 'text' | 'long' | 'link' | 'image' | 'number'; label: string; value: string };
type List = { type: 'list'; key: string; label: string; items: Field[][] };
type Section = { label: string; blocks: (Field | List)[] };
type SchemaPage = { id: string; label: string; url: string; shared?: boolean; sections: Section[] };
type Schema = { built: string; pages: SchemaPage[] };
type Item = { src: number | null; fields: Record<string, string> };
type Draft = { fields: Record<string, string>; lists: Record<string, Item[]> };
type SiteState = {
  pages: { page: string; changed: boolean; edits: number; updated_at: string | null; published_at: string | null }[];
  unpublished: number; last_publish: { at: string; by: string; pages: number; deploy: string } | null; deploy_hook: boolean; site_url: string;
};

const say = (m: string) => (Platform.OS === 'web' ? (globalThis as any).alert?.(m) : null);
const ask = (m: string) => (Platform.OS === 'web' ? !!(globalThis as any).confirm?.(m) : true);
const when = (s?: string | null) => (s ? new Date(s).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '');

/** The editable-content list published by the website build. */
function useSchema(siteUrl?: string) {
  const [schema, setSchema] = useState<Schema | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!siteUrl) return;
    let live = true;
    fetch(`${siteUrl.replace(/\/$/, '')}/cms-schema.json`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((j) => live && setSchema(j))
      .catch(() => live && setError(`Could not read the website's page list from ${siteUrl}. Check the website is online.`));
    return () => { live = false; };
  }, [siteUrl]);
  return { schema, error };
}

const fullUrl = (site: string, v: string) => (/^https?:\/\//.test(v) ? v : `${site.replace(/\/$/, '')}${v.startsWith('/') ? '' : '/'}${v}`);

// ------------------------------------------------------------------ Pages + publish

export function WebsiteScreen() {
  const { data: st, error: stErr, reload } = useApi<SiteState>('/super/site');
  const { schema, error } = useSchema(st?.site_url);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  if (stErr) return <Screen><ErrorBox message={stErr} onRetry={reload} /></Screen>;
  if (!st) return <Loading />;
  const state = Object.fromEntries(st.pages.map((p) => [p.page, p]));

  const publish = async () => {
    if (!st.unpublished) return say('There are no unpublished changes.');
    if (!ask(`Publish ${st.unpublished} page${st.unpublished === 1 ? '' : 's'} to the live website?`)) return;
    setBusy(true); setResult(null);
    try {
      const r = await api.post<{ pages: number; deploy: string }>('/super/site/publish');
      setResult(r.deploy === 'started' ? 'Published. The website is rebuilding — changes show in about 1–2 minutes.'
        : r.deploy === 'not_configured' ? 'Saved as published. The website can’t rebuild by itself yet — add SITE_DEPLOY_HOOK to the server (see below).'
          : 'Saved as published, but the website rebuild did not start. Try Publish again in a minute.');
      reload();
    } catch (e) { setResult(e instanceof ApiError ? e.friendly : 'Could not publish.'); } finally { setBusy(false); }
  };

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <T v="h1">Website</T>
          <T v="small">Edit www.noonlearn.com — text, courses, images, links and menus</T>
        </View>
        <Pressable accessibilityRole="link" onPress={() => Linking.openURL(st.site_url)} style={{ height: 40, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="open-outline" size={16} color={colors.ink} /><T style={{ fontFamily: fonts.medium, fontSize: 13 }}>Open site</T>
        </Pressable>
      </Row>

      <Row gap={8} style={{ marginTop: 12 }}>
        <MiniStat value={st.unpublished} label="Pages not published" tint={st.unpublished ? colors.butter : colors.mint} />
        <MiniStat value={st.last_publish ? when(st.last_publish.at) : '—'} label={st.last_publish ? `Last publish · ${st.last_publish.by}` : 'Never published'} tint={colors.lav} />
      </Row>
      <Card style={{ marginTop: 12, gap: 10 }}>
        <T style={{ fontFamily: fonts.semibold }}>{st.unpublished ? 'You have changes that are not live yet' : 'Everything is live'}</T>
        <T v="small">Edits are saved as drafts. Publish puts all of them on the website at once.</T>
        <Button title={st.unpublished ? `Publish ${st.unpublished} page${st.unpublished === 1 ? '' : 's'}` : 'Publish'} icon="rocket-outline" onPress={publish} loading={busy} disabled={!st.unpublished} />
        {result ? <T style={{ color: /could not|did not/i.test(result) ? colors.red : colors.green }}>{result}</T> : null}
        {!st.deploy_hook ? (
          <T v="small" style={{ color: colors.muted }}>Setup needed once: in Vercel open the website project → Settings → Git → Deploy Hooks, create a hook, and put its address in the server’s .env as SITE_DEPLOY_HOOK=…</T>
        ) : null}
      </Card>

      <T v="label" style={{ marginTop: 18, marginBottom: 8, marginLeft: 4 }}>PAGES</T>
      {error ? <ErrorBox message={error} /> : !schema ? <Loading /> : (
        <View style={{ gap: 8 }}>
          {schema.pages.map((p) => {
            const s = state[p.id];
            const count = p.sections.reduce((n, sec) => n + sec.blocks.length, 0);
            return (
              <Card key={p.id} onPress={() => router.push(`/super/website/${p.id}` as any)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: p.shared ? colors.lav[0] : colors.sky[0], alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={p.shared ? 'layers-outline' : 'document-text-outline'} size={20} color={p.shared ? colors.lav[1] : colors.sky[1]} />
                </View>
                <View style={{ flex: 1 }}>
                  <T style={{ fontFamily: fonts.semibold }}>{p.label}</T>
                  <T v="small">{p.shared ? 'On every page' : p.url} · {count} things to edit{s?.edits ? ` · ${s.edits} edited` : ''}</T>
                </View>
                {s?.changed ? <Tagish text="Not published" tone={colors.butter} /> : s?.edits ? <Tagish text="Live" tone={colors.mint} /> : null}
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

function Tagish({ text, tone }: { text: string; tone: readonly [string, string] }) {
  return <View style={{ backgroundColor: tone[0], borderRadius: 12, paddingHorizontal: 10, height: 24, justifyContent: 'center' }}><T style={{ color: tone[1], fontFamily: fonts.semibold, fontSize: 11 }}>{text}</T></View>;
}

// ------------------------------------------------------------------ One page

export function WebsitePageScreen() {
  const { page } = useLocalSearchParams<{ page: string }>();
  const { data: st } = useApi<SiteState>('/super/site');
  const { schema, error } = useSchema(st?.site_url);
  const { data: saved, reload } = useApi<{ draft: Partial<Draft>; changed: boolean }>(`/super/site/${page}`);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [open, setOpen] = useState<Record<number, boolean>>({ 0: true });
  const [unpub, setUnpub] = useState(false);
  useEffect(() => { if (saved) setUnpub(!!saved.changed); }, [saved]);

  useEffect(() => {
    if (saved && !dirty) setDraft({ fields: { ...(saved.draft?.fields ?? {}) }, lists: { ...(saved.draft?.lists ?? {}) } });
  }, [saved]);
  const sp = useMemo(() => schema?.pages.find((p) => p.id === page), [schema, page]);

  if (error) return <Screen><ErrorBox message={error} /></Screen>;
  if (!st || !schema || !draft) return <Loading />;
  if (!sp) return <Screen><ErrorBox message="This page is not on the website." /></Screen>;
  const site = st.site_url;

  const change = (next: Draft) => { setDraft(next); setDirty(true); setMsg(null); };
  const setField = (f: Field, v: string) => {
    const fields = { ...draft.fields };
    if (v === f.value) delete fields[f.key]; else fields[f.key] = v;
    change({ ...draft, fields });
  };
  const itemsOf = (l: List): Item[] => draft.lists[l.key] ?? l.items.map((_, i) => ({ src: i, fields: {} }));
  const setItems = (l: List, items: Item[]) => {
    const lists = { ...draft.lists };
    const untouched = items.length === l.items.length && items.every((it, i) => it.src === i && !Object.keys(it.fields).length);
    if (untouched) delete lists[l.key]; else lists[l.key] = items;
    change({ ...draft, lists });
  };

  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await api.put<{ draft: Partial<Draft>; changed: boolean }>(`/super/site/${page}`, draft);
      setDraft({ fields: { ...(r.draft?.fields ?? {}) }, lists: { ...(r.draft?.lists ?? {}) } }); setDirty(false); setUnpub(!!r.changed);
      setMsg({ ok: true, text: 'Saved as a draft — not on the website yet. Press Publish now to make it live.' });
      return true;
    } catch (e) { setMsg({ ok: false, text: e instanceof ApiError ? e.friendly : 'Could not save.' }); return false; } finally { setBusy(false); }
  };
  const discard = async () => {
    if (!ask('Throw away the changes on this page that are not published yet?')) return;
    setBusy(true);
    try { await api.post(`/super/site/${page}/discard`); setDirty(false); setUnpub(false); reload(); setMsg({ ok: true, text: 'Changes thrown away.' }); }
    catch (e) { setMsg({ ok: false, text: e instanceof ApiError ? e.friendly : 'Could not do that.' }); } finally { setBusy(false); }
  };

  const publishNow = async () => {
    if (!ask('Publish to the live website now? (This also publishes changes saved on other pages.)')) return;
    if (dirty && !(await save())) return;
    setBusy(true);
    try {
      const r = await api.post<{ deploy: string }>('/super/site/publish');
      setUnpub(false);
      setMsg(r.deploy === 'started' ? { ok: true, text: 'Published! The website is rebuilding — reload it in about 1–2 minutes.' }
        : r.deploy === 'not_configured' ? { ok: true, text: 'Published, but the website rebuild is not set up (SITE_DEPLOY_HOOK).' }
          : { ok: false, text: 'Saved as published, but the website rebuild did not start. Try Publish again in a minute.' });
    } catch (e) { setMsg({ ok: false, text: e instanceof ApiError ? e.friendly : 'Could not publish.' }); } finally { setBusy(false); }
  };
  const actions = (
    <View style={{ gap: 8, marginTop: 12 }}>
      {dirty ? (
        <Row gap={10}>
          <Button kind="ghost" title="Save draft" icon="save-outline" onPress={save} loading={busy} style={{ flex: 1 }} />
          <Button title="Save & publish" icon="rocket-outline" onPress={publishNow} loading={busy} style={{ flex: 1 }} />
        </Row>
      ) : unpub ? (
        <Row gap={10}>
          <Button kind="ghost" title="Discard changes" onPress={discard} loading={busy} style={{ flex: 1 }} />
          <Button title="Publish now" icon="rocket-outline" onPress={publishNow} loading={busy} style={{ flex: 1 }} />
        </Row>
      ) : <T v="small" style={{ color: colors.green }}>✓ Everything on this page is live. Edit below, then Save & publish.</T>}
    </View>
  );
  const sectionEdited = (s: Section) => s.blocks.some((b) => (b.type === 'field' ? draft.fields[b.key] != null : draft.lists[b.key] != null));

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <T v="label">WEBSITE{sp.shared ? ' · ON EVERY PAGE' : ''}</T>
          <T v="h1">{sp.label}</T>
        </View>
        <Pressable accessibilityRole="link" onPress={() => Linking.openURL(fullUrl(site, sp.url))} style={{ height: 40, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="open-outline" size={16} color={colors.ink} /><T style={{ fontFamily: fonts.medium, fontSize: 13 }}>View live</T>
        </Pressable>
      </Row>
      <T v="small" style={{ marginTop: 6 }}>
        Tips: *word* shows a word in colour, **word** in bold, a new line breaks the line. Leave a text empty to hide it. ↺ puts back the original.
      </T>
      {msg ? <T style={{ marginTop: 8, color: msg.ok ? colors.green : colors.red }}>{msg.text}</T> : null}
      {dirty ? <T style={{ marginTop: 6, color: colors.butter[1], fontFamily: fonts.medium }}>Unsaved changes</T> : null}
      {actions}

      <View style={{ gap: 10, marginTop: 12 }}>
        {sp.sections.map((s, si) => {
          const isOpen = !!open[si];
          return (
            <Card key={si} style={{ padding: 0, overflow: 'hidden' }}>
              <Pressable accessibilityRole="button" onPress={() => setOpen({ ...open, [si]: !isOpen })} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 }}>
                <View style={{ flex: 1 }}>
                  <T style={{ fontFamily: fonts.semibold }}>{s.label}</T>
                  <T v="small">{s.blocks.length} item{s.blocks.length === 1 ? '' : 's'}</T>
                </View>
                {sectionEdited(s) ? <Tagish text="Edited" tone={colors.butter} /> : null}
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
              </Pressable>
              {isOpen ? (
                <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 14 }}>
                  {s.blocks.map((b) => b.type === 'field'
                    ? <FieldEditor key={b.key} f={b} site={site} value={draft.fields[b.key] ?? b.value} edited={draft.fields[b.key] != null} onChange={(v) => setField(b, v)} />
                    : <ListEditor key={b.key} l={b} site={site} items={itemsOf(b)} edited={draft.lists[b.key] != null} onChange={(items) => setItems(b, items)} onReset={() => { const lists = { ...draft.lists }; delete lists[b.key]; change({ ...draft, lists }); }} />)}
                </View>
              ) : null}
            </Card>
          );
        })}
      </View>
      {msg ? <T style={{ marginTop: 12, color: msg.ok ? colors.green : colors.red }}>{msg.text}</T> : null}
      {actions}
    </Screen>
  );
}

function FieldEditor({ f, value, edited, onChange, site, label }: { f: Field; value: string; edited: boolean; onChange: (v: string) => void; site: string; label?: string }) {
  const [up, setUp] = useState(false);
  const reset = edited ? (
    <Pressable accessibilityRole="button" accessibilityLabel={`Put back the original ${f.label}`} onPress={() => onChange(f.value)} hitSlop={8}>
      <T style={{ color: colors.violet, fontFamily: fonts.semibold, fontSize: 16 }}>↺</T>
    </Pressable>
  ) : null;
  const title = (
    <Row style={{ justifyContent: 'space-between' }}>
      <T v="small" style={{ fontFamily: fonts.medium, color: edited ? colors.violet : colors.muted }}>{label ?? f.label}{edited ? ' · edited' : ''}</T>
      {reset}
    </Row>
  );
  if (f.kind === 'image') {
    const pick = async () => {
      const r = await DocumentPicker.getDocumentAsync({ type: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'], copyToCacheDirectory: true });
      if (r.canceled || !r.assets?.[0]) return;
      const a = r.assets[0];
      if ((a.size ?? 0) > 5 * 1024 * 1024) return say('Please choose an image smaller than 5 MB.');
      const fd = new FormData();
      if (Platform.OS === 'web' && (a as any).file) fd.append('image', (a as any).file);
      else fd.append('image', { uri: a.uri, name: a.name ?? 'image.jpg', type: a.mimeType ?? 'image/jpeg' } as any);
      setUp(true);
      try { onChange((await api.post<{ url: string }>('/super/site/upload', fd)).url); }
      catch (e) { say(e instanceof ApiError ? e.friendly : 'Upload failed.'); } finally { setUp(false); }
    };
    return (
      <View style={{ gap: 6 }}>
        {title}
        <Row gap={10}>
          <View style={{ width: 96, height: 72, borderRadius: 12, backgroundColor: '#EEF3F5', overflow: 'hidden' }}>
            {value ? <Image source={{ uri: fullUrl(site, value) }} style={{ width: '100%', height: '100%' }} resizeMode="contain" /> : null}
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Button kind="ghost" title={up ? 'Uploading…' : 'Upload new image'} icon="cloud-upload-outline" onPress={pick} loading={up} />
            <T v="small" numberOfLines={1}>{value}</T>
          </View>
        </Row>
      </View>
    );
  }
  return (
    <View style={{ gap: 6 }}>
      {title}
      <Input accessibilityLabel={label ?? f.label} value={value} onChangeText={onChange} multiline={f.kind === 'long' || value.includes('\n')} placeholder={f.kind === 'link' ? 'https://… or /page' : '(hidden)'}
        keyboardType={f.kind === 'number' ? 'number-pad' : f.kind === 'link' ? 'url' : 'default'} autoCapitalize={f.kind === 'link' ? 'none' : 'sentences'} />
    </View>
  );
}

function ListEditor({ l, items, edited, onChange, onReset, site }: { l: List; items: Item[]; edited: boolean; onChange: (items: Item[]) => void; onReset: () => void; site: string }) {
  const base = (it: Item) => l.items[it.src != null && l.items[it.src] ? it.src : l.items.length - 1] ?? [];
  const move = (i: number, d: -1 | 1) => { const j = i + d; if (j < 0 || j >= items.length) return; const n = [...items]; [n[i], n[j]] = [n[j], n[i]]; onChange(n); };
  const title = (it: Item) => {
    const fs = base(it).filter((f) => f.kind === 'text' || f.kind === 'long');
    const main = fs.find((f) => /Title|Question|Point|Option/.test(f.label)) ?? fs[0];
    return main ? (it.fields[main.key] ?? main.value) || '(empty)' : 'Item';
  };
  return (
    <View style={{ gap: 8, borderRadius: 16, backgroundColor: '#F6F9FA', padding: 12 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T style={{ fontFamily: fonts.semibold }}>{l.label} · {items.length}</T>
        {edited ? <Pressable accessibilityRole="button" onPress={onReset}><T style={{ color: colors.violet, fontFamily: fonts.semibold, fontSize: 13 }}>↺ Original list</T></Pressable> : null}
      </Row>
      {items.map((it, i) => (
        <ListItem key={i} n={i} total={items.length} title={title(it)} fields={base(it)} item={it} site={site}
          onField={(f, v) => { const fields = { ...it.fields }; if (v === f.value) delete fields[f.key]; else fields[f.key] = v; const n = [...items]; n[i] = { ...it, fields }; onChange(n); }}
          onMove={(d) => move(i, d)}
          onCopy={() => { const n = [...items]; n.splice(i + 1, 0, { src: it.src, fields: { ...it.fields } }); onChange(n); }}
          onDelete={() => { if (ask(`Remove “${title(it)}”?`)) onChange(items.filter((_, k) => k !== i)); }} />
      ))}
      <Button kind="ghost" title="Add one (copy of the last)" icon="add-circle-outline"
        onPress={() => { const last = items[items.length - 1]; onChange([...items, last ? { src: last.src, fields: { ...last.fields } } : { src: null, fields: {} }]); }} />
    </View>
  );
}

function ListItem({ n, total, title, fields, item, site, onField, onMove, onCopy, onDelete }: {
  n: number; total: number; title: string; fields: Field[]; item: Item; site: string;
  onField: (f: Field, v: string) => void; onMove: (d: -1 | 1) => void; onCopy: () => void; onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const icon = (name: any, label: string, on: () => void, disabled = false) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={on} hitSlop={6} style={{ padding: 4, opacity: disabled ? 0.25 : 1 }}>
      <Ionicons name={name} size={18} color={colors.ink} />
    </Pressable>
  );
  return (
    <View style={{ backgroundColor: '#FFF', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 }}>
      <Row gap={4}>
        <Pressable accessibilityRole="button" onPress={() => setOpen(!open)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
          <T v="small" style={{ fontFamily: fonts.semibold, width: 18 }}>{n + 1}</T>
          <T style={{ flex: 1, fontFamily: fonts.medium }} numberOfLines={1}>{title.replace(/\*/g, '')}</T>
          {Object.keys(item.fields).length ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.violet }} /> : null}
        </Pressable>
        {icon('chevron-up', `Move ${title} up`, () => onMove(-1), n === 0)}
        {icon('chevron-down', `Move ${title} down`, () => onMove(1), n === total - 1)}
        {icon('copy-outline', `Copy ${title}`, onCopy)}
        {icon('trash-outline', `Remove ${title}`, onDelete)}
        {icon(open ? 'chevron-collapse-outline' : 'create-outline', open ? 'Close' : `Edit ${title}`, () => setOpen(!open))}
      </Row>
      {open ? (
        <View style={{ gap: 12, paddingTop: 8, paddingBottom: 6 }}>
          {fields.map((f) => <FieldEditor key={f.key} f={f} site={site} value={item.fields[f.key] ?? f.value} edited={item.fields[f.key] != null} onChange={(v) => onField(f, v)} />)}
        </View>
      ) : null}
    </View>
  );
}
