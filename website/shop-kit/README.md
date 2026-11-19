# Website shop kit (for the Noon Learn website)

The shop is meant for the Noon Learn website (noonlearn.com), not Noon Buds, so these pages are
kept here, outside the Noon Buds build, ready to be added to that site:

- `shop.html` – products by category (`/shop?category=quran|audio|pdf|adkar|chart|slide|worksheet|form`), product window, cart
- `checkout.html` – name, phone, delivery address for printed items, UPI or Cash on Delivery
- `order.html` – the order's own secret link: status, UPI payment and UTR, downloads once paid
- `shop.js` – all the shop logic; it talks to the Noon Learn server (`window.NOON.api`, default https://noonapi.macadz.com/api)

The styles are the "Shop" block at the end of `website/static/css/site.css`.
The server side (website orders without an account) is already in the API: `/api/shop/products`,
`/api/shop/checkout-settings`, `/api/shop/web-orders…`. The site's domain must be in the server's CORS_ALLOWED_ORIGINS.
