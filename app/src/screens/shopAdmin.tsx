// Super admin Shop: dashboard, orders (confirm UPI, pack, ship, deliver, cancel, refund),
// products (digital and printed, with a bin) and settings (UPI, delivery, Cash on Delivery).
import React, { useState } from 'react';
import { Image, Modal, Platform, Pressable, ScrollView, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Button, Card, Empty, ErrorBox, Grid, IconButton, Loading, Row, Screen, Segmented, T } from '@/components/ui';
import { Chips, demoNote, Tabs } from '@/components/kit';
import { Input, Select } from '@/components/kit2';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { CATEGORIES, catOf, Category, fileSize, Order, PAY_LABEL, Product, rupee, ShopSettings } from '@/lib/shop';
import { colors, fonts, scriptFont } from '@/theme/tokens';
import { StatusTag } from './shop';

const errText = (e: unknown) => (e instanceof ApiError ? e.friendly : 'Could not save. Please try again.');
type Picked = { uri: string; name?: string; mimeType?: string; size?: number; file?: File };
const append = (fd: FormData, key: string, f: Picked) => {
  if (Platform.OS === 'web' && f.file) fd.append(key, f.file);
  else fd.append(key, { uri: f.uri, name: f.name ?? key, type: f.mimeType ?? 'application/octet-stream' } as any);
};
async function pick(types: string[]): Promise<Picked | null> {
  const r = await DocumentPicker.getDocumentAsync({ type: types, copyToCacheDirectory: true });
  return r.canceled ? null : (r.assets[0] as Picked);
}

type Summary = {
  sales_today: number; sales_month: number; orders_month: number; to_verify: number; awaiting_payment: number; to_ship: number;
  low_stock: { id: number; title: string; stock: number }[]; products_live: number; top: { id: number; title: string; sold: number }[];
};
type Tab = 'dash' | 'orders' | 'products' | 'settings';

export function SuperShopScreen() {
  const [tab, setTab] = useState<Tab>('dash');
  const [orderFilter, setOrderFilter] = useState<OrderFilter>('verify');
  const open = (f: OrderFilter) => { setOrderFilter(f); setTab('orders'); };
  return (
    <Screen>
      <T v="h1">Shop</T>
      <T v="small">Orders, products and payments</T>
      <Tabs value={tab} onChange={setTab} options={[{ key: 'dash', label: 'Dashboard' }, { key: 'orders', label: 'Orders' }, { key: 'products', label: 'Products' }, { key: 'settings', label: 'Settings' }]} />
      {tab === 'dash' ? <Dashboard onOpen={open} onProducts={() => setTab('products')} onSettings={() => setTab('settings')} />
        : tab === 'orders' ? <Orders filter={orderFilter} setFilter={setOrderFilter} />
        : tab === 'products' ? <Products /> : <Settings />}
    </Screen>
  );
}

