<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\ShopSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

/** Super admin: shop dashboard, products (with a bin), orders and settings. */
class ShopAdminController extends Controller
{
    public function summary()
    {
        $paid = Order::where('payment_status', 'paid')->where('status', '!=', 'cancelled');

        return [
            'sales_today' => (int) (clone $paid)->whereDate('paid_at', today())->sum('total'),
            'sales_month' => (int) (clone $paid)->where('paid_at', '>=', now()->startOfMonth())->sum('total'),
            'orders_month' => Order::where('created_at', '>=', now()->startOfMonth())->where('status', '!=', 'cancelled')->count(),
            'to_verify' => Order::where('payment_status', 'verifying')->where('status', '!=', 'cancelled')->count(),
            'awaiting_payment' => Order::where('payment_method', 'upi')->where('payment_status', 'unpaid')->where('status', 'placed')->count(),
            'to_ship' => Order::whereIn('status', ['confirmed', 'packed'])->whereHas('items', fn ($q) => $q->where('type', 'physical'))->count(),
            'low_stock' => Product::where('type', 'physical')->whereNotNull('stock')->where('stock', '<=', 5)->where('status', 'live')->get()->map(fn ($p) => ['id' => $p->id, 'title' => $p->title, 'stock' => $p->stock]),
            'products_live' => Product::where('status', 'live')->count(),
            'top' => Product::where('sold', '>', 0)->orderByDesc('sold')->limit(5)->get()->map(fn ($p) => ['id' => $p->id, 'title' => $p->title, 'sold' => $p->sold]),
        ];
    }

    /* ---------- Products ---------- */

    public function products(Request $request)
    {
        $q = $request->boolean('deleted') ? Product::onlyTrashed()->latest('deleted_at') : Product::orderBy('position')->latest();

        return $q->get()->map(fn (Product $p) => $p->toApp(true));
    }

    public function storeProduct(Request $request)
    {
        $data = $this->validated($request);
        $p = new Product(collect($data)->except(['cover', 'file', 'remove_cover'])->all());
        $this->saveFiles($request, $p);
        $p->save();

        return response()->json($p->toApp(true), 201);
    }

    /** POST (multipart) so files can be replaced. */
    public function updateProduct(Request $request, int $id)
    {
        $p = Product::findOrFail($id);
        $data = $this->validated($request, $p);
        $p->fill(collect($data)->except(['cover', 'file', 'remove_cover'])->all());
        if ($p->type === 'digital') {
            $p->stock = null;
        }
        $this->saveFiles($request, $p);
        $p->save();

        return $p->toApp(true);
    }

    public function destroyProduct(int $id)
    {
        Product::findOrFail($id)->delete();

        return response()->noContent();
    }

    public function restoreProduct(int $id)
    {
        $p = Product::onlyTrashed()->findOrFail($id);
        $p->restore();
        $p->update(['status' => 'draft']);

        return $p->toApp(true);
    }

    public function forceDeleteProduct(int $id)
    {
        $p = Product::onlyTrashed()->findOrFail($id);
        // Keep the file while someone who paid for it can still open it.
        $bought = \App\Models\OrderItem::where('product_id', $p->id)->exists();
        abort_if($bought, 422, 'People have bought this, so it stays in the bin so their copies keep working.');
        $p->cover_path && Storage::disk('public')->delete($p->cover_path);
        $p->file_path && Storage::disk('local')->delete($p->file_path);
        $p->forceDelete();

        return response()->noContent();
    }

