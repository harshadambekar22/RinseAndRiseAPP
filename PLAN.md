# Rinse & Rise — 10-Day Build Plan (≈4 hours/day, ~40 hours)

This plan turns the scaffold in this repository into a working, demoable product over ten
focused half-days. **Day 0 is already done** — this code *is* the scaffold. Days 1–10 are
how to make it run, harden the core flows, and add the time-sensitive integrations last.

> ### Start these external approvals on Day 1 — they wait for no one
> Several pieces depend on **third-party verification that you cannot rush** by coding:
> - **Razorpay live payments** → business KYC (PAN, bank, etc.). *Test mode works instantly;*
>   *live approval can take several days.* Apply Day 1, build against Test Mode meanwhile.
> - **WhatsApp Business sender** (via Twilio/Meta) → sender approval. *Use the Twilio*
>   *sandbox for development now; submit the production sender early.*
> - **Google Cloud project** → enable billing, create OAuth client + Maps key (fast, but do
>   it Day 1 so nothing blocks you).
> - **Domain + SSL** → purchase early; DNS/SSL propagation isn't instant.
>
> Submitting these on Day 1 means they're approved by the time you need them on Days 8–10.

---

## Phase 1 — Foundations & the customer money path (Days 1–5)

### Day 1 — Environment & first run *(get it green)*
- Install .NET 8 SDK and Node 18+. Open the repo. Install the EF CLI:
  `dotnet tool install --global dotnet-ef`. No database server to install — the app uses
  SQLite (a local file), already configured in `appsettings.json`.
- `cd server/RinseRise.Api && dotnet restore && dotnet ef migrations add InitialCreate &&
  dotnet run` — confirm Swagger at `:5080/swagger`, confirm `rinserise.db` was created and
  the catalogue is seeded.
- `cd client && npm install && npm run dev` — confirm the app loads at `:5173`.
- Fix any first-run hiccups (a missing `using`, a package version).
- **Kick off all external sign-ups above (Razorpay, Google Cloud, Twilio, domain).**
- *Done when:* both servers run and you can log in as the seeded admin.

### Day 2 — Auth, end to end *(real accounts)*
- Register a customer from the UI; verify the JWT is stored and protected routes work.
- Test the redirect-to-login-then-back behaviour during checkout.
- Wire **Google Sign-In**: paste the OAuth Client ID into `client/.env` and
  `appsettings.json`; verify the button appears and logs you in.
- Review password rules and token lifetime in `appsettings.json`.
- *Done when:* email/password **and** Google sign-in both create working sessions.

### Day 3 — Catalogue & live billing *(the cart)*
- Review the seeded garment list / prices in `Data/AppDbContext.cs`; adjust to your real
  menu and GST treatment.
- Verify the live bill math (subtotal + 18% tax) matches between the cloth-selection page
  and the backend order totals.
- Tidy the empty/loading/error states on the selection screen.
- *Done when:* selecting garments produces a correct, live-updating bill.

### Day 4 — Pickup scheduling & map *(location)*
- Confirm the OpenStreetMap/Leaflet draggable-pin map loads (no API key needed) and that
  Nominatim reverse-geocoding fills city/state/pincode on pin drop.
- Persist the chosen address + pickup time through the sign-in redirect (already handled via
  the local cart — verify on mobile).
- Validate address fields and pincode.
- *Done when:* a customer can drop a pin, enter an address, and pick a time reliably.

### Day 5 — Payments with Razorpay (Test Mode) *(the core transaction)*
- Add Razorpay **test** keys to `appsettings.json`.
- Walk the full path: create order → Razorpay checkout → **server-side signature
  verification** → order marked paid → success screen.
- Test the unhappy paths: user dismisses the modal, payment fails — confirm the order is
  saved as unpaid and the messaging is clear.
- Confirm the **mock/demo** fallback still works with keys removed (for safe demos).
- *Done when:* a test UPI/card payment completes and verifies on the server.

---

## Phase 2 — Tracking, admin, and the WhatsApp bill (Days 6–9)

### Day 6 — Order tracking *(visibility)*
- Verify the tracking stepper maps correctly across the full `OrderStatus` lifecycle.
- Exercise `PUT /api/orders/{id}/status` from Swagger to advance an order and watch the
  customer tracking page update on refresh.
- Decide your real-world status triggers (who advances an order, and when).
- *Stretch:* auto-refresh the tracking page on an interval.
- *Done when:* advancing status on the backend is reflected on the customer's tracker.

### Day 7 — Admin dashboard & records *(operations)*
- Verify the dashboard summary numbers (revenue today/all-time, pending, in-cleaning,
  customers) against orders you created.
- Test the transactions and customers tables, including the search filters.
- Confirm admin-only routes reject non-admin tokens.
- *Done when:* an admin can see accurate revenue, all transactions, and all customers.

### Day 8 — Counter (in-shop) billing *(the front desk)*
- Use the counter-billing screen: add items, enter the walk-in customer's name + mobile,
  pick a payment method (UPI/QR/card/POS/cash), and generate the invoice.
- Confirm the perforated-ticket invoice renders with correct totals.
- Leave WhatsApp on **Console** provider for now and confirm the bill text is logged.
- *Done when:* a counter sale produces a correct invoice and a (logged) bill message.

### Day 9 — WhatsApp bill delivery *(close the loop)*
- Switch `Notifications:Provider` to `Twilio`; fill the Twilio sandbox credentials.
- Join the sandbox from a test phone; send a real bill to WhatsApp; confirm the **SMS
  fallback** path.
- Normalise Indian phone numbers (the service prepends +91 — verify with your formats).
- Submit/confirm your **production WhatsApp sender** if not already approved.
- *Done when:* a real bill arrives on WhatsApp in the sandbox, with SMS as backup.

---

## Phase 3 — Ship it (Day 10)

### Day 10 — Hardening, build & deploy
- Responsive QA on real devices: phone, tablet, laptop (order flow + admin).
- Make sure `rinserise.db` lives on **persistent** disk on your host (not an ephemeral
  container filesystem), and run `dotnet ef database update` against it as part of the
  deploy. (Outgrown SQLite? See the README §5 note on switching providers.)
- `npm run build` (set `VITE_API_BASE_URL`) and `dotnet publish -c Release`.
- Deploy backend (Azure/Render/Railway) and frontend (Netlify/Vercel/Cloudflare).
- Point your **domain**, enable **HTTPS**, and add the production domain to Google OAuth
  origins and Razorpay. Flip Razorpay to **live** (once KYC is approved).
- Smoke-test the deployed app end to end.
- *Done when:* the app is live on your domain over HTTPS and a real order completes.

---

## Honest scope note

Forty hours is enough to get a **solid, demoable product** on top of this scaffold and to
deploy it — provided the external approvals (Razorpay KYC, WhatsApp sender) were started on
Day 1 and clear in parallel. What typically slips past 40 hours, and is best treated as a
**phase-two backlog**, includes: automated tests, Razorpay **webhooks** for guaranteed
payment reconciliation, courier/logistics integration for *real* tracking events (vs.
manual status updates), staff/role management, refunds and cancellations, invoicing/GST
reports, and rate-limiting/observability. None of these block your first launch, but plan a
second iteration for them.
