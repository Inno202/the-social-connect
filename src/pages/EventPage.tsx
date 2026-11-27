import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, Expand, MapPin } from 'lucide-react';
import { Poster } from '../components/Poster';
import { PhotoViewer } from '../components/PhotoViewer';
import { AgeNotice } from '../components/Layout';
import { Skeleton } from '../components/ui';
import { useEvent, posterImg } from '../lib/data';
import { canBuyOnSite, isPast } from '../lib/eventState';
import { dateRange, longDate, randsPlain } from '../lib/format';
import { CATEGORY_LABEL, type MsbEvent } from '../lib/types';
import { useTitle } from '../lib/useTitle';
import { addressLine, mapLink } from '../lib/place';
import { Countdown } from '../components/Countdown';
import { EventActions } from '../components/EventActions';
import { NotifyMe } from '../components/NotifyMe';
import NotFound from './NotFound';

const TABS = ['Info', 'Line up', 'Venue'] as const;
type Tab = (typeof TABS)[number];

function initials(name: string) {
  return name.replace(/[^A-Za-z0-9 &]/g, '').split(/\s+/).filter((w) => w && w !== '&').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

export { addressLine, mapLink } from '../lib/place';

function LineUp({ event }: { event: MsbEvent }) {
  const [all, setAll] = useState(false);
  if (event.lineup.length === 0) return <p className="text-ink-soft">The line-up will be announced.</p>;
  const groups: { name: string; items: typeof event.lineup }[] = [];
  event.lineup.forEach((a) => {
    const g = a.group ?? '';
    let grp = groups.find((x) => x.name === g);
    if (!grp) groups.push((grp = { name: g, items: [] }));
    grp.items.push(a);
  });
  const LIMIT = 12;
  let shown = 0;
  const hidden = Math.max(0, event.lineup.length - LIMIT);
  return (
    <div className="space-y-8">
      {groups.map((g) => {
        const items = all ? g.items : g.items.slice(0, Math.max(0, LIMIT - shown));
        shown += items.length;
        if (items.length === 0) return null;
        return (
          <section key={g.name}>
            {g.name && <h3 className="eyebrow text-ink-soft mb-4">{g.name}</h3>}
            <ul className="grid grid-cols-3 sm:grid-cols-4 gap-x-3 gap-y-5">
              {items.map((a) => {
                const photo = a.photo ? posterImg(a.photo) : null;
                return (
                  <li key={a.name} className="flex flex-col items-center text-center gap-2 min-w-0">
                    {photo ? (
                      <img src={photo.src} srcSet={photo.srcSet} sizes="80px" width={80} height={80} alt="" className="size-20 rounded-full object-cover bg-mist" loading="lazy" />
                    ) : (
                      <span className="size-20 rounded-full bg-ink text-lime grid place-items-center display text-2xl" aria-hidden>{initials(a.name)}</span>
                    )}
                    <span className="text-sm font-semibold leading-tight break-any">{a.name}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      {!all && hidden > 0 && (
        <button type="button" className="btn btn-outline btn-block" onClick={() => setAll(true)}>
          {hidden} more
        </button>
      )}
    </div>
  );
}

export function BuyButton({ event }: { event: MsbEvent }) {
  if (event.status === 'cancelled') return <p className="status-bar status-bar-danger" role="status">This event was cancelled</p>;
  if (isPast(event)) return <p className="status-bar" role="status">This event is over</p>;
  if (event.sellMode === 'external' && event.externalUrl)
    return (
      <a href={event.externalUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-lg btn-block">
        Buy on {event.externalSeller || 'the seller’s site'} <ArrowUpRight className="btn-arrow text-lime" aria-hidden />
      </a>
    );
  // Every release on this site still marked "coming soon": nothing to buy yet, so offer the notify list instead.
  const sellable = (event.ticketTypes ?? []).filter((t) => t.capacity > 0);
  const allSoon = sellable.length > 0 && sellable.every((t) => t.comingSoon);
  if (canBuyOnSite(event) && !allSoon)
    return (
      <Link to={`/events/${event.id}/tickets`} className="btn btn-primary btn-lg btn-block">
        {(event.ticketTypes ?? []).every((t) => t.price === 0) ? 'Get free tickets' : 'Buy tickets'} <ArrowRight className="btn-arrow text-lime" aria-hidden />
      </Link>
    );
  return (
    <div className="space-y-3">
      <p className="status-bar" role="status">Tickets coming soon</p>
      {event.sellMode === 'site' && event.status === 'published' && <NotifyMe event={event} />}
    </div>
  );
}

export default function EventPage() {
  const { id } = useParams();
  const { event, loading } = useEvent(id);
  const [tab, setTab] = useState<Tab>('Info');
  const [viewer, setViewer] = useState(false);
  useTitle(event?.title ?? 'Event');

  if (event === null) return <NotFound />;
  if (!event)
    return (
      <div className="wrap py-10 grid gap-8 md:grid-cols-2" role="status" aria-label="Loading event">
        <Skeleton className="aspect-[4/5] rounded-[var(--radius-xl)]" />
        <div className="space-y-4"><Skeleton className="h-32" /><Skeleton className="h-28" /><Skeleton className="h-14" /></div>
      </div>
    );

  const map = mapLink(event);
  const place = event.venue || 'Venue to be announced';
  const img = posterImg(event.poster);

  return (
    <div className="wrap max-w-6xl py-6 md:py-10">
      <Link to="/events" className="inline-flex items-center gap-2 min-h-[44px] text-sm font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> All events
      </Link>
      <div className="mt-3 grid gap-6 md:gap-10 md:grid-cols-2 items-start">
        <div className="md:sticky md:top-24 min-w-0">
          {img ? (
            <button type="button" onClick={() => setViewer(true)} className="tap-card zoomable group relative frame" aria-label="Open the poster full screen">
              <img src={img.src} srcSet={img.srcSet} sizes="(min-width: 768px) 560px, 100vw" width={img.width} height={img.height} alt={`${event.title} poster`} className="w-full h-auto block" {...{ fetchpriority: 'high' }} />
              <span className="zoom-hint icon-btn icon-btn-glass absolute top-3 right-3" aria-hidden><Expand /></span>
            </button>
          ) : (
            <div className="frame aspect-[4/5]"><Poster event={event} eager /></div>
          )}
        </div>

        <div className="space-y-4 min-w-0">
          <section className="panel p-6">
            <span className="pill bg-ink text-lime">{CATEGORY_LABEL[event.category]}</span>
            <h1 className="display text-4xl sm:text-5xl text-leaf mt-3">{event.title}</h1>
            {event.status !== 'cancelled' && <Countdown to={event.startsAt} className="mt-4" />}
          </section>

          <section className="panel p-6 space-y-5" aria-label="When and where">
            <div className="flex gap-4">
              <span className="size-11 rounded-full bg-mist grid place-items-center shrink-0"><CalendarDays className="size-5" aria-hidden /></span>
              <div className="min-w-0">
                <p className="font-bold num">{event.endsAt ? dateRange(event.startsAt, event.endsAt) : longDate(event.startsAt)}</p>
                <p className="text-ink-soft text-sm num">
                  {event.timeTbc ? 'Times to be announced' : event.gatesOpen ? `Gates open ${event.gatesOpen}` : `Starts ${new Date(event.startsAt).toLocaleTimeString('en-ZA', { timeZone: 'Africa/Johannesburg', hour: '2-digit', minute: '2-digit', hour12: false })}`}
                  {!event.timeTbc && ' (SAST)'}
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="size-11 rounded-full bg-mist grid place-items-center shrink-0"><MapPin className="size-5" aria-hidden /></span>
              <div className="min-w-0">
                <p className="font-bold break-any">{place}</p>
                <p className="text-ink-soft text-sm break-any">{addressLine(event)}</p>
              </div>
            </div>
          </section>

          <BuyButton event={event} />
          {event.gatePrice != null && !isPast(event) && (
            <p className="text-sm text-ink-soft text-center num">At the gate {randsPlain(event.gatePrice)}. Gate tickets are not sold online.</p>
          )}
          {loading && <Skeleton className="h-6 w-40 mx-auto" />}
          {!isPast(event) && event.status !== 'cancelled' && <EventActions event={event} />}

          <div className="pt-4">
            <div role="tablist" aria-label="Event details" className="even-cols">
              {TABS.map((t) => (
                <button
                  key={t}
                  role="tab"
                  id={`tab-${t}`}
                  aria-selected={tab === t}
                  aria-controls={`panel-${t}`}
                  tabIndex={tab === t ? 0 : -1}
                  className="btn btn-chip"
                  onClick={() => setTab(t)}
                  onKeyDown={(e) => {
                    const i = TABS.indexOf(t);
                    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                      const next = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length];
                      setTab(next);
                      document.getElementById(`tab-${next}`)?.focus();
                    }
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
            <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="panel p-6 mt-4">
              {tab === 'Info' && (
                <div className="space-y-6">
                  <p className="whitespace-pre-line prose-w">{event.description}</p>
                  {event.is18Plus && <div className="rounded-2xl bg-ink text-white p-4"><AgeNotice /></div>}
                  {event.houseRules.length > 0 && (
                    <div>
                      <h2 className="eyebrow text-ink-soft">House rules</h2>
                      <ul className="mt-2 list-disc pl-5 space-y-1">{event.houseRules.map((r) => <li key={r}>{r}</li>)}</ul>
                    </div>
                  )}
                  {event.amenities.length > 0 && (
                    <div>
                      <h2 className="eyebrow text-ink-soft">Available</h2>
                      <ul className="mt-2 list-disc pl-5 space-y-1">{event.amenities.map((r) => <li key={r}>{r}</li>)}</ul>
                    </div>
                  )}
                  <div>
                    <h2 className="eyebrow text-ink-soft">Refunds</h2>
                    <p className="mt-2 text-ink-soft">
                      {event.refundPolicy ||
                        (event.sellMode === 'external'
                          ? `Tickets bought on ${event.externalSeller || 'an outside site'} fall under that seller's own terms and refund policy.`
                          : 'MSB Events will publish its refund policy before tickets are sold for money on this site. See the Terms.')}
                    </p>
                    <Link to="/terms#refunds" className="link text-sm inline-flex min-h-[44px] items-center">Read the refund policy</Link>
                  </div>
                </div>
              )}
              {tab === 'Line up' && <LineUp event={event} />}
              {tab === 'Venue' && (
                <div className="space-y-3">
                  <p className="font-bold break-any">{place}</p>
                  <p className="text-ink-soft break-any">{addressLine(event)}</p>
                  {map ? (
                    <a href={map} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
                      Open in Google Maps <ArrowUpRight className="btn-arrow" aria-hidden />
                    </a>
                  ) : (
                    <p className="text-ink-soft">The venue will be announced.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {viewer && img && <PhotoViewer photos={[{ src: img.src, srcSet: img.srcSet, alt: `${event.title} poster` }]} index={0} onIndex={() => undefined} onClose={() => setViewer(false)} />}
    </div>
  );
}
