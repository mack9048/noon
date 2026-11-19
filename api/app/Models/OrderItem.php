<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderItem extends Model
{
    public $timestamps = false;

    protected $fillable = ['order_id', 'product_id', 'title', 'type', 'unit_price', 'qty', 'line_total'];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
