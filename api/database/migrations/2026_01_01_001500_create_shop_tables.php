<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Shop: digital files (open after payment) and printed items (delivered).
 * Payment by direct UPI (confirmed by Noon Learn) or Cash on Delivery for printed items.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $t) {
            $t->id();
            $t->string('type', 10);                            // digital | physical
            $t->string('category', 20)->index();               // quran | audio | pdf | adkar | chart | slide | worksheet | form | other
            $t->string('title', 160);
            $t->text('description')->nullable();
            $t->unsignedInteger('price');                      // rupees
            $t->unsignedInteger('offer_price')->nullable();
            $t->string('cover_path')->nullable();              // public picture
            $t->string('file_path')->nullable();               // private file (digital)
            $t->string('file_name', 160)->nullable();
            $t->unsignedBigInteger('file_size')->nullable();
            $t->unsignedInteger('stock')->nullable();          // printed items; null = no limit
            $t->string('status', 10)->default('draft');        // live | draft
            $t->unsignedInteger('position')->default(0);
            $t->unsignedInteger('sold')->default(0);
            $t->softDeletes();
            $t->timestamps();
        });
        Schema::create('cart_items', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->foreignId('product_id')->constrained()->cascadeOnDelete();
            $t->unsignedInteger('qty')->default(1);
            $t->timestamps();
            $t->unique(['user_id', 'product_id']);
        });
        Schema::create('orders', function (Blueprint $t) {
            $t->id();
            $t->string('ref', 20)->unique();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->foreignId('tenant_id')->nullable()->constrained()->nullOnDelete(); // bulk order for an institution
            $t->string('status', 12)->default('placed')->index();     // placed | confirmed | packed | shipped | delivered | completed | cancelled
            $t->string('payment_method', 6);                            // upi | cod
            $t->string('payment_status', 10)->default('unpaid')->index(); // unpaid | verifying | paid | refunded
            $t->string('upi_ref', 40)->nullable();
            $t->unsignedInteger('subtotal');
            $t->unsignedInteger('shipping')->default(0);
            $t->unsignedInteger('total');
            $t->string('ship_name', 80)->nullable();
            $t->string('ship_phone', 20)->nullable();
            $t->string('ship_address', 300)->nullable();
            $t->string('ship_city', 60)->nullable();
            $t->string('ship_state', 40)->nullable();
            $t->string('ship_pincode', 10)->nullable();
            $t->string('note', 300)->nullable();
            $t->string('admin_note', 300)->nullable();
            $t->string('courier', 40)->nullable();
            $t->string('tracking_no', 60)->nullable();
            $t->timestamp('paid_at')->nullable();
            $t->timestamps();
        });
        Schema::create('order_items', function (Blueprint $t) {
            $t->id();
            $t->foreignId('order_id')->constrained()->cascadeOnDelete();
            $t->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $t->string('title', 160);
            $t->string('type', 10);
            $t->unsignedInteger('unit_price');
            $t->unsignedInteger('qty');
            $t->unsignedInteger('line_total');
        });
        Schema::create('shop_settings', function (Blueprint $t) {
            $t->id();
            $t->json('data');
            $t->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['shop_settings', 'order_items', 'orders', 'cart_items', 'products'] as $t) {
            Schema::dropIfExists($t);
        }
    }
};
