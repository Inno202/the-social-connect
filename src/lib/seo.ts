import type { MsbEvent } from './types';
import { STATIC_EVENTS, posterSrc, heroImg } from './data';
import { HERO_SLIDES } from '../data/site';

/** Page head for the pre-rendered public pages: title, description, canonical link, share cards and
 *  structured data (schema.org) so search engines and WhatsApp / Facebook previews show the right thing. */

const SITE_NAME = 'MSB Events';
const DEFAULT_TITLE = 'MSB Events | Matjhabeng, Welkom';
const DEFAULT_DESC = 'MSB Events from Matjhabeng, Welkom: the Blow festivals, the MSB Fun Walk and more. Events, tickets and photos.';
const FACEBOOK = 'https://www.facebook.com/MatjhabengSummerBlow';

const PAGES: Record<string, { title: string; desc: string; image?: string }> = {
  '/': { title: DEFAULT_TITLE, desc: DEFAULT_DESC, image: '/photos/festival-crowd-night-green.webp' },
  '/about': { title: 'About | MSB Events', desc: 'MSB Events puts on the Matjhabeng Blow festivals, activations and the MSB Fun Walk & Family Day in Welkom, Free State.', image: '/photos/festival-crowd-day-stage.webp' },
  '/events': { title: 'Events | MSB Events', desc: 'Upcoming MSB events in Matjhabeng: festivals, activations and family days. See dates, line-ups and tickets.', image: '/photos/summerblow-field-blue-sky.webp' },
  '/gallery': { title: 'Gallery | MSB Events', desc: 'Photos and posters from MSB Events: Spring Blow, Soulful Blow, Summer Blow, Spin Blow and the MSB Fun Walk.', image: '/photos/festival-aerial-night.webp' },
  '/vendors': { title: 'Become a vendor | MSB Events', desc: 'Sell food, drinks, clothing or services at an MSB event. Apply for a stall online.', image: '/photos/festival-crowd-chairs.webp' },
  '/terms': { title: 'Terms | MSB Events', desc: 'Terms for buying tickets and attending MSB events.' },
  '/privacy': { title: 'Privacy | MSB Events', desc: 'How MSB Events handles your personal information under POPIA.' },
  '/cookies': { title: 'Cookies | MSB Events', desc: 'The browser storage MSB Events uses and why.' },
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** JSON inside a script tag: stop "</script>" (and other HTML) from closing it early. */
const jsonLd = (o: unknown) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;
const clip = (s: string, n = 160) => (s.length <= n ? s : `${s.slice(0, n - 1).replace(/\s+\S*$/, '')}…`);

function eventLd(e: MsbEvent, url: string, image: string, site: string) {
  const types = (e.ticketTypes ?? []).filter((t) => t.capacity > 0);
  const offers =
    e.sellMode === 'site' && types.length
      ? types.map((t) => ({
          '@type': 'Offer',
          name: t.name,
          price: t.price,
          priceCurrency: 'ZAR',
          url,
          availability: t.comingSoon
            ? 'https://schema.org/PreOrder'
            : t.sold >= t.capacity
              ? 'https://schema.org/SoldOut'
              : 'https://schema.org/InStock',
        }))
      : undefined;
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: e.title,
    startDate: e.startsAt,
    ...(e.endsAt ? { endDate: e.endsAt } : {}),
    eventStatus: e.status === 'cancelled' ? 'https://schema.org/EventCancelled' : 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: e.venue,
      address: { '@type': 'PostalAddress', streetAddress: e.address || e.venue, addressLocality: e.town, addressRegion: 'Free State', addressCountry: 'ZA' },
    },
    image: [image],
    description: e.description,
    ...(e.is18Plus ? { typicalAgeRange: '18-' } : {}),
    ...(e.lineup.length ? { performer: e.lineup.map((l) => ({ '@type': 'PerformingGroup', name: l.name })) } : {}),
    organizer: { '@type': 'Organization', name: SITE_NAME, url: site },
    ...(offers ? { offers } : {}),
  };
}

/** `route` is without the base path. `site` is the full site address with base, no trailing slash. */
export function headFor(route: string, site: string): { title: string; html: string } {
  const abs = (p: string) => (/^https?:\/\//.test(p) ? p : site + p);
  const url = site + (route === '/' ? '/' : `${route}/`);
  let title = DEFAULT_TITLE;
  let desc = DEFAULT_DESC;
  let image = abs('/icon-512.png');
  let type = 'website';
  const ld: unknown[] = [];

  const ev = route.startsWith('/events/') ? STATIC_EVENTS.find((e) => `/events/${e.id}` === route) : undefined;
  if (ev) {
    title = `${ev.title} | MSB Events`;
    desc = clip(ev.description || `${ev.title} in ${ev.town}.`);
    const poster = posterSrc(ev.poster, 'jpg');
    if (poster) image = abs(poster.replace(/^.*?(\/posters\/)/, '$1'));
    type = 'article';
    ld.push(eventLd(ev, url, image, site));
  } else if (PAGES[route]) {
    ({ title, desc } = PAGES[route]);
    if (PAGES[route].image) image = abs(PAGES[route].image!);
  }
  if (route === '/') {
    ld.push({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: SITE_NAME,
      url: `${site}/`,
      logo: abs('/icon-512.png'),
      sameAs: [FACEBOOK],
      address: { '@type': 'PostalAddress', addressLocality: 'Welkom', addressRegion: 'Free State', addressCountry: 'ZA' },
    });
  }

  const tags = [
    // Home: start fetching the first slideshow photo straight away (it is the biggest thing on screen).
    ...(route === '/' ? (() => { const h = heroImg(HERO_SLIDES[0].src); return [`<link rel="preload" as="image" href="${esc(h.src)}" imagesrcset="${esc(h.srcSet ?? '')}" imagesizes="100vw" fetchpriority="high" />`]; })() : []),
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:type" content="${type}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(desc)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta property="og:locale" content="en_ZA" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    ...ld.map(jsonLd),
  ];
  return { title, html: [`<meta name="description" content="${esc(desc)}" />`, ...tags].join('\n    ') };
}

export const SITE_DEFAULT_DESC = DEFAULT_DESC;
