<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CartItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ShopSetting;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Validation\ValidationException;

/**
 * The shop for every signed-in user: products, cart, checkout (direct UPI or Cash on Delivery),
 * orders and the library of bought digital files. Institution admins can order in bulk.
 */
class ShopController extends Controller
{
    /** Most of one printed item a person may order; institution admins order in bulk. */
    private function maxQty(User $user): int
    {
        return $user->hasRole('admin') && $user->tenant_id ? 1000 : 20;
    }

    /** Public list for the website and the app. */
    public function products(Request $request)
    {
        $data = $request->validate(['category' => ['nullable', 'in:'.implode(',', Product::CATEGORIES)], 'q' => ['nullable', 'string', 'max:80']]);

        return Product::where('status', 'live')
            ->when($data['category'] ?? null, fn ($q, $c) => $q->where('category', $c))
            ->when($data['q'] ?? null, fn ($q, $s) => $q->where('title', 'like', "%{$s}%"))
            ->orderBy('position')->latest()->limit(300)->get()->map(fn (Product $p) => $p->toApp());
    }

    public function product(Request $request, int $id)
    {
        $p = Product::where('status', 'live')->findOrFail($id);

        return $p->toApp() + ['owned' => $request->user() ? $this->owns($request->user(), $p->id) : false];
    }

    /* ---------- Cart ---------- */

    public function cart(Request $request)
    {
        $user = $request->user();
        $items = CartItem::with('product')->where('user_id', $user->id)->get();
        // Drop products that were removed or unpublished since they were added.
        $gone = $items->filter(fn ($i) => ! $i->product || $i->product->status !== 'live');
        CartItem::whereIn('id', $gone->pluck('id'))->delete();
        $items = $items->diff($gone)->values();

        $lines = $items->map(fn (CartItem $i) => ['product' => $i->product->toApp(), 'qty' => $i->qty, 'line_total' => $i->product->unitPrice() * $i->qty]);
        $subtotal = (int) $lines->sum('line_total');
        $physical = $items->contains(fn ($i) => $i->product->type === 'physical');
        $settings = ShopSetting::forBuyers();
        $shipping = $physical && $subtotal < $settings['free_shipping_above'] ? $settings['shipping_fee'] : 0;

        return [
            'items' => $lines->values(), 'count' => (int) $items->sum('qty'), 'subtotal' => $subtotal, 'shipping' => $shipping, 'total' => $subtotal + $shipping,
            'has_physical' => $physical, 'settings' => $settings, 'max_qty' => $this->maxQty($user),
            'bulk' => $user->hasRole('admin') && $user->tenant_id ? ['institution' => $user->tenant?->name] : null,
        ];
    }

    public function addToCart(Request $request)
    {
        $user = $request->user();
        $data = $request->validate(['product_id' => ['required', 'integer'], 'qty' => ['nullable', 'integer', 'min:1', 'max:'.$this->maxQty($user)]]);
        $p = Product::where('status', 'live')->findOrFail($data['product_id']);
        if ($p->type === 'digital' && $this->owns($user, $p->id)) {
            throw ValidationException::withMessages(['product_id' => 'You already have this. Open it from My library.']);
        }
        $item = CartItem::firstOrNew(['user_id' => $user->id, 'product_id' => $p->id]);
        $qty = $p->type === 'digital' ? 1 : min($this->maxQty($user), ($item->exists ? $item->qty : 0) + ($data['qty'] ?? 1));
        if (! $p->inStock($qty)) {
            throw ValidationException::withMessages(['qty' => $p->stock ? "Only {$p->stock} left." : 'Out of stock.']);
        }
        $item->qty = $qty;
        $item->save();

        return $this->cart($request);
    }

    public function updateCart(Request $request, int $productId)
    {
        $user = $request->user();
        $data = $request->validate(['qty' => ['required', 'integer', 'min:0', 'max:'.$this->maxQty($user)]]);
        $item = CartItem::with('product')->where('user_id', $user->id)->where('product_id', $productId)->firstOrFail();
        if ($data['qty'] === 0) {
            $item->delete();
        } else {
            $qty = $item->product->type === 'digital' ? 1 : $data['qty'];
            if (! $item->product->inStock($qty)) {
                throw ValidationException::withMessages(['qty' => "Only {$item->product->stock} left."]);
            }
            $item->update(['qty' => $qty]);
        }

        return $this->cart($request);
    }

    public function removeFromCart(Request $request, int $productId)
    {
        CartItem::where('user_id', $request->user()->id)->where('product_id', $productId)->delete();

        return $this->cart($request);
    }

    /* ---------- Checkout & orders ---------- */

