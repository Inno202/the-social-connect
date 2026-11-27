# Decisions

Choices made while building, so they can be changed later. Everything visual is in tokens in `src/index.css`.

## Look

- **Colours.** Black `#0B0B0C`, white `#FFFFFF`, light grey `#F3F3F1` for frames and placeholders, soft text `#55555A`, lines `#E4E4E0`. One accent: lime `#A3E635`, used only on black (buttons on dark, the active tab, chips, the cart count, highlights). Lime on white is 1.5:1, so it is never used for text on white.
- **Accent text on white** uses the Summer Blow leaf green: `#4A8A0E` for large text such as event titles and heading accents (4.3:1, passes AA for large text), and a deeper `#3B6E0B` for small text such as dates and links (6.1:1). Errors `#B42318`.
- **Fonts.** Headings: Barlow Condensed ExtraBold Italic (800), in capitals, short, in the spirit of the posters. Reading text and interface: Barlow (400 to 700). Both from Google Fonts.
- **Where the Bokamoso style was overridden on purpose:** you asked for slanted capital headings, so headings are italic and upper case (Bokamoso says upright, sentence case, no italics). Reading text stays upright with no italics anywhere. Inner page headers are solid black bands instead of photo bands, because there are no event photos yet.
- **Event colours stay on the posters.** The site frame is black, white and lime; posters bring the colour. When an event has no poster (Spin Blow 2026) a plain block in its poster colour (blue `#1D4FBF`) shows the name, with black or white text chosen for contrast.
- **Logo.** The MSB Events logo you supplied (white lettering on blue) has had the blue removed. It ships as a transparent white version (header, footer, app icons, ticket PDF without a poster) and a black version (ticket PDF), in `public/brand/msb-logo-*.png`, with the original kept in `reference/brand/`.
- **Hero slideshow.** No crowd or stage photos were supplied. Until they are, the slides are crops of the artist line-ups from your Spring Blow and Soulful Blow 2026 posters and the MSB Weekend 2024 poster (`public/brand/hero-*.webp`). No text or buttons are placed on the slides; only pause and dots.
- **Gallery.** Until event photos arrive, it shows your posters, grouped by event and year.

## Events and categories

- **Chips:** Upcoming, Festivals, Activations, Family, Past. Comedy events count as Festivals in the chips (there is no separate Comedy chip).
- **Categories stored:** festival, activation, family, comedy. Each event page shows one category pill.
- **Past:** an event moves to Past 12 hours after it starts. For an event over several days (MSB Weekend 2024) it is 12 hours after the start of the last day.
- **Today is 24 November 2026**, so the Fun Walk, the September Blow events and the activations are already in Past. Upcoming are Summer Blow (26 December) and Soulful Blow (27 December).
- **18+ events:** all Blow-branded events (including the activations) are marked 18+ and show "No under 18s. Drink responsibly. Alcohol is not for sale to persons under 18." The Fun Walk is not. Please confirm (see open questions).
- **Times:** shown in SAST. Where only the date is known, the page says "Times to be announced" (12:00 is stored internally only for sorting).
- **Selling:** Spring Blow and Soulful Blow (September) and the December Soulful Blow VIP tables are set to "Buy on Computicket". The Computicket links are the Computicket home page until you send the exact event links. The activations and the Fun Walk are set to sell on this site (both are past now). Summer Blow and Spin Blow are "Tickets coming soon".
- **"From R…"** uses the cheapest ticket on sale now; if nothing is on sale here it uses the listed prices (so Spring Blow shows "From R200", the December Soulful Blow shows "Tables from R3,000").

## Tickets

