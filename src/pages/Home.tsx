import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { HeroSlideshow } from '../components/HeroSlideshow';
import { EventCard, EventCardSkeleton } from '../components/EventCard';
import { CalendarRow } from '../components/CalendarRow';
import { useEvents, useGallery, posterImg } from '../lib/data';
import { filterEvents } from '../lib/eventState';
import { longDate } from '../lib/format';
import { CALENDAR_2026, HERO_SLIDES, PARTNERS } from '../data/site';
import { useTitle } from '../lib/useTitle';

function SectionHead({ id, title, accent, to, linkLabel }: { id: string; title: string; accent: string; to?: string; linkLabel?: string }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-8">
      <h2 id={id} className="t-section">
        {title} <span className="text-leaf">{accent}</span>
      </h2>
      {to && (
        <Link to={to} className="hidden sm:inline-flex btn btn-outline shrink-0">
          {linkLabel} <ArrowRight className="btn-arrow" aria-hidden />
        </Link>
      )}
    </div>
  );
}

export default function Home() {
  useTitle('');
  const { events, loading } = useEvents();
  const gallery = useGallery();
  // Teaser: four event photos (posters already show in the events grid above).
  const teaser = useMemo(() => {
    const all = gallery ?? [];
    const photos = all.filter((g) => g.src.includes('/photos/') || g.src.includes('/gallery/'));
    const pick = ['p-soulfulblow-2026-stage-day', 'p-festival-crowd-night-green', 'p-funwalk-2025-walkers-road', 'p-festival-performer-fist-night'];
    const chosen = pick.map((id) => photos.find((g) => g.id === id)).filter((g): g is NonNullable<typeof g> => !!g);
    return (chosen.length === 4 ? chosen : [...photos, ...all]).slice(0, 4);
  }, [gallery]);
  const upcoming = useMemo(() => (events ? filterEvents(events, 'upcoming') : []), [events]);
  const summer = events?.find((e) => e.id === 'summer-blow-2026');
  const summerImg = posterImg(summer?.poster || '/posters/summer-blow-2026');
  const calendar = useMemo(
    () => CALENDAR_2026.map((id) => events?.find((e) => e.id === id)).filter((e): e is NonNullable<typeof e> => Boolean(e)),
    [events],
  );

  return (
    <>
      <HeroSlideshow slides={HERO_SLIDES} />

      <section className="wrap pt-10 md:pt-12" aria-labelledby="upcoming">
        <SectionHead id="upcoming" title="Upcoming" accent="events" to="/events" linkLabel="All events" />
        {/* Same grid as the gallery below: the posters are exactly the size of the gallery photos. */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-card-grid>
          {loading && [0, 1, 2, 3].map((n) => <EventCardSkeleton key={n} compact />)}
          {upcoming.slice(0, 8).map((e) => <EventCard key={e.id} event={e} compact />)}
        </div>
        {!loading && upcoming.length === 0 && <p className="text-ink-soft prose-w">No events on sale right now. New dates are added here as soon as they are announced.</p>}
        <Link to="/events" className="sm:hidden mt-6 btn btn-outline btn-block">All events <ArrowRight className="btn-arrow" aria-hidden /></Link>
      </section>

      <section className="wrap pt-20 md:pt-28" aria-labelledby="calendar">
        <SectionHead id="calendar" title="The MSB calendar" accent="2026" />
        {calendar.length > 0 ? <CalendarRow events={calendar} /> : <div className="h-40 rounded-[var(--radius-xl)] bg-mist animate-pulse" />}
      </section>

      {/* Feature: the next big event. Only the name and date are known so far. */}
      <section className="wrap pt-20 md:pt-28" aria-labelledby="summer-blow">
        <div className="band p-6 sm:p-10 md:p-12 grid gap-8 md:grid-cols-[1.3fr_1fr] items-center [--pad:1rem]">
          <div className="min-w-0 order-2 md:order-1">
            <p className="eyebrow text-lime">{summer ? longDate(summer.startsAt) : 'Sat 26 December 2026'}</p>
            <h2 id="summer-blow" className="t-section mt-3">
              Matjhabeng <span className="text-lime">Summer Blow</span>
            </h2>
            <p className="mt-4 text-white/85 text-lg md:text-xl max-w-[30rem]">
              Summer Blow is back on 26 December 2026. Venue, times, line-up and tickets will be announced here first.
            </p>
            <div className="even-row [--even-min:11rem] mt-6">
              <Link to="/events/summer-blow-2026" className="btn btn-accent">See Summer Blow <ArrowRight className="btn-arrow" aria-hidden /></Link>
              <Link to="/vendors" className="btn btn-outline-light">Become a vendor</Link>
            </div>
          </div>
          <Link to="/events/summer-blow-2026" className="order-1 md:order-2 block rounded-[var(--radius-xl)] bg-white p-4 group" aria-label="Matjhabeng Summer Blow 2026">
            <div className="aspect-square r-in overflow-hidden">
              {summerImg && <img src={summerImg.src} srcSet={summerImg.srcSet} sizes="(min-width: 768px) 400px, 100vw" width={summerImg.width} height={summerImg.height} alt="Matjhabeng Summer Blow logo" loading="lazy" decoding="async" className="photo-zoom w-full h-full object-contain" />}
            </div>
          </Link>
        </div>
      </section>

      <section className="wrap pt-20 md:pt-28" aria-labelledby="gallery-teaser">
        <SectionHead id="gallery-teaser" title="The" accent="gallery" to="/gallery" linkLabel="Open the gallery" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {teaser.map((g) => {
            const img = posterImg(g.src);
            return (
              <Link key={g.id} to="/gallery" className="group frame aspect-square block">
                {img && <img src={img.src} srcSet={img.srcSet} sizes="(min-width: 768px) 25vw, 50vw" width={img.width} height={img.height} alt={g.alt} loading="lazy" decoding="async" className="photo-zoom w-full h-full object-cover" />}
              </Link>
            );
          })}
          {!gallery && [0, 1, 2, 3].map((n) => <div key={n} className="aspect-square rounded-[var(--radius-xl)] bg-mist animate-pulse" />)}
        </div>
        <Link to="/gallery" className="sm:hidden mt-6 btn btn-outline btn-block">Open the gallery <ArrowRight className="btn-arrow" aria-hidden /></Link>
      </section>

      <section className="wrap pt-20 md:pt-28" aria-labelledby="partners">
        <h2 id="partners" className="t-section mb-6">Our <span className="text-leaf">partners</span></h2>
        <ul className="even-row [--even-min:9rem]">
          {PARTNERS.map((p) => (
            <li key={p} className="rounded-full border border-line px-4 min-h-[44px] flex items-center justify-center text-center text-sm font-semibold">{p}</li>
          ))}
        </ul>
      </section>
    </>
  );
}