    public function placeOrder(Request $request)
    {
        $user = $request->user();
        $cart = $this->cart($request);
        abort_if(! $cart['items']->count(), 422, 'Your cart is empty.');
        $lines = collect($cart['items'])->map(fn ($l) => [Product::find($l['product']['id']), $l['qty']])->all();
        $data = $this->checkoutRules($request, $cart['has_physical']);
        $order = $this->createOrder($lines, $data, $user);
        CartItem::where('user_id', $user->id)->delete();

        return response()->json($order->load('items', 'tenant')->toApp(), 201);
    }

    /* ---------- Website checkout (no account) ---------- */

    /** The website's checkout: the cart comes from the browser; the buyer gives a name and phone. */
    public function websiteOrder(Request $request)
    {
        // A field people never see: forms filled in by bots are dropped quietly.
        abort_if(filled($request->input('website')), 422, 'Please try again.');
        $items = $request->validate([
            'items' => ['required', 'array', 'min:1', 'max:30'],
            'items.*.product_id' => ['required', 'integer'],
            'items.*.qty' => ['required', 'integer', 'min:1', 'max:20'],
        ])['items'];
        $products = Product::where('status', 'live')->whereIn('id', collect($items)->pluck('product_id'))->get()->keyBy('id');
        $lines = [];
        foreach (collect($items)->groupBy('product_id') as $id => $rows) {
            $p = $products[$id] ?? null;
            if (! $p) {
                throw ValidationException::withMessages(['items' => 'Some items are no longer for sale. Please refresh your cart.']);
            }
            $lines[] = [$p, $p->type === 'digital' ? 1 : min(20, (int) $rows->sum('qty'))];
        }
        $physical = collect($lines)->contains(fn ($l) => $l[0]->type === 'physical');
        $data = $this->checkoutRules($request, $physical) + $request->validate([
            'buyer_name' => ['required', 'string', 'max:80'],
            'buyer_phone' => ['required', 'string', 'regex:/^\+?[0-9 ]{10,15}$/'],
            'buyer_email' => ['nullable', 'email', 'max:120'],
        ], ['buyer_phone.regex' => 'Enter a phone number with 10 digits or more.']);
        $order = $this->createOrder($lines, $data, null);

        return response()->json($this->websiteView($order) + ['token' => $order->access_token], 201);
    }

    public function websiteShow(Request $request, string $ref)
    {
        return $this->websiteView($this->byToken($request, $ref));
    }

    public function websiteUpi(Request $request, string $ref)
    {
        $order = $this->byToken($request, $ref);
        $this->applyUpiRef($request, $order);

        return $this->websiteView($order->fresh(['items']));
    }

    public function websiteCancel(Request $request, string $ref)
    {
        $order = $this->byToken($request, $ref);
        abort_unless(in_array($order->status, ['placed', 'confirmed'], true) && $order->payment_status !== 'paid', 422, 'This order can no longer be cancelled. Please contact us.');
        self::cancelOrder($order);

        return $this->websiteView($order->fresh(['items']));
    }

    /** Public product details (website and app). */
    public function websiteProduct(int $id)
    {
        return Product::where('status', 'live')->findOrFail($id)->toApp();
    }

    public function websiteSettings()
    {
        return ShopSetting::forBuyers();
    }

    private function byToken(Request $request, string $ref): Order
    {
        $token = (string) $request->query('t', $request->input('t', ''));
        $order = Order::with('items')->where('ref', $ref)->whereNull('user_id')->whereNotNull('access_token')->first();
        abort_unless($order && strlen($token) >= 32 && hash_equals($order->access_token, $token), 404, 'Order not found. Please use the link you got after ordering.');

        return $order;
    }

    /** The order for its secret link, with download links for paid digital files. */
    private function websiteView(Order $order): array
    {
        $paid = $order->payment_status === 'paid' && $order->status !== 'cancelled';
        $downloads = $paid ? $order->items->where('type', 'digital')->filter(fn ($i) => $i->product_id)->map(function ($i) {
            $p = Product::withTrashed()->find($i->product_id);
            if (! $p?->file_path) {
                return null;
            }
            $path = URL::temporarySignedRoute('shop.file', now()->addHours(2), ['id' => $p->id], absolute: false);

            return ['title' => $i->title, 'file_name' => $p->file_name, 'url' => rtrim(config('app.url'), '/').$path];
        })->filter()->values() : [];

        return $order->toApp() + ['buyer_name' => $order->buyer_name, 'buyer_phone' => $order->buyer_phone, 'downloads' => $downloads, 'settings' => ShopSetting::forBuyers()];
    }