- **One order per ticket type**, issued in one database transaction with the tickets, the sold counter and the buyer's per-event count, so numbers cannot drift.
- **Per-account limit:** 20 tickets per event (so two 8-seat tables plus four general tickets fit).
- **VIP tables** issue one ticket per seat ("Seat 2 of 4"). Checkout asks a name for each seat (empty seats use the buyer's name); the owner can change the name on a ticket in My tickets until it is scanned. The database rules allow only that one field to change.
- **Releases** open in order: a release with "Opens after" set goes on sale when that release sells out. "Coming soon" can also be set by hand.
- **Gate price** is shown for information only.
- **Promo codes:** the row is shown but switched off ("Coming soon"). Future feature.
- **QR code** contains `MSB1:` plus the ticket code. The code is printed under the QR for typing at the door.
- **Cart** lives in the browser (local storage), so it is per device.

## Testing data

- Two **demo events** exist only in the local test database (`node scripts/seed.mjs --demo`): "MSB Test Night (demo event)" with releases, VIP tables and children's tickets, and "Test Activation (demo event)" with free tickets. They exist because every real 2026 event is either past or sold on Computicket, so there was nothing real to buy on this site. Their prices are test values, not MSB prices. The screenshots of the tickets step, cart, my tickets and the PDF use them.
- The PDF screenshot shows the black "MSB" block on the left because the demo event has no poster. A real event's ticket shows its poster there.

## Live setup (24 November 2026)

- **Firebase project** `msbevents-74e03`; web config in `.env.production` (public). Google Analytics left out: the Privacy policy promises no tracking.
- **Sign-in:** email and password, and Google (popup). A first Google sign-in creates a customer profile automatically. Google accounts have no password section; deleting the account asks Google to confirm.
- **No database indexes needed:** ticket lists are sorted in the browser and ticket types are read per event, so a fresh Firestore works after publishing the rules.
- **Hosting:** GitHub Pages at `inno202.github.io/<repository>/`, published only by running the workflow by hand. The base path follows the repository name, so renaming to `msb-events` keeps working.
- **Live content:** the 9 events and the poster gallery are loaded with the dashboard's "Load MSB events" button, not with a script, so no admin keys are ever needed.

## Responsive system (25 November 2026)

The Bokamoso rules applied across the whole site. Everything shared is in `src/index.css`.

- **Root font:** `clamp(87.5%, calc(1.2vw + 62.5%), 100%)`. At the default text size this is exactly `clamp(14px, 1.2vw + 10px, 16px)`; written in % so a phone set to larger text still makes the site bigger (the px version would ignore that setting).
- **Readable floor:** with the scaled root, Tailwind's `text-sm` would be about 12.5px on a 360px phone, which breaks "nothing people read below 14px". `text-sm` is therefore `max(14px, .875rem)` and `text-xs` is `max(12px, .75rem)`; button text and form labels have the same floor. `text-xs` is used only for eyebrow labels (decoration); badges such as Sold out, Valid and Past moved up to `text-sm` because they carry information.
- **Fields:** `font-size: max(16px, 1rem)` so iPhones never zoom in, while still growing with the phone's text setting.
- **Buttons:** `.btn` plus one variant: `btn-primary`, `btn-accent` (lime; was `btn-lime`), `btn-outline`, `btn-ghost` (quiet actions like "Forgot password"), `btn-danger`, `btn-danger-solid`, and on dark: `btn-light`, `btn-outline-light`, `btn-ghost-light`. Filters, tabs and segmented toggles use `btn-chip` / `btn-chip-light` (48px tall, black with lime when on). Medium weight (500).
- **Icon buttons:** `.icon-btn` (44 x 44) plus `icon-btn-dark`, `-ghost`, `-ghost-light`, `-glass` (on photos), `-light`, `-danger`. The slideshow dots are 44px icon buttons with a small dot inside.
- **Icons in text buttons removed** (Download, Plus, Upload, scanner icon, external-link icon); only the forward arrow remains. Exception: "Continue with Google" keeps Google's mark, because Google's branding rules ask for it.
- **Cards that are tap targets** (poster, gallery photo, ticket) are buttons styled as `.tap-card`, not `.btn`: they are cards.
- **"This event is over" / "Tickets coming soon"** are status lines (`.status-bar`), not disabled buttons.
- **Radius:** one token `--radius-xl` (24px) for panels, frames, bands, dialogs and the hero; inner items use `.r-in` (radius minus padding). The hero and page bands went from 32px to 24px to stay in one family.
- **Type scale:** `.t-hero` (5xl / md:7xl), `.t-title` (4xl / sm:5xl / md:6xl), `.t-section` (3xl / md:4xl), `.t-card` (2xl), `.t-card-lg` (2xl / md:3xl), `.t-lead`. The event title, which sits in a half-width column, uses the plain-page steps without the md step (4xl / sm:5xl). Headings keep the slanted capital poster style you asked for, at line height 1.02.
- **Sign in / create account** became a plain page (no black band) with a centred card, as the rules ask for short forms.
- **Checkout:** form (3/5) beside the order summary (2/5) on desktop; on phones the form comes first and the summary follows it, so the main button is reached without scrolling past the order.
- **Staff forms in dialogs:** ticket types and gallery photos are added and edited in a native dialog (up to 42rem, scrolls inside, Save / Cancel always visible). The event itself stays a full page because it has many sections.
- **Dialogs** keep a 16px gap from the screen edge on every phone (`calc(100% - 32px)`, in px so the gap does not shrink with the root font).
- **Back button:** closes the photo viewer, any dialog (confirmations, tickets, staff forms) and the phone menu before leaving the page.
- **Door scanner** fills one screen (`100dvh`) and the camera square fits the smaller of width and height via a size container.
- **Images:** posters in 400 / 640 / 1000px versions, hero photos in 640 / 1024 / 1600px, all with `srcset`, `sizes` and real width and height; only the first hero photo is high priority; slideshow photos load only when their turn is near.
- **Chunks:** Firebase in its own chunk (the public pages need it for live events, so it still loads there); the PDF maker loads only on "Download PDF"; the QR reader only on the scanner. The My tickets page went from 437 KB to 36 KB.
- **Service worker:** pages are fetched from the network first (4 second limit), falling back to the saved copy or the app shell offline, so a new release shows on the next visit.
- **Fonts:** Barlow Condensed 800 italic only (700 was unused) and Barlow 400 to 700.

## 27 November 2026: launch polish

- **Search and sharing.** Each pre-rendered page gets its own title, description, canonical link and Open Graph / Twitter
  tags (event pages use the event poster as the share picture). Event pages carry schema.org `Event` data (date, venue,
  prices, availability, line-up) and Home carries `Organization` data, so Google can show events in search. The build
  writes `sitemap.xml` and `robots.txt`. On a `github.io` project address search engines only read `robots.txt` at
  the domain root, so it takes effect once the site has its own domain; submit `sitemap.xml` in Google Search Console
  meanwhile. Set `VITE_SITE_ORIGIN` (in `.env.production`) if the address changes.
- **Event page.** Add to calendar (an `.ics` file for any calendar app, plus a Google Calendar link), Directions (Google
  Maps), WhatsApp and native Share, and a countdown. Without a published end time the calendar entry ends when it
  starts (no made-up end time); events with times to be announced become all-day entries. Home shows a countdown to
  the next event under "Upcoming events".
- **Notify me.** On events whose tickets are coming soon, a signed-in person can join a notify list (name and account
  email, enforced by the rules). Staff see the lists in Dashboard → Notify lists, export a CSV and clear a list once
  they have told people. No emails are sent by the site.
- **Ticket transfer.** An owner makes a one-time link (28 random characters, valid 7 days, cancellable). The friend signs
  in and claims it: in one transaction they get a new ticket with a new id (so a new QR code), the old ticket is
  cancelled and the link is used up. A screenshot of the old QR code no longer gets in. The rules check every copied
  field, so nothing can be changed on the way. Known limits: the friend's copy does not count towards the friend's
  20-ticket limit (the sender's count is not reduced either), and a door phone that is offline and cached the old
  ticket earlier could still show it as valid until it reconnects.
- **Busy sale moments: the waiting room.** When many people check out at once, a purchase that fails because the
  database is busy is tried again automatically after a growing, random wait (1.5 s, 3 s, 6 s, 12 s, then about 20 s,
  each ±50%), for up to 4 minutes, behind a playful full-screen "You are in the line" screen. Real problems (sold
  out, limit reached) show straight away and are never retried. This spreads retries out so the site does not fall
  over, but it runs in the browser: it is not a server-enforced line.
- **Sold counters (sharding): planned, not built.** Firestore handles about one sustained write per second on a
  single document, and each ticket type has one `sold` counter. Splitting the counter into shards was considered,
  but the security rules could not then check the exact total and the release order within Firestore's limit on
  document reads per rule, so the strict checks (never oversell, 20 per account, releases in order) would be lost.
  The plan for when payments are connected (which needs the Blaze plan and Cloud Functions anyway): tickets are issued
  by a server function after the payment provider confirms payment; buyers join a server queue (a `queue` document
  per buyer, admitted in order by the function); the function keeps sharded counters plus a reservation with a
  10-minute hold, so the browser never writes counters at all. Until then the waiting room above covers busy moments.
- **App Check (bot protection).** Already wired in code: it switches on when `VITE_RECAPTCHA_SITE_KEY` is set. To turn
  it on: Google Cloud console → reCAPTCHA → create a v3 key for `inno202.github.io`; Firebase console → App Check →
  register the web app with that key; put the site key in `.env.production`; publish; watch the App Check metrics for
  a few days, then press Enforce for Cloud Firestore and Authentication.
- **Fonts** are served from the site (Fontsource packages, latin letters only); Google Fonts is no longer contacted, and
  the CSP no longer allows it.
- **Server headers.** GitHub Pages does not send an `X-Powered-By` header, and its `Server` header says only
  `GitHub.com` with no software version. GitHub controls these headers and no site hosted there can remove or
  change them. If the site moves to Firebase Hosting or its own server: Firebase Hosting also sends no
  `X-Powered-By` (the security headers are already in `firebase.json`); on nginx use `server_tokens off;` (and
  `more_clear_headers Server;` with the headers-more module); on Apache use `ServerTokens Prod`, `ServerSignature Off`
  and `Header unset X-Powered-By`; on Express use `app.disable('x-powered-by')`.
- **Vendors follow their applications.** A vendor who applies while signed in can open My applications
  (`/vendors/applications`, also linked from Profile and the vendor page) to see each application's status (Received,
  Approved, Not this time) and an optional message from staff (up to 500 characters, written in Dashboard → Vendors).
  The rules let a vendor read only applications carrying their own account id and never change them; only event staff
  write the status and message. Applications sent without an account are not linked to anyone and do not show there;
  staff are reminded to reply to those by phone or email. No email is sent.
