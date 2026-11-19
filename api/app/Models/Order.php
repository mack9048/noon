<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    protected $fillable = ['ref', 'user_id', 'tenant_id', 'status', 'payment_method', 'payment_status', 'upi_ref', 'subtotal', 'shipping', 'total',
        'ship_name', 'ship_phone', 'ship_address', 'ship_city', 'ship_state', 'ship_pincode', 'note', 'admin_note', 'courier', 'tracking_no', 'paid_at'];

    protected $casts = ['paid_at' => 'datetime'];

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function hasPhysical(): bool
    {
        return $this->items->contains('type', 'physical');
    }

    public function toApp(bool $admin = false): array
    {
        return [
            'id' => $this->id, 'ref' => $this->ref, 'status' => $this->status, 'payment_method' => $this->payment_method, 'payment_status' => $this->payment_status,
            'upi_ref' => $this->upi_ref, 'subtotal' => $this->subtotal, 'shipping' => $this->shipping, 'total' => $this->total,
            'ship' => $this->ship_name ? ['name' => $this->ship_name, 'phone' => $this->ship_phone, 'address' => $this->ship_address, 'city' => $this->ship_city, 'state' => $this->ship_state, 'pincode' => $this->ship_pincode] : null,
            'note' => $this->note, 'admin_note' => $this->admin_note, 'courier' => $this->courier, 'tracking_no' => $this->tracking_no,
            'institution' => $this->tenant?->name, 'placed_at' => $this->created_at?->toIso8601String(), 'paid_at' => $this->paid_at?->toIso8601String(),
            'items' => $this->items->map(fn (OrderItem $i) => ['product_id' => $i->product_id, 'title' => $i->title, 'type' => $i->type, 'unit_price' => $i->unit_price, 'qty' => $i->qty, 'line_total' => $i->line_total])->values(),
        ] + ($admin ? ['buyer' => $this->user ? ['id' => $this->user->id, 'name' => $this->user->name, 'role' => $this->user->role, 'phone' => $this->user->phone, 'email' => $this->user->email] : null] : []);
    }
}
