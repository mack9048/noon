# Install the Noon Learn API on Hostinger

This folder is the complete API, dependencies included. You don't need Composer.
It needs **PHP 8.3** and **MySQL 8**. Hostinger's Business, Cloud and VPS plans all work.

There are two ways to install it. Pick the one that matches your plan:

- **A. Web / Cloud hosting** (hPanel with File Manager), steps 1–8 below
- **B. VPS** (Ubuntu with root access), see the end

---

## A. Web / Cloud hosting (hPanel)

### 1. Create the API subdomain
hPanel → **Websites → Dashboard → Domains → Subdomains**. Create `api` (for example `api.yourdomain.com`).
Its folder will be something like `domains/yourdomain.com/public_html/api` or `domains/api.yourdomain.com/public_html`.

### 2. Set PHP 8.3
hPanel → **Advanced → PHP Configuration** → choose **PHP 8.3** for that site.
Under **PHP extensions**, make sure these are ticked: `pdo_mysql`, `mbstring`, `openssl`, `intl`, `gd`, `zip`, `bcmath`, `curl`, `fileinfo`, `tokenizer`, `xml`.

### 3. Create the database
hPanel → **Databases → MySQL Databases** → create a database and a user with a strong password.
Write down the **database name**, **user name**, **password** and **host** (usually `localhost`).

### 4. Upload the files
hPanel → **Files → File Manager** → open the subdomain's `public_html` folder → **Upload** `noon-api.zip` → right-click → **Extract**.
Move everything from the extracted `noon-api` folder **into** `public_html`, so `public_html` directly contains `app`, `public`, `vendor`, `artisan`, `.htaccess` and the rest.

> The `.htaccess` in `public_html` sends every request into the `public` folder, so `.env` and the code are never visible on the web.
> If File Manager hides dot-files, turn on **Show hidden files** in its settings.

### 5. Create the `.env` file
In File Manager, copy `.env.example` to `.env` and edit it:

```
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.yourdomain.com
APP_TIMEZONE=Asia/Dubai

DB_CONNECTION=mysql
DB_HOST=localhost
DB_DATABASE=u123456789_noon        # from step 3
DB_USERNAME=u123456789_noon
DB_PASSWORD=your-database-password

# No Supervisor on web hosting: let cron run the queue
QUEUE_VIA_SCHEDULER=true

# Your Vercel web app (no trailing slash). Add more with commas.
CORS_ALLOWED_ORIGINS=https://your-app.vercel.app

# SMS codes: msg91 (India) or twilio (Gulf / international). Leave OTP_FIXED_CODE empty!
OTP_DRIVER=twilio
OTP_FIXED_CODE=
DEFAULT_COUNTRY_CODE=971
TWILIO_SID=...
TWILIO_TOKEN=...
TWILIO_FROM=+1...
```

Leave `APP_KEY=` empty; the next step fills it in.

### 6. Run the setup commands
**With SSH** (hPanel → **Advanced → SSH Access**, or the browser **Terminal**):

```bash
cd ~/domains/api.yourdomain.com/public_html     # your folder from step 1
php artisan key:generate --force
php artisan migrate --force
php artisan storage:link
php artisan config:cache && php artisan route:cache
```

To load demo data (demo logins and courses) on a test server only, also run `php artisan db:seed --force`.

**Without SSH**, use cron jobs instead. hPanel → **Advanced → Cron Jobs** → **Custom**. Add each command below, set it to run every minute, wait a minute, then **delete it**:

```
cd /home/u123456789/domains/api.yourdomain.com/public_html && php artisan key:generate --force
cd /home/u123456789/domains/api.yourdomain.com/public_html && php artisan migrate --force
cd /home/u123456789/domains/api.yourdomain.com/public_html && php artisan storage:link
```

(Your real home path is shown at the top of the Cron Jobs page.)

### 7. Add the permanent cron job
hPanel → **Cron Jobs** → **Custom**, every minute:

```
cd /home/u123456789/domains/api.yourdomain.com/public_html && php artisan schedule:run >> /dev/null 2>&1
```

This runs the queue (notifications, emails) and the daily clean-up.

### 8. SSL and check
hPanel → **Security → SSL** → install the free certificate for `api.yourdomain.com`.
Open `https://api.yourdomain.com/api/health` in a browser. You should see `{"ok":true,...,"database":"ok"}`.

Then in **Vercel → Project → Settings → Environment Variables**, set:

```
EXPO_PUBLIC_API_URL=https://api.yourdomain.com/api
EXPO_PUBLIC_USE_MOCK=0
```

and redeploy.

### Updating later
Upload the new zip and extract it over the old files, but **keep your `.env`**. Then run `php artisan migrate --force` and `php artisan config:cache` (SSH or cron, as in step 6).

---

## B. VPS (Ubuntu, root)

```bash
apt install nginx php8.3-fpm php8.3-{mysql,mbstring,xml,curl,zip,gd,bcmath,intl} mysql-server unzip supervisor certbot python3-certbot-nginx
mkdir -p /var/www/noon-learn && cd /var/www/noon-learn
unzip noon-api.zip && mv noon-api api && cd api
cp .env.example .env     # edit as in step 5, but QUEUE_VIA_SCHEDULER=false
php artisan key:generate --force
php artisan migrate --force
php artisan storage:link
chown -R www-data:www-data storage bootstrap/cache
cp deploy/nginx-noon-api.conf /etc/nginx/sites-available/noon-api   # set server_name
ln -s /etc/nginx/sites-available/noon-api /etc/nginx/sites-enabled/ && nginx -t && systemctl reload nginx
certbot --nginx -d api.yourdomain.com
cp deploy/noon-queue.conf /etc/supervisor/conf.d/ && supervisorctl reread && supervisorctl update
(crontab -l; echo "* * * * * cd /var/www/noon-learn/api && php artisan schedule:run >> /dev/null 2>&1") | crontab -
```

DNS: in hPanel add an **A record** `api` → your VPS IP.

---

## Safety checklist before going live
- `APP_DEBUG=false` and `APP_ENV=production`
- `OTP_FIXED_CODE` is empty
- Don't run `db:seed` on the live server. It creates demo accounts with the password `password`.
- If you did seed by mistake, change the passwords of `super@noon.test`, `admin@noon.test`, `teacher@noon.test` and `student@noon.test`, or delete those accounts.
