// Noon Play VIP: membership plans, the cart and the VIP status.
// Prices are sample values — change them here (one place) before launch.
// Cart and VIP status live on this device until payments are connected to the API.
import { useSyncExternalStore } from 'react';

export type Plan = { id: string; months: number; title: string; price: number; was?: number; tag?: string };
export const CURRENCY = '₹';
export const PLANS: Plan[] = [
  { id: '1m', months: 1, title: 'One-Month VIP Membership', price: 199 },
  { id: '3m', months: 3, title: '3-Month VIP Membership', price: 499, was: 597 },
  { id: '6m', months: 6, title: '6-Month VIP Membership', price: 899, was: 1194, tag: 'POPULAR' },
  { id: '12m', months: 12, title: 'One-Year VIP Membership', price: 1499, was: 2388, tag: 'BEST VALUE' },
];
export const VIP_PERKS = [
  'Every VIP game and new levels each month',
  'Quran memorise games for all Juz Amma surahs',
  'No waiting — play VIP games without stars',
  'Double stars on every game',
  'Works for one child on any phone or computer',
];
export const off = (p: Plan) => (p.was ? Math.round(((p.was - p.price) / p.was) * 1000) / 10 : 0);
export const money = (n: number) => `${CURRENCY}${n.toLocaleString('en-IN')}`;

type State = { cart: string[]; liked: string[]; vipUntil: string | null };
let state: State = { cart: [], liked: [], vipUntil: null };
const ls = new Set<() => void>();
const set = (s: Partial<State>) => { state = { ...state, ...s }; ls.forEach((l) => l()); };
export const useVip = () => useSyncExternalStore((l) => { ls.add(l); return () => { ls.delete(l); }; }, () => state, () => state);

export const addToCart = (id: string) => { if (!state.cart.includes(id)) set({ cart: [...state.cart, id] }); };
export const removeFromCart = (id: string) => set({ cart: state.cart.filter((x) => x !== id) });
export const toggleLike = (id: string) => set({ liked: state.liked.includes(id) ? state.liked.filter((x) => x !== id) : [...state.liked, id] });

/** Pays for everything in the cart (demo): VIP runs for the total months bought, added to any time left. */
export function checkout() {
  const months = state.cart.reduce((n, id) => n + (PLANS.find((p) => p.id === id)?.months ?? 0), 0);
  const start = state.vipUntil && new Date(state.vipUntil) > new Date() ? new Date(state.vipUntil) : new Date();
  start.setMonth(start.getMonth() + months);
  set({ cart: [], vipUntil: start.toISOString() });
  return start;
}
export const isVip = (s: State) => !!s.vipUntil && new Date(s.vipUntil) > new Date();
