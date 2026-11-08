// Noon Play VIP store: plan cards, plan details and the cart.
import React from 'react';
import { Platform, Pressable, Share, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Card, Grid, IconButton, Row, Screen, T } from '@/components/ui';
import { demoNote } from '@/components/kit';
import { useBase } from '@/lib/useBase';
import { PLANS, Plan, VIP_PERKS, addToCart, checkout, isVip, money, off, removeFromCart, toggleLike, useVip } from '@/lib/vip';
import { colors, fonts } from '@/theme/tokens';

const ORANGE: [string, string] = ['#FF9A3D', '#F06A24'];
const FRONT = [
  { label: 'Memorize Quran', icon: 'book' as const, g: ['#FF8A65', '#E0445A'] as [string, string] },
  { label: 'Little driver', icon: 'car-sport' as const, g: ['#FF9A3D', '#FF5E7E'] as [string, string] },
  { label: 'Quiz game', icon: 'help-circle' as const, g: ['#4ED68A', '#14945A'] as [string, string] },
  { label: 'Quiz game', icon: 'help-circle' as const, g: ['#4ED68A', '#14945A'] as [string, string] },
];
const BACK = [{ label: 'Little driver', g: ['#FF9A3D', '#C2304F'] as [string, string] }, { label: 'Quiz game', g: ['#4ED68A', '#0E7A50'] as [string, string] }];

function VipRibbon({ small }: { small?: boolean }) {
  return (
    <View style={{ position: 'absolute', right: small ? -14 : -18, top: small ? 6 : 10, transform: [{ rotate: '35deg' }], backgroundColor: '#F7C948', paddingHorizontal: small ? 14 : 18, paddingVertical: 1 }}>
      <Text style={{ fontFamily: fonts.fun, fontSize: small ? 9 : 11, color: '#6A4D00' }}>VIP</Text>
    </View>
  );
}

