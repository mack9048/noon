# Noon Learn — starter code

One codebase for the **Android app, iOS app and web app** (phone, tablet and desktop layouts), plus a **Laravel API** with **MySQL**.

```
noon-learn/
├── app/   Expo (React Native + Expo Router, TypeScript)  → Play Store / App Store via EAS, Web on Vercel
└── api/   Laravel 11 + Sanctum                           → Hostinger cloud server (VPS) + MySQL
```

```
 Phones / tablets (Expo app) ─┐
                              ├──HTTPS + Bearer token──▶  api.yourdomain.com (Laravel, Hostinger VPS) ──▶ MySQL
 Browser (Vercel web build) ──┘                                     └── storage/app/public (PDFs, audio, video)
```

## What's in the starter

| Area | App screens (all roles) | API |
|---|---|---|
| Login + roles | Welcome, madrasa login, role-based home (student · guest · teacher · admin · super) | `/auth/login`, `/auth/me`, Sanctum tokens, `role:` middleware |
| **Guest student** | 2-step join: name/age/phone → pick board + class and/or Noon Courses → guest home | `/auth/guest`, `/auth/join-tenant` (enter madrasa code later) |
| Madrasa Support | Board → class (1–10, +1, +2) → subjects → lessons (video / audio / PDF + textbook) | `/boards`, `/boards/{id}/classes`, `/classes/{id}/subjects`, `/subjects/{id}` |
| Noon Courses | My courses / Explore, course detail with Live · Video · Audio · PDF · Test, enrol | `/courses`, `/courses/{id}`, `/courses/{id}/enroll`, progress |
| Teacher | Dashboard, add content to course, start live class, approve leave | `/teacher/courses/{id}/items`, `/staff/leave-requests` |
| Institute admin | Dashboard, switch courses on/off for the madrasa, approve leave | `/admin/courses/{id}` |
| Super admin | Overview, course CRUD with content builder, **Study tools CRUD** (Charts · Adkar · Slides · Forms) with file upload | `/super/courses…`, `/super/study-tools…`, `/super/tenants…` |
| Study tools | Charts / Adkar / Slides / Forms lists (Malayalam + Arabic fonts) | `/study-tools?type=` |
| Chat | WhatsApp-style list + thread (split view on tablet/desktop) | `/conversations`, messages (polling) |
| Leave request | Status (total/used/remaining), apply, history | `/leave-requests` |

Screens marked **Coming soon** (Games, Quran & Hifz, fees, attendance…) are already designed on the canvas — build them next using the same components.

### Responsive rules (`app/src/lib/useLayout.ts`)
- **Phone < 640px** → floating bottom tab bar, 1-column cards
- **Tablet 640–1099px** → left icon rail, 2–4 column grids, chat split view
- **Desktop ≥ 1100px** → sidebar with labels + user card, content max-width 1200px

---

## 1. Run the app locally (works without the API)

```bash
cd app
cp .env.example .env          # EXPO_PUBLIC_USE_MOCK=1 → built-in demo data
npm install
npx expo install --fix        # aligns native package versions with your Expo SDK
npm run web                   # browser   (press w)
npm start                     # scan QR with Expo Go on Android/iOS
```
Demo logins in mock mode: type `student`, `teacher`, `admin` or `super` (any password), or tap **Start as a guest**.

## 2. Run the API locally

Needs PHP 8.2+, Composer and MySQL 8.
```bash
cd api
bash install.sh               # creates api/server (Laravel 11 + Sanctum) and copies our code in
cd server
# edit .env → DB_DATABASE / DB_USERNAME / DB_PASSWORD (see .env.noon.example for the rest)
php artisan migrate --seed
php artisan serve             # http://127.0.0.1:8000/api/health
```
Seeded logins (password `password`): `super@noon.test`, `admin@noon.test`, `teacher@noon.test`, `student@noon.test`. Madrasa code: `NOON01`.

