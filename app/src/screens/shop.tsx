// Shop for every role: categories, products, cart, checkout (direct UPI or Cash on Delivery),
// orders with their status, and the library of bought digital files.
import React, { useEffect, useState } from 'react';
import { Image, Linking, Platform, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Card, Empty, ErrorBox, Grid, Header, Loading, Row, Screen, T } from '@/components/ui';
import { Chips, demoNote } from '@/components/kit';
import { Input } from '@/components/kit2';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/lib/auth';
import { useBase } from '@/lib/useBase';
import { useLayout } from '@/lib/useLayout';
import {
  Cart, CATEGORIES, catOf, Category, fileSize, isPhoneWeb, Order, orderHint, PAY_LABEL, Product, rupee, setCartCount, setNextPath, STATUS_LABEL, upiLink, useCartCount,
} from '@/lib/shop';
import { colors, fonts, scriptFont } from '@/theme/tokens';

const errText = (e: unknown, f = 'Something went wrong. Please try again.') => (e instanceof ApiError ? e.friendly : f);
const web = Platform.OS === 'web';

/** Cart button with the number of items, for the top of shop pages. */
function CartButton() {
  const base = useBase();
  const n = useCartCount();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Cart, ${n} item${n === 1 ? '' : 's'}`} onPress={() => router.push(`${base}/shop/cart` as any)}
      style={{ height: 46, paddingHorizontal: 16, borderRadius: 23, backgroundColor: colors.ink, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Ionicons name="cart" size={20} color="#FFF" />
      <T style={{ color: '#FFF', fontFamily: fonts.semibold }}>Cart</T>
      {n ? <View style={{ minWidth: 22, height: 22, borderRadius: 11, backgroundColor: colors.yellow, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }}><T style={{ fontSize: 12, fontFamily: fonts.semibold, color: colors.ink }}>{n}</T></View> : null}
    </Pressable>
  );
}

function Price({ p, big }: { p: Product; big?: boolean }) {
  const off = p.offer_price != null && p.offer_price < p.price;
  return (
    <Row gap={6}>
      <T style={{ fontFamily: fonts.semibold, fontSize: big ? 26 : 16, color: colors.ink }}>{p.unit_price ? rupee(p.unit_price) : 'Free'}</T>
      {off ? <T style={{ textDecorationLine: 'line-through', color: colors.muted, fontSize: big ? 16 : 12 }}>{rupee(p.price)}</T> : null}
      {off ? <T style={{ color: colors.green, fontSize: big ? 14 : 11, fontFamily: fonts.semibold }}>{Math.round((1 - p.unit_price / p.price) * 100)}% off</T> : null}
    </Row>
  );
}

function Cover({ p, height }: { p: Product; height: number }) {
  const c = catOf(p.category);
  return (
    <View style={{ height, backgroundColor: c.tint[0], alignItems: 'center', justifyContent: 'center' }}>
      {p.cover_url ? <Image source={{ uri: p.cover_url }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} resizeMode="cover" accessibilityIgnoresInvertColors />
        : <Ionicons name={c.icon} size={Math.min(56, height / 2.4)} color={c.tint[1]} />}
      {height >= 100 ? (
        <View style={{ position: 'absolute', left: 8, top: 8, backgroundColor: '#FFF', borderRadius: 10, paddingHorizontal: 8, height: 22, justifyContent: 'center' }}>
          <T style={{ fontSize: 10, fontFamily: fonts.semibold, color: p.type === 'digital' ? colors.violet : colors.teal }}>{p.type === 'digital' ? 'DIGITAL' : 'PRINTED'}</T>
        </View>
      ) : null}
    </View>
  );
}

async function addToCart(p: Product, qty = 1) {
  const c = await api.post<Cart>('/shop/cart', { product_id: p.id, qty });
  setCartCount(c.count);
  return c;
}

/* ---------- Shop home ---------- */
export function ShopScreen() {
  const base = useBase();
  const { category } = useLocalSearchParams<{ category?: Category }>();
  const [cat, setCat] = useState<Category | 'all'>(category ?? 'all');
  const [q, setQ] = useState('');
  const qs = new URLSearchParams();
  if (cat !== 'all') qs.set('category', cat);
  if (q.trim()) qs.set('q', q.trim());
  const list = useApi<Product[]>(`/shop/products${qs.toString() ? `?${qs}` : ''}`);
  const [adding, setAdding] = useState<number | null>(null);
  const add = async (p: Product) => {
    setAdding(p.id);
    try { await addToCart(p); demoNote(`Added "${p.title}" to your cart.`); } catch (e) { demoNote(errText(e)); } finally { setAdding(null); }
  };
  const browsing = cat === 'all' && !q.trim();
  return (
    <Screen>
      <Header title="Shop" subtitle="Books, audio, charts and cards for learning at home and in the madrasa" right={<CartButton />} />
      <Row gap={8} style={{ flexWrap: 'wrap', marginBottom: 6 }}>
        <Button title="My orders" icon="receipt-outline" kind="ghost" style={{ height: 40 }} onPress={() => router.push(`${base}/shop/orders` as any)} />
        <Button title="My library" icon="library-outline" kind="ghost" style={{ height: 40 }} onPress={() => router.push(`${base}/shop/library` as any)} />
      </Row>
      <Input value={q} onChangeText={setQ} placeholder="Search books, audio, charts…" accessibilityLabel="Search the shop" />
      {browsing ? (
        <View style={{ marginTop: 12 }}>
          <Grid cols={{ phone: 2, tablet: 4, desktop: 4 }} gap={10}>
            {CATEGORIES.filter((c) => c.key !== 'other').map((c) => (
              <Pressable key={c.key} accessibilityRole="button" accessibilityLabel={c.label} onPress={() => setCat(c.key)}
                style={{ borderRadius: 22, backgroundColor: c.tint[0], padding: 14, gap: 8, minHeight: 104 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' }}><Ionicons name={c.icon} size={20} color={c.tint[1]} /></View>
                <T style={{ fontFamily: fonts.semibold, color: colors.ink }}>{c.label}</T>
              </Pressable>
            ))}
          </Grid>
        </View>
      ) : null}
      <Chips value={cat} onChange={setCat} options={[{ key: 'all', label: 'All' }, ...CATEGORIES.map((c) => ({ key: c.key as Category | 'all', label: c.label }))]} />
      {list.loading && !list.data ? <Loading /> : list.error ? <ErrorBox message={list.error} onRetry={list.reload} /> : !list.data?.length ? <Empty text="Nothing here yet. Please check back soon." /> : (
        <Grid cols={{ phone: 2, tablet: 3, desktop: 4 }} gap={10}>
          {list.data.map((p) => (
            <Pressable key={p.id} accessibilityRole="button" accessibilityLabel={p.title} onPress={() => router.push(`${base}/shop/${p.id}` as any)}
              style={{ borderRadius: 20, backgroundColor: '#FFF', overflow: 'hidden', borderWidth: 1, borderColor: colors.line }}>
              <Cover p={p} height={120} />
              <View style={{ padding: 10, gap: 4, flex: 1 }}>
                <T style={{ fontFamily: scriptFont(p.title), fontSize: 14, color: colors.ink }} numberOfLines={2}>{p.title}</T>
                <Price p={p} />
                {p.in_stock ? (
                  <Button title="Add to cart" icon="cart-outline" kind="ghost" loading={adding === p.id} style={{ height: 36, paddingHorizontal: 8, marginTop: 4 }} onPress={() => add(p)} />
                ) : <T v="small" style={{ color: colors.red, marginTop: 6 }}>Out of stock</T>}
              </View>
            </Pressable>
          ))}
        </Grid>
      )}
    </Screen>
  );
}

/* ---------- One product ---------- */
export function ProductScreen() {
  const base = useBase();
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = useApi<Product>(`/shop/products/${id}`);
  const { isPhone } = useLayout();
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState<'add' | 'buy' | null>(null);
  if (p.loading && !p.data) return <Screen><Loading /></Screen>;
  if (!p.data) return <Screen><ErrorBox message={p.error ?? 'Not found'} onRetry={p.reload} /></Screen>;
  const it = p.data;
  const c = catOf(it.category);
  const go = async (buy: boolean) => {
    setBusy(buy ? 'buy' : 'add');
    try { await addToCart(it, qty); if (buy) router.push(`${base}/shop/cart` as any); else demoNote('Added to your cart.'); } catch (e) { demoNote(errText(e)); } finally { setBusy(null); }
  };
  return (
    <Screen>
      <Row style={{ justifyContent: 'flex-end', marginBottom: 8 }}><CartButton /></Row>
      <View style={{ flexDirection: isPhone ? 'column' : 'row', gap: 20 }}>
        <View style={{ flex: isPhone ? undefined : 1, borderRadius: 24, overflow: 'hidden' }}><Cover p={it} height={isPhone ? 240 : 360} /></View>
        <View style={{ flex: isPhone ? undefined : 1, gap: 10 }}>
          <T v="small" style={{ color: c.tint[1], fontFamily: fonts.semibold }}>{c.label.toUpperCase()}</T>
          <T style={{ fontFamily: scriptFont(it.title), fontSize: 26, color: colors.ink }}>{it.title}</T>
          <Price p={it} big />
          <Card tint={it.type === 'digital' ? '#F1EDFF' : '#E6F4F4'} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Ionicons name={it.type === 'digital' ? 'cloud-download-outline' : 'cube-outline'} size={22} color={it.type === 'digital' ? colors.violet : colors.teal} />
            <T style={{ flex: 1, fontSize: 14 }}>{it.type === 'digital'
              ? `Digital file${it.file_name ? ` · ${it.file_name.split('.').pop()?.toUpperCase()} ${fileSize(it.file_size)}` : ''}. Opens in My library as soon as your payment is confirmed.`
              : `Printed and delivered to your address.${it.stock != null ? ` ${it.stock} in stock.` : ''} Cash on Delivery available.`}</T>
          </Card>
          {it.description ? <T style={{ color: colors.muted, lineHeight: 22 }} auto>{it.description}</T> : null}
          {it.owned ? (
            <Button title="Open in My library" icon="library-outline" onPress={() => router.push(`${base}/shop/library` as any)} />
          ) : !it.in_stock ? <T style={{ color: colors.red, fontFamily: fonts.semibold }}>Out of stock</T> : (
            <>
              {it.type === 'physical' ? (
                <Row gap={10}>
                  <T style={{ fontFamily: fonts.medium }}>Quantity</T>
                  <Stepper value={qty} onChange={setQty} max={it.stock ?? 1000} />
                </Row>
              ) : null}
              <Row gap={10}>
                <Button title="Add to cart" icon="cart-outline" kind="ghost" loading={busy === 'add'} style={{ flex: 1 }} onPress={() => go(false)} />
                <Button title="Buy now" icon="flash" kind="yellow" loading={busy === 'buy'} style={{ flex: 1 }} onPress={() => go(true)} />
              </Row>
            </>
          )}
        </View>
      </View>
    </Screen>
  );
}

function Stepper({ value, onChange, max }: { value: number; onChange: (n: number) => void; max: number }) {
  const b = (icon: 'remove' | 'add', next: number, label: string) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={next < 1 || next > max} onPress={() => onChange(next)}
      style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', opacity: next < 1 || next > max ? 0.4 : 1 }}>
      <Ionicons name={icon} size={18} color={colors.ink} />
    </Pressable>
  );
  return (
    <Row gap={6} style={{ alignSelf: 'flex-start', backgroundColor: '#FFF', borderRadius: 22, borderWidth: 1, borderColor: colors.line, padding: 3 }}>
      {b('remove', value - 1, 'Fewer')}
      <T style={{ minWidth: 32, textAlign: 'center', fontFamily: fonts.semibold }}>{value}</T>
      {b('add', value + 1, 'More')}
    </Row>
  );
}

/* ---------- Cart ---------- */
function Totals({ c }: { c: { subtotal: number; shipping: number; total: number; has_physical?: boolean; settings?: Cart['settings'] } }) {
  const line = (k: string, v: string, bold = false) => <Row style={{ justifyContent: 'space-between' }}><T style={bold ? { fontFamily: fonts.semibold, fontSize: 18 } : { color: colors.muted }}>{k}</T><T style={bold ? { fontFamily: fonts.semibold, fontSize: 18 } : undefined}>{v}</T></Row>;
  return (
    <Card style={{ gap: 6 }}>
      {line('Items', rupee(c.subtotal))}
      {c.has_physical !== false ? line('Delivery', c.shipping ? rupee(c.shipping) : 'Free') : null}
      {c.settings && c.has_physical && c.shipping && c.settings.free_shipping_above ? <T v="small">Free delivery on orders above {rupee(c.settings.free_shipping_above)}.</T> : null}
      <View style={{ height: 1, backgroundColor: colors.line, marginVertical: 4 }} />
      {line('Total', rupee(c.total), true)}
    </Card>
  );
}

export function CartScreen() {
  const base = useBase();
  const cart = useApi<Cart>('/shop/cart');
  const [busy, setBusy] = useState<number | null>(null);
  useEffect(() => { if (cart.data) setCartCount(cart.data.count); }, [cart.data]);
  const change = async (productId: number, qty: number) => {
    setBusy(productId);
    try { await (qty ? api.put(`/shop/cart/${productId}`, { qty }) : api.del(`/shop/cart/${productId}`)); await cart.reload(); } catch (e) { demoNote(errText(e)); } finally { setBusy(null); }
  };
  if (cart.loading && !cart.data) return <Screen><Loading /></Screen>;
  if (!cart.data) return <Screen><ErrorBox message={cart.error ?? 'Could not load your cart'} onRetry={cart.reload} /></Screen>;
  const c = cart.data;
  return (
    <Screen>
      <Header title="Your cart" subtitle={c.count ? `${c.count} item${c.count === 1 ? '' : 's'}` : undefined} />
      {!c.items.length ? (
        <View style={{ gap: 12 }}><Empty text="Your cart is empty." /><Button title="Go to the shop" icon="storefront-outline" onPress={() => router.replace(`${base}/shop` as any)} /></View>
      ) : (
        <View style={{ gap: 10 }}>
          {c.bulk ? <Card tint={colors.sky[0]}><T style={{ color: colors.sky[1] }}>You can order in bulk for {c.bulk.institution} (up to {c.max_qty} of each printed item).</T></Card> : null}
          {c.items.map(({ product: p, qty, line_total }) => (
            <Card key={p.id} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <Pressable onPress={() => router.push(`${base}/shop/${p.id}` as any)} style={{ width: 64, height: 64, borderRadius: 14, overflow: 'hidden' }}><Cover p={p} height={64} /></Pressable>
              <View style={{ flex: 1, gap: 4 }}>
                <T style={{ fontFamily: scriptFont(p.title), color: colors.ink }} numberOfLines={2}>{p.title}</T>
                <T v="small">{rupee(p.unit_price)} each · {p.type === 'digital' ? 'Digital' : 'Printed'}</T>
                {p.type === 'physical' ? <Stepper value={qty} onChange={(n) => change(p.id, n)} max={Math.min(c.max_qty, p.stock ?? c.max_qty)} /> : null}
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <T style={{ fontFamily: fonts.semibold }}>{rupee(line_total)}</T>
                <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${p.title}`} disabled={busy === p.id} onPress={() => change(p.id, 0)} style={{ padding: 6 }}>
                  <Ionicons name="trash-outline" size={20} color={colors.red} />
                </Pressable>
              </View>
            </Card>
          ))}
          <Totals c={c} />
          <Button title="Checkout" icon="arrow-forward" kind="yellow" onPress={() => router.push(`${base}/shop/checkout` as any)} />
        </View>
      )}
    </Screen>
  );
}

