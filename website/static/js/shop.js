// Noon Buds website shop: products, cart (kept in this browser), checkout without an account,
// and the order page reached by its secret link (status, UPI payment, downloads).
(function () {
  var API = (window.NOON && window.NOON.api) || 'https://noonapi.macadz.com/api';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (t) { var d = document.createElement('div'); d.textContent = t == null ? '' : String(t); return d.innerHTML; };
  var rupee = function (n) { return n ? '₹' + Number(n).toLocaleString('en-IN') : 'Free'; };
  var store = {
    get: function (k, f) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? f : v; } catch (e) { return f; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
  };
  var CAT = {
    quran: ['The Holy Quran', '#E9F0FF', '#1F5FE0', 'ق'], audio: ['Audio Books', '#E6F6F0', '#0E7A50', '♪'], pdf: ['Books', '#FFF3E4', '#C4600E', 'ك'],
    adkar: ['Adkar Cards', '#F1EDFF', '#5B43E0', 'ذ'], chart: ['Learning Charts', '#E9F0FF', '#1F5FE0', 'ج'], slide: ['Lesson Slides', '#E6F6F0', '#0E7A50', 'ع'],
    worksheet: ['Worksheets & Quizzes', '#FFF3E4', '#C4600E', 'خ'], form: ['Madrasa Forms', '#F1EDFF', '#5B43E0', 'م'], other: ['Other', '#FDE6F2', '#B0256E', 'ن'],
  };
  var cat = function (k) { return CAT[k] || CAT.other; };
  function api(path, opts) {
    opts = opts || {};
    return fetch(API + path, { method: opts.method || 'GET', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: opts.body ? JSON.stringify(opts.body) : undefined })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (d) {
          if (r.ok) return d;
          var msg = d && d.errors ? Object.keys(d.errors).map(function (k) { return d.errors[k][0]; })[0] : (d && d.message) || 'Something went wrong. Please try again.';
          if (r.status === 429) msg = 'Too many tries. Please wait a minute and try again.';
          throw new Error(msg);
        });
      });
  }

  /* ---------- Cart (in this browser) ---------- */
  var CART = 'noon.shop.cart';
  var cart = store.get(CART, []);
  var save = function () { store.set(CART, cart); paintCount(); };
  var count = function () { return cart.reduce(function (n, l) { return n + l.qty; }, 0); };
  function paintCount() { $$('[data-cart-count]').forEach(function (e) { e.textContent = count(); }); }
  function add(p, qty) {
    var line = cart.filter(function (l) { return l.id === p.id; })[0];
    var max = p.type === 'digital' ? 1 : Math.min(20, p.stock == null ? 20 : p.stock);
    if (line) line.qty = Math.min(max, line.qty + (p.type === 'digital' ? 0 : qty));
    else cart.push({ id: p.id, qty: Math.min(max, p.type === 'digital' ? 1 : qty), title: p.title, price: p.unit_price, type: p.type, category: p.category, cover: p.cover_url, max: max });
    save();
  }
  function setQty(id, qty) {
    cart = cart.filter(function (l) { if (l.id === id) l.qty = Math.min(l.max || 20, qty); return l.id !== id || qty > 0; });
    save();
  }
  var settings = null;
  var loadSettings = function () { return settings ? Promise.resolve(settings) : api('/shop/checkout-settings').then(function (s) { settings = s; return s; }); };
  function totals() {
    var sub = cart.reduce(function (n, l) { return n + l.price * l.qty; }, 0);
    var physical = cart.some(function (l) { return l.type === 'physical'; });
    var ship = physical && settings && sub < settings.free_shipping_above ? settings.shipping_fee : 0;
    return { sub: sub, ship: ship, total: sub + ship, physical: physical, digital: cart.some(function (l) { return l.type === 'digital'; }) };
  }
  function cover(l, h) {
    var c = cat(l.category);
    return '<div class="sh-cover" style="height:' + h + 'px;background:' + c[1] + ';color:' + c[2] + '">' + (l.cover ? '<img src="' + esc(l.cover) + '" alt="">' : '<span lang="ar">' + c[3] + '</span>') + '</div>';
  }
  function paintCart() {
    $$('[data-cart-lines]').forEach(function (box) {
      if (!cart.length) { box.innerHTML = '<p class="shop-note">Your cart is empty. <a href="/shop">Go to the shop</a></p>'; return; }
      box.innerHTML = cart.map(function (l) {
        return '<div class="cart-line">' + cover(l, 56) + '<div class="cl-mid"><b>' + esc(l.title) + '</b><small>' + rupee(l.price) + ' · ' + (l.type === 'digital' ? 'Digital' : 'Printed') + '</small>' +
          (l.type === 'physical' ? '<span class="qty"><button type="button" data-q="' + l.id + '" data-d="-1" aria-label="Fewer">−</button><span>' + l.qty + '</span><button type="button" data-q="' + l.id + '" data-d="1" aria-label="More">+</button></span>' : '') +
          '</div><div class="cl-end"><b>' + rupee(l.price * l.qty) + '</b><button type="button" class="cl-rm" data-rm="' + l.id + '" aria-label="Remove ' + esc(l.title) + '">Remove</button></div></div>';
      }).join('');
    });
    var t = totals();
    $$('[data-cart-totals]').forEach(function (box) {
      box.innerHTML = cart.length ? '<div class="sum"><span>Items</span><span>' + rupee(t.sub) + '</span></div>' + (t.physical ? '<div class="sum"><span>Delivery</span><span>' + (t.ship ? rupee(t.ship) : 'Free') + '</span></div>' : '') +
        (t.physical && t.ship && settings && settings.free_shipping_above ? '<p class="shop-note">Free delivery above ' + rupee(settings.free_shipping_above) + '.</p>' : '') +
        '<div class="sum total"><span>Total</span><span>' + rupee(t.total) + '</span></div>' : '';
    });
    $$('[data-cart-checkout]').forEach(function (a) { a.hidden = !cart.length; });
    document.dispatchEvent(new Event('noon-cart'));
  }
  document.addEventListener('click', function (e) {
    var q = e.target.closest('[data-q]');
    if (q) { var l = cart.filter(function (x) { return x.id === +q.dataset.q; })[0]; if (l) { setQty(l.id, l.qty + +q.dataset.d); paintCart(); } }
    var rm = e.target.closest('[data-rm]');
    if (rm) { setQty(+rm.dataset.rm, 0); paintCart(); }
  });

  // Cart drawer
  var drawer = $('[data-cart-drawer]');
  function openCart() { if (!drawer) return location.assign('/checkout'); drawer.hidden = false; document.body.style.overflow = 'hidden'; loadSettings().then(paintCart, paintCart); paintCart(); $('[data-cart-close]', drawer).focus(); }
  function closeCart() { if (drawer) { drawer.hidden = true; document.body.style.overflow = ''; } }
  $$('[data-cart-open]').forEach(function (b) { b.addEventListener('click', openCart); });
  $$('[data-cart-close]').forEach(function (b) { b.addEventListener('click', closeCart); });
  if (drawer) drawer.addEventListener('click', function (e) { if (e.target === drawer) closeCart(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeCart(); });
  paintCount();

  /* ---------- Orders remembered in this browser ---------- */
  var ORDERS = 'noon.shop.orders';
  var orderLink = function (o) { return '/order?ref=' + encodeURIComponent(o.ref) + '&t=' + encodeURIComponent(o.token); };

  /* ---------- Shop page ---------- */
  var grid = $('[data-shop-grid]');
  if (grid) {
    var all = []; var current = 'all'; var q = '';
    var dialog = $('[data-product-dialog]');
    var paint = function () {
      var list = all.filter(function (p) { return (current === 'all' || p.category === current) && (!q || p.title.toLowerCase().indexOf(q) > -1); });
      grid.innerHTML = list.length ? list.map(function (p) {
        var off = p.offer_price != null && p.offer_price < p.price;
        return '<article class="sh-card"><button type="button" class="sh-open" data-open="' + p.id + '" aria-label="' + esc(p.title) + '">' + cover({ category: p.category, cover: p.cover_url }, 150) +
          '<span class="sh-type ' + p.type + '">' + (p.type === 'digital' ? 'Digital' : 'Printed') + '</span></button><div class="sh-body"><h3>' + esc(p.title) + '</h3><span class="meta">' + esc(cat(p.category)[0]) + '</span>' +
          '<div class="sh-price"><b>' + rupee(p.unit_price) + '</b>' + (off ? '<s>' + rupee(p.price) + '</s>' : '') + '</div>' +
          (p.in_stock ? '<button type="button" class="btn btn-violet btn-sm" data-add="' + p.id + '">Add to cart</button>' : '<span class="oos">Out of stock</span>') + '</div></article>';
      }).join('') : '<p class="shop-note">Nothing here yet. Please check back soon.</p>';
    };
    var cats = $('[data-shop-cats]');
    var paintCats = function () {
      var used = {}; all.forEach(function (p) { used[p.category] = (used[p.category] || 0) + 1; });
      cats.innerHTML = '<button class="chip violet" aria-pressed="' + (current === 'all') + '" data-cat="all">All · ' + all.length + '</button>' +
        Object.keys(CAT).filter(function (k) { return used[k]; }).map(function (k) { return '<button class="chip violet" aria-pressed="' + (current === k) + '" data-cat="' + k + '">' + esc(CAT[k][0]) + ' · ' + used[k] + '</button>'; }).join('');
    };
    cats.addEventListener('click', function (e) { var b = e.target.closest('[data-cat]'); if (b) { current = b.dataset.cat; paintCats(); paint(); } });
    $('[data-shop-search]').addEventListener('input', function (e) { q = e.target.value.trim().toLowerCase(); paint(); });
    var byId = function (id) { return all.filter(function (p) { return p.id === id; })[0]; };
    var added = function (btn) { var t = btn.textContent; btn.textContent = 'Added ✓'; btn.disabled = true; setTimeout(function () { btn.textContent = t; btn.disabled = false; }, 1400); };
    grid.addEventListener('click', function (e) {
      var a = e.target.closest('[data-add]');
      if (a) { add(byId(+a.dataset.add), 1); added(a); return; }
      var o = e.target.closest('[data-open]');
      if (o) showProduct(byId(+o.dataset.open));
    });
    var showProduct = function (p) {
      if (!p || !dialog) return;
      var c = cat(p.category); var qty = 1;
      dialog.innerHTML = '<button type="button" class="cart-x dlg-x" aria-label="Close">×</button><div class="dlg">' + cover({ category: p.category, cover: p.cover_url }, 260) +
        '<div class="dlg-body"><small class="dlg-cat" style="color:' + c[2] + '">' + esc(c[0]) + '</small><h2>' + esc(p.title) + '</h2><div class="sh-price big"><b>' + rupee(p.unit_price) + '</b>' + (p.offer_price != null && p.offer_price < p.price ? '<s>' + rupee(p.price) + '</s>' : '') + '</div>' +
        '<p class="dlg-info">' + (p.type === 'digital' ? 'Digital file. You get the download on your order page as soon as we confirm your UPI payment.' : 'Printed and delivered to your address.' + (p.stock != null ? ' ' + p.stock + ' in stock.' : '') + ' UPI or Cash on Delivery.') + '</p>' +
        (p.description ? '<p class="dlg-desc">' + esc(p.description) + '</p>' : '') +
        (p.in_stock ? (p.type === 'physical' ? '<div class="qty big"><button type="button" data-dq="-1" aria-label="Fewer">−</button><span data-dqv>1</span><button type="button" data-dq="1" aria-label="More">+</button></div>' : '') +
          '<div class="dlg-btns"><button type="button" class="btn btn-violet" data-dadd>Add to cart</button><button type="button" class="btn btn-yellow" data-dbuy>Buy now</button></div>' : '<p class="oos">Out of stock</p>') + '</div></div>';
      dialog.showModal();
      dialog.onclick = function (e) {
        if (e.target === dialog || e.target.closest('.dlg-x')) return dialog.close();
        var d = e.target.closest('[data-dq]');
        if (d) { qty = Math.max(1, Math.min(p.stock == null ? 20 : Math.min(20, p.stock), qty + +d.dataset.dq)); $('[data-dqv]', dialog).textContent = qty; }
        if (e.target.closest('[data-dadd]')) { add(p, qty); added(e.target.closest('[data-dadd]')); }
        if (e.target.closest('[data-dbuy]')) { add(p, qty); location.assign('/checkout'); }
      };
    };
    api('/shop/products').then(function (list) {
      all = list || []; paintCats(); paint();
      var m = location.hash.match(/^#p-(\d+)$/); if (m) showProduct(byId(+m[1]));
    }).catch(function () { grid.innerHTML = '<p class="shop-note">The shop could not be loaded. Please check your internet and try again.</p>'; });
    var mine = store.get(ORDERS, []);
    if (mine.length) {
      $('[data-my-orders]').hidden = false;
      $('[data-my-orders-list]').innerHTML = mine.slice(0, 9).map(function (o) {
        return '<a class="card my-order" href="' + orderLink(o) + '"><b>' + esc(o.ref) + '</b><span>' + rupee(o.total) + ' · ' + new Date(o.at).toLocaleDateString() + '</span><span class="go">View order →</span></a>';
      }).join('');
    }
  }

  /* ---------- Checkout ---------- */
  var form = $('[data-checkout-form]');
  if (form) {
    var err = $('[data-checkout-err]');
    var saved = store.get('noon.shop.buyer', {});
    Object.keys(saved).forEach(function (k) { if (form.elements[k] && !form.elements[k].value) form.elements[k].value = saved[k]; });
    var refresh = function () {
      var t = totals();
      $('[data-ship]').hidden = !t.physical;
      var why = !t.physical ? 'Only for printed items' : settings && !settings.cod_enabled ? 'Not available now' : t.digital ? 'Not with digital files in the cart (pay them by UPI)'
        : settings && settings.cod_max && t.total > settings.cod_max ? 'Only for orders up to ' + rupee(settings.cod_max) : null;
      var cod = form.querySelector('input[value="cod"]');
      cod.disabled = !!why; $('[data-cod-opt]').classList.toggle('off', !!why);
      $('[data-cod-why]').textContent = why || 'Pay in cash when the parcel arrives.';
      if (why && cod.checked) form.querySelector('input[value="upi"]').checked = true;
      $('[data-place]').textContent = cart.length ? 'Place order · ' + rupee(t.total) : 'Place order';
      $('[data-place]').disabled = !cart.length;
    };
    document.addEventListener('noon-cart', refresh);
    loadSettings().then(function () { paintCart(); refresh(); }, function () { paintCart(); refresh(); });
    paintCart(); refresh();
    form.addEventListener('submit', function (e) {
      e.preventDefault(); err.textContent = '';
      if (!cart.length) { err.textContent = 'Your cart is empty.'; return; }
      var f = form.elements; var t = totals();
      var body = { items: cart.map(function (l) { return { product_id: l.id, qty: l.qty }; }), buyer_name: f.buyer_name.value.trim(), buyer_phone: f.buyer_phone.value.trim(), buyer_email: f.buyer_email.value.trim() || undefined,
        payment_method: form.querySelector('input[name="payment_method"]:checked').value, note: f.note.value.trim() || undefined, website: f.website.value };
      if (t.physical) { ['ship_address', 'ship_city', 'ship_state', 'ship_pincode'].forEach(function (k) { body[k] = f[k].value.trim(); }); body.ship_name = body.buyer_name; body.ship_phone = body.buyer_phone; }
      if (!body.buyer_name || !body.buyer_phone) { err.textContent = 'Please enter your name and phone number.'; return; }
      store.set('noon.shop.buyer', { buyer_name: body.buyer_name, buyer_phone: body.buyer_phone, buyer_email: body.buyer_email || '', ship_address: body.ship_address || '', ship_city: body.ship_city || '', ship_state: body.ship_state || 'Kerala', ship_pincode: body.ship_pincode || '' });
      var btn = $('[data-place]'); btn.disabled = true; btn.textContent = 'Placing your order…';
      api('/shop/web-orders', { method: 'POST', body: body }).then(function (o) {
        var mine = store.get(ORDERS, []); mine.unshift({ ref: o.ref, token: o.token, total: o.total, at: Date.now() }); store.set(ORDERS, mine.slice(0, 30));
        cart = []; save();
        location.assign(orderLink(o));
      }).catch(function (x) { err.textContent = x.message; btn.disabled = false; refresh(); });
    });
  }

  /* ---------- Order page (secret link) ---------- */
  var box = $('[data-order]');
  if (box) {
    var params = new URLSearchParams(location.search);
    var ref = params.get('ref') || ''; var token = params.get('t') || '';
    var STATUS = { placed: 'Waiting for payment', confirmed: 'Confirmed', packed: 'Packed', shipped: 'Shipped', delivered: 'Delivered', completed: 'Completed', cancelled: 'Cancelled' };
    var hint = function (o) {
      if (o.status === 'cancelled') return o.payment_status === 'refunded' ? 'Cancelled and refunded.' : 'This order was cancelled.';
      if (o.payment_method === 'upi' && o.payment_status === 'unpaid') return 'Pay by UPI below, then send us the UPI reference number.';
      if (o.payment_status === 'verifying') return 'Thank you! We are checking your UPI payment. This usually takes a few hours. Keep this page link to come back.';
      if (o.downloads && o.downloads.length && !o.items.some(function (i) { return i.type === 'physical'; })) return 'Paid. Your files are ready below.';
      if (o.status === 'shipped') return 'On the way' + (o.courier ? ' by ' + o.courier : '') + (o.tracking_no ? ' · tracking ' + o.tracking_no : '') + '.';
      if (o.status === 'delivered') return 'Delivered. JazakAllah khair for your order!';
      if (o.status === 'packed') return 'Packed and ready to ship.';
      return o.payment_method === 'cod' ? 'Confirmed. Pay in cash when it arrives.' : 'Paid and confirmed. We will pack it soon.';
    };
    var mobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
    var render = function (o) {
      var s = o.settings || {};
      var needPay = o.payment_method === 'upi' && (o.payment_status === 'unpaid' || o.payment_status === 'verifying') && o.status !== 'cancelled';
      var canCancel = (o.status === 'placed' || o.status === 'confirmed') && o.payment_status !== 'paid';
      var upi = s.upi_id ? 'upi://pay?pa=' + encodeURIComponent(s.upi_id) + '&pn=' + encodeURIComponent(s.upi_name || 'Noon Learn') + '&am=' + o.total + '&cu=INR&tn=' + encodeURIComponent('Order ' + o.ref) : '';
      var label = o.payment_status === 'verifying' && o.status !== 'cancelled' ? 'Checking payment' : STATUS[o.status];
      box.innerHTML = '<h1 class="shop-title">Order ' + esc(o.ref) + '</h1><p class="shop-note">Placed ' + new Date(o.placed_at).toLocaleString() + ' · ' + esc(o.buyer_name || '') + '</p>' +
        '<div class="card ord-status st-' + o.status + (o.payment_status === 'verifying' ? ' st-verifying' : '') + '"><span class="pill">' + esc(label) + '</span><p class="big">' + esc(hint(o)) + '</p>' + (o.admin_note ? '<p class="shop-note">Note from Noon Learn: ' + esc(o.admin_note) + '</p>' : '') + '</div>' +
        (needPay ? '<div class="card pay-box"><h3>Pay ' + rupee(o.total) + ' by UPI</h3>' +
          (s.upi_id ? '<p>UPI ID: <b class="sel">' + esc(s.upi_id) + '</b> (' + esc(s.upi_name || '') + ') <button type="button" class="chip" data-copy="' + esc(s.upi_id) + '">Copy</button></p>' +
            (mobile ? '<a class="btn btn-yellow" href="' + esc(upi) + '" style="margin-top:10px">Pay with a UPI app</a>' : '') +
            (s.upi_qr_url ? '<div class="qr"><img src="' + esc(s.upi_qr_url) + '" alt="UPI QR code" width="200" height="200"><small>Scan with any UPI app</small></div>' : '') +
            '<p class="shop-note">Write order number ' + esc(o.ref) + ' in the payment note if your app asks.</p>' : '<p>UPI details will show here soon.' + (s.support_phone ? ' Call ' + esc(s.support_phone) + '.' : '') + '</p>') +
          '<form class="utr" data-utr><label for="utr">' + (o.payment_status === 'verifying' ? 'UPI reference sent: <b>' + esc(o.upi_ref) + '</b>. Wrong number? Send it again:' : 'After paying, enter the UPI reference (UTR) number from your payment app:') + '</label>' +
          '<div class="utr-row"><input class="input" id="utr" name="utr" placeholder="eg. 412345678901" maxlength="40" autocomplete="off"><button class="btn btn-violet btn-sm" type="submit">Send</button></div><p class="form-err" data-utr-err role="alert"></p></form></div>' : '') +
        (o.downloads && o.downloads.length ? '<div class="card"><h3>Your downloads</h3>' + o.downloads.map(function (d) { return '<p class="dl"><a class="btn btn-green" href="' + esc(d.url) + '" target="_blank" rel="noopener">Download</a> ' + esc(d.title) + ' <small>' + esc(d.file_name || '') + '</small></p>'; }).join('') + '<p class="shop-note">Links work for 2 hours; open this page again for fresh links.</p></div>' : '') +
        '<div class="card"><h3>Items</h3>' + o.items.map(function (i) { return '<div class="sum"><span>' + esc(i.title) + ' <small>· ' + (i.type === 'digital' ? 'Digital' : 'Printed') + (i.qty > 1 ? ' · ×' + i.qty : '') + '</small></span><span>' + rupee(i.line_total) + '</span></div>'; }).join('') +
          '<div class="sum"><span>Delivery</span><span>' + (o.shipping ? rupee(o.shipping) : 'Free') + '</span></div><div class="sum total"><span>Total</span><span>' + rupee(o.total) + '</span></div>' +
          '<p class="shop-note">Payment: ' + (o.payment_method === 'cod' ? 'Cash on Delivery' : 'UPI') + '</p></div>' +
        (o.ship ? '<div class="card"><h3>Delivery to</h3><p>' + esc(o.ship.name) + ' · ' + esc(o.ship.phone) + '<br>' + esc(o.ship.address) + ', ' + esc(o.ship.city) + ', ' + esc(o.ship.state) + ' ' + esc(o.ship.pincode) + '</p>' + (o.tracking_no ? '<p class="shop-note">Tracking: ' + esc(o.courier || '') + ' ' + esc(o.tracking_no) + '</p>' : '') + '</div>' : '') +
        '<div class="card keep"><b>Keep this page</b><p class="shop-note">Bookmark it or copy the link: it is the only way to see this order without an account.</p><button type="button" class="chip" data-copy="' + esc(location.href) + '">Copy order link</button>' + (s.support_phone ? ' <span class="shop-note">Questions? Call ' + esc(s.support_phone) + '</span>' : '') + '</div>' +
        (canCancel ? '<button type="button" class="btn btn-ghost-dark" data-cancel>Cancel order</button>' : '');
      var u = $('[data-utr]', box);
      if (u) u.addEventListener('submit', function (e) {
        e.preventDefault(); var v = u.elements.utr.value.trim(); var er = $('[data-utr-err]', u);
        if (v.length < 6) { er.textContent = 'Enter the UPI reference (UTR) number from your payment app.'; return; }
        api('/shop/web-orders/' + encodeURIComponent(ref) + '/upi?t=' + encodeURIComponent(token), { method: 'POST', body: { upi_ref: v } }).then(render).catch(function (x) { er.textContent = x.message; });
      });
      var c = $('[data-cancel]', box);
      if (c) c.addEventListener('click', function () {
        if (!confirm('Cancel this order?')) return;
        api('/shop/web-orders/' + encodeURIComponent(ref) + '/cancel?t=' + encodeURIComponent(token), { method: 'POST' }).then(render).catch(function (x) { alert(x.message); });
      });
    };
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-copy]');
      if (b && navigator.clipboard) navigator.clipboard.writeText(b.dataset.copy).then(function () { var t = b.textContent; b.textContent = 'Copied ✓'; setTimeout(function () { b.textContent = t; }, 1400); });
    });
    if (!ref || !token) box.innerHTML = '<p class="shop-note">Open your order with the link you got after ordering.</p>';
    else api('/shop/web-orders/' + encodeURIComponent(ref) + '?t=' + encodeURIComponent(token)).then(render).catch(function (x) { box.innerHTML = '<p class="shop-note">' + esc(x.message) + '</p>'; });
  }
})();
