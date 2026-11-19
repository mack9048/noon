// Shop: types, categories, the shared cart count and UPI payment links.
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import type { Ionicons } from '@expo/vector-icons';
import { api } from './api';
import { colors } from '@/theme/tokens';

export type ProductType = 'digital' | 'physical';
export type Category = 'quran' | 'audio' | 'pdf' | 'adkar' | 'chart' | 'slide' | 'worksheet' | 'form' | 'other';
export type Product = {
  id: number; type: ProductType; category: Category; title: string; description?: string | null;
  price: number; offer_price?: number | null; unit_price: number; cover_url?: string | null; in_stock: boolean; stock?: number | null;
  file_name?: string | null; file_size?: number | null; owned?: boolean;
  // super admin only
  status?: 'live' | 'draft'; sold?: number; has_file?: boolean; deleted_at?: string | null; position?: number;
};
export type ShopSettings = { upi_id: string; upi_name: string; upi_qr_url: string | null; shipping_fee: number; free_shipping_above: number; cod_enabled: boolean; cod_max: number; support_phone: string };
export type Cart = {
  items: { product: Product; qty: number; line_total: number }[]; count: number; subtotal: number; shipping: number; total: number;
  has_physical: boolean; settings: ShopSettings; max_qty: number; bulk: { institution: string } | null;
};
export type OrderStatus = 'placed' | 'confirmed' | 'packed' | 'shipped' | 'delivered' | 'completed' | 'cancelled';
export type Order = {
  id: number; ref: string; status: OrderStatus; payment_method: 'upi' | 'cod'; payment_status: 'unpaid' | 'verifying' | 'paid' | 'refunded';
  upi_ref: string | null; subtotal: number; shipping: number; total: number;
  ship: { name: string; phone: string; address: string; city: string; state: string; pincode: string } | null;
  note: string | null; admin_note: string | null; courier: string | null; tracking_no: string | null; institution: string | null;
  placed_at: string; paid_at: string | null;
  items: { product_id: number | null; title: string; type: ProductType; unit_price: number; qty: number; line_total: number }[];
  buyer?: { id: number; name: string; role: string; phone: string | null; email: string | null } | null;
  settings?: ShopSettings;
};

/** The categories, as on the website's resources page. */
export const CATEGORIES: { key: Category; label: string; icon: keyof typeof Ionicons.glyphMap; tint: readonly [string, string] }[] = [
  { key: 'quran', label: 'The Holy Quran', icon: 'book-outline', tint: ['#E9F0FF', '#1F5FE0'] },
  { key: 'audio', label: 'Audio Books', icon: 'headset-outline', tint: ['#E6F6F0', '#0E7A50'] },
  { key: 'pdf', label: 'Books', icon: 'document-text-outline', tint: ['#FFF3E4', '#C4600E'] },
  { key: 'adkar', label: 'Adkar Cards', icon: 'heart-outline', tint: ['#F1EDFF', '#5B43E0'] },
  { key: 'chart', label: 'Learning Charts', icon: 'grid-outline', tint: ['#E9F0FF', '#1F5FE0'] },
  { key: 'slide', label: 'Lesson Slides', icon: 'desktop-outline', tint: ['#E6F6F0', '#0E7A50'] },
  { key: 'worksheet', label: 'Worksheets & Quizzes', icon: 'checkbox-outline', tint: ['#FFF3E4', '#C4600E'] },
  { key: 'form', label: 'Madrasa Forms', icon: 'document-attach-outline', tint: ['#F1EDFF', '#5B43E0'] },
  { key: 'other', label: 'Other', icon: 'gift-outline', tint: [colors.pink[0], colors.pink[1]] },
];
export const catOf = (k: Category) => CATEGORIES.find((c) => c.key === k) ?? CATEGORIES[CATEGORIES.length - 1];

export const rupee = (n: number) => `₹${n.toLocaleString('en-IN')}`;
export const fileSize = (n?: number | null) => (!n ? '' : n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export const STATUS_LABEL: Record<OrderStatus, string> = {
  placed: 'Waiting for payment', confirmed: 'Confirmed', packed: 'Packed', shipped: 'Shipped', delivered: 'Delivered', completed: 'Completed', cancelled: 'Cancelled',
};
export const PAY_LABEL: Record<Order['payment_status'], string> = { unpaid: 'Not paid', verifying: 'Checking payment', paid: 'Paid', refunded: 'Refunded' };

/** What the buyer should do or expect next, in plain words. */
export function orderHint(o: Order): string {
  if (o.status === 'cancelled') return o.payment_status === 'refunded' ? 'Cancelled and refunded.' : 'This order was cancelled.';
  if (o.payment_method === 'upi' && o.payment_status === 'unpaid') return 'Pay by UPI and send us the UPI reference number.';
  if (o.payment_status === 'verifying') return 'We are checking your UPI payment. This usually takes a few hours.';
  if (o.status === 'completed') return 'Paid. Your files are in My library.';
  if (o.status === 'shipped') return o.tracking_no ? `On the way${o.courier ? ` by ${o.courier}` : ''} · tracking ${o.tracking_no}` : 'On the way to you.';
  if (o.status === 'delivered') return 'Delivered. JazakAllah khair for your order!';
  if (o.status === 'packed') return 'Packed and ready to ship.';
  return o.payment_method === 'cod' ? 'Confirmed. Pay in cash when it arrives.' : 'Paid and confirmed. We will pack it soon.';
}

/** A link that opens the buyer's UPI app (GPay, PhonePe, Paytm…) with the amount filled in. */
export const upiLink = (s: ShopSettings, amount: number, ref: string) =>
  `upi://pay?pa=${encodeURIComponent(s.upi_id)}&pn=${encodeURIComponent(s.upi_name || 'Noon Learn')}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Order ${ref}`)}`;
export const isPhoneWeb = () => Platform.OS !== 'web' || /Android|iPhone|iPad/i.test((globalThis as any).navigator?.userAgent ?? '');

/* ---------- Cart count shared by every screen (the cart badge) ---------- */
let count = 0;
const listeners = new Set<(n: number) => void>();
export const setCartCount = (n: number) => { count = n; listeners.forEach((l) => l(n)); };
export function useCartCount() {
  const [n, setN] = useState(count);
  useEffect(() => {
    listeners.add(setN);
    api.get<Cart>('/shop/cart').then((c) => setCartCount(c.count)).catch(() => {});
    return () => { listeners.delete(setN); };
  }, []);
  return n;
}

/* ---------- Where to go after logging in (website visitor who tapped Buy) ---------- */
const NEXT = 'noon.next';
export const setNextPath = (p: string) => { try { (globalThis as any).localStorage?.setItem(NEXT, p); } catch { /* private mode */ } };
export function takeNextPath(): string | null {
  try {
    const p = (globalThis as any).localStorage?.getItem(NEXT);
    (globalThis as any).localStorage?.removeItem(NEXT);
    return p && /^\/shop(\/|$)/.test(p) ? p : null;
  } catch { return null; }
}
