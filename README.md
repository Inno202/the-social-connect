# MSB Events website

The website for MSB Events, the Matjhabeng (Welkom, Free State) events company behind Matjhabeng Spring Blow, Soulful Blow, Spin Blow and Summer Blow, the MSB Fun Walk & Family Day and MSB Comedy Night.

Built in the Bokamoso style: React, Vite, Tailwind 4 and TypeScript, with Firebase Auth (email and Google) and Firestore (strict rules with tests), pre-rendered public pages, a service worker so tickets open offline, and Cloudinary uploads.

**Nothing is live yet.** The Firebase project `msbevents-74e03` exists and is connected, but the rules are not published and the site is not deployed. All tests run against the local Firebase emulators. **No payments are taken**: checkout issues tickets without charging, and the site says so.

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

`test:rules` and `test:e2e` start their own emulators. The e2e suite saves screenshots to `docs/screenshots/`.

`tests/e2e/layout.spec.ts` enforces the responsive rules on every public page at 1280, 768, 390 and 360px, on signed-in pages for every staff role, at 200% zoom and with a larger phone text size: no sideways scrolling, 48px buttons and fields, 44 x 44px icon buttons, no reading text under 14px, button and chip rows that fill the width, equal-height cards, one h1, sized images, dialogs that keep clear of the screen edge, the back button closing overlays, and axe accessibility. The design system itself is described at the top of `src/index.css` and in `docs/DECISIONS.md`. Three scripted checks run against a production build with the emulators running and seeded:

- `tests/e2e/offline-check.mjs`: tickets and the scanner without signal (build with `VITE_USE_EMULATORS=true`, serve with `npx vite preview --port 4173`).
- `tests/e2e/pages-check.mjs`: the GitHub Pages build under `/the-social-connect/` (build with `VITE_BASE=/the-social-connect/ VITE_USE_EMULATORS=true`, serve with `node scripts/pages-server.mjs`).
- `tests/e2e/import-check.mjs`: "Load MSB events" on an empty database (wipes the emulator data).

Run each with `NODE_PATH=node_modules node <file>`.

## Firebase project: `msbevents-74e03`

Done by you: the project, Email/Password and Google sign-in, `inno202.github.io` as an authorized domain, and Firestore. The web config is in `.env.production` (public identifiers, not secrets; Google Analytics is left out on purpose because the Privacy policy promises no tracking).

Still to do in the console (in this order):

1. **Publish the database rules (most urgent).** Firestore → **Rules** → replace everything with the contents of [`firestore.rules`](firestore.rules) → **Publish**. Until you do, Firestore uses whatever rules it was created with: in "test mode" anyone can read and change everything; in "production mode" the site cannot load or save anything. No indexes are needed.
   (CLI alternative: `npx firebase login`, then `npx firebase deploy --only firestore:rules`.)
2. **Email enumeration protection:** Authentication → Settings → User actions → turn on.
3. **Restrict the API key:** Google Cloud console → APIs & Services → Credentials → "Browser key (auto created by Firebase)" → Website restrictions: `inno202.github.io/*`, `msbevents-74e03.firebaseapp.com/*`, `localhost/*` (plus your own domain later).
4. **First super admin:** once the site is published, sign up on it, then in Firestore → `users` → your user id, change `role` from `USER` to `SUPER_ADMIN`. From then on change roles in the dashboard (Users and roles).
5. **Load the events:** sign in as that super admin, open Dashboard → Events and press **Load MSB events**. It copies the 9 events from the posters (with their ticket types) and the poster gallery into the live database, through the same rules as everything else.
6. **Bot protection (later):** create a reCAPTCHA v3 key for `inno202.github.io`, put the site key in `VITE_RECAPTCHA_SITE_KEY` in `.env.production`, register it under Build → App Check, watch the metrics for a few days, then **Enforce**.
7. **Cloudinary (for poster and photo uploads):** create an account, then Settings → Upload → Add upload preset: Unsigned, folder `msb`, formats `jpg,png,webp`, max 8 MB, incoming transformation `c_limit,w_2400`. Put the cloud name and preset in `.env.production`. Until then, staff paste image links.
8. **Budget alert** in Google Cloud Billing.

## Publishing on GitHub Pages (only when you approve)

The site is ready to be served at `https://inno202.github.io/the-social-connect/` (or `/msb-events/` if you rename the repository; the path follows the repository name).

