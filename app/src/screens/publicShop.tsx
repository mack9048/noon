// Public shop for website visitors (no account, no app): products, cart kept in this browser,
// checkout by UPI or Cash on Delivery, and the order page reached by its secret link.
// Served at /shop and /account/shop (noonlearn.com forwards /account/* to this app).
import React, { useEffect, useState } from 'react';
import { Image, Linking, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, usePathname } from 'expo-router';
import { Button, Card, Empty, ErrorBox, Grid, Loading, Row, T } from '@/components/ui';
import { Chips, demoNote } from '@/components/kit';
import { Input } from '@/components/kit2';
import { Logo } from '@/components/Logo';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useLayout } from '@/lib/useLayout';
import { CATEGORIES, catOf, Category, isPhoneWeb, Order, orderHint, Product, rupee, ShopSettings, upiLink } from '@/lib/shop';
import { colors, fonts, scriptFont } from '@/theme/tokens';
import { Cover, Price, StatusTag, Stepper } from './shop';

const W: any = globalThis;
const errText = (e: unknown, f = 'Something went wrong. Please try again.') => (e instanceof ApiError ? e.friendly : f);

/* ---------- Cart and orders kept in this browser ---------- */
type Line = { id: number; qty: number; title: string; price: number; type: Product['type']; category: Category; cover: string | null; max: number };
type Saved = { ref: string; token: string; total: number; at: number };
const CART = 'noon.shop.cart';
const ORDERS = 'noon.shop.orders';
const BUYER = 'noon.shop.buyer';
let memory: Record<string, unknown> = {};
const read = <T,>(k: string, f: T): T => { try { const v = W.localStorage?.getItem(k); return v ? (JSON.parse(v) as T) : ((memory[k] as T) ?? f); } catch { return (memory[k] as T) ?? f; } };
const write = (k: string, v: unknown) => { memory[k] = v; try { W.localStorage?.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((l) => l());
function useCart() {
  const [lines, setLines] = useState<Line[]>(() => read(CART, []));
  useEffect(() => { const l = () => setLines(read(CART, [])); listeners.add(l); return () => { listeners.delete(l); }; }, []);
  const save = (next: Line[]) => { write(CART, next); changed(); };
  return {
    lines,
    count: lines.reduce((n, l) => n + l.qty, 0),
    add: (p: Product, qty = 1) => {
      const cur = read<Line[]>(CART, []);
      const max = p.type === 'digital' ? 1 : Math.min(20, p.stock ?? 20);
      const found = cur.find((l) => l.id === p.id);
      if (found) found.qty = Math.min(max, found.qty + (p.type === 'digital' ? 0 : qty));
      else cur.push({ id: p.id, qty: Math.min(max, p.type === 'digital' ? 1 : qty), title: p.title, price: p.unit_price, type: p.type, category: p.category, cover: p.cover_url ?? null, max });
      save(cur);
    },
    setQty: (id: number, qty: number) => save(read<Line[]>(CART, []).map((l) => (l.id === id ? { ...l, qty: Math.min(l.max, qty) } : l)).filter((l) => l.qty > 0)),
    clear: () => save([]),
  };
}
const asProduct = (l: Line): Product => ({ id: l.id, type: l.type, category: l.category, title: l.title, price: l.price, unit_price: l.price, cover_url: l.cover, in_stock: true });

/** /shop or /account/shop, whichever this page was opened under. */
function useShopBase() {
  const path = usePathname();
  return path.startsWith('/account/shop') ? '/account/shop' : '/shop';
}

/* ---------- Page frame: logo, Shop, My orders, Cart ---------- */
function ShopFrame({ children, title }: { children: React.ReactNode; title?: string }) {
  const base = useShopBase();
  const { count } = useCart();
  const { isPhone } = useLayout();
  useEffect(() => { if (Platform.OS === 'web' && title) W.document.title = `${title} · Noon Learn`; }, [title]);
  return (
    <View style={{ flex: 1, backgroundColor: '#F4F7FB' }}>
      <View style={{ backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: colors.line }}>
        <Row style={{ width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: isPhone ? 14 : 24, height: 64, justifyContent: 'space-between' }}>
          <Pressable accessibilityRole="link" accessibilityLabel="Noon Learn" onPress={() => (Platform.OS === 'web' ? W.location.assign('/') : router.replace('/' as any))}><Logo height={isPhone ? 30 : 36} /></Pressable>
          <Row gap={8}>
            <Pressable accessibilityRole="link" onPress={() => router.push(base as any)} style={{ paddingHorizontal: 10, height: 40, justifyContent: 'center' }}><T style={{ fontFamily: fonts.semibold, color: colors.ink }}>Shop</T></Pressable>
            {!isPhone ? <Pressable accessibilityRole="link" onPress={() => router.push(`${base}/orders` as any)} style={{ paddingHorizontal: 10, height: 40, justifyContent: 'center' }}><T style={{ fontFamily: fonts.semibold, color: colors.ink }}>My orders</T></Pressable> : null}
            <Pressable accessibilityRole="button" accessibilityLabel={`Cart, ${count} items`} onPress={() => router.push(`${base}/checkout` as any)}
              style={{ height: 42, paddingHorizontal: 14, borderRadius: 21, backgroundColor: '#1B3A8C', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="cart" size={18} color="#FFF" /><T style={{ color: '#FFF', fontFamily: fonts.semibold }}>{count}</T>
            </Pressable>
          </Row>
        </Row>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        <View style={{ width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: isPhone ? 14 : 24, paddingTop: 18 }}>{children}</View>
      </ScrollView>
    </View>
  );
}

/* ---------- Shop ---------- */
export function PublicShopScreen() {
  const base = useShopBase();
  const { category } = useLocalSearchParams<{ category?: string }>();
  const valid = CATEGORIES.some((c) => c.key === category);
  const [cat, setCat] = useState<Category | 'all'>(valid ? (category as Category) : 'all');
  const [q, setQ] = useState('');
  const list = useApi<Product[]>('/shop/products');
  const cart = useCart();
  const all = list.data ?? [];
  const shown = all.filter((p) => (cat === 'all' || p.category === cat) && (!q.trim() || p.title.toLowerCase().includes(q.trim().toLowerCase())));
  const pick = (k: Category | 'all') => { setCat(k); if (Platform.OS === 'web') W.history.replaceState(null, '', k === 'all' ? base : `${base}?category=${k}`); };
  const used = CATEGORIES.filter((c) => all.some((p) => p.category === c.key));
  return (
    <ShopFrame title={cat === 'all' ? 'Shop' : catOf(cat).label}>
      <T style={{ fontFamily: fonts.fun, fontSize: 32, color: '#0F2B5B' }}>{cat === 'all' ? 'Books & learning resources' : catOf(cat).label}</T>
      <T style={{ color: colors.muted, marginTop: 8 }}>Buy here, no account needed. Pay by UPI, or Cash on Delivery for printed items.</T>
      {cat === 'all' && !q.trim() && used.length ? (
        <View style={{ marginTop: 16 }}>
          <Grid cols={{ phone: 2, tablet: 4, desktop: 4 }} gap={12}>
            {used.map((c) => (
              <Pressable key={c.key} accessibilityRole="button" accessibilityLabel={c.label} onPress={() => pick(c.key)} style={{ borderRadius: 22, backgroundColor: c.tint[0], padding: 16, gap: 10, minHeight: 110 }}>
                <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' }}><Ionicons name={c.icon} size={21} color={c.tint[1]} /></View>
                <T style={{ fontFamily: fonts.semibold, color: '#0F2B5B' }}>{c.label}</T>
                <T style={{ color: c.tint[1], fontFamily: fonts.semibold, fontSize: 13 }}>Open →</T>
              </Pressable>
            ))}
          </Grid>
        </View>
      ) : null}
      <View style={{ marginTop: 14 }}><Input value={q} onChangeText={setQ} placeholder="Search books, audio, charts…" accessibilityLabel="Search the shop" /></View>
      <Chips value={cat} onChange={pick} options={[{ key: 'all', label: `All · ${all.length}` }, ...used.map((c) => ({ key: c.key as Category | 'all', label: c.label }))]} />
      {list.loading && !list.data ? <Loading /> : list.error ? <ErrorBox message={list.error} onRetry={list.reload} /> : !shown.length ? <Empty text="Nothing here yet. Please check back soon." /> : (
        <Grid cols={{ phone: 2, tablet: 3, desktop: 4 }} gap={12}>
          {shown.map((p) => (
            <View key={p.id} style={{ borderRadius: 20, backgroundColor: '#FFF', overflow: 'hidden', borderWidth: 1, borderColor: colors.line }}>
              <Pressable accessibilityRole="link" accessibilityLabel={p.title} onPress={() => router.push(`${base}/${p.id}` as any)}><Cover p={p} height={140} /></Pressable>
              <View style={{ padding: 12, gap: 4, flex: 1 }}>
                <Pressable onPress={() => router.push(`${base}/${p.id}` as any)}><T style={{ fontFamily: scriptFont(p.title), fontSize: 15, color: '#0F2B5B' }} numberOfLines={2}>{p.title}</T></Pressable>
                <T v="small">{catOf(p.category).label}</T>
                <Price p={p} />
                {p.in_stock ? <Button title="Add to cart" icon="cart-outline" kind="ghost" style={{ height: 38, marginTop: 6, paddingHorizontal: 8 }} onPress={() => { cart.add(p); demoNote(`Added "${p.title}" to your cart.`); }} />
                  : <T v="small" style={{ color: colors.red, marginTop: 6 }}>Out of stock</T>}
              </View>
            </View>
          ))}
        </Grid>
      )}
    </ShopFrame>
  );
}

/* ---------- One product ---------- */
export function PublicProductScreen() {
  const base = useShopBase();
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = useApi<Product>(`/shop/item/${id}`);
  const cart = useCart();
  const { isPhone } = useLayout();
  const [qty, setQty] = useState(1);
  if (p.loading && !p.data) return <ShopFrame><Loading /></ShopFrame>;
  if (!p.data) return <ShopFrame><ErrorBox message={p.error ?? 'This item is not for sale.'} onRetry={p.reload} /></ShopFrame>;
  const it = p.data;
  const c = catOf(it.category);
  return (
    <ShopFrame title={it.title}>
      <Pressable onPress={() => router.push(`${base}?category=${it.category}` as any)} style={{ marginBottom: 10 }}><T style={{ color: '#1F5FE0', fontFamily: fonts.semibold }}>← {c.label}</T></Pressable>
      <View style={{ flexDirection: isPhone ? 'column' : 'row', gap: 22 }}>
        <View style={{ flex: isPhone ? undefined : 1, borderRadius: 24, overflow: 'hidden' }}><Cover p={it} height={isPhone ? 240 : 380} /></View>
        <View style={{ flex: isPhone ? undefined : 1, gap: 10 }}>
          <T v="small" style={{ color: c.tint[1], fontFamily: fonts.semibold }}>{c.label.toUpperCase()}</T>
          <T style={{ fontFamily: scriptFont(it.title), fontSize: 28, color: '#0F2B5B' }}>{it.title}</T>
          <Price p={it} big />
          <Card tint={it.type === 'digital' ? '#EEF1FF' : '#E6F4F4'} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Ionicons name={it.type === 'digital' ? 'cloud-download-outline' : 'cube-outline'} size={22} color={it.type === 'digital' ? '#1F5FE0' : colors.teal} />
            <T style={{ flex: 1, fontSize: 14 }}>{it.type === 'digital' ? 'Digital file. Download it from your order page as soon as we confirm your UPI payment.' : `Printed and delivered to your address.${it.stock != null ? ` ${it.stock} in stock.` : ''} UPI or Cash on Delivery.`}</T>
          </Card>
          {it.description ? <T style={{ color: colors.muted, lineHeight: 22 }} auto>{it.description}</T> : null}
          {!it.in_stock ? <T style={{ color: colors.red, fontFamily: fonts.semibold }}>Out of stock</T> : (
            <>
              {it.type === 'physical' ? <Row gap={10}><T style={{ fontFamily: fonts.medium }}>Quantity</T><Stepper value={qty} onChange={setQty} max={Math.min(20, it.stock ?? 20)} /></Row> : null}
              <Row gap={10}>
                <Button title="Add to cart" icon="cart-outline" kind="ghost" style={{ flex: 1 }} onPress={() => { cart.add(it, qty); demoNote('Added to your cart.'); }} />
                <Button title="Buy now" icon="flash" kind="yellow" style={{ flex: 1 }} onPress={() => { cart.add(it, qty); router.push(`${base}/checkout` as any); }} />
              </Row>
            </>
          )}
        </View>
      </View>
    </ShopFrame>
  );
}

/* ---------- Cart + checkout ---------- */
export function PublicCheckoutScreen() {
  const base = useShopBase();
  const cart = useCart();
  const { isPhone } = useLayout();
  const settings = useApi<ShopSettings>('/shop/checkout-settings');
  const saved = read<Record<string, string>>(BUYER, {});
  const [f, setF] = useState({ buyer_name: saved.buyer_name ?? '', buyer_phone: saved.buyer_phone ?? '', buyer_email: saved.buyer_email ?? '', ship_address: saved.ship_address ?? '', ship_city: saved.ship_city ?? '', ship_state: saved.ship_state ?? 'Kerala', ship_pincode: saved.ship_pincode ?? '', note: '' });
  const [method, setMethod] = useState<'upi' | 'cod'>('upi');
  const [hp, setHp] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const s = settings.data;
  const sub = cart.lines.reduce((n, l) => n + l.price * l.qty, 0);
  const physical = cart.lines.some((l) => l.type === 'physical');
  const digital = cart.lines.some((l) => l.type === 'digital');
  const ship = physical && s && sub < s.free_shipping_above ? s.shipping_fee : 0;
  const total = sub + ship;
  const codWhy = !physical ? 'Only for printed items' : s && !s.cod_enabled ? 'Not available now' : digital ? 'Not with digital files in the cart' : s?.cod_max && total > s.cod_max ? `Only up to ${rupee(s.cod_max)}` : null;
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const place = async () => {
    setErr('');
    if (!f.buyer_name.trim() || f.buyer_phone.replace(/\D/g, '').length < 10) return setErr('Please enter your name and a phone number with 10 digits.');
    setBusy(true);
    write(BUYER, { ...f, note: undefined });
    try {
      const body: Record<string, unknown> = {
        items: cart.lines.map((l) => ({ product_id: l.id, qty: l.qty })), buyer_name: f.buyer_name.trim(), buyer_phone: f.buyer_phone.trim(), buyer_email: f.buyer_email.trim() || undefined,
        payment_method: codWhy ? 'upi' : method, note: f.note.trim() || undefined, website: hp,
        ...(physical ? { ship_name: f.buyer_name.trim(), ship_phone: f.buyer_phone.trim(), ship_address: f.ship_address.trim(), ship_city: f.ship_city.trim(), ship_state: f.ship_state.trim(), ship_pincode: f.ship_pincode.trim() } : {}),
      };
      const o = await api.post<Order & { token: string }>('/shop/web-orders', body);
      write(ORDERS, [{ ref: o.ref, token: o.token, total: o.total, at: Date.now() }, ...read<Saved[]>(ORDERS, [])].slice(0, 30));
      cart.clear();
      router.replace(`${base}/order?ref=${encodeURIComponent(o.ref)}&t=${encodeURIComponent(o.token)}` as any);
    } catch (e) { setErr(errText(e, 'Could not place the order.')); } finally { setBusy(false); }
  };
  const line = (k: string, v: string, bold = false) => <Row style={{ justifyContent: 'space-between' }}><T style={bold ? { fontFamily: fonts.semibold, fontSize: 18 } : { color: colors.muted }}>{k}</T><T style={bold ? { fontFamily: fonts.semibold, fontSize: 18 } : undefined}>{v}</T></Row>;
  const payOpt = (key: 'upi' | 'cod', title: string, sub2: string, disabled: string | null) => (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: method === key && !disabled, disabled: !!disabled }} disabled={!!disabled} onPress={() => setMethod(key)}
      style={{ flex: 1, minWidth: 220, borderRadius: 16, borderWidth: 2, borderColor: method === key && !disabled ? '#1F5FE0' : colors.line, backgroundColor: '#FFF', padding: 12, gap: 2, opacity: disabled ? 0.5 : 1 }}>
      <Row gap={8}><Ionicons name={method === key && !disabled ? 'radio-button-on' : 'radio-button-off'} size={20} color="#1F5FE0" /><T style={{ fontFamily: fonts.semibold }}>{title}</T></Row>
      <T v="small">{disabled ?? sub2}</T>
    </Pressable>
  );
  if (!cart.lines.length) return <ShopFrame title="Cart"><Empty text="Your cart is empty." /><Button title="Go to the shop" icon="storefront-outline" onPress={() => router.replace(base as any)} /></ShopFrame>;
  return (
    <ShopFrame title="Checkout">
      <T style={{ fontFamily: fonts.fun, fontSize: 30, color: '#0F2B5B', marginBottom: 12 }}>Checkout</T>
      <View style={{ flexDirection: isPhone ? 'column' : 'row', gap: 18, alignItems: 'flex-start' }}>
        <View style={{ flex: isPhone ? undefined : 1.4, width: isPhone ? '100%' : undefined, gap: 14 }}>
          <Card style={{ gap: 10 }}>
            <T v="h3">Your details</T>
            <Input label="Full name" value={f.buyer_name} onChangeText={set('buyer_name')} autoComplete="name" />
            <Row gap={10} style={{ flexWrap: 'wrap' }}>
              <View style={{ flex: 1, minWidth: 200 }}><Input label="Phone (WhatsApp)" value={f.buyer_phone} onChangeText={set('buyer_phone')} keyboardType="phone-pad" autoComplete="tel" /></View>
              <View style={{ flex: 1, minWidth: 200 }}><Input label="Email (optional)" value={f.buyer_email} onChangeText={set('buyer_email')} keyboardType="email-address" autoCapitalize="none" /></View>
            </Row>
            {physical ? (
              <>
                <T v="h3" style={{ marginTop: 8 }}>Delivery address</T>
                <Input label="House, street, area" value={f.ship_address} onChangeText={set('ship_address')} multiline />
                <Row gap={10} style={{ flexWrap: 'wrap' }}>
                  <View style={{ flex: 1, minWidth: 140 }}><Input label="City / town" value={f.ship_city} onChangeText={set('ship_city')} /></View>
                  <View style={{ flex: 1, minWidth: 140 }}><Input label="State" value={f.ship_state} onChangeText={set('ship_state')} /></View>
                  <View style={{ flex: 1, minWidth: 110 }}><Input label="PIN code" value={f.ship_pincode} onChangeText={set('ship_pincode')} keyboardType="number-pad" maxLength={6} /></View>
                </Row>
              </>
            ) : null}
            <T v="h3" style={{ marginTop: 8 }}>Payment</T>
            <Row gap={10} style={{ flexWrap: 'wrap', alignItems: 'stretch' }}>
              {payOpt('upi', 'UPI', 'GPay, PhonePe, Paytm or any UPI app. Pay, then send us the UPI reference.', null)}
              {payOpt('cod', 'Cash on Delivery', 'Pay in cash when the parcel arrives.', codWhy)}
            </Row>
            <Input label="Note for us (optional)" value={f.note} onChangeText={set('note')} />
            {/* A field people never see: forms filled by bots are dropped. */}
            <View style={{ position: 'absolute', left: -9999, width: 1, height: 1, overflow: 'hidden' }} aria-hidden>
              <TextInput value={hp} onChangeText={setHp} accessibilityLabel="Leave this empty" tabIndex={-1 as any} />
            </View>
            {err ? <T style={{ color: colors.red }}>{err}</T> : null}
            <Button title={`Place order · ${rupee(total)}`} icon="checkmark" kind="yellow" loading={busy} onPress={place} />
          </Card>
        </View>
        <Card style={{ flex: isPhone ? undefined : 1, width: isPhone ? '100%' : undefined, gap: 10 }}>
          <T v="h3">Your order</T>
          {cart.lines.map((l) => (
            <Row key={l.id} gap={10} style={{ borderBottomWidth: 1, borderBottomColor: colors.line, paddingBottom: 10 }}>
              <View style={{ width: 52, height: 52, borderRadius: 12, overflow: 'hidden' }}><Cover p={asProduct(l)} height={52} /></View>
              <View style={{ flex: 1, gap: 4 }}>
                <T style={{ fontFamily: scriptFont(l.title) }} numberOfLines={2}>{l.title}</T>
                <T v="small">{rupee(l.price)} · {l.type === 'digital' ? 'Digital' : 'Printed'}</T>
                {l.type === 'physical' ? <Stepper value={l.qty} onChange={(n) => cart.setQty(l.id, n)} max={l.max} /> : null}
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <T style={{ fontFamily: fonts.semibold }}>{rupee(l.price * l.qty)}</T>
                <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${l.title}`} onPress={() => cart.setQty(l.id, 0)} style={{ padding: 4 }}><Ionicons name="trash-outline" size={18} color={colors.red} /></Pressable>
              </View>
            </Row>
          ))}
          {line('Items', rupee(sub))}
          {physical ? line('Delivery', ship ? rupee(ship) : 'Free') : null}
          {physical && ship && s?.free_shipping_above ? <T v="small">Free delivery above {rupee(s.free_shipping_above)}.</T> : null}
          {line('Total', rupee(total), true)}
        </Card>
      </View>
    </ShopFrame>
  );
}

/* ---------- Order page (secret link) ---------- */
type WebOrder = Order & { buyer_name?: string; downloads?: { title: string; file_name?: string; url: string }[] };
export function PublicOrderScreen() {
  const { ref, t } = useLocalSearchParams<{ ref?: string; t?: string }>();
  const o = useApi<WebOrder>(ref && t ? `/shop/web-orders/${encodeURIComponent(ref)}?t=${encodeURIComponent(t)}` : null);
  const [data, setData] = useState<WebOrder | null>(null);
  const [utr, setUtr] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { if (o.data) setData(o.data); }, [o.data]);
  if (!ref || !t) return <ShopFrame title="Order"><Empty text="Open your order with the link you got after ordering." /></ShopFrame>;
  if (o.loading && !data) return <ShopFrame title="Order"><Loading /></ShopFrame>;
  if (!data) return <ShopFrame title="Order"><ErrorBox message={o.error ?? 'Order not found.'} onRetry={o.reload} /></ShopFrame>;
  const d = data;
  const s = d.settings;
  const q = `?t=${encodeURIComponent(t)}`;
  const needPay = d.payment_method === 'upi' && (d.payment_status === 'unpaid' || d.payment_status === 'verifying') && d.status !== 'cancelled';
  const canCancel = (d.status === 'placed' || d.status === 'confirmed') && d.payment_status !== 'paid';
  const send = async () => {
    setBusy(true); setErr('');
    try { setData(await api.post<WebOrder>(`/shop/web-orders/${encodeURIComponent(d.ref)}/upi${q}`, { upi_ref: utr.trim() })); setUtr(''); } catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  };
  const cancel = async () => { try { setData(await api.post<WebOrder>(`/shop/web-orders/${encodeURIComponent(d.ref)}/cancel${q}`)); } catch (e) { demoNote(errText(e)); } };
  const copy = (v: string) => { try { W.navigator?.clipboard?.writeText(v); demoNote('Copied.'); } catch { /* not available */ } };
  return (
    <ShopFrame title={`Order ${d.ref}`}>
      <View style={{ gap: 12, maxWidth: 780, width: '100%' }}>
        <T style={{ fontFamily: fonts.fun, fontSize: 28, color: '#0F2B5B' }}>Order {d.ref}</T>
        <T v="small">Placed {new Date(d.placed_at).toLocaleString()}{d.buyer_name ? ` · ${d.buyer_name}` : ''}</T>
        <Card style={{ gap: 6 }}><StatusTag o={d} /><T style={{ fontFamily: fonts.semibold, fontSize: 17 }}>{orderHint(d).replace('Your files are in My library.', 'Your files are ready below.')}</T>{d.admin_note ? <T v="small">Note from Noon Learn: {d.admin_note}</T> : null}</Card>
        {needPay && s ? (
          <Card style={{ gap: 10 }}>
            <T v="h3">Pay {rupee(d.total)} by UPI</T>
            {s.upi_id ? (
              <>
                <Row gap={8} style={{ flexWrap: 'wrap' }}><T>UPI ID: <T style={{ fontFamily: fonts.semibold }} selectable>{s.upi_id}</T> ({s.upi_name})</T><Button title="Copy" icon="copy-outline" kind="ghost" style={{ height: 34, paddingHorizontal: 10 }} onPress={() => copy(s.upi_id)} /></Row>
                {isPhoneWeb() ? <Button title="Pay with a UPI app" icon="phone-portrait-outline" kind="yellow" onPress={() => Linking.openURL(upiLink(s, d.total, d.ref)).catch(() => demoNote('No UPI app found. Pay to the UPI ID above.'))} /> : null}
                {s.upi_qr_url ? <View style={{ alignItems: 'center', gap: 4 }}><Image source={{ uri: s.upi_qr_url }} style={{ width: 200, height: 200 }} resizeMode="contain" accessibilityLabel="UPI QR code" /><T v="small">Scan with any UPI app</T></View> : null}
              </>
            ) : <T v="small">UPI details will show here soon.{s.support_phone ? ` Call ${s.support_phone}.` : ''}</T>}
            <T style={{ fontFamily: fonts.medium }}>{d.payment_status === 'verifying' ? `UPI reference sent: ${d.upi_ref}. Wrong number? Send it again:` : 'After paying, enter the UPI reference (UTR) number from your payment app:'}</T>
            <Row gap={8}>
              <View style={{ flex: 1 }}><Input value={utr} onChangeText={setUtr} placeholder="eg. 412345678901" accessibilityLabel="UPI reference number" /></View>
              <Button title="Send" icon="send" loading={busy} disabled={utr.trim().length < 6} style={{ height: 50 }} onPress={send} />
            </Row>
            {err ? <T style={{ color: colors.red }}>{err}</T> : null}
          </Card>
        ) : null}
        {d.downloads?.length ? (
          <Card style={{ gap: 8 }}>
            <T v="h3">Your downloads</T>
            {d.downloads.map((x) => <Row key={x.url} gap={10}><Button title="Download" icon="download-outline" style={{ height: 38 }} onPress={() => Linking.openURL(x.url)} /><T style={{ flex: 1 }}>{x.title}</T></Row>)}
            <T v="small">Links work for 2 hours; open this page again for fresh links.</T>
          </Card>
        ) : null}
        <Card style={{ gap: 6 }}>
          <T v="h3">Items</T>
          {d.items.map((i, k) => <Row key={k} style={{ justifyContent: 'space-between', gap: 10 }}><T style={{ flex: 1 }}>{i.title} <T v="small">· {i.type === 'digital' ? 'Digital' : 'Printed'}{i.qty > 1 ? ` · ×${i.qty}` : ''}</T></T><T>{rupee(i.line_total)}</T></Row>)}
          <Row style={{ justifyContent: 'space-between' }}><T style={{ color: colors.muted }}>Delivery</T><T>{d.shipping ? rupee(d.shipping) : 'Free'}</T></Row>
          <Row style={{ justifyContent: 'space-between' }}><T style={{ fontFamily: fonts.semibold, fontSize: 18 }}>Total</T><T style={{ fontFamily: fonts.semibold, fontSize: 18 }}>{rupee(d.total)}</T></Row>
          <T v="small">Payment: {d.payment_method === 'cod' ? 'Cash on Delivery' : 'UPI'}</T>
        </Card>
        {d.ship ? <Card style={{ gap: 2 }}><T v="h3">Delivery to</T><T>{d.ship.name} · {d.ship.phone}</T><T v="small">{d.ship.address}, {d.ship.city}, {d.ship.state} {d.ship.pincode}</T>{d.tracking_no ? <T v="small">Tracking: {d.courier ? `${d.courier} · ` : ''}{d.tracking_no}</T> : null}</Card> : null}
        <Card tint="#EEF1FF" style={{ gap: 6 }}>
          <T style={{ fontFamily: fonts.semibold }}>Keep this page</T>
          <T v="small">Bookmark it or copy the link: it is how you see this order without an account.</T>
          {Platform.OS === 'web' ? <Button title="Copy order link" icon="link-outline" kind="ghost" style={{ alignSelf: 'flex-start', height: 38 }} onPress={() => copy(W.location.href)} /> : null}
        </Card>
        {canCancel ? <Button title="Cancel order" kind="ghost" icon="close-circle-outline" onPress={cancel} /> : null}
      </View>
    </ShopFrame>
  );
}

/* ---------- My orders (this browser) ---------- */
export function PublicOrdersScreen() {
  const base = useShopBase();
  const mine = read<Saved[]>(ORDERS, []);
  return (
    <ShopFrame title="My orders">
      <T style={{ fontFamily: fonts.fun, fontSize: 28, color: '#0F2B5B' }}>My orders</T>
      <T v="small" style={{ marginBottom: 12 }}>Orders placed on this phone or computer.</T>
      {!mine.length ? <Empty text="No orders yet on this device." /> : (
        <Grid cols={{ phone: 1, tablet: 2, desktop: 3 }} gap={10}>
          {mine.map((o) => (
            <Card key={o.ref} onPress={() => router.push(`${base}/order?ref=${encodeURIComponent(o.ref)}&t=${encodeURIComponent(o.token)}` as any)} style={{ gap: 4 }}>
              <T style={{ fontFamily: fonts.semibold }}>{o.ref}</T>
              <T v="small">{rupee(o.total)} · {new Date(o.at).toLocaleDateString()}</T>
              <T style={{ color: '#1F5FE0', fontFamily: fonts.semibold }}>View order →</T>
            </Card>
          ))}
        </Grid>
      )}
    </ShopFrame>
  );
}
