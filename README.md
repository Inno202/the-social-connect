# MSB Events website

The website for MSB Events, the Matjhabeng (Welkom, Free State) events company behind Matjhabeng Spring Blow, Soulful Blow, Spin Blow and Summer Blow, the MSB Fun Walk & Family Day and MSB Comedy Night.

Built in the Bokamoso style: React, Vite, Tailwind 4 and TypeScript, with Firebase Auth and Firestore (strict rules with tests), pre-rendered public pages, a service worker so tickets open offline, and Cloudinary uploads.

**Nothing is live.** There is no Firebase project yet. Everything runs and is tested against the local Firebase emulators. **No payments are taken**: checkout issues tickets without charging, and the site says so.

- What was decided and why: [`docs/DECISIONS.md`](docs/DECISIONS.md)
- Content still needed from MSB Events: [`PLACEHOLDERS.md`](PLACEHOLDERS.md)
- Screenshots: [`docs/screenshots/`](docs/screenshots)
- Brand files supplied: [`reference/`](reference)

## What is in it

| Area | Where |
| --- | --- |
| Home: photo slideshow, upcoming events, the MSB calendar 2026, about, gallery teaser, partners | `src/pages/Home.tsx` |
| Events list with Upcoming / Festivals / Activations / Family / Past chips (events move to Past 12 hours after the start) | `src/pages/Events.tsx`, `src/lib/eventState.ts` |
| Event page: poster, title card, date and venue card, Buy button (or "Buy on Computicket"), Info / Line up / Venue tabs | `src/pages/EventPage.tsx` |
| Tickets step (releases, VIP tables, free tickets, sold out / coming soon, gate price, promo code row switched off), cart, checkout (Tickets → Details → Pay → Success) | `src/pages/Tickets.tsx`, `Cart.tsx`, `Checkout.tsx`, `src/lib/checkout.ts` |
| My tickets with QR codes and PDF download; account (name, password, delete) | `src/pages/Profile.tsx`, `src/lib/pdf.ts` |
| Gallery with full-screen viewer | `src/pages/Gallery.tsx`, `src/components/PhotoViewer.tsx` |
| Dashboard by role: events (create, edit, duplicate, cancel, releases, VIP tables, free tickets, outside link, poster, line-up), reports with attendee CSV, gallery, users and roles, activity log | `src/pages/dashboard/` |
| Door scanner (camera or typed code, offline, one camera at a time) | `src/pages/Scanner.tsx`, `src/lib/scan.ts` |
| Terms, Privacy (POPIA), Cookies | `src/pages/Legal.tsx` |
| Database rules | `firestore.rules` |

Roles: `SUPER_ADMIN`, `ADMIN`, `EVENT_MANAGER`, `FINANCE`, `TICKET_SCANNER`, `USER`.

| Role | Events | Reports | Gallery | Users and roles | Activity log | Door scanner |
| --- | --- | --- | --- | --- | --- | --- |
| Super admin | yes | yes | yes | yes | yes | yes |
| Admin | yes | yes | yes | no | no | yes |
| Event manager | yes | yes | yes | no | no | yes |
| Finance | no | yes | no | no | no | no |
| Ticket scanner | no | no | no | no | no | yes |

## Run it on your computer

Needs Node 20+ and Java 21 (for the Firebase emulators).

```bash
npm install
```

```bash
npm run emulators
```

In a second terminal, add the content (and the two demo events used for testing checkout):

```bash
node scripts/seed.mjs --demo
```

```bash
npm run dev:emu
```

Open http://127.0.0.1:5173. Staff test accounts (emulator only): `super@msb.test`, `admin@msb.test`, `manager@msb.test`, `finance@msb.test`, `scanner@msb.test`, password `msb-test-pass`. Create a customer account on the site itself.

## Tests

```bash
npm run typecheck
```

```bash
npm test
```

```bash
npm run test:rules
```

```bash
npm run test:e2e
```

```bash
npm run build
```

`test:rules` and `test:e2e` start their own emulators. The e2e suite saves screenshots to `docs/screenshots/`. The offline check runs against the production build:

```bash
VITE_USE_EMULATORS=true npm run build && (npx vite preview --port 4173 &) && npm run emulators
```

then, with the emulators seeded, `NODE_PATH=node_modules node tests/e2e/offline-check.mjs`.

## Setting up Firebase (console steps for you)

1. Go to https://console.firebase.google.com, **Add project**, name it (for example `msb-events`). Google Analytics is not needed.
2. **Build → Authentication → Get started → Email/Password → Enable.** Under **Settings**, turn on **Email enumeration protection**. Under **Settings → Authorized domains**, add your domain once you have one.
3. **Build → Firestore Database → Create database**, production mode, location **africa-south1 (Johannesburg)** if offered, otherwise the nearest region.
4. **Project settings → General → Your apps → Web app (`</>`)**. Register it (tick Firebase Hosting if you will host there) and copy the config values into a new `.env.local` file using the names in `.env.example`. These are public identifiers, not secrets.
5. Install the CLI and deploy the rules and indexes (the rules must go live before or with the site):
   ```bash
   npx firebase login
   ```
   ```bash
   npx firebase use --add
   ```
   ```bash
   npx firebase deploy --only firestore:rules,firestore:indexes
   ```