/* ---------- Checkout ---------- */
export function CheckoutScreen() {
  const base = useBase();
  const { user } = useAuth();
  const cart = useApi<Cart>('/shop/cart');
  const [f, setF] = useState({ ship_name: user?.name ?? '', ship_phone: user?.phone ?? '', ship_address: '', ship_city: '', ship_state: 'Kerala', ship_pincode: '', note: '' });
  const [method, setMethod] = useState<'upi' | 'cod'>('upi');
  const [forInst, setForInst] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  if (cart.loading && !cart.data) return <Screen><Loading /></Screen>;
  if (!cart.data) return <Screen><ErrorBox message={cart.error ?? 'Could not load your cart'} onRetry={cart.reload} /></Screen>;
  const c = cart.data;
  if (!c.items.length) return <Screen><Empty text="Your cart is empty." /><Button title="Go to the shop" onPress={() => router.replace(`${base}/shop` as any)} /></Screen>;
  const hasDigital = c.items.some((i) => i.product.type === 'digital');
  const codWhyNot = !c.has_physical ? 'Only for printed items' : !c.settings.cod_enabled ? 'Not available now' : hasDigital ? 'Not with digital files in the cart'
    : c.settings.cod_max && c.total > c.settings.cod_max ? `Only up to ${rupee(c.settings.cod_max)}` : null;
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const place = async () => {
    setBusy(true); setErr('');
    try {
      const o = await api.post<Order>('/shop/orders', { payment_method: codWhyNot ? 'upi' : method, for_institution: forInst, note: f.note || undefined, ...(c.has_physical ? f : {}) });
      setCartCount(0);
      router.replace(`${base}/shop/orders/${o.ref}` as any);
    } catch (e) { setErr(errText(e, 'Could not place the order.')); } finally { setBusy(false); }
  };
  const payOpt = (key: 'upi' | 'cod', title: string, sub: string, disabled: string | null) => (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: method === key && !disabled, disabled: !!disabled }} disabled={!!disabled} onPress={() => setMethod(key)}
      style={{ flex: 1, minWidth: 220, borderRadius: 18, borderWidth: 2, borderColor: method === key && !disabled ? colors.violet : colors.line, backgroundColor: '#FFF', padding: 14, gap: 4, opacity: disabled ? 0.5 : 1 }}>
      <Row gap={8}><Ionicons name={method === key && !disabled ? 'radio-button-on' : 'radio-button-off'} size={20} color={colors.violet} /><T style={{ fontFamily: fonts.semibold }}>{title}</T></Row>
      <T v="small">{disabled ?? sub}</T>
    </Pressable>
  );
  return (
    <Screen>
      <Header title="Checkout" subtitle={`${c.count} item${c.count === 1 ? '' : 's'} · ${rupee(c.total)}`} />
      <View style={{ gap: 14 }}>
        {c.has_physical ? (
          <Card style={{ gap: 10 }}>
            <T v="h3">Delivery address</T>
            <Row gap={10} style={{ flexWrap: 'wrap' }}>
              <View style={{ flex: 1, minWidth: 220 }}><Input label="Full name" value={f.ship_name} onChangeText={set('ship_name')} autoComplete="name" /></View>
              <View style={{ flex: 1, minWidth: 220 }}><Input label="Phone" value={f.ship_phone} onChangeText={set('ship_phone')} keyboardType="phone-pad" autoComplete="tel" /></View>
            </Row>
            <Input label="House, street, area" value={f.ship_address} onChangeText={set('ship_address')} multiline autoComplete="street-address" />
            <Row gap={10} style={{ flexWrap: 'wrap' }}>
              <View style={{ flex: 1, minWidth: 150 }}><Input label="City / town" value={f.ship_city} onChangeText={set('ship_city')} /></View>
              <View style={{ flex: 1, minWidth: 150 }}><Input label="State" value={f.ship_state} onChangeText={set('ship_state')} /></View>
              <View style={{ flex: 1, minWidth: 120 }}><Input label="PIN code" value={f.ship_pincode} onChangeText={set('ship_pincode')} keyboardType="number-pad" maxLength={6} /></View>
            </Row>
          </Card>
        ) : (
          <Card tint="#F1EDFF"><T>Digital files only: nothing to deliver. They open in <T style={{ fontFamily: fonts.semibold }}>My library</T> once your payment is confirmed.</T></Card>
        )}
        <View style={{ gap: 8 }}>
          <T v="h3">Payment</T>
          <Row gap={10} style={{ flexWrap: 'wrap', alignItems: 'stretch' }}>
            {payOpt('upi', 'UPI', 'GPay, PhonePe, Paytm or any UPI app. Pay, then send us the UPI reference.', null)}
            {payOpt('cod', 'Cash on Delivery', 'Pay in cash when the parcel arrives.', codWhyNot)}
          </Row>
        </View>
        {c.bulk ? (
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: forInst }} onPress={() => setForInst(!forInst)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name={forInst ? 'checkbox' : 'square-outline'} size={22} color={colors.violet} /><T>This order is for {c.bulk.institution}</T>
          </Pressable>
        ) : null}
        <Input label="Note for us (optional)" value={f.note} onChangeText={set('note')} placeholder="Anything we should know" />
        <Totals c={c} />
        {err ? <T style={{ color: colors.red }}>{err}</T> : null}
        <Button title={`Place order · ${rupee(c.total)}`} icon="checkmark" kind="yellow" loading={busy} onPress={place} />
      </View>
    </Screen>
  );
}

