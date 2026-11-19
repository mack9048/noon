<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class Product extends Model
{
    use SoftDeletes;

    public const CATEGORIES = ['quran', 'audio', 'pdf', 'adkar', 'chart', 'slide', 'worksheet', 'form', 'other'];

    protected $fillable = ['type', 'category', 'title', 'description', 'price', 'offer_price', 'cover_path', 'file_path', 'file_name', 'file_size', 'stock', 'status', 'position', 'sold'];

    protected $casts = ['price' => 'integer', 'offer_price' => 'integer', 'stock' => 'integer', 'file_size' => 'integer'];

    /** What the buyer pays for one. */
    public function unitPrice(): int
    {
        return $this->offer_price !== null && $this->offer_price < $this->price ? $this->offer_price : $this->price;
    }

    public function inStock(int $qty = 1): bool
    {
        return $this->type === 'digital' || $this->stock === null || $this->stock >= $qty;
    }

    public function toApp(bool $admin = false): array
    {
        return [
            'id' => $this->id, 'type' => $this->type, 'category' => $this->category, 'title' => $this->title, 'description' => $this->description,
            'price' => $this->price, 'offer_price' => $this->offer_price, 'unit_price' => $this->unitPrice(),
            'cover_url' => $this->cover_path ? Storage::disk('public')->url($this->cover_path) : null,
            'in_stock' => $this->inStock(), 'stock' => $this->type === 'physical' ? $this->stock : null,
            'file_name' => $this->type === 'digital' ? $this->file_name : null, 'file_size' => $this->type === 'digital' ? $this->file_size : null,
        ] + ($admin ? ['status' => $this->status, 'position' => $this->position, 'sold' => $this->sold, 'has_file' => (bool) $this->file_path, 'deleted_at' => $this->deleted_at?->toIso8601String()] : []);
    }
}
