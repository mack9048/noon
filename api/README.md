# Noon Learn API

Laravel 13 + Sanctum + MySQL 8. Serves the Expo app in `../app` (Android, iOS and web).

## Run locally

Needs PHP 8.3+, Composer and MySQL 8 (or SQLite for a quick try).

```bash
composer install
cp .env.example .env
php artisan key:generate
# MySQL: fill DB_* in .env.  SQLite: set DB_CONNECTION=sqlite, DB_DATABASE=database/database.sqlite, then `touch database/database.sqlite`
php artisan migrate --seed
php artisan storage:link
php artisan serve            # http://127.0.0.1:8000/api/health
```

Seeded logins (password `password`): `super@noon.test`, `admin@noon.test`, `teacher@noon.test`, `student@noon.test` (admission no. `NM-0014`). Madrasa code: `NOON01`.

With `OTP_DRIVER=log`, SMS codes are written to `storage/logs/laravel.log`. With `OTP_FIXED_CODE=123456` (local only) every code is `123456`.

## Tests

```bash
php artisan test                                                  # SQLite in memory
DB_CONNECTION=mysql DB_DATABASE=noon_test php artisan test         # MySQL
```

## Endpoints added in this version

| Method | Path | Notes |
|---|---|---|
| POST | `/api/auth/otp/request` | `phone`. Sends a 6-digit SMS code if the number has an account (same reply either way). |
| POST | `/api/auth/otp/verify` | `phone`, `otp` → `{ token, user }` |
| POST | `/api/auth/login` | now also takes `tenant_code`. If the login exists in several madrasas → `409 { code: "tenant_required", tenants: [{code, name}] }` |
| POST | `/api/auth/guest` | now takes `otp`. If the parent phone already has an account → an SMS code is sent and the reply is `409 { code: "otp_required" }` |

Everything else is unchanged from the starter (see the root README).

## How madrasas are kept apart

- Madrasa routes run behind the `tenant` middleware, which sets the signed-in user's madrasa.
- Tenant-owned models (`LeaveRequest`, `Conversation`) use `BelongsToTenant`: every query is limited to that madrasa, new rows get its `tenant_id`, and saving into another madrasa throws. A leave request or chat from another madrasa is simply "not found".
- `tests/Feature/TenantIsolationTest.php` fails if a new madrasa route forgets the `tenant` middleware.
- The `active` middleware cuts off blocked users and switched-off madrasas on their next request, even with a valid token.

## Security fixes over the starter

- **Laravel 13** (was 11, which has an unpatched critical Sanctum bypass, CVE-2026-114509).
- **Guest takeover**: typing someone's phone at guest sign-up used to log you into their account. Now it needs the SMS code.
- **Login**: admission numbers repeat across madrasas; the app now asks which madrasa instead of picking one.
- **Uploads**: chat accepted any file (e.g. `.php`) into public storage; now only images, audio, video and PDF. nginx also refuses to run anything under `/storage` (`deploy/nginx-noon-api.conf`).
- **Course links** must be `http(s)` (no `javascript:` links). Course and study-tool drafts are hidden from non-super users.
- **Admin** can only assign their own madrasa's teachers to a course; only teachers can be course teachers.
- **Course progress** only for courses you are enrolled in.
- **Leave**: no overlapping requests, can't go over the yearly balance (pending requests count), staff can't approve their own, a decided request can't be changed.
- Rate limits on login, OTP and guest sign-up (per IP and per phone), and on joining a madrasa by code.
- Madrasa codes avoid look-alike characters (0/O, 1/I) and are checked for uniqueness.