/* ---------- Dashboard ---------- */
function Dashboard({ onOpen, onProducts, onSettings }: { onOpen: (f: OrderFilter) => void; onProducts: () => void; onSettings: () => void }) {
  const s = useApi<Summary>('/super/shop/summary');
  const settings = useApi<ShopSettings>('/super/shop/settings');
  if (s.loading && !s.data) return <Loading />;
  if (!s.data) return <ErrorBox message={s.error ?? 'Could not load'} onRetry={s.reload} />;
  const d = s.data;
  const tile = (label: string, value: string | number, tint: readonly [string, string], icon: keyof typeof Ionicons.glyphMap, onPress?: () => void, alert = false) => (
    <Pressable accessibilityRole={onPress ? 'button' : undefined} disabled={!onPress} onPress={onPress}
      style={{ borderRadius: 22, backgroundColor: tint[0], padding: 14, gap: 6, minHeight: 104, borderWidth: alert ? 2 : 0, borderColor: tint[1] }}>
      <Row style={{ justifyContent: 'space-between' }}><Ionicons name={icon} size={20} color={tint[1]} />{onPress ? <Ionicons name="chevron-forward" size={16} color={tint[1]} /> : null}</Row>
      <T style={{ fontFamily: fonts.semibold, fontSize: 24, color: tint[1] }}>{value}</T>
      <T v="small" style={{ color: tint[1] }}>{label}</T>
    </Pressable>
  );
  return (
    <View style={{ gap: 14 }}>
      {settings.data && !settings.data.upi_id ? (
        <Card tint={colors.butter[0]} onPress={onSettings} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <Ionicons name="warning-outline" size={22} color={colors.butter[1]} /><T style={{ flex: 1, color: colors.butter[1] }}>Add your UPI ID in Settings so buyers can pay.</T><Ionicons name="chevron-forward" size={18} color={colors.butter[1]} />
        </Card>
      ) : null}
      <Grid cols={{ phone: 2, tablet: 3, desktop: 3 }} gap={10}>
        {tile('Sales today', rupee(d.sales_today), colors.mint, 'trending-up')}
        {tile('Sales this month', rupee(d.sales_month), colors.sky, 'calendar')}
        {tile('Orders this month', d.orders_month, colors.lav, 'receipt', () => onOpen('all'))}
        {tile('UPI payments to check', d.to_verify, colors.butter, 'shield-checkmark', () => onOpen('verify'), d.to_verify > 0)}
        {tile('Waiting for payment', d.awaiting_payment, colors.pink, 'time', () => onOpen('unpaid'))}
        {tile('To pack & ship', d.to_ship, colors.sky, 'cube', () => onOpen('ship'), d.to_ship > 0)}
      </Grid>
      <Grid cols={{ phone: 1, tablet: 2, desktop: 2 }} gap={10}>
        <Card style={{ gap: 8 }}>
          <Row style={{ justifyContent: 'space-between' }}><T v="h3">Low stock</T><Button title="Products" kind="ghost" style={{ height: 34, paddingHorizontal: 10 }} onPress={onProducts} /></Row>
          {d.low_stock.length ? d.low_stock.map((p) => <Row key={p.id} style={{ justifyContent: 'space-between' }}><T style={{ flex: 1, fontFamily: scriptFont(p.title) }} numberOfLines={1}>{p.title}</T><T style={{ color: p.stock ? colors.butter[1] : colors.red, fontFamily: fonts.semibold }}>{p.stock ? `${p.stock} left` : 'Out of stock'}</T></Row>)
            : <T v="small">All printed items have enough stock.</T>}
        </Card>
        <Card style={{ gap: 8 }}>
          <T v="h3">Best sellers</T>
          {d.top.length ? d.top.map((p, i) => <Row key={p.id} style={{ justifyContent: 'space-between' }}><T style={{ flex: 1, fontFamily: scriptFont(p.title) }} numberOfLines={1}>{i + 1}. {p.title}</T><T v="small">{p.sold} sold</T></Row>)
            : <T v="small">No sales yet. {d.products_live} products are in the shop.</T>}
        </Card>
      </Grid>
    </View>
  );
}

/* ---------- Orders ---------- */
type OrderFilter = 'verify' | 'unpaid' | 'ship' | 'shipped' | 'done' | 'cancelled' | 'all';
function Orders({ filter, setFilter }: { filter: OrderFilter; setFilter: (f: OrderFilter) => void }) {
  const [q, setQ] = useState('');
  const list = useApi<Order[]>(`/super/shop/orders?filter=${filter}${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ''}`);
  const [open, setOpen] = useState<Order | null>(null);
  return (
    <>
      <Chips value={filter} onChange={setFilter} options={[
        { key: 'verify', label: 'UPI to check' }, { key: 'unpaid', label: 'Waiting for payment' }, { key: 'ship', label: 'To ship' },
        { key: 'shipped', label: 'Shipped' }, { key: 'done', label: 'Done' }, { key: 'cancelled', label: 'Cancelled' }, { key: 'all', label: 'All' },
      ]} />
      <Input value={q} onChangeText={setQ} placeholder="Search order no., name, phone or UPI ref" accessibilityLabel="Search orders" />
      <View style={{ height: 10 }} />
      {list.loading && !list.data ? <Loading /> : list.error ? <ErrorBox message={list.error} onRetry={list.reload} /> : !list.data?.length ? <Empty text="No orders here." /> : (
        <Grid cols={{ phone: 1, tablet: 2, desktop: 3 }} gap={10}>
          {list.data.map((o) => (
            <Card key={o.id} onPress={() => setOpen(o)} style={{ gap: 6 }}>
              <Row style={{ justifyContent: 'space-between' }}><T style={{ fontFamily: fonts.semibold }}>{o.ref}</T><StatusTag o={o} /></Row>
              <T v="small">{o.buyer?.name ?? '—'}{o.institution ? ` · for ${o.institution}` : ''}</T>
              <T v="small" numberOfLines={2}>{o.items.map((i) => `${i.title}${i.qty > 1 ? ` ×${i.qty}` : ''}`).join(', ')}</T>
              <Row style={{ justifyContent: 'space-between' }}>
                <T v="small">{o.payment_method === 'cod' ? 'Cash on Delivery' : `UPI${o.upi_ref ? ` · ${o.upi_ref}` : ''}`}</T>
                <T style={{ fontFamily: fonts.semibold }}>{rupee(o.total)}</T>
              </Row>
            </Card>
          ))}
        </Grid>
      )}
      {open ? <OrderSheet order={open} onClose={() => setOpen(null)} onChanged={(o) => { setOpen(o); list.reload(); }} /> : null}
    </>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close" style={{ flex: 1, backgroundColor: 'rgba(16,48,58,0.35)' }} onPress={onClose} />
      <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, width: '100%', maxWidth: 680, alignSelf: 'center', maxHeight: '92%' }}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }} keyboardShouldPersistTaps="handled">
          <Row><T v="h2" style={{ flex: 1 }}>{title}</T><IconButton name="close" label="Close" tint={colors.bg} size={38} onPress={onClose} /></Row>
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

