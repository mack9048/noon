<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

/** One row of shop settings: UPI details, shipping and Cash on Delivery. */
class ShopSetting extends Model
{
    protected $fillable = ['data'];

    protected $casts = ['data' => 'array'];

    public const DEFAULTS = ['upi_id' => '', 'upi_name' => 'Noon Learn', 'upi_qr_path' => null, 'shipping_fee' => 50, 'free_shipping_above' => 999, 'cod_enabled' => true, 'cod_max' => 5000, 'support_phone' => ''];

    public static function current(): array
    {
        return array_merge(self::DEFAULTS, static::query()->first()?->data ?? []);
    }

    public static function put(array $values): array
    {
        $row = static::query()->first() ?? new static(['data' => []]);
        $row->data = array_merge(self::DEFAULTS, $row->data ?? [], $values);
        $row->save();

        return $row->data;
    }

    /** What buyers see at checkout. */
    public static function forBuyers(): array
    {
        $s = self::current();

        return [
            'upi_id' => $s['upi_id'], 'upi_name' => $s['upi_name'],
            'upi_qr_url' => $s['upi_qr_path'] ? Storage::disk('public')->url($s['upi_qr_path']) : null,
            'shipping_fee' => (int) $s['shipping_fee'], 'free_shipping_above' => (int) $s['free_shipping_above'],
            'cod_enabled' => (bool) $s['cod_enabled'], 'cod_max' => (int) $s['cod_max'], 'support_phone' => $s['support_phone'],
        ];
    }
}
