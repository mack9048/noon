<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ShopTest extends TestCase
{
    use RefreshDatabase;

    private User $boss;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        Storage::fake('local');
        $this->boss = User::create(['name' => 'Boss', 'email' => 'boss@x.test', 'password' => 'secret123', 'role' => 'super']);
    }

    private function product(array $fields, ?UploadedFile $file = null): array
    {
        return $this->as($this->boss)->post('/api/super/shop/products', $fields + ($file ? ['file' => $file] : []), ['Accept' => 'application/json'])->assertCreated()->json();
    }

    private function address(): array
    {
        return ['ship_name' => 'Rahim', 'ship_phone' => '9876543210', 'ship_address' => 'House 1, Main Road', 'ship_city' => 'Kozhikode', 'ship_state' => 'Kerala', 'ship_pincode' => '673001'];
    }

    public function test_digital_file_bought_by_upi_opens_after_noon_confirms(): void
    {
        $this->as($this->boss)->postJson('/api/super/shop/settings', ['upi_id' => 'not-a-upi'])->assertUnprocessable();
        $this->as($this->boss)->postJson('/api/super/shop/settings', ['upi_id' => 'noonlearn@okhdfcbank', 'upi_name' => 'Noon Learn', 'shipping_fee' => 60, 'free_shipping_above' => 500])->assertOk();
        $book = $this->product(['type' => 'digital', 'category' => 'pdf', 'title' => 'Fiqh Textbook', 'price' => 200, 'offer_price' => 150, 'status' => 'live'], UploadedFile::fake()->create('fiqh.pdf', 100, 'application/pdf'));
        $this->product(['type' => 'digital', 'category' => 'audio', 'title' => 'Hidden draft', 'price' => 10]);

        // Public list shows only live products.
        $this->getJson('/api/shop/products')->assertOk()->assertJsonCount(1)->assertJsonPath('0.unit_price', 150);
        $s = User::create(['name' => 'S', 'email' => 's@x.test', 'phone' => '9000000001', 'password' => 'secret123', 'role' => 'guest']);

        // A digital file is always one copy and has no shipping.
        $this->as($s)->postJson('/api/shop/cart', ['product_id' => $book['id'], 'qty' => 3])->assertOk()->assertJsonPath('items.0.qty', 1)->assertJsonPath('shipping', 0)->assertJsonPath('total', 150);
        $this->as($s)->postJson('/api/shop/orders', ['payment_method' => 'cod'])->assertUnprocessable();
        $order = $this->as($s)->postJson('/api/shop/orders', ['payment_method' => 'upi'])->assertCreated()
            ->assertJsonPath('status', 'placed')->assertJsonPath('payment_status', 'unpaid')->json();
        $this->as($s)->getJson('/api/shop/cart')->assertJsonPath('count', 0);
        $this->as($s)->getJson("/api/shop/products/{$book['id']}/download")->assertForbidden();

        // The buyer sends the UPI reference; Noon checks it and confirms.
        $this->as($s)->postJson("/api/shop/orders/{$order['ref']}/upi", ['upi_ref' => 'abc'])->assertUnprocessable();
        $this->as($s)->postJson("/api/shop/orders/{$order['ref']}/upi", ['upi_ref' => '412345678901'])->assertOk()->assertJsonPath('payment_status', 'verifying');
        $this->as($this->boss)->getJson('/api/super/shop/summary')->assertJsonPath('to_verify', 1);
        $this->as($this->boss)->getJson('/api/super/shop/orders?filter=verify')->assertJsonCount(1)->assertJsonPath('0.buyer.name', 'S');
        $this->as($this->boss)->putJson("/api/super/shop/orders/{$order['id']}", ['action' => 'confirm_payment'])->assertOk()
            ->assertJsonPath('payment_status', 'paid')->assertJsonPath('status', 'completed');
        $this->as($this->boss)->getJson('/api/super/shop/summary')->assertJsonPath('sales_today', 150);

        // Now it is in the library and opens through a signed link only.
        $this->as($s)->getJson('/api/shop/library')->assertJsonCount(1);
        $url = $this->as($s)->getJson("/api/shop/products/{$book['id']}/download")->assertOk()->json('url');
        $path = parse_url($url, PHP_URL_PATH);
        $this->get($path.'?'.parse_url($url, PHP_URL_QUERY))->assertOk();
        $this->get($path)->assertForbidden();
        // Buying it again is not possible.
        $this->as($s)->postJson('/api/shop/cart', ['product_id' => $book['id']])->assertUnprocessable();
        // Someone else's order is not found.
        $other = User::create(['name' => 'O', 'email' => 'o@x.test', 'password' => 'secret123', 'role' => 'guest']);
        $this->as($other)->getJson("/api/shop/orders/{$order['ref']}")->assertNotFound();
        $this->as($other)->getJson("/api/shop/products/{$book['id']}/download")->assertForbidden();
    }

    public function test_printed_items_cash_on_delivery_stock_shipping_and_bulk(): void
    {
        $this->as($this->boss)->postJson('/api/super/shop/settings', ['upi_id' => 'noon@oksbi', 'shipping_fee' => 60, 'free_shipping_above' => 500, 'cod_enabled' => true, 'cod_max' => 5000]);
        $cards = $this->product(['type' => 'physical', 'category' => 'adkar', 'title' => 'Adkar cards', 'price' => 120, 'stock' => 3, 'status' => 'live']);
        // Printed items can't have a file.
        $this->as($this->boss)->post('/api/super/shop/products', ['type' => 'physical', 'category' => 'pdf', 'title' => 'x', 'price' => 1, 'file' => UploadedFile::fake()->create('a.pdf', 5)], ['Accept' => 'application/json'])->assertUnprocessable();

        $b = User::create(['name' => 'B', 'email' => 'b@x.test', 'password' => 'secret123', 'role' => 'guest']);
        $this->as($b)->postJson('/api/shop/cart', ['product_id' => $cards['id'], 'qty' => 5])->assertUnprocessable();
        $this->as($b)->postJson('/api/shop/cart', ['product_id' => $cards['id'], 'qty' => 2])->assertOk()->assertJsonPath('shipping', 60)->assertJsonPath('total', 300);
        // Address is needed for printed items.
        $this->as($b)->postJson('/api/shop/orders', ['payment_method' => 'cod'])->assertUnprocessable()->assertJsonValidationErrors(['ship_name', 'ship_pincode']);
        $o = $this->as($b)->postJson('/api/shop/orders', ['payment_method' => 'cod'] + $this->address())->assertCreated()
            ->assertJsonPath('status', 'confirmed')->assertJsonPath('payment_status', 'unpaid')->assertJsonPath('ship.city', 'Kozhikode')->json();
        $this->getJson('/api/shop/products')->assertJsonPath('0.stock', 1);

        // Packed, shipped with tracking, delivered: Cash on Delivery becomes paid.
        $this->as($this->boss)->getJson('/api/super/shop/orders?filter=ship')->assertJsonCount(1);
        $this->as($this->boss)->putJson("/api/super/shop/orders/{$o['id']}", ['action' => 'deliver'])->assertUnprocessable();
        $this->as($this->boss)->putJson("/api/super/shop/orders/{$o['id']}", ['action' => 'pack'])->assertJsonPath('status', 'packed');
        $this->as($this->boss)->putJson("/api/super/shop/orders/{$o['id']}", ['action' => 'ship', 'courier' => 'India Post', 'tracking_no' => 'EE123456789IN'])->assertJsonPath('tracking_no', 'EE123456789IN');
        $this->as($b)->postJson("/api/shop/orders/{$o['ref']}/cancel")->assertUnprocessable();
        $this->as($this->boss)->putJson("/api/super/shop/orders/{$o['id']}", ['action' => 'deliver'])->assertJsonPath('status', 'delivered')->assertJsonPath('payment_status', 'paid');

        // Cancelling puts stock back.
        $this->as($b)->postJson('/api/shop/cart', ['product_id' => $cards['id'], 'qty' => 1]);
        $o2 = $this->as($b)->postJson('/api/shop/orders', ['payment_method' => 'cod'] + $this->address())->json();
        $this->getJson('/api/shop/products')->assertJsonPath('0.stock', 0)->assertJsonPath('0.in_stock', false);
        $this->as($b)->postJson("/api/shop/orders/{$o2['ref']}/cancel")->assertOk()->assertJsonPath('status', 'cancelled');
        $this->getJson('/api/shop/products')->assertJsonPath('0.stock', 1);

        // Institution admin orders in bulk for the institution.
        $books = $this->product(['type' => 'physical', 'category' => 'pdf', 'title' => 'Class 5 textbook', 'price' => 80, 'status' => 'live']);
        $t = $this->madrasa('NOON01');
        $admin = $this->member($t, 'admin');
        $this->as($b)->postJson('/api/shop/cart', ['product_id' => $books['id'], 'qty' => 100])->assertUnprocessable();
        $this->as($admin)->postJson('/api/shop/cart', ['product_id' => $books['id'], 'qty' => 100])->assertOk()->assertJsonPath('shipping', 0)->assertJsonPath('bulk.institution', $t->name);
        $bulk = $this->as($admin)->postJson('/api/shop/orders', ['payment_method' => 'upi', 'upi_ref' => 'UTR99887766', 'for_institution' => true] + $this->address())->assertCreated()
            ->assertJsonPath('total', 8000)->assertJsonPath('institution', $t->name)->json();
        // Cash on Delivery only up to the limit.
        $this->as($admin)->postJson('/api/shop/cart', ['product_id' => $books['id'], 'qty' => 100]);
        $this->as($admin)->postJson('/api/shop/orders', ['payment_method' => 'cod'] + $this->address())->assertUnprocessable();
        // UPI must be confirmed before shipping.
        $this->as($this->boss)->putJson("/api/super/shop/orders/{$bulk['id']}", ['action' => 'ship'])->assertUnprocessable();

        // Products in the bin; ones people bought stay there.
        $this->as($this->boss)->deleteJson("/api/super/shop/products/{$cards['id']}")->assertNoContent();
        $this->getJson('/api/shop/products')->assertJsonCount(1);
        $this->as($this->boss)->deleteJson("/api/super/shop/products/{$cards['id']}/forever")->assertUnprocessable();
        $this->as($this->boss)->postJson("/api/super/shop/products/{$cards['id']}/restore")->assertOk()->assertJsonPath('status', 'draft');

        // Only super admin manages the shop.
        $this->as($admin)->getJson('/api/super/shop/orders')->assertForbidden();
    }

    public function test_website_visitor_buys_without_an_account_using_the_secret_order_link(): void
    {
        $this->as($this->boss)->postJson('/api/super/shop/settings', ['upi_id' => 'noon@oksbi', 'shipping_fee' => 40, 'free_shipping_above' => 1000]);
        $pdf = $this->product(['type' => 'digital', 'category' => 'pdf', 'title' => 'Duas book', 'price' => 60, 'status' => 'live'], UploadedFile::fake()->create('duas.pdf', 20, 'application/pdf'));
        $chart = $this->product(['type' => 'physical', 'category' => 'chart', 'title' => 'Alphabet chart', 'price' => 100, 'stock' => 5, 'status' => 'live']);
        $this->getJson("/api/shop/item/{$chart['id']}")->assertOk()->assertJsonPath('title', 'Alphabet chart');
        $this->getJson('/api/shop/checkout-settings')->assertJsonPath('upi_id', 'noon@oksbi');
        $buyer = ['buyer_name' => 'Fathima', 'buyer_phone' => '9847000000', 'payment_method' => 'upi'];

        // Bots filling the hidden field, missing name, and printed items without an address are refused.
        $this->postJson('/api/shop/web-orders', ['items' => [['product_id' => $pdf['id'], 'qty' => 1]], 'website' => 'x'] + $buyer)->assertUnprocessable();
        $this->postJson('/api/shop/web-orders', ['items' => [['product_id' => $pdf['id'], 'qty' => 1]], 'payment_method' => 'upi'])->assertJsonValidationErrors(['buyer_name', 'buyer_phone']);
        $this->postJson('/api/shop/web-orders', ['items' => [['product_id' => $chart['id'], 'qty' => 1]]] + $buyer)->assertJsonValidationErrors(['ship_address']);

        $o = $this->postJson('/api/shop/web-orders', ['items' => [['product_id' => $pdf['id'], 'qty' => 3], ['product_id' => $chart['id'], 'qty' => 2]]] + $buyer + $this->address())
            ->assertCreated()->assertJsonPath('total', 60 + 200 + 40)->assertJsonPath('items.0.qty', 1)->json();
        $this->assertSame(48, strlen($o['token']));
        $this->getJson('/api/shop/products')->assertJsonPath('1.stock', 3);

        // The order opens only with its secret link.
        $this->getJson("/api/shop/web-orders/{$o['ref']}")->assertNotFound();
        $this->getJson("/api/shop/web-orders/{$o['ref']}?t=".str_repeat('a', 48))->assertNotFound();
        $link = "/api/shop/web-orders/{$o['ref']}?t={$o['token']}";
        $this->getJson($link)->assertOk()->assertJsonPath('buyer_name', 'Fathima')->assertJsonPath('downloads', [])->assertJsonMissingPath('token');
        $this->postJson("/api/shop/web-orders/{$o['ref']}/upi?t={$o['token']}", ['upi_ref' => 'UTR123456789'])->assertOk()->assertJsonPath('payment_status', 'verifying');

        // Noon sees the website buyer, confirms; the download appears on the order link.
        $this->as($this->boss)->getJson('/api/super/shop/orders?q=Fathima')->assertJsonCount(1)->assertJsonPath('0.buyer.role', 'website')->assertJsonPath('0.buyer.phone', '9847000000');
        $this->as($this->boss)->putJson("/api/super/shop/orders/{$o['id']}", ['action' => 'confirm_payment'])->assertJsonPath('status', 'confirmed');
        $url = $this->getJson($link)->assertJsonCount(1, 'downloads')->json('downloads.0.url');
        $this->get(parse_url($url, PHP_URL_PATH).'?'.parse_url($url, PHP_URL_QUERY))->assertOk();

        // Cancel by link (a separate unpaid order); app users can't open website orders as theirs.
        $o2 = $this->postJson('/api/shop/web-orders', ['items' => [['product_id' => $chart['id'], 'qty' => 1]], 'payment_method' => 'cod'] + $buyer + $this->address())->assertCreated()->json();
        $this->postJson("/api/shop/web-orders/{$o2['ref']}/cancel?t={$o2['token']}")->assertOk()->assertJsonPath('status', 'cancelled');
        $someone = User::create(['name' => 'X', 'email' => 'x@x.test', 'password' => 'secret123', 'role' => 'guest']);
        $this->as($someone)->getJson("/api/shop/orders/{$o['ref']}")->assertNotFound();
    }
}
