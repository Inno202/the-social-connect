# Decisions

Choices made while building, so they can be changed later. Everything visual is in tokens in `src/index.css`.

## Look

- **Colours.** Black `#0B0B0C`, white `#FFFFFF`, light grey `#F3F3F1` for frames and placeholders, soft text `#55555A`, lines `#E4E4E0`. One accent: lime `#A3E635`, used only on black (buttons on dark, the active tab, chips, the cart count, highlights). Lime on white is 1.5:1, so it is never used for text on white.
- **Accent text on white** uses the Summer Blow leaf green: `#4A8A0E` for large text such as event titles and heading accents (4.3:1, passes AA for large text), and a deeper `#3B6E0B` for small text such as dates and links (6.1:1). Errors `#B42318`.
- **Fonts.** Headings: Barlow Condensed ExtraBold Italic (800), in capitals, short, in the spirit of the posters. Reading text and interface: Barlow (400 to 700). Both from Google Fonts.
- **Where the Bokamoso style was overridden on purpose:** you asked for slanted capital headings, so headings are italic and upper case (Bokamoso says upright, sentence case, no italics). Reading text stays upright with no italics anywhere. Inner page headers are solid black bands instead of photo bands, because there are no event photos yet.
- **Event colours stay on the posters.** The site frame is black, white and lime; posters bring the colour. When an event has no poster (Spin Blow 2026) a plain block in its poster colour (blue `#1D4FBF`) shows the name, with black or white text chosen for contrast.
- **Logo.** No logo file was supplied, so the header and footer use a text logo: "MSB" with "EVENTS" spaced out underneath (`src/components/Logo.tsx`). Swap in the real file when you send it.
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
- **VIP tables** issue one ticket per seat ("Seat 2 of 4"), all in the buyer's name. Asking for each guest's name is a possible later addition.
- **Releases** open in order: a release with "Opens after" set goes on sale when that release sells out. "Coming soon" can also be set by hand.
- **Gate price** is shown for information only.
- **Promo codes:** the row is shown but switched off ("Coming soon"). Future feature.
- **QR code** contains `MSB1:` plus the ticket code. The code is printed under the QR for typing at the door.
- **Cart** lives in the browser (local storage), so it is per device.

## Testing data

- Two **demo events** exist only in the local test database (`node scripts/seed.mjs --demo`): "MSB Test Night (demo event)" with releases, VIP tables and children's tickets, and "Test Activation (demo event)" with free tickets. They exist because every real 2026 event is either past or sold on Computicket, so there was nothing real to buy on this site. Their prices are test values, not MSB prices. The screenshots of the tickets step, cart, my tickets and the PDF use them.
- The PDF screenshot shows the black "MSB" block on the left because the demo event has no poster. A real event's ticket shows its poster there.