    /* ---------- Shared checkout ---------- */

    private function checkoutRules(Request $request, bool $physical): array
    {
        return $request->validate([
            'payment_method' => ['required', 'in:upi,cod'],
            'upi_ref' => ['nullable', 'string', 'max:40', 'regex:/^[A-Za-z0-9\-]{6,40}$/'],
            'note' => ['nullable', 'string', 'max:300'],
            'for_institution' => ['sometimes', 'boolean'],
            'ship_name' => [$physical ? 'required' : 'nullable', 'string', 'max:80'],
            'ship_phone' => [$physical ? 'required' : 'nullable', 'string', 'regex:/^\+?[0-9 ]{10,15}$/'],
            'ship_address' => [$physical ? 'required' : 'nullable', 'string', 'max:300'],
            'ship_city' => [$physical ? 'required' : 'nullable', 'string', 'max:60'],
            'ship_state' => [$physical ? 'required' : 'nullable', 'string', 'max:40'],
            'ship_pincode' => [$physical ? 'required' : 'nullable', 'regex:/^[0-9]{6}$/'],
        ], ['upi_ref.regex' => 'Enter the UPI reference (UTR) number from your payment app.', 'ship_pincode.regex' => 'Enter a 6-digit PIN code.', 'ship_phone.regex' => 'Enter a phone number with 10 digits or more.']);
    }

    /**
     * Create an order from [product, qty] lines; checks payment rules and stock, takes stock.
     * $user is null for website orders (they get a secret link instead).
     */
    private function createOrder(array $lines, array $data, ?User $user): Order
    {
        $s = ShopSetting::forBuyers();
        $physical = collect($lines)->contains(fn ($l) => $l[0]->type === 'physical');
        $hasDigital = collect($lines)->contains(fn ($l) => $l[0]->type === 'digital');
        $subtotal = (int) collect($lines)->sum(fn ($l) => $l[0]->unitPrice() * $l[1]);
        $shipping = $physical && $subtotal < $s['free_shipping_above'] ? $s['shipping_fee'] : 0;
        $total = $subtotal + $shipping;
        if ($data['payment_method'] === 'cod') {
            abort_unless($physical && $s['cod_enabled'], 422, 'Cash on Delivery is only for printed items.');
            abort_if($hasDigital, 422, 'Digital files are paid by UPI. Remove them or pay the whole order by UPI.');
            abort_if($s['cod_max'] && $total > $s['cod_max'], 422, "Cash on Delivery is for orders up to ₹{$s['cod_max']}. Please pay by UPI.");
        } else {
            abort_unless($s['upi_id'], 422, 'UPI payment is not set up yet. Please try again later.');
        }

        return DB::transaction(function () use ($user, $data, $lines, $physical, $subtotal, $shipping, $total) {
            // Lock the products while stock is checked and taken.
            $products = Product::whereIn('id', collect($lines)->map(fn ($l) => $l[0]->id))->lockForUpdate()->get()->keyBy('id');
            foreach ($lines as [$line, $qty]) {
                $p = $products[$line->id];
                if (! $p->inStock($qty)) {
                    throw ValidationException::withMessages(['cart' => "{$p->title}: only {$p->stock} left. Please change the quantity."]);
                }
            }
            $order = Order::create([
                'ref' => 'TMP'.bin2hex(random_bytes(6)), 'user_id' => $user?->id,
                'tenant_id' => $user && ($data['for_institution'] ?? false) && $user->hasRole('admin') ? $user->tenant_id : null,
                'buyer_name' => $user ? null : $data['buyer_name'], 'buyer_phone' => $user ? null : $data['buyer_phone'], 'buyer_email' => $user ? null : ($data['buyer_email'] ?? null),
                'access_token' => $user ? null : bin2hex(random_bytes(24)),
                'status' => $data['payment_method'] === 'cod' ? 'confirmed' : 'placed',
                'payment_method' => $data['payment_method'],
                'payment_status' => $data['payment_method'] === 'upi' && ! empty($data['upi_ref']) ? 'verifying' : 'unpaid',
                'upi_ref' => $data['upi_ref'] ?? null,
                'subtotal' => $subtotal, 'shipping' => $shipping, 'total' => $total,
                'note' => $data['note'] ?? null,
            ] + ($physical ? collect($data)->only(['ship_name', 'ship_phone', 'ship_address', 'ship_city', 'ship_state', 'ship_pincode'])->all() : []));
            $order->update(['ref' => 'NL'.now()->format('ymd').'-'.str_pad((string) $order->id, 5, '0', STR_PAD_LEFT)]);
            foreach ($lines as [$line, $qty]) {
                $p = $products[$line->id];
                OrderItem::create(['order_id' => $order->id, 'product_id' => $p->id, 'title' => $p->title, 'type' => $p->type, 'unit_price' => $p->unitPrice(), 'qty' => $qty, 'line_total' => $p->unitPrice() * $qty]);
                if ($p->type === 'physical' && $p->stock !== null) {
                    $p->decrement('stock', $qty);
                }
                $p->increment('sold', $qty);
            }

            return $order;
        });
    }