/* ---------- Orders ---------- */
const STATUS_TINT: Record<string, readonly [string, string]> = {
  placed: colors.butter, confirmed: colors.sky, packed: colors.sky, shipped: colors.lav, delivered: colors.mint, completed: colors.mint, cancelled: ['#FBD9DC', colors.red],
};
export function StatusTag({ o }: { o: Order }) {
  const label = o.payment_status === 'verifying' && o.status !== 'cancelled' ? 'Checking payment' : STATUS_LABEL[o.status];
  const t = o.payment_status === 'verifying' && o.status !== 'cancelled' ? colors.butter : STATUS_TINT[o.status];
  return <View style={{ alignSelf: 'flex-start', backgroundColor: t[0], borderRadius: 12, paddingHorizontal: 10, height: 24, justifyContent: 'center' }}><T style={{ fontSize: 11, fontFamily: fonts.semibold, color: t[1] }}>{label}</T></View>;
}

export function OrdersScreen() {
  const base = useBase();
  const list = useApi<Order[]>('/shop/orders');
  return (
    <Screen>
      <Header title="My orders" right={<CartButton />} />
      {list.loading && !list.data ? <Loading /> : list.error ? <ErrorBox message={list.error} onRetry={list.reload} /> : !list.data?.length ? (
        <View style={{ gap: 12 }}><Empty text="No orders yet." /><Button title="Go to the shop" icon="storefront-outline" onPress={() => router.push(`${base}/shop` as any)} /></View>
      ) : (
        <View style={{ gap: 10 }}>
          {list.data.map((o) => (
            <Card key={o.id} onPress={() => router.push(`${base}/shop/orders/${o.ref}` as any)} style={{ gap: 6 }}>
              <Row style={{ justifyContent: 'space-between' }}><T style={{ fontFamily: fonts.semibold }}>{o.ref}</T><StatusTag o={o} /></Row>
              <T v="small" numberOfLines={1}>{o.items.map((i) => `${i.title}${i.qty > 1 ? ` ×${i.qty}` : ''}`).join(', ')}</T>
              <Row style={{ justifyContent: 'space-between' }}>
                <T v="small">{new Date(o.placed_at).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })} · {o.payment_method === 'cod' ? 'Cash on Delivery' : 'UPI'}</T>
                <T style={{ fontFamily: fonts.semibold }}>{rupee(o.total)}</T>
              </Row>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

export function OrderScreen() {
  const base = useBase();
  const { ref } = useLocalSearchParams<{ ref: string }>();
  const o = useApi<Order>(`/shop/orders/${ref}`);
  const [utr, setUtr] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  if (o.loading && !o.data) return <Screen><Loading /></Screen>;
  if (!o.data) return <Screen><ErrorBox message={o.error ?? 'Order not found'} onRetry={o.reload} /></Screen>;
  const d = o.data;
  const s = d.settings;
  const needPay = d.payment_method === 'upi' && (d.payment_status === 'unpaid' || d.payment_status === 'verifying') && d.status !== 'cancelled';
  const canCancel = (d.status === 'placed' || d.status === 'confirmed') && d.payment_status !== 'paid';
  const send = async () => {
    setBusy(true); setErr('');
    try { await api.post(`/shop/orders/${d.ref}/upi`, { upi_ref: utr.trim() }); setUtr(''); await o.reload(); } catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  };
  const cancel = async () => { try { await api.post(`/shop/orders/${d.ref}/cancel`); await o.reload(); } catch (e) { demoNote(errText(e)); } };
  const copy = (v: string) => { try { (globalThis as any).navigator?.clipboard?.writeText(v); demoNote('Copied.'); } catch { /* not available */ } };
  return (
    <Screen>
      <Header title={`Order ${d.ref}`} subtitle={new Date(d.placed_at).toLocaleString([], { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })} />
      <View style={{ gap: 12, maxWidth: 760, width: '100%' }}>
        <Card tint={STATUS_TINT[d.status][0]} style={{ gap: 6 }}>
          <StatusTag o={d} />
          <T style={{ fontFamily: fonts.semibold, fontSize: 16 }}>{orderHint(d)}</T>
          {d.admin_note ? <T v="small">Note from Noon Learn: {d.admin_note}</T> : null}
          {d.institution ? <T v="small">Bulk order for {d.institution}</T> : null}
        </Card>

        {needPay && s ? (
          <Card style={{ gap: 10 }}>
            <T v="h3">Pay {rupee(d.total)} by UPI</T>
            {s.upi_id ? (
              <>
                <Row gap={8} style={{ flexWrap: 'wrap' }}>
                  <T>UPI ID: <T style={{ fontFamily: fonts.semibold }} selectable>{s.upi_id}</T> ({s.upi_name})</T>
                  {web ? <Button title="Copy" icon="copy-outline" kind="ghost" style={{ height: 34, paddingHorizontal: 10 }} onPress={() => copy(s.upi_id)} /> : null}
                </Row>
                {isPhoneWeb() ? <Button title="Pay with a UPI app" icon="phone-portrait-outline" kind="yellow" onPress={() => Linking.openURL(upiLink(s, d.total, d.ref)).catch(() => demoNote('No UPI app found. Pay to the UPI ID above.'))} /> : null}
                {s.upi_qr_url ? <View style={{ alignItems: 'center', gap: 4 }}><Image source={{ uri: s.upi_qr_url }} style={{ width: 200, height: 200 }} resizeMode="contain" accessibilityLabel="UPI QR code" /><T v="small">Scan with any UPI app</T></View> : null}
                <T v="small">Write order number {d.ref} in the payment note if your app asks.</T>
              </>
            ) : <T v="small">UPI details will show here soon. {s.support_phone ? `Call ${s.support_phone}.` : ''}</T>}
            <T style={{ fontFamily: fonts.medium, marginTop: 4 }}>{d.payment_status === 'verifying' ? `UPI reference sent: ${d.upi_ref}. Wrong number? Send it again:` : 'After paying, enter the UPI reference (UTR) number from your payment app:'}</T>
            <Row gap={8}>
              <View style={{ flex: 1 }}><Input value={utr} onChangeText={setUtr} placeholder="eg. 412345678901" accessibilityLabel="UPI reference number" autoCapitalize="characters" /></View>
              <Button title="Send" icon="send" loading={busy} disabled={utr.trim().length < 6} style={{ height: 50 }} onPress={send} />
            </Row>
            {err ? <T style={{ color: colors.red }}>{err}</T> : null}
          </Card>
        ) : null}

        <Card style={{ gap: 8 }}>
          <T v="h3">Items</T>
          {d.items.map((i, k) => (
            <Row key={k} style={{ justifyContent: 'space-between', gap: 10 }}>
              <T style={{ flex: 1, fontFamily: scriptFont(i.title) }}>{i.title} <T v="small">· {i.type === 'digital' ? 'Digital' : 'Printed'}{i.qty > 1 ? ` · ×${i.qty}` : ''}</T></T>
              <T>{rupee(i.line_total)}</T>
            </Row>
          ))}
        </Card>
        <Totals c={{ ...d, settings: undefined, has_physical: d.items.some((i) => i.type === 'physical') }} />
        {d.ship ? (
          <Card style={{ gap: 4 }}>
            <T v="h3">Delivery to</T>
            <T>{d.ship.name} · {d.ship.phone}</T>
            <T v="small">{d.ship.address}, {d.ship.city}, {d.ship.state} {d.ship.pincode}</T>
            {d.tracking_no ? <T v="small" selectable>Tracking: {d.courier ? `${d.courier} · ` : ''}{d.tracking_no}</T> : null}
          </Card>
        ) : null}
        <T v="small">Payment: {d.payment_method === 'cod' ? 'Cash on Delivery' : 'UPI'} · {PAY_LABEL[d.payment_status]}</T>
        {d.status === 'completed' ? <Button title="Open My library" icon="library-outline" onPress={() => router.push(`${base}/shop/library` as any)} /> : null}
        {canCancel ? <Button title="Cancel order" kind="ghost" icon="close-circle-outline" onPress={cancel} /> : null}
        <Button title="Back to the shop" kind="ghost" icon="storefront-outline" onPress={() => router.push(`${base}/shop` as any)} />
      </View>
    </Screen>
  );
}

/* ---------- Bought digital files ---------- */
export function LibraryScreen() {
  const base = useBase();
  const list = useApi<Product[]>('/shop/library');
  const [opening, setOpening] = useState<number | null>(null);
  const open = async (p: Product) => {
    setOpening(p.id);
    try { const r = await api.get<{ url: string }>(`/shop/products/${p.id}/download`); await Linking.openURL(r.url); } catch (e) { demoNote(errText(e)); } finally { setOpening(null); }
  };
  return (
    <Screen>
      <Header title="My library" subtitle="Digital files you have bought" />
      {list.loading && !list.data ? <Loading /> : list.error ? <ErrorBox message={list.error} onRetry={list.reload} /> : !list.data?.length ? (
        <View style={{ gap: 12 }}><Empty text="Nothing here yet. Bought books, audio and charts show here once paid." /><Button title="Go to the shop" icon="storefront-outline" onPress={() => router.push(`${base}/shop` as any)} /></View>
      ) : (
        <Grid cols={{ phone: 2, tablet: 3, desktop: 4 }} gap={10}>
          {list.data.map((p) => (
            <View key={p.id} style={{ borderRadius: 20, backgroundColor: '#FFF', overflow: 'hidden', borderWidth: 1, borderColor: colors.line }}>
              <Cover p={p} height={110} />
              <View style={{ padding: 10, gap: 6 }}>
                <T style={{ fontFamily: scriptFont(p.title), color: colors.ink }} numberOfLines={2}>{p.title}</T>
                {p.file_name ? <T v="small">{p.file_name.split('.').pop()?.toUpperCase()} · {fileSize(p.file_size)}</T> : null}
                <Button title="Open" icon="open-outline" loading={opening === p.id} style={{ height: 38 }} onPress={() => open(p)} />
              </View>
            </View>
          ))}
        </Grid>
      )}
    </Screen>
  );
}

/** /shop and /shop/<id> from the website: go to the shop in the user's own app, or log in first. */
export function ShopRedirect({ id }: { id?: string }) {
  const { user, loading } = useAuth();
  useEffect(() => {
    if (loading) return;
    const path = id ? `/shop/${id}` : '/shop';
    if (!user) {
      setNextPath(path);
      router.replace('/login' as any);
    } else {
      const base = user.role === 'super' ? '/super' : user.role === 'parent' ? '/student' : `/${user.role}`;
      router.replace((user.role === 'super' ? '/super/shop' : `${base}${path}`) as any);
    }
  }, [loading, user, id]);
  return <Screen><Loading /></Screen>;
}