    private function validated(Request $request, ?Product $p = null): array
    {
        $req = $p ? 'sometimes' : 'required';
        $type = $request->input('type', $p?->type);

        return $request->validate([
            'type' => [$req, 'in:digital,physical'],
            'category' => [$req, Rule::in(Product::CATEGORIES)],
            'title' => [$req, 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:3000'],
            'price' => [$req, 'integer', 'min:0', 'max:1000000'],
            'offer_price' => ['nullable', 'integer', 'min:0', 'max:1000000'],
            'stock' => ['nullable', 'integer', 'min:0', 'max:1000000'],
            'status' => ['sometimes', 'in:live,draft'],
            'position' => ['sometimes', 'integer', 'min:0'],
            'cover' => ['nullable', 'file', 'max:5120', 'extensions:jpg,jpeg,png,webp'],
            'remove_cover' => ['sometimes', 'boolean'],
            // Digital files: books, audio, slides, worksheets, or a zip of them.
            'file' => [$type === 'digital' ? 'nullable' : 'prohibited', 'file', 'max:204800', 'extensions:pdf,mp3,m4a,aac,ogg,wav,zip,png,jpg,jpeg,pptx,docx'],
        ]);
    }

    private function saveFiles(Request $request, Product $p): void
    {
        if ($request->boolean('remove_cover') && $p->cover_path) {
            Storage::disk('public')->delete($p->cover_path);
            $p->cover_path = null;
        }
        if ($request->hasFile('cover')) {
            $p->cover_path && Storage::disk('public')->delete($p->cover_path);
            $p->cover_path = $request->file('cover')->store('shop/covers', 'public');
        }
        if ($request->hasFile('file')) {
            $p->file_path && Storage::disk('local')->delete($p->file_path);
            $f = $request->file('file');
            $p->file_path = $f->store('shop/files', 'local');
            $p->file_name = mb_substr($f->getClientOriginalName(), 0, 160);
            $p->file_size = $f->getSize();
        }
    }

    /* ---------- Orders ---------- */

    public function orders(Request $request)
    {
        $data = $request->validate(['filter' => ['nullable', 'in:all,verify,unpaid,ship,shipped,done,cancelled'], 'q' => ['nullable', 'string', 'max:60']]);

        return Order::with('items', 'user', 'tenant')
            ->when($data['filter'] ?? 'all', fn ($q, $f) => match ($f) {
                'verify' => $q->where('payment_status', 'verifying')->where('status', '!=', 'cancelled'),
                'unpaid' => $q->where('payment_method', 'upi')->where('payment_status', 'unpaid')->where('status', 'placed'),
                'ship' => $q->whereIn('status', ['confirmed', 'packed'])->whereHas('items', fn ($i) => $i->where('type', 'physical')),
                'shipped' => $q->where('status', 'shipped'),
                'done' => $q->whereIn('status', ['delivered', 'completed']),
                'cancelled' => $q->where('status', 'cancelled'),
                default => $q,
            })
            ->when($data['q'] ?? null, fn ($q, $s) => $q->where(fn ($w) => $w->where('ref', 'like', "%{$s}%")->orWhere('ship_name', 'like', "%{$s}%")
                ->orWhere('ship_phone', 'like', "%{$s}%")->orWhere('upi_ref', 'like', "%{$s}%")
                ->orWhereHas('user', fn ($u) => $u->where('name', 'like', "%{$s}%")->orWhere('phone', 'like', "%{$s}%"))))
            ->latest()->limit(300)->get()->map(fn (Order $o) => $o->toApp(true));
    }

    /**
     * Actions: confirm_payment, reject_payment, pack, ship (courier, tracking_no), deliver, cancel, refund, note.
     * A paid order with only digital files is completed at once (the buyer can open them).
     */
    public function updateOrder(Request $request, int $id)
    {
        $order = Order::with('items', 'user', 'tenant')->findOrFail($id);
        $data = $request->validate([
            'action' => ['required', 'in:confirm_payment,reject_payment,pack,ship,deliver,cancel,refund,note'],
            'courier' => ['nullable', 'string', 'max:40'], 'tracking_no' => ['nullable', 'string', 'max:60'],
            'admin_note' => ['nullable', 'string', 'max:300'],
        ]);
        $live = $order->status !== 'cancelled';
        $physical = $order->hasPhysical();
        switch ($data['action']) {
            case 'confirm_payment':
                abort_unless($live && $order->payment_status !== 'paid', 422, 'Nothing to confirm.');
                $order->fill(['payment_status' => 'paid', 'paid_at' => now(), 'status' => $physical ? ($order->status === 'placed' ? 'confirmed' : $order->status) : 'completed']);
                break;
            case 'reject_payment':
                abort_unless($live && $order->payment_method === 'upi' && $order->payment_status === 'verifying', 422, 'Nothing to reject.');
                $order->fill(['payment_status' => 'unpaid', 'admin_note' => $data['admin_note'] ?? 'We could not find this UPI payment. Please check the reference number.']);
                break;
            case 'pack':
                abort_unless($live && $physical && $order->status === 'confirmed', 422, 'Only confirmed orders can be packed.');
                $order->status = 'packed';
                break;
            case 'ship':
                abort_unless($live && $physical && in_array($order->status, ['confirmed', 'packed'], true), 422, 'Only confirmed or packed orders can be shipped.');
                abort_if($order->payment_method === 'upi' && $order->payment_status !== 'paid', 422, 'Confirm the UPI payment first.');
                $order->fill(['status' => 'shipped', 'courier' => $data['courier'] ?? $order->courier, 'tracking_no' => $data['tracking_no'] ?? $order->tracking_no]);
                break;
            case 'deliver':
                abort_unless($live && $order->status === 'shipped', 422, 'Only shipped orders can be marked delivered.');
                $order->status = 'delivered';
                // Cash on Delivery is paid when it is delivered.
                if ($order->payment_status !== 'paid') {
                    $order->fill(['payment_status' => 'paid', 'paid_at' => now()]);
                }
                break;
            case 'cancel':
                abort_unless($live && ! in_array($order->status, ['shipped', 'delivered', 'completed'], true), 422, 'Shipped or finished orders cannot be cancelled.');
                ShopController::cancelOrder($order);
                $order->refresh();
                break;
            case 'refund':
                abort_unless($order->payment_status === 'paid', 422, 'Only paid orders can be marked refunded.');
                $order->payment_status = 'refunded';
                if ($live && ! in_array($order->status, ['delivered', 'completed'], true)) {
                    ShopController::cancelOrder($order);
                    $order->refresh();
                    $order->payment_status = 'refunded';
                }
                break;
        }
        if (array_key_exists('admin_note', $data) && $data['action'] !== 'reject_payment') {
            $order->admin_note = $data['admin_note'];
        }
        $order->save();

        return $order->fresh(['items', 'user', 'tenant'])->toApp(true);
    }

    /* ---------- Settings ---------- */

    public function settings()
    {
        return ShopSetting::forBuyers();
    }

    public function updateSettings(Request $request)
    {
        $data = $request->validate([
            'upi_id' => ['nullable', 'string', 'max:60', 'regex:/^[A-Za-z0-9.\-_]{2,}@[A-Za-z][A-Za-z0-9]{1,}$/'],
            'upi_name' => ['nullable', 'string', 'max:60'],
            'shipping_fee' => ['nullable', 'integer', 'min:0', 'max:10000'],
            'free_shipping_above' => ['nullable', 'integer', 'min:0', 'max:1000000'],
            'cod_enabled' => ['sometimes', 'boolean'],
            'cod_max' => ['nullable', 'integer', 'min:0', 'max:1000000'],
            'support_phone' => ['nullable', 'string', 'max:20'],
            'qr' => ['nullable', 'file', 'max:2048', 'extensions:png,jpg,jpeg,webp'],
            'remove_qr' => ['sometimes', 'boolean'],
        ], ['upi_id.regex' => 'Enter a UPI ID like name@okhdfcbank.']);
        $values = collect($data)->except(['qr', 'remove_qr'])->map(fn ($v) => $v ?? '')->all();
        $old = ShopSetting::current()['upi_qr_path'];
        if ($request->boolean('remove_qr') || $request->hasFile('qr')) {
            $old && Storage::disk('public')->delete($old);
            $values['upi_qr_path'] = $request->hasFile('qr') ? $request->file('qr')->store('shop', 'public') : null;
        }
        foreach (['shipping_fee', 'free_shipping_above', 'cod_max'] as $k) {
            if (isset($values[$k]) && $values[$k] === '') {
                $values[$k] = 0;
            }
        }
        ShopSetting::put($values);

        return ShopSetting::forBuyers();
    }
}