    private function applyUpiRef(Request $request, Order $order): void
    {
        $data = $request->validate(['upi_ref' => ['required', 'string', 'regex:/^[A-Za-z0-9\-]{6,40}$/']], ['upi_ref.regex' => 'Enter the UPI reference (UTR) number from your payment app.']);
        abort_unless($order->payment_method === 'upi' && in_array($order->payment_status, ['unpaid', 'verifying'], true) && $order->status !== 'cancelled', 422, 'This order does not need a UPI reference.');
        $order->update(['upi_ref' => $data['upi_ref'], 'payment_status' => 'verifying']);
    }

    public function orders(Request $request)
    {
        return Order::with('items', 'tenant')->where('user_id', $request->user()->id)->latest()->limit(100)->get()->map(fn (Order $o) => $o->toApp());
    }

    public function order(Request $request, string $ref)
    {
        return $this->mine($request, $ref)->toApp() + ['settings' => ShopSetting::forBuyers()];
    }

    /** The buyer sends (or corrects) the UPI reference after paying. */
    public function submitUpi(Request $request, string $ref)
    {
        $order = $this->mine($request, $ref);
        $this->applyUpiRef($request, $order);

        return $order->fresh(['items', 'tenant'])->toApp();
    }

    public function cancel(Request $request, string $ref)
    {
        $order = $this->mine($request, $ref);
        abort_unless(in_array($order->status, ['placed', 'confirmed'], true) && $order->payment_status !== 'paid', 422, 'This order can no longer be cancelled. Please contact us.');
        self::cancelOrder($order);

        return $order->fresh(['items', 'tenant'])->toApp();
    }

    /** Cancel and put printed items back in stock. */
    public static function cancelOrder(Order $order): void
    {
        DB::transaction(function () use ($order) {
            foreach ($order->items as $i) {
                $p = $i->product_id ? Product::withTrashed()->find($i->product_id) : null;
                if ($p && $i->type === 'physical' && $p->stock !== null) {
                    $p->increment('stock', $i->qty);
                }
                if ($p && $p->sold >= $i->qty) {
                    $p->decrement('sold', $i->qty);
                }
            }
            $order->update(['status' => 'cancelled']);
        });
    }

    /* ---------- Bought digital files ---------- */

    public function library(Request $request)
    {
        $ids = $this->ownedIds($request->user());

        return Product::withTrashed()->whereIn('id', $ids)->where('type', 'digital')->get()->map(fn (Product $p) => $p->toApp());
    }

    /** A short-lived link to the file, only for people who paid for it. */
    public function download(Request $request, int $id)
    {
        $p = Product::withTrashed()->where('type', 'digital')->findOrFail($id);
        abort_unless($this->owns($request->user(), $p->id) || $request->user()->hasRole('super'), 403, 'Buy this first to open it.');
        abort_unless($p->file_path, 404, 'The file is not ready yet. Please contact us.');

        $path = URL::temporarySignedRoute('shop.file', now()->addMinutes(30), ['id' => $p->id], absolute: false);

        return ['url' => rtrim(config('app.url'), '/').$path, 'file_name' => $p->file_name];
    }

    /** The file itself; reached only through the signed link above. */
    public function file(int $id)
    {
        $p = Product::withTrashed()->where('type', 'digital')->findOrFail($id);
        abort_unless($p->file_path && Storage::disk('local')->exists($p->file_path), 404);

        return Storage::disk('local')->response($p->file_path, $p->file_name, ['X-Content-Type-Options' => 'nosniff']);
    }

    private function mine(Request $request, string $ref): Order
    {
        return Order::with('items', 'tenant')->where('user_id', $request->user()->id)->where('ref', $ref)->firstOrFail();
    }

    private function ownedIds(User $user): array
    {
        return OrderItem::whereHas('order', fn ($q) => $q->where('user_id', $user->id)->where('payment_status', 'paid')->where('status', '!=', 'cancelled'))
            ->where('type', 'digital')->pluck('product_id')->filter()->unique()->values()->all();
    }

    private function owns(User $user, int $productId): bool
    {
        return in_array($productId, $this->ownedIds($user), true);
    }
}