/** Picture for a plan: stacked game cards with VIP ribbons over a sky, surah tabs below. */
function PlanArt({ i, discount }: { i: number; discount: number }) {
  const f = FRONT[i % FRONT.length];
  return (
    <LinearGradient colors={['#3CB7F0', '#9BE0FF', '#8ED38A']} locations={[0, 0.6, 1]} style={{ height: 190, overflow: 'hidden' }}>
      {BACK.map((b, k) => (
        <LinearGradient key={k} colors={b.g} style={{ position: 'absolute', left: 60 + k * 36, top: 44 + k * 24, width: 120, height: 86, borderRadius: 14, borderWidth: 3, borderColor: '#FFF', opacity: 0.9, overflow: 'hidden', justifyContent: 'flex-end', padding: 6 }}>
          <VipRibbon small />
          <Text style={{ fontFamily: fonts.fun, fontSize: 11, color: '#FFF', textAlign: 'center' }}>{b.label}</Text>
        </LinearGradient>
      ))}
      <LinearGradient colors={f.g} style={{ position: 'absolute', left: 12, top: 18, width: 132, height: 104, borderRadius: 16, borderWidth: 3, borderColor: '#FFF', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        <VipRibbon />
        <Ionicons name={f.icon} size={36} color="#FFF" />
        <Text style={{ fontFamily: fonts.fun, fontSize: 13, color: '#FFF' }}>{f.label}</Text>
      </LinearGradient>
      <Row gap={6} style={{ position: 'absolute', left: 8, top: 8 }}>
        {discount ? <View style={{ backgroundColor: '#E0445A', borderRadius: 8, paddingHorizontal: 6, height: 18, justifyContent: 'center' }}><Text style={{ color: '#FFF', fontSize: 10, fontFamily: fonts.semibold }}>{discount}%</Text></View> : null}
        <View style={{ backgroundColor: '#22A86B', borderRadius: 8, paddingHorizontal: 6, height: 18, justifyContent: 'center' }}><Text style={{ color: '#FFF', fontSize: 10, fontFamily: fonts.semibold }}>Available</Text></View>
      </Row>
      <Row gap={4} style={{ position: 'absolute', left: 6, right: 6, bottom: 6 }}>
        {['سورة المسد', 'سورة الفلق', 'سورة النصر'].map((s, k) => (
          <View key={s} style={{ flex: 1, height: 30, borderRadius: 10, backgroundColor: k === 0 ? '#F08A24' : '#7E8C90', borderWidth: 2, borderColor: '#FFF', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: fonts.arabic, fontSize: 11, color: '#FFF' }}>{s}</Text>
          </View>
        ))}
      </Row>
    </LinearGradient>
  );
}

const share = async (p: Plan) => {
  const msg = `Noon Play VIP — ${p.title} for ${money(p.price)}. Fun Quran and Arabic games for kids on Noon Learn.`;
  try {
    if (Platform.OS === 'web' && (globalThis as any).navigator?.share) await (globalThis as any).navigator.share({ title: 'Noon Play VIP', text: msg });
    else if (Platform.OS !== 'web') await Share.share({ message: msg });
    else { await (globalThis as any).navigator?.clipboard?.writeText(msg); demoNote('Copied to share.'); }
  } catch { /* cancelled */ }
};

function PlanCard({ p, i }: { p: Plan; i: number }) {
  const base = useBase();
  const st = useVip();
  const liked = st.liked.includes(p.id);
  const inCart = st.cart.includes(p.id);
  return (
    <View style={{ backgroundColor: '#FFF', borderRadius: 22, overflow: 'hidden', shadowColor: '#10303A', shadowOpacity: 0.08, shadowRadius: 14 }}>
      <View>
        <PlanArt i={i} discount={off(p)} />
        <View style={{ position: 'absolute', right: 8, top: 8, gap: 8 }}>
          <IconButton name={liked ? 'heart' : 'heart-outline'} label={liked ? 'Remove from wishlist' : 'Add to wishlist'} size={38} color={liked ? '#E0445A' : colors.ink} onPress={() => toggleLike(p.id)} />
          <IconButton name="share-social-outline" label="Share" size={38} onPress={() => share(p)} />
        </View>
        {p.tag ? <View style={{ position: 'absolute', left: 8, top: 30, backgroundColor: colors.violet, borderRadius: 8, paddingHorizontal: 6, height: 18, justifyContent: 'center' }}><Text style={{ color: '#FFF', fontSize: 9, fontFamily: fonts.semibold }}>{p.tag}</Text></View> : null}
      </View>
      <View style={{ padding: 14, gap: 6 }}>
        <T v="small" style={{ fontFamily: fonts.semibold, fontSize: 11 }}>Game subscription</T>
        <Text style={{ fontFamily: fonts.fun, fontSize: 15, color: '#2A1A5E' }}>{p.title} for Noon Play</Text>
        <Row gap={8}>
          <Text style={{ fontFamily: fonts.fun, fontSize: 18, color: '#F06A24' }}>{money(p.price)}</Text>
          {p.was ? <Text style={{ fontSize: 12, color: colors.muted, textDecorationLine: 'line-through' }}>{money(p.was)}</Text> : null}
        </Row>
        <Pressable accessibilityRole="button" accessibilityLabel={inCart ? `${p.title} in cart, open cart` : `Add ${p.title} to cart`}
          onPress={() => (inCart ? router.push(`${base}/games/cart` as any) : addToCart(p.id))}>
          <LinearGradient colors={inCart ? ['#22A86B', '#14945A'] : ORANGE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 44, borderRadius: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Ionicons name={inCart ? 'checkmark' : 'cart-outline'} size={18} color="#FFF" /><Text style={{ fontFamily: fonts.fun, fontSize: 16, color: '#FFF' }}>{inCart ? 'In cart · View' : 'Add to Cart'}</Text>
          </LinearGradient>
        </Pressable>
        <Pressable accessibilityRole="link" onPress={() => router.push(`${base}/games/vip/${p.id}` as any)} style={{ alignSelf: 'center', padding: 4 }}>
          <T style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.muted }}>View Details</T>
        </Pressable>
      </View>
    </View>
  );
}

function CartButton() {
  const base = useBase();
  const st = useVip();
  if (!st.cart.length) return null;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Cart, ${st.cart.length} items`} onPress={() => router.push(`${base}/games/cart` as any)}
      style={{ position: 'absolute', right: 16, bottom: 104, height: 54, paddingHorizontal: 18, borderRadius: 27, backgroundColor: '#F06A24', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Ionicons name="cart" size={20} color="#FFF" /><Text style={{ fontFamily: fonts.fun, fontSize: 16, color: '#FFF' }}>Cart · {st.cart.length}</Text>
    </Pressable>
  );
}

function VipStatus() {
  const st = useVip();
  if (!isVip(st)) return null;
  return (
    <View style={{ marginTop: 10, backgroundColor: '#FFF4CC', borderRadius: 18, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Ionicons name="star" size={20} color="#D9A21A" />
      <T style={{ flex: 1, color: '#6A4D00' }}>VIP is active until <T style={{ fontFamily: fonts.semibold, color: '#6A4D00' }}>{new Date(st.vipUntil!).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</T>. Buying again adds more time.</T>
    </View>
  );
}

/* ---------- Store ---------- */
export function VipStoreScreen() {
  return (
    <Screen overlay={<CartButton />}>
      <Text style={{ fontFamily: fonts.fun, fontSize: 30, color: '#2A1A5E' }}>Noon Play VIP</Text>
      <T v="small">{PLANS.length} plans · all VIP games, double stars, new levels every month</T>
      <VipStatus />
      <View style={{ marginTop: 14 }}>
        <Grid cols={{ phone: 2, tablet: 3, desktop: 4 }} gap={12}>
          {PLANS.map((p, i) => <PlanCard key={p.id} p={p} i={i} />)}
        </Grid>
      </View>
    </Screen>
  );
}

/* ---------- Plan details ---------- */
export function VipPlanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const base = useBase();
  const st = useVip();
  const i = Math.max(0, PLANS.findIndex((p) => p.id === id));
  const p = PLANS[i];
  const inCart = st.cart.includes(p.id);
  const perMonth = Math.round(p.price / p.months);
  return (
    <Screen overlay={<CartButton />}>
      <View style={{ borderRadius: 26, overflow: 'hidden' }}><PlanArt i={i} discount={off(p)} /></View>
      <T v="small" style={{ marginTop: 14, fontFamily: fonts.semibold }}>Game subscription</T>
      <Text style={{ fontFamily: fonts.fun, fontSize: 24, color: '#2A1A5E' }}>{p.title} for Noon Play</Text>
      <Row gap={10} style={{ marginTop: 6 }}>
        <Text style={{ fontFamily: fonts.fun, fontSize: 26, color: '#F06A24' }}>{money(p.price)}</Text>
        {p.was ? <Text style={{ fontSize: 15, color: colors.muted, textDecorationLine: 'line-through' }}>{money(p.was)}</Text> : null}
        {p.was ? <View style={{ backgroundColor: '#FBD9DC', borderRadius: 10, paddingHorizontal: 8, height: 24, justifyContent: 'center' }}><T style={{ color: colors.red, fontFamily: fonts.semibold, fontSize: 12 }}>Save {off(p)}%</T></View> : null}
      </Row>
      <T v="small">{p.months === 1 ? 'Billed once for 1 month' : `${money(perMonth)} a month · ${p.months} months`} · no auto-renew</T>
      <Card style={{ marginTop: 14, gap: 10 }}>
        <T v="h3">What's included</T>
        {VIP_PERKS.map((x) => <Row key={x} gap={8}><Ionicons name="checkmark-circle" size={18} color={colors.green} /><T style={{ flex: 1 }}>{x}</T></Row>)}
      </Card>
      <Pressable accessibilityRole="button" onPress={() => (inCart ? router.push(`${base}/games/cart` as any) : addToCart(p.id))} style={{ marginTop: 14 }}>
        <LinearGradient colors={ORANGE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 54, borderRadius: 27, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Ionicons name="cart-outline" size={20} color="#FFF" /><Text style={{ fontFamily: fonts.fun, fontSize: 18, color: '#FFF' }}>{inCart ? 'Go to cart' : 'Add to Cart'}</Text>
        </LinearGradient>
      </Pressable>
    </Screen>
  );
}

/* ---------- Cart ---------- */
export function VipCartScreen() {
  const base = useBase();
  const st = useVip();
  const items = st.cart.map((id) => PLANS.find((p) => p.id === id)!).filter(Boolean);
  const total = items.reduce((n, p) => n + p.price, 0);
  const saved = items.reduce((n, p) => n + (p.was ? p.was - p.price : 0), 0);
  const pay = () => {
    const until = checkout();
    demoNote(`Demo payment done. VIP is on until ${until.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}. Real UPI / card payment is connected in the payments step.`);
    router.replace(`${base}/games` as any);
  };
  return (
    <Screen>
      <Text style={{ fontFamily: fonts.fun, fontSize: 28, color: '#2A1A5E' }}>My cart</Text>
      {items.length ? (
        <>
          <View style={{ gap: 10, marginTop: 12 }}>
            {items.map((p) => (
              <Card key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <LinearGradient colors={ORANGE} style={{ width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: fonts.fun, color: '#FFF', fontSize: 13 }}>VIP</Text></LinearGradient>
                <View style={{ flex: 1 }}><T style={{ fontFamily: fonts.semibold }}>{p.title}</T><T v="small">{p.months} month{p.months > 1 ? 's' : ''} of Noon Play VIP</T></View>
                <View style={{ alignItems: 'flex-end' }}>
                  <T style={{ fontFamily: fonts.semibold, color: '#F06A24' }}>{money(p.price)}</T>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${p.title}`} onPress={() => removeFromCart(p.id)}><T v="small" style={{ color: colors.red }}>Remove</T></Pressable>
                </View>
              </Card>
            ))}
          </View>
          <Card style={{ marginTop: 12, gap: 8 }}>
            <Row style={{ justifyContent: 'space-between' }}><T v="small">You save</T><T style={{ color: colors.green, fontFamily: fonts.semibold }}>{money(saved)}</T></Row>
            <Row style={{ justifyContent: 'space-between' }}><T v="h3">Total</T><Text style={{ fontFamily: fonts.fun, fontSize: 22, color: '#F06A24' }}>{money(total)}</Text></Row>
          </Card>
          <Pressable accessibilityRole="button" onPress={pay} style={{ marginTop: 14 }}>
            <LinearGradient colors={ORANGE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: fonts.fun, fontSize: 18, color: '#FFF' }}>Pay {money(total)}</Text>
            </LinearGradient>
          </Pressable>
          <T v="small" style={{ textAlign: 'center', marginTop: 8 }}>UPI · card · parents pay, kids play</T>
        </>
      ) : (
        <Card style={{ marginTop: 14, alignItems: 'center', gap: 10, paddingVertical: 28 }}>
          <Ionicons name="cart-outline" size={36} color={colors.muted} />
          <T v="small">Your cart is empty.</T>
          <Pressable accessibilityRole="button" onPress={() => router.replace(`${base}/games/vip` as any)}><T style={{ color: '#F06A24', fontFamily: fonts.semibold }}>See VIP plans</T></Pressable>
        </Card>
      )}
    </Screen>
  );
}