1. Merge the working branch into `main` (your decision).
2. GitHub → repository **Settings → Pages → Source: GitHub Actions**.
3. **Actions → Deploy to GitHub Pages → Run workflow** (it only runs when started by hand). It runs the unit tests, builds, and publishes.
4. A custom domain later: add it in Settings → Pages, add it to Firebase authorized domains and the API key restrictions, and set the repository variable `SITE_BASE` to `/`.

GitHub Pages cannot send security headers, so the Content-Security-Policy and referrer policy are in a `<meta>` tag, a script stops the site being framed, and GitHub forces HTTPS. Unknown paths (cart, tickets, dashboard) are served by `404.html`, which opens the right page in the app.

## Going live: what is still needed

- **Payments** (not built; you will choose the provider later). MSB will sell paid tickets on this site, so when you are ready you need:
  1. A merchant account with **PayFast**, **Yoco** or **Paystack** (all support South African cards and instant EFT).
  2. A server function (Firebase Cloud Functions, which needs the Blaze pay-as-you-go plan) that creates the payment from the cart, sends the buyer to the provider's hosted checkout, and receives the provider's webhook (ITN for PayFast).
  3. Only that function issues paid tickets (with the Admin SDK); the rules would then stop browsers creating orders for paid ticket types. Free tickets keep the current flow.
  4. Update the Terms (refund policy, fees) and the Privacy policy (the payment provider) before switching on.
  Until then, checkout issues tickets without charging and says so, so keep real paid events on "Outside link" (Computicket).
- **Content from MSB Events**: see [`PLACEHOLDERS.md`](PLACEHOLDERS.md).

## Security check (the 20 tips)

| # | Tip | Status |
| --- | --- | --- |
| 1 | Hide API keys | Done: no secrets in the code or bundle. The Firebase web config in `.env.production` is a public identifier by design. **Needs you:** restrict the API key to your domains (step 3). |
| 2 | Purge Git secrets | Done: new repository, history scanned, `.env*` ignored. |
| 3 | Use public DB key | Done: the browser only has the Firebase web config; the Admin SDK is used only by local test scripts against the emulators. |
| 4 | Row-level security | Done in `firestore.rules` (default deny, each collection allowed explicitly). **Needs you:** publish them (step 1). |
| 5 | Encrypt sensitive data | Done for what applies: HTTPS, Google encryption at rest, no card data, minimal personal data. |
| 6 | Server-side auth | Done: every protected read and write is checked in the rules with `request.auth.uid`. |
| 7 | Lock record access | Done: people read only their own tickets, orders and profile; staff access comes from a role the user cannot edit; deactivated staff lose access at once; role changes need a sign-in within 8 hours. |
| 8 | Block field tampering | Done: exact field lists, types and sizes; order price must equal the release price; the sold counter moves by exactly the order quantity; ticket count and per-account limit (20 per event) are enforced; scans are stamped with the server time and the scanner's id. |
| 9 | Secure session cookies | Not applicable: no cookies; Firebase Auth handles tokens. |
| 10 | Hash passwords | Done by Firebase Auth; minimum 8 characters. |
| 11 | Rate limit login | Firebase's built-in throttling; generic "email or password is incorrect" message. **Needs you:** turn on email enumeration protection (step 2). |
| 12 | Bot protection | Built in (App Check with reCAPTCHA v3) plus the 20-tickets-per-account-per-event limit. **Needs you:** site key and enforcement (step 6). |
| 13 | Parameterize queries | Done: Firestore queries are built from typed values only. |
| 14 | Validate all input | Done on the page (helpful messages) and in the rules (safety). |
| 15 | Escape user content | Done: React escapes text; no raw HTML; outside links must be `https://` and open with `noopener noreferrer`; CSV exports neutralise spreadsheet formulas. |
| 16 | Restrict file uploads | Done in the app (JPG/PNG/WebP, 8 MB) and rules (only Cloudinary or built-in image links). **Needs you:** lock the Cloudinary preset (step 7). |
| 17 | Trim API responses | Done: public documents hold no emails; tickets hold only what the gate needs. |
| 18 | Security headers | GitHub Pages: CSP and referrer policy in a `<meta>` tag, plus a frame-busting script (a meta tag cannot block framing). `firebase.json` sends the full set as headers if you ever move to Firebase Hosting. |
| 19 | Force HTTPS | GitHub Pages forces HTTPS for github.io (tick "Enforce HTTPS" for a custom domain); the CSP adds `upgrade-insecure-requests`. |
| 20 | Scan dependencies | Done: `npm audit --omit=dev` reports 0. Remaining moderate advisories are in development tools only (firebase-tools). Turn on Dependabot in GitHub settings. |