6. **App Check (bot protection):** in the Google reCAPTCHA admin console create a reCAPTCHA v3 key for your domain, put the site key in `VITE_RECAPTCHA_SITE_KEY`, register it under **Build → App Check**, watch the metrics for a few days, then press **Enforce** for Firestore and Authentication.
7. **Content:** the seed script only works with the local emulators. On the real project, add events in the dashboard (or ask for a one-off import script).
8. **First super admin:** sign up on the site, then in **Firestore → users → (your user id)** change `role` to `SUPER_ADMIN`. From then on, roles are changed in the dashboard (Users and roles).
9. **Cloudinary:** create an account, then **Settings → Upload → Add upload preset**: Signing mode **Unsigned**, Folder `msb`, Allowed formats `jpg,png,webp`, max file size 8 MB, incoming transformation `c_limit,w_2400`. Put the cloud name and preset name in `.env.local`.
10. **Budget alert:** in Google Cloud Billing, set a budget alert so a traffic spike cannot surprise you.

## Going live: what is still needed

- **Firebase project and keys** (steps above) and the `.env.local` values.
- **Domain** (for example `msbevents.co.za`): connect it under **Hosting → Add custom domain**; Firebase issues HTTPS automatically. `firebase.json` already sends the security headers (CSP, HSTS, nosniff, referrer policy, camera only for this site, no framing).
- **Payments** (not built): a browser-only site cannot safely take money. To sell paid tickets you need:
  1. A merchant account with **PayFast**, **Yoco** or **Paystack** (all support South African cards and instant EFT).
  2. A server function (Firebase Cloud Functions, which needs the Blaze pay-as-you-go plan) that creates the payment from the cart, sends the buyer to the provider's hosted checkout, and receives the provider's webhook (ITN for PayFast).
  3. Only that function issues paid tickets (with the Admin SDK); the rules would then stop browsers creating orders for paid ticket types. Free tickets can keep the current flow.
  4. Update the Terms (refund policy, fees) and Privacy policy (the payment provider) before switching on.
- **Content from MSB Events**: see [`PLACEHOLDERS.md`](PLACEHOLDERS.md).
- **Deploy** (only when you approve): `npm run build` then `npx firebase deploy --only hosting`.

## Security check (the 20 tips)

| # | Tip | Status |
| --- | --- | --- |
| 1 | Hide API keys | Done: no secrets in the code or bundle; `.env.example` has placeholders only. Firebase web config and the Cloudinary preset name are public identifiers. |
| 2 | Purge Git secrets | Done: new repository, history scanned, `.env*` ignored. |
| 3 | Use public DB key | Done: the browser only has the Firebase web config; the Admin SDK is used only by the local seed script against emulators. |
| 4 | Row-level security | Done: `firestore.rules` denies everything by default and allows each collection explicitly. |
| 5 | Encrypt sensitive data | Done for what applies: HTTPS, Google encryption at rest, no card data, minimal personal data. |
| 6 | Server-side auth | Done: every protected read and write is checked in the rules with `request.auth.uid`. |
| 7 | Lock record access | Done: people read only their own tickets, orders and profile; staff access comes from a role the user cannot edit; deactivated staff lose access at once; role changes need a sign-in within 8 hours. |
| 8 | Block field tampering | Done: exact field lists, types and sizes; order price must equal the release price; the sold counter moves by exactly the order quantity; ticket count and per-account limit (20 per event) are enforced; scans are stamped with the server time and the scanner's id. |
| 9 | Secure session cookies | Not applicable: no cookies; Firebase Auth handles tokens. |
| 10 | Hash passwords | Done by Firebase Auth; minimum 8 characters. |
| 11 | Rate limit login | Firebase's built-in throttling; generic "email or password is incorrect" message. **Needs you:** turn on email enumeration protection (step 2). |
| 12 | Bot protection | Built in (App Check with reCAPTCHA v3) plus the 20-tickets-per-event limit. **Needs you:** site key and enforcement (step 6). |
| 13 | Parameterize queries | Done: Firestore queries are built from typed values only. |
| 14 | Validate all input | Done on the page (helpful messages) and in the rules (safety). |
| 15 | Escape user content | Done: React escapes text; no raw HTML; outside links must be `https://` and open with `noopener noreferrer`; CSV exports neutralise spreadsheet formulas. |
| 16 | Restrict file uploads | Done in the app (JPG/PNG/WebP, 8 MB) and rules (only Cloudinary or built-in image links). **Needs you:** lock the Cloudinary preset (step 9). |
| 17 | Trim API responses | Done: public documents hold no emails; tickets hold only what the gate needs. |
| 18 | Security headers | Done in `firebase.json`, plus a frame-busting check in the app for hosts that cannot send headers. |
| 19 | Force HTTPS | Done by Firebase Hosting, with HSTS and `upgrade-insecure-requests`. |
| 20 | Scan dependencies | Done: `npm audit --omit=dev` reports 0. Remaining moderate advisories are in development tools only (firebase-tools). Turn on Dependabot in GitHub settings. |