Point the app at it: in `app/.env` set `EXPO_PUBLIC_API_URL=http://127.0.0.1:8000/api` and `EXPO_PUBLIC_USE_MOCK=0`.
(On a real phone use your computer's LAN IP instead of 127.0.0.1.)

---

## 3. Deploy

### 3a. MySQL (Hostinger)
Either MySQL on the same VPS (`apt install mysql-server`) or Hostinger's managed MySQL.
```sql
CREATE DATABASE noon_learn CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'noon_user'@'localhost' IDENTIFIED BY 'a-strong-password';
GRANT ALL PRIVILEGES ON noon_learn.* TO 'noon_user'@'localhost';
```
`utf8mb4` is required for Arabic, Malayalam and emoji.

### 3b. API on Hostinger cloud server (VPS, Ubuntu)
```bash
# once
apt install nginx php8.3-fpm php8.3-{mysql,mbstring,xml,curl,zip,gd,bcmath,intl} composer unzip supervisor certbot python3-certbot-nginx
git clone <your repo> /var/www/noon-learn
cd /var/www/noon-learn/api && bash install.sh
cd server && cp .env.noon.example .env   # then fill in APP_KEY (php artisan key:generate), DB_*, CORS_*
php artisan migrate --seed --force
chown -R www-data:www-data storage bootstrap/cache
cp ../deploy/nginx-noon-api.conf /etc/nginx/sites-available/noon-api   # edit server_name
ln -s /etc/nginx/sites-available/noon-api /etc/nginx/sites-enabled/ && nginx -t && systemctl reload nginx
certbot --nginx -d api.yourdomain.com
cp ../deploy/noon-queue.conf /etc/supervisor/conf.d/ && supervisorctl reread && supervisorctl update

# every release
bash api/deploy/deploy.sh
```
DNS: add an **A record** `api` → your VPS IP in Hostinger hPanel.

### 3c. Web app on Vercel
1. Import the repo in Vercel → **Root Directory: `app`** (vercel.json already sets build `npx expo export --platform web`, output `dist`, SPA rewrites).
2. Environment variables: `EXPO_PUBLIC_API_URL=https://api.yourdomain.com/api`, `EXPO_PUBLIC_USE_MOCK=0`.
3. Add your domain (e.g. `app.yourdomain.com`) and put it in the API's `CORS_ALLOWED_ORIGINS`.

### 3d. Android & iOS apps (EAS)
```bash
cd app
npm i -g eas-cli && eas login
eas build:configure
eas build -p android --profile preview      # installable APK for testing
eas build -p android --profile production   # .aab for Play Store
eas build -p ios --profile production       # needs Apple Developer account
eas submit -p android                       # / -p ios
```
Set the production API URL in `eas.json` (`env.EXPO_PUBLIC_API_URL`).

---

## 4. Next steps (recommended order)
1. **Live classes** – start with Jitsi links stored in `course_items.url` (already supported); move to LiveKit/Agora SDK for an in-app meet screen (`app/src/screens/social.tsx → LiveMeetScreen`).
2. **Real-time chat** – add Laravel Reverb (`php artisan install:broadcasting`), broadcast a `MessageSent` event in `ChatController@send`; until then the app can poll.
3. **Video/audio storage** – large files on the VPS disk work to start; move to Hostinger Object Storage / S3 (`FILESYSTEM_DISK=s3`) + a CDN when content grows.
4. **Payments / subscriptions** for Noon Courses and tenant billing (Razorpay / Stripe) – tables `course_user.trial_ends_at` and `tenants.plan` are ready.
5. OTP login for parents (MSG91 / Twilio) on `/auth/guest`.
6. Push notifications (expo-notifications + Laravel job).
7. Remaining screens from the design canvas: Games, Quran & Hifz, attendance, fees, report card.

## Folder guide (app)
```
app/app/            routes (Expo Router) – one folder per role: student/ guest/ teacher/ admin/ super/
app/src/screens/    real screen code shared by all roles (auth, join, home, learn, social, staff)
app/src/components/ ui.tsx (Text, Card, Button, Grid, Segmented…), AppShell (responsive nav), Logo, RoleGate
app/src/lib/        api.ts (fetch + token), mock.ts (demo backend), auth.tsx, useLayout.ts, types.ts
app/src/theme/      tokens.ts – colours, gradients, fonts from the design
```