function OrderSheet({ order: o, onClose, onChanged }: { order: Order; onClose: () => void; onChanged: (o: Order) => void }) {
  const [courier, setCourier] = useState(o.courier ?? 'India Post');
  const [tracking, setTracking] = useState(o.tracking_no ?? '');
  const [note, setNote] = useState(o.admin_note ?? '');
  const [busy, setBusy] = useState<string | null>(null);
  const [sure, setSure] = useState<string | null>(null);
  const physical = o.items.some((i) => i.type === 'physical');
  const live = o.status !== 'cancelled';
  const act = async (action: string, extra: Record<string, unknown> = {}) => {
    setBusy(action);
    try { onChanged(await api.put<Order>(`/super/shop/orders/${o.id}`, { action, ...extra })); setSure(null); } catch (e) { demoNote(errText(e)); } finally { setBusy(null); }
  };
  const danger = (action: string, label: string) => sure === action
    ? <Row gap={6}><Button title={`Yes, ${label.toLowerCase()}`} kind="danger" loading={busy === action} style={{ flex: 1 }} onPress={() => act(action, { admin_note: note || undefined })} /><Button title="No" kind="ghost" onPress={() => setSure(null)} /></Row>
    : <Button title={label} kind="ghost" onPress={() => setSure(action)} />;
  return (
    <Sheet title={`Order ${o.ref}`} onClose={onClose}>
      <Row gap={8} style={{ flexWrap: 'wrap' }}><StatusTag o={o} /><T v="small">{PAY_LABEL[o.payment_status]} · {o.payment_method === 'cod' ? 'Cash on Delivery' : 'UPI'} · {new Date(o.placed_at).toLocaleString([], { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</T></Row>
      <Card tint={colors.surfaceSoft} style={{ gap: 4 }}>
        <T style={{ fontFamily: fonts.semibold }}>{o.buyer?.name} <T v="small">· {o.buyer?.role}</T></T>
        <T v="small" selectable>{[o.buyer?.phone, o.buyer?.email].filter(Boolean).join(' · ')}</T>
        {o.institution ? <T v="small">Bulk order for {o.institution}</T> : null}
        {o.note ? <T v="small">Buyer's note: {o.note}</T> : null}
      </Card>
      {o.payment_method === 'upi' ? (
        <Card tint={o.payment_status === 'verifying' ? colors.butter[0] : colors.surfaceSoft} style={{ gap: 4 }}>
          <T style={{ fontFamily: fonts.semibold }}>UPI reference: <T selectable style={{ fontFamily: fonts.semibold }}>{o.upi_ref ?? 'not sent yet'}</T></T>
          <T v="small">Check that {rupee(o.total)} with this reference reached your UPI account before confirming.</T>
        </Card>
      ) : null}
      <View style={{ gap: 6 }}>
        {o.items.map((i, k) => <Row key={k} style={{ justifyContent: 'space-between', gap: 8 }}><T style={{ flex: 1, fontFamily: scriptFont(i.title) }}>{i.title} <T v="small">· {i.type === 'digital' ? 'Digital' : 'Printed'} · {rupee(i.unit_price)} × {i.qty}</T></T><T>{rupee(i.line_total)}</T></Row>)}
        <T v="small">Items {rupee(o.subtotal)} · Delivery {o.shipping ? rupee(o.shipping) : 'free'}</T>
        <T style={{ fontFamily: fonts.semibold, fontSize: 18 }}>Total {rupee(o.total)}</T>
      </View>
      {o.ship ? <Card tint={colors.surfaceSoft} style={{ gap: 2 }}><T style={{ fontFamily: fonts.semibold }}>Deliver to</T><T selectable>{o.ship.name} · {o.ship.phone}</T><T v="small" selectable>{o.ship.address}, {o.ship.city}, {o.ship.state} {o.ship.pincode}</T></Card> : null}

      <Input label="Note to the buyer (optional)" value={note} onChangeText={setNote} placeholder="eg. Payment not found, please check the UTR" />
      {live && o.payment_status !== 'paid' && o.payment_status !== 'refunded' && (o.payment_method === 'upi') ? (
        <Row gap={8}>
          <Button title="Confirm payment" icon="checkmark-circle" loading={busy === 'confirm_payment'} style={{ flex: 1 }} onPress={() => act('confirm_payment', { admin_note: note || undefined })} />
          {o.payment_status === 'verifying' ? <Button title="Not received" kind="ghost" loading={busy === 'reject_payment'} onPress={() => act('reject_payment', { admin_note: note || undefined })} /> : null}
        </Row>
      ) : null}
      {live && physical && o.status === 'confirmed' ? <Button title="Mark packed" icon="cube-outline" loading={busy === 'pack'} onPress={() => act('pack')} /> : null}
      {live && physical && (o.status === 'confirmed' || o.status === 'packed') ? (
        <Card style={{ gap: 8 }}>
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            <View style={{ flex: 1, minWidth: 160 }}><Input label="Courier" value={courier} onChangeText={setCourier} /></View>
            <View style={{ flex: 1, minWidth: 160 }}><Input label="Tracking number" value={tracking} onChangeText={setTracking} /></View>
          </Row>
          <Button title="Mark shipped" icon="paper-plane-outline" loading={busy === 'ship'} onPress={() => act('ship', { courier, tracking_no: tracking || undefined })} />
        </Card>
      ) : null}
      {live && o.status === 'shipped' ? <Button title={o.payment_method === 'cod' ? 'Delivered · cash received' : 'Mark delivered'} icon="home-outline" loading={busy === 'deliver'} onPress={() => act('deliver')} /> : null}
      {note !== (o.admin_note ?? '') ? <Button title="Save note" kind="ghost" loading={busy === 'note'} onPress={() => act('note', { admin_note: note })} /> : null}
      {live && !['shipped', 'delivered', 'completed'].includes(o.status) ? danger('cancel', 'Cancel order') : null}
      {o.payment_status === 'paid' ? danger('refund', 'Mark refunded') : null}
    </Sheet>
  );
}

/* ---------- Products ---------- */
type ProdFilter = 'live' | 'draft' | 'out' | 'deleted';
function Products() {
  const live = useApi<Product[]>('/super/shop/products');
  const bin = useApi<Product[]>('/super/shop/products?deleted=1');
  const [f, setF] = useState<ProdFilter>('live');
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const all = live.data ?? [];
  const groups: Record<ProdFilter, Product[]> = {
    live: all.filter((p) => p.status === 'live'), draft: all.filter((p) => p.status !== 'live'),
    out: all.filter((p) => p.type === 'physical' && p.stock != null && p.stock <= 5), deleted: bin.data ?? [],
  };
  const reload = () => { live.reload(); bin.reload(); };
  const binAct = async (p: Product, what: 'restore' | 'forever') => {
    try { if (what === 'restore') await api.post(`/super/shop/products/${p.id}/restore`); else await api.del(`/super/shop/products/${p.id}/forever`); reload(); } catch (e) { demoNote(errText(e)); }
  };
  return (
    <>
      <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <Chips value={f} onChange={setF} options={[
          { key: 'live', label: `In the shop · ${groups.live.length}` }, { key: 'draft', label: `Drafts · ${groups.draft.length}` },
          { key: 'out', label: `Low stock · ${groups.out.length}` }, { key: 'deleted', label: `Deleted · ${groups.deleted.length}` },
        ]} />
        <Button title="New product" icon="add" style={{ height: 44 }} onPress={() => setEditing('new')} />
      </Row>
      {live.loading && !live.data ? <Loading /> : !groups[f].length ? <Empty text={f === 'deleted' ? 'The bin is empty.' : 'No products here. Tap New product.'} /> : (
        <Grid cols={{ phone: 2, tablet: 3, desktop: 4 }} gap={10}>
          {groups[f].map((p) => {
            const c = catOf(p.category);
            const body = (
              <>
                <View style={{ height: 96, backgroundColor: c.tint[0], alignItems: 'center', justifyContent: 'center' }}>
                  {p.cover_url ? <Image source={{ uri: p.cover_url }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} resizeMode="cover" /> : <Ionicons name={c.icon} size={36} color={c.tint[1]} />}
                  <View style={{ position: 'absolute', left: 8, top: 8, backgroundColor: p.status === 'live' ? colors.mint[0] : colors.butter[0], borderRadius: 10, paddingHorizontal: 8, height: 22, justifyContent: 'center' }}>
                    <T style={{ fontSize: 10, fontFamily: fonts.semibold, color: p.status === 'live' ? colors.mint[1] : colors.butter[1] }}>{f === 'deleted' ? 'DELETED' : p.status === 'live' ? 'IN SHOP' : 'DRAFT'}</T>
                  </View>
                </View>
                <View style={{ padding: 10, gap: 3 }}>
                  <T style={{ fontFamily: scriptFont(p.title), color: colors.ink }} numberOfLines={2}>{p.title}</T>
                  <T v="small">{rupee(p.unit_price)} · {p.type === 'digital' ? (p.has_file ? 'Digital' : 'Digital · no file yet') : p.stock == null ? 'Printed' : `Printed · ${p.stock} in stock`}</T>
                  <T v="small">{p.sold ?? 0} sold</T>
                  {f === 'deleted' ? (
                    <Row gap={6} style={{ marginTop: 4 }}><Button title="Restore" kind="ghost" style={{ height: 34, flex: 1, paddingHorizontal: 8 }} onPress={() => binAct(p, 'restore')} /><IconButton name="trash" label="Delete for good" tint="transparent" color={colors.red} size={34} onPress={() => binAct(p, 'forever')} /></Row>
                  ) : null}
                </View>
              </>
            );
            const style = { borderRadius: 20, backgroundColor: '#FFF', overflow: 'hidden' as const, borderWidth: 1, borderColor: colors.line };
            return f === 'deleted' ? <View key={p.id} style={style}>{body}</View>
              : <Pressable key={p.id} accessibilityRole="button" accessibilityLabel={`Edit ${p.title}`} onPress={() => setEditing(p)} style={style}>{body}</Pressable>;
          })}
        </Grid>
      )}
      {editing ? <ProductSheet product={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} /> : null}
    </>
  );
}

function ProductSheet({ product: p, onClose, onSaved }: { product: Product | null; onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState<'digital' | 'physical'>(p?.type ?? 'digital');
  const [category, setCategory] = useState<Category>(p?.category ?? 'pdf');
  const [title, setTitle] = useState(p?.title ?? '');
  const [desc, setDesc] = useState(p?.description ?? '');
  const [price, setPrice] = useState(p ? String(p.price) : '');
  const [offer, setOffer] = useState(p?.offer_price != null ? String(p.offer_price) : '');
  const [stock, setStock] = useState(p?.stock != null ? String(p.stock) : '');
  const [cover, setCover] = useState<Picked | null>(null);
  const [file, setFile] = useState<Picked | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [sure, setSure] = useState(false);
  const save = async (status: 'live' | 'draft') => {
    setBusy(true); setErr('');
    try {
      const fd = new FormData();
      fd.append('type', type); fd.append('category', category); fd.append('title', title.trim()); fd.append('description', desc);
      fd.append('price', String(parseInt(price || '0', 10))); if (offer.trim()) fd.append('offer_price', String(parseInt(offer, 10)));
      if (type === 'physical' && stock.trim()) fd.append('stock', String(parseInt(stock, 10)));
      fd.append('status', status);
      if (cover) append(fd, 'cover', cover);
      if (file && type === 'digital') append(fd, 'file', file);
      await api.post(p ? `/super/shop/products/${p.id}` : '/super/shop/products', fd);
      onSaved();
    } catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  };
  const remove = async () => { try { await api.del(`/super/shop/products/${p!.id}`); onSaved(); } catch (e) { setErr(errText(e)); } };
  return (
    <Sheet title={p ? 'Edit product' : 'New product'} onClose={onClose}>
      <Segmented value={type} onChange={setType} activeColor={colors.violet} options={[{ key: 'digital', label: 'Digital file' }, { key: 'physical', label: 'Printed item' }]} />
      <T v="small">{type === 'digital' ? 'Buyers open it in My library after their payment is confirmed. Paid by UPI.' : 'Delivered to the buyer. UPI or Cash on Delivery.'}</T>
      <Select label="Category" value={category} options={CATEGORIES.map((c) => ({ key: c.key, label: c.label }))} onChange={setCategory} />
      <Input label="Title (Malayalam, Arabic or English)" value={title} onChangeText={setTitle} style={{ fontFamily: scriptFont(title || 'a') }} />
      <Input label="Description" value={desc} onChangeText={setDesc} multiline />
      <Row gap={10} style={{ flexWrap: 'wrap' }}>
        <View style={{ flex: 1, minWidth: 130 }}><Input label="Price (₹)" value={price} onChangeText={(v) => setPrice(v.replace(/\D/g, ''))} keyboardType="number-pad" /></View>
        <View style={{ flex: 1, minWidth: 130 }}><Input label="Offer price (₹, optional)" value={offer} onChangeText={(v) => setOffer(v.replace(/\D/g, ''))} keyboardType="number-pad" /></View>
        {type === 'physical' ? <View style={{ flex: 1, minWidth: 130 }}><Input label="Stock (blank = no limit)" value={stock} onChangeText={(v) => setStock(v.replace(/\D/g, ''))} keyboardType="number-pad" /></View> : null}
      </Row>
      <Card onPress={async () => { const f = await pick(['image/*']); if (f) setCover(f); }} tint={colors.surfaceSoft} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#9BB6BE' }}>
        <Ionicons name="image-outline" size={24} color={colors.violet} />
        <View style={{ flex: 1 }}><T v="h3">{cover ? cover.name : p?.cover_url ? 'Replace cover picture' : 'Cover picture (optional)'}</T><T v="small">JPG, PNG or WEBP · up to 5 MB</T></View>
      </Card>
      {type === 'digital' ? (
        <Card onPress={async () => { const f = await pick(['application/pdf', 'audio/*', 'application/zip', 'image/*', '*/*']); if (f) setFile(f); }} tint={colors.surfaceSoft} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#9BB6BE' }}>
          <Ionicons name="cloud-upload-outline" size={24} color={colors.violet} />
          <View style={{ flex: 1 }}><T v="h3">{file ? `${file.name} · ${fileSize(file.size)}` : p?.has_file ? `Replace file (${p.file_name})` : 'The file buyers get'}</T><T v="small">PDF, audio, ZIP, picture, PPTX or DOCX · up to 200 MB</T></View>
        </Card>
      ) : null}
      {err ? <T style={{ color: colors.red }}>{err}</T> : null}
      <Row gap={8}>
        <Button title="Save draft" kind="ghost" loading={busy} disabled={!title.trim() || !price} style={{ flex: 1 }} onPress={() => save('draft')} />
        <Button title={p?.status === 'live' ? 'Save' : 'Put in shop'} icon="storefront-outline" loading={busy} disabled={!title.trim() || !price} style={{ flex: 1 }} onPress={() => save('live')} />
      </Row>
      {p ? (sure ? <Row gap={6}><Button title="Yes, move to bin" kind="danger" style={{ flex: 1 }} onPress={remove} /><Button title="No" kind="ghost" onPress={() => setSure(false)} /></Row>
        : <Button title="Delete" kind="ghost" icon="trash-outline" onPress={() => setSure(true)} />) : null}
    </Sheet>
  );
}

/* ---------- Settings ---------- */
function Settings() {
  const s = useApi<ShopSettings>('/super/shop/settings');
  if (s.loading && !s.data) return <Loading />;
  if (!s.data) return <ErrorBox message={s.error ?? 'Could not load'} onRetry={s.reload} />;
  return <SettingsForm s={s.data} onSaved={s.reload} />;
}

function SettingsForm({ s, onSaved }: { s: ShopSettings; onSaved: () => void }) {
  const [f, setF] = useState({ upi_id: s.upi_id, upi_name: s.upi_name, shipping_fee: String(s.shipping_fee), free_shipping_above: String(s.free_shipping_above), cod_max: String(s.cod_max), support_phone: s.support_phone });
  const [cod, setCod] = useState(s.cod_enabled);
  const [qr, setQr] = useState<Picked | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const set = (k: keyof typeof f, num = false) => (v: string) => setF((x) => ({ ...x, [k]: num ? v.replace(/\D/g, '') : v }));
  const save = async (removeQr = false) => {
    setBusy(true); setMsg('');
    try {
      const fd = new FormData();
      Object.entries(f).forEach(([k, v]) => fd.append(k, v));
      fd.append('cod_enabled', cod ? '1' : '0');
      if (qr) append(fd, 'qr', qr);
      if (removeQr) fd.append('remove_qr', '1');
      await api.post('/super/shop/settings', fd);
      setQr(null); setMsg('Saved.'); onSaved();
    } catch (e) { setMsg(errText(e)); } finally { setBusy(false); }
  };
  return (
    <View style={{ gap: 14, maxWidth: 720 }}>
      <Card style={{ gap: 10 }}>
        <T v="h3">UPI payment</T>
        <T v="small">Buyers pay to this UPI ID and send the UPI reference. You confirm it under Orders › UPI to check.</T>
        <Row gap={10} style={{ flexWrap: 'wrap' }}>
          <View style={{ flex: 1, minWidth: 200 }}><Input label="UPI ID" value={f.upi_id} onChangeText={set('upi_id')} placeholder="eg. noonlearn@okhdfcbank" autoCapitalize="none" /></View>
          <View style={{ flex: 1, minWidth: 200 }}><Input label="Name shown to the buyer" value={f.upi_name} onChangeText={set('upi_name')} /></View>
        </Row>
        <Row gap={12} style={{ alignItems: 'center' }}>
          {s.upi_qr_url && !qr ? <Image source={{ uri: s.upi_qr_url }} style={{ width: 96, height: 96 }} resizeMode="contain" accessibilityLabel="Current UPI QR code" /> : null}
          <View style={{ flex: 1, gap: 6 }}>
            <Button title={qr ? `QR: ${qr.name}` : s.upi_qr_url ? 'Replace QR code' : 'Upload UPI QR code'} icon="qr-code-outline" kind="ghost" onPress={async () => { const p = await pick(['image/*']); if (p) setQr(p); }} />
            {s.upi_qr_url ? <Button title="Remove QR" kind="ghost" onPress={() => save(true)} /> : null}
          </View>
        </Row>
      </Card>
      <Card style={{ gap: 10 }}>
        <T v="h3">Delivery</T>
        <Row gap={10} style={{ flexWrap: 'wrap' }}>
          <View style={{ flex: 1, minWidth: 160 }}><Input label="Delivery charge (₹)" value={f.shipping_fee} onChangeText={set('shipping_fee', true)} keyboardType="number-pad" /></View>
          <View style={{ flex: 1, minWidth: 160 }}><Input label="Free delivery above (₹, 0 = never)" value={f.free_shipping_above} onChangeText={set('free_shipping_above', true)} keyboardType="number-pad" /></View>
        </Row>
        <Row><T style={{ flex: 1 }}>Cash on Delivery for printed items</T><Switch value={cod} onValueChange={setCod} accessibilityLabel="Cash on Delivery" trackColor={{ true: colors.green, false: '#C3D3D8' }} thumbColor="#FFF" /></Row>
        {cod ? <Input label="Cash on Delivery up to (₹, 0 = no limit)" value={f.cod_max} onChangeText={set('cod_max', true)} keyboardType="number-pad" /> : null}
        <Input label="Support phone shown to buyers (optional)" value={f.support_phone} onChangeText={set('support_phone')} keyboardType="phone-pad" />
      </Card>
      {msg ? <T style={{ color: msg === 'Saved.' ? colors.green : colors.red }}>{msg}</T> : null}
      <Button title="Save settings" icon="checkmark" loading={busy} onPress={() => save()} />
    </View>
  );
}
