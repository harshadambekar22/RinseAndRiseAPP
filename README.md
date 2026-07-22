# Rinse & Rise — Dry-Cleaning Web App

A full-stack web application for a dry-cleaning business, with a **customer ordering
flow** (select garments → live bill → schedule pickup on a map → pay with Razorpay →
live order tracking) and an **admin dashboard** (transactions, customers, and in-shop
counter billing that sends the bill to the customer's WhatsApp).

- **Backend:** .NET 8 Web API · Entity Framework Core · JWT auth
- **Frontend:** React 18 · Vite · React Router
- **Database:** SQLite (a single local file — no database server to install or run),
  schema managed with EF Core migrations
- **Payments:** Razorpay (UPI / QR / card / net-banking)
- **Maps:** OpenStreetMap via Leaflet (pickup location) — no API key required
- **Sign-in:** Email + password, and Google Sign-In
- **Notifications:** WhatsApp bill delivery via Twilio, with SMS fallback

> ⚠️ **Please read “Was this built and tested?” below.** This project was generated as a
> complete, organised scaffold. It has **not** been compiled or run in the environment it
> was created in (no network / no .NET SDK there), so you must run `dotnet restore` and
> `npm install` yourself. Expect to fix the odd small thing on first run — that's normal.

---

## 1. Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| .NET SDK | **8.0** | https://dotnet.microsoft.com/download |
| Node.js | **18+** (20 recommended) | https://nodejs.org |
| EF Core CLI | `dotnet-ef` | `dotnet tool install --global dotnet-ef` |
| A code editor | — | VS Code, Rider, or Visual Studio |

No database server to install — the app uses **SQLite**, a single local file
(`server/RinseRise.Api/rinserise.db`) created automatically the first time you run
migrations. Nothing to download, no service to start, nothing to configure.

---

## 2. Run it locally (2 terminals)

### Terminal 1 — backend API
```bash
cd server/RinseRise.Api

dotnet restore

# Create the first migration (only needed once), then run.
# dotnet run applies any pending migrations on startup, creating
# rinserise.db (a SQLite file) right next to the project — no server needed.
dotnet ef migrations add InitialCreate
dotnet run
```
- API runs at **http://localhost:5080**
- Swagger UI (interactive API docs): **http://localhost:5080/swagger**
- On startup it applies migrations (creating the tables), seeds the garment catalogue,
  and creates the admin account.
- Prefer to apply migrations manually instead of on startup? Run
  `dotnet ef database update` before `dotnet run`.

### Terminal 2 — frontend
```bash
cd client
npm install
npm run dev
```
- App runs at **http://localhost:5173**
- The Vite dev server proxies `/api/*` to the backend on port 5080, so you don't need
  CORS or any base-URL config during development.

### Log in
- **Admin:** `admin@rinserise.local` / `Admin@123`  → you'll land on the admin dashboard.
- **Customer:** click **Book now**, add items, and you'll be prompted to register/sign in
  during checkout.

> You can change the seeded admin credentials in `server/RinseRise.Api/appsettings.json`
> under the `Seed` section **before** the first run (i.e. before the admin row is created).

---

## 3. The app runs with NO API keys (demo mode)

Everything is wired to **degrade gracefully** so you can demo the whole flow immediately:

| Feature | Without keys | With keys |
|---------|--------------|-----------|
| Razorpay payment | Returns a **mock** order and marks it paid so you can see the success + tracking screens | Opens the real Razorpay checkout (UPI/QR/card) |
| Google Sign-In | Button is **hidden** | "Sign in with Google" appears |
| WhatsApp / SMS bill | **Logged to the API console** | Delivered via Twilio |

The pickup-location map (OpenStreetMap tiles + Nominatim reverse-geocoding) always works —
no keys needed for it at all.

So you can clone, run, and click through end-to-end before signing up for anything.

---

## 4. Adding real API keys

Backend keys live in **`server/RinseRise.Api/appsettings.json`**.
Frontend keys live in **`client/.env`** (copy `client/.env.example` → `client/.env`).

### 4a. Razorpay (payments)
1. Create an account at https://razorpay.com and stay in **Test Mode** to start.
2. Dashboard → **Settings → API Keys → Generate Test Key**.
3. Put them in `appsettings.json`:
   ```json
   "Razorpay": { "KeyId": "rzp_test_xxxxx", "KeySecret": "your_secret" }
   ```
   The frontend automatically receives the public `KeyId` from the backend — you do **not**
   put the Razorpay key in the frontend.
4. Test cards/UPI: https://razorpay.com/docs/payments/payments/test-card-details/
5. **Going live** needs business KYC verification on Razorpay (PAN, bank account, etc.).
   That approval is done on Razorpay's side and can take a few days — plan for it.

### 4b. Google Sign-In
Comes from a **Google Cloud** project with billing enabled (https://console.cloud.google.com).

- **Sign-In (OAuth):** APIs & Services → Credentials → *Create OAuth client ID* →
  *Web application*. Add `http://localhost:5173` to **Authorized JavaScript origins**.
  Copy the **Client ID** into:
  - `client/.env` → `VITE_GOOGLE_CLIENT_ID=...`
  - `appsettings.json` → `"Google": { "ClientId": "...same id..." }` (the backend uses it
    to verify the token).

The pickup-location map runs on OpenStreetMap tiles + Nominatim reverse-geocoding
(`client/src/pages/Schedule.jsx`) — both free public services, no account or API key needed.

### 4c. WhatsApp bill delivery (Twilio)
The simplest route for development is the **Twilio WhatsApp Sandbox**:
1. Create a Twilio account → Messaging → **Try WhatsApp** (sandbox).
2. Note your **Account SID**, **Auth Token**, and the sandbox **WhatsApp from** number
   (e.g. `whatsapp:+14155238886`). For SMS fallback, note an SMS-capable number too.
3. In `appsettings.json`:
   ```json
   "Notifications": {
     "Provider": "Twilio",
     "Twilio": {
       "AccountSid": "ACxxxx",
       "AuthToken": "xxxx",
       "WhatsAppFrom": "whatsapp:+14155238886",
       "SmsFrom": "+1xxxxxxxxxx"
     }
   }
   ```
4. In the sandbox, each recipient must first send the join code to the sandbox number.
   **Production WhatsApp** requires a Meta-approved WhatsApp Business sender (via Twilio or
   another BSP) — that approval also takes time, so budget for it.

After editing `.env`, restart `npm run dev`. After editing `appsettings.json`, restart
`dotnet run`.

---

## 5. Database (SQLite) & EF Core migrations

The app uses **SQLite** — the whole database is one file, `rinserise.db`, created next to the
project the first time you run migrations. There's no server to install, no service to start,
and nothing to configure beyond the file path already set in `appsettings.json`. Schema is
still managed by **EF Core migrations** (not auto-create), so the flow is the same as any
other EF Core project:

**One-time setup**
1. The connection string is already set in `appsettings.json` — nothing to edit:
   ```json
   "ConnectionStrings": {
     "Default": "Data Source=rinserise.db"
   }
   ```
   (Use an absolute path here instead if you'd rather the file live somewhere specific.)
2. Install the EF Core CLI if you don't have it:
   ```bash
   dotnet tool install --global dotnet-ef
   ```
3. Create the first migration, then start the app (which applies it and creates the file):
   ```bash
   cd server/RinseRise.Api
   dotnet ef migrations add InitialCreate
   dotnet run              # Migrate() applies pending migrations on startup
   ```
   The generated `Migrations/` folder **should be committed** to source control.

**Everyday migration commands**
```bash
# after changing any entity / DbContext mapping:
dotnet ef migrations add DescribeYourChange
dotnet ef database update          # apply to the database

dotnet ef migrations list          # see applied vs pending
dotnet ef migrations remove        # undo the last (unapplied) migration
```

> Startup calls `db.Database.Migrate()`, so a normal `dotnet run` keeps the database in sync
> with whatever migrations exist. If you prefer to gate schema changes manually, remove that
> call in `Program.cs` and run `dotnet ef database update` yourself during deploys.

> **Resetting your data:** since it's just a file, you can start over any time by stopping
> the app and deleting `server/RinseRise.Api/rinserise.db` (and the `-shm`/`-wal` files if
> present) — the next `dotnet run` recreates it from the migrations and reseeds it.

> **Want MySQL/Postgres/SQL Server later instead?** SQLite is great for local dev and small
> deployments, but if you outgrow it: swap the `Microsoft.EntityFrameworkCore.Sqlite` package
> for the provider you want (e.g. `Npgsql.EntityFrameworkCore.PostgreSQL` for Postgres,
> `Microsoft.EntityFrameworkCore.SqlServer` for SQL Server, or the Pomelo MySQL provider),
> change `opt.UseSqlite(...)` in `Program.cs` to the matching `Use...` call, update the
> connection string, delete the `Migrations/` folder, and regenerate `InitialCreate` against
> the new provider.

**Note on indexes:** the unique columns (`User.Email`, `Order.OrderNumber`) get unique
indexes as normal under SQLite. Keep a `[MaxLength]` on any new string column you intend to
index if you later move to a provider that enforces index key-length limits (MySQL, SQL
Server).

---

## 6. What's wired vs. what's a starting point

**Fully wired**
- Email/password + Google auth, JWT issuance, role-based access (Customer vs Admin)
- Garment catalogue, live bill with 18% GST, order creation, order history
- Razorpay order creation **and** server-side signature verification (HMAC-SHA256)
- Admin dashboard summary, transactions list, customer list
- Counter billing → invoice → WhatsApp/SMS send (with console fallback)
- Admin-editable prices/catalogue, theme colors, contact details, and third-party API keys
  (Google Sign-In, Razorpay, Twilio) — see §10, all take effect without a redeploy
- Responsive layout for mobile / tablet / laptop

**Deliberately simple (extend for production)**
- Order status is advanced via an admin API call (`PUT /api/orders/{id}/status`); there's no
  background job or courier integration yet — tracking reflects whatever status is set.
- Razorpay **webhooks** aren't handled (verification is done inline on the success callback);
  add a webhook for extra robustness against dropped callbacks.
- Passwords use PBKDF2 (no external dependency). Fine to start; review before scale.
- No automated tests are included.

---

## 7. Was this built and tested?

Yes — the app has been built and run end-to-end (both `dotnet build` and `npm run build`
pass cleanly), and the core flows (sign-in/out, admin catalogue/price edits, theme and
contact settings, API key management) have been exercised in a real browser against a live
backend, not just typechecked. That said, it's still one project's worth of manual testing,
not a test suite — there's no automated coverage (see §6), so re-check anything you change
before shipping it.

---

## 8. Hosting & domain (when you're ready)

- **Frontend:** `npm run build` produces static files in `client/dist` — host on Netlify,
  Vercel, Cloudflare Pages, or any static host. Set `VITE_API_BASE_URL` to your API's public
  URL at build time.
- **Backend:** publish with `dotnet publish -c Release` and host on Azure App Service,
  Render, Railway, or a VM. SQLite works fine in production for small/single-instance
  deployments as long as the `rinserise.db` file lives on **persistent** disk (not an
  ephemeral container filesystem) — run `dotnet ef database update` against it as part of
  your deploy. If you outgrow a single file (multiple app instances, high write concurrency),
  switch to a managed Postgres/MySQL instance using the note in §5.
- **Domain & SSL:** buy a domain (e.g. from your preferred registrar), point DNS to your
  hosts, and enable HTTPS (most platforms issue free certificates). Remember to add your
  production domain to Google OAuth origins and Razorpay's allowed origins.

### 8a. Push to GitHub

```bash
git init                      # if not already a repo
git add .
git commit -m "Initial commit"
gh repo create <your-repo-name> --private --source=. --remote=origin
git push -u origin main
```
(No `gh` CLI? Create the empty repo on github.com first, then
`git remote add origin <url>` and `git push -u origin main`.)

### 8b. Deploy to Railway (two services, one repo)

This is a monorepo (`server/RinseRise.Api` + `client`), so create **two** Railway
services from the same GitHub repo, each with its own **Root Directory**. Both ship
with a `Dockerfile`, which Railway auto-detects — no Nixpacks config needed.

**API service** — Root Directory: `server/RinseRise.Api`
1. New Service → Deploy from GitHub repo → set Root Directory to `server/RinseRise.Api`.
2. Add a **Volume**, mount it at e.g. `/app/data` (so the SQLite file and uploaded
   images survive redeploys — the container filesystem otherwise resets every deploy).
3. Environment variables (Settings → Variables):
   | Variable | Value |
   |---|---|
   | `ConnectionStrings__Default` | `Data Source=/app/data/rinserise.db` |
   | `Uploads__Directory` | `/app/data/uploads` (branding logo / offer images — without this they're written to the container's own filesystem and lost on the next redeploy) |
   | `Jwt__Key` | a long random secret (**don't** ship the appsettings.json placeholder) |
   | `Seed__AdminPassword` | your own admin password (don't ship the default) |
   | `CORS_ALLOWED_ORIGINS` | the client service's public URL, once you have it (comma-separate if more than one) |
   | `ASPNETCORE_ENVIRONMENT` | `Production` (Dockerfile already sets this, only needed if you override) |
4. Deploy, then note the generated public URL (Settings → Networking → Generate Domain).
   Razorpay/Google/Twilio keys don't need to be set here — add them later from
   **Admin → API Keys** once the app is live, no redeploy required (see §10).

**Client service** — Root Directory: `client`
1. New Service → same repo → Root Directory `client`.
2. Build-time variable: `VITE_API_BASE_URL` = the API service's public URL from above.
   (`VITE_GOOGLE_CLIENT_ID` is an optional build arg — skip it and set it from
   Admin → API Keys after deploy instead. The map needs no build-time variable at all.)
3. Deploy, note its public URL, and set it as `CORS_ALLOWED_ORIGINS` on the API service
   (step 3 above), then redeploy the API service so the new origin takes effect.
4. Add both services' domains to Google OAuth's Authorized JavaScript origins and to
   Razorpay's allowed origins/webhook settings when you're ready to go live.

**First admin login:** `admin@rinserise.local` / whatever you set `Seed__AdminPassword`
to — the account is created automatically on first boot (see `SeedAdmin` in `Program.cs`).

---

## 9. Project structure

```
rinse-and-rise/
├── PLAN.md                      # 10-day, 4-hours/day build plan
├── README.md                    # this file
├── server/RinseRise.Api/         # .NET 8 Web API
│   ├── Controllers/             # Auth, ClothTypes, Orders, Payments, Admin
│   ├── Services/                # Auth, Orders, Razorpay, Notifications, JWT, hashing
│   ├── Models/ · Dtos/ · Data/  # entities, request/response types, EF DbContext + seed
│   ├── Program.cs               # startup, DI, auth, CORS, Swagger, DB init
│   ├── appsettings.json         # fallback config & API keys (Admin → API Keys overrides)
│   └── Dockerfile               # Railway/any-Docker-host deploy — see §8b
└── client/                      # React + Vite app
    ├── src/pages/               # Home, auth, order flow, tracking
    ├── src/pages/admin/         # dashboard, prices, features, API keys, counter billing
    ├── src/components/ · context/ · api/ · data/
    ├── .env.example             # frontend keys template (optional — see §10 API keys)
    └── Dockerfile               # Railway/any-Docker-host deploy — see §8b
```

Enjoy building **Rinse & Rise**! 🧺

---

## 10. Storefront & admin features

This build turns the site into a proper storefront (inspired by laundry sites like
meralaundry.in) with an admin-managed catalogue, offers, and a pickup toggle.

### Categories
Garments are grouped into **categories** (Men, Women, Kids, Curtains, Sofa & Couch Covers,
Shoes, Household). The same categories are shared by customers and the counter. The homepage
shows a "browse by category" grid, and the **Select garments** page has category tabs
(`/order?category=men`). Seeded categories can be edited under **Admin → Categories**
(name, slug, icon, sort order, image, active/hidden).

### Offers & discounts (time-limited)
Under **Admin → Offers** you can create discounts that:
- take **% off** or a **flat ₹ off**,
- apply to **all items**, **one category**, or **one specific item**,
- run between a **start and end date/time** (outside that window they simply don't apply),
- optionally carry a **coupon code** (shown to customers), and
- optionally show as a **pamphlet/banner on the homepage** (`Show on homepage`).

Active offers automatically:
- discount the price shown in the catalogue (original price shown struck-through), and
- **carry through to checkout** — `OrderService` charges the discounted unit price, so the
  bill always matches what the customer saw. When several offers apply to one item, the one
  giving the **lowest price** wins.

### Pamphlet / image uploads
The offer and category forms let you **upload an image**. Files are sent to
`POST /api/admin/uploads`, saved under `server/RinseRise.Api/wwwroot/uploads/`, and served as
static files (the app calls `UseStaticFiles`). Only image types up to ~6 MB are accepted.
In production, set `VITE_API_BASE_URL` on the frontend so these image URLs resolve to your API
origin.

### "How it works" steps
The homepage shows a seeded **process** (Book → Pickup → Clean → Deliver) plus each item's
short description and a "How we clean it" overview.

### Pickup scheduling toggle (admin-controlled)
**Admin → Settings** has a switch for **customer pickup scheduling**:
- **Off (default):** customers browse services, prices and offers, but the self-service
  pickup/checkout flow is hidden. Instead they see a "call to book" prompt with your business
  phone — you arrange pickups manually.
- **On:** the full flow appears (map pickup → payment → tracking).

The same screen sets the **business phone** and **homepage headline**. These live in a small
`Settings` key/value table and are exposed to the storefront via `GET /api/settings/public`.

### Prices (Admin → Prices)
Add or edit catalogue items — name, category, type (Wash & Fold / Dry Clean / Ironing /
Premium), per-piece price, icon, and active/hidden — the same items customers pick under
**Book a pickup**. There's no separate "publish" step: `GET /api/clothtypes` reads straight
from the database, so a saved price change is live for every customer on their next page
load, no rebuild or restart needed.

### Theme colors (Admin → Features)
Two base hex colors (primary, accent) that the whole storefront's palette — buttons, navbar,
links, icons, wash tints — is derived from. Previews live as you pick a color, and applies
for every visitor the moment you save, by writing CSS custom properties onto the document
root (`client/src/utils/theme.js`), which beats the theme's own light/dark stylesheet rules.

### Contact us (Admin → Features)
Email, phone, address, and a Google Maps location link, shown in the site footer. The
existing **business phone** (the "call to book" number) is editable from here too, alongside
the rest of the contact card.

### API keys (Admin → API Keys)
Google Sign-In, Razorpay, and Twilio credentials can be set from the admin UI
instead of (or in addition to) `appsettings.json`/`client/.env` — changes apply immediately,
no redeploy. A key saved here always wins; leaving a field blank keeps using whatever's in
`appsettings.json`/env config (shown as a hint under the field). This is what makes the
Railway deploy in §8b simple: you don't need to bake real third-party secrets into build-time
config at all — deploy first with no keys (everything runs in the graceful-degradation "demo
mode" from §3), then fill them in from this page once the app is live.

### New API endpoints
Public: `GET /api/home`, `GET /api/categories`, `GET /api/clothtypes?category=slug`,
`GET /api/process-steps`, `GET /api/settings/public`.
Admin (JWT, Admin role): `GET/POST/PUT/DELETE /api/admin/offers`,
`GET/POST/PUT /api/admin/categories`, `GET/POST/PUT /api/admin/clothtypes`,
`GET/PUT /api/admin/settings`, `GET/PUT /api/admin/apikeys`, `POST /api/admin/uploads`.

> Offer start/end times are entered in your local timezone in the admin form and stored as
> UTC. If you run the server in a very different timezone from your admins, keep that in mind
> when scheduling tight windows.
