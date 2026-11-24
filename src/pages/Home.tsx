import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { HeroSlideshow } from '../components/HeroSlideshow';
import { EventCard, EventCardSkeleton } from '../components/EventCard';
import { CalendarRow } from '../components/CalendarRow';
import { useEvents, useGallery, posterSrc } from '../lib/data';
import { filterEvents } from '../lib/eventState';
import { CALENDAR_2026, HERO_SLIDES, PARTNERS } from '../data/site';
import { useTitle } from '../lib/useTitle';

function SectionHead({ title, accent, to, linkLabel }: { title: string; accent: string; to?: string; linkLabel?: string }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-8">
      <h2 className="display text-5xl sm:text-6xl">
        {title} <span className="text-leaf">{accent}</span>
      </h2>
      {to && (
        <Link to={to} className="hidden sm:inline-flex btn btn-outline shrink-0">
          {linkLabel} <ArrowRight className="size-4 btn-arrow" aria-hidden />
        </Link>
      )}
    </div>
  );
}

export default function Home() {
  useTitle('');
  const { events, loading } = useEvents();
  const gallery = useGallery();
  const upcoming = useMemo(() => (events ? filterEvents(events, 'upcoming') : []), [events]);
  const calendar = useMemo(
    () => CALENDAR_2026.map((id) => events?.find((e) => e.id === id)).filter((e): e is NonNullable<typeof e> => Boolean(e)),
    [events],
  );

  return (
    <>
      <HeroSlideshow slides={HERO_SLIDES} />

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 md:pt-24" aria-labelledby="upcoming">
        <div id="upcoming"><SectionHead title="Upcoming" accent="events" to="/events" linkLabel="All events" /></div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {loading && [0, 1, 2].map((n) => <EventCardSkeleton key={n} />)}
          {upcoming.slice(0, 6).map((e, n) => <EventCard key={e.id} event={e} eager={n < 2} />)}
        </div>
        {!loading && upcoming.length === 0 && <p className="text-ink-soft">No events on sale right now. New dates are added here as soon as they are announced.</p>}
        <Link to="/events" className="sm:hidden mt-6 btn btn-outline btn-block">All events <ArrowRight className="size-4 btn-arrow" aria-hidden /></Link>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 md:pt-28" aria-labelledby="calendar">
        <div id="calendar"><SectionHead title="The MSB calendar" accent="2026" /></div>
        {calendar.length > 0 ? <CalendarRow events={calendar} /> : <div className="h-40 rounded-3xl bg-mist animate-pulse" />}
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 md:pt-28">
        <div className="rounded-[2rem] bg-ink text-white p-8 sm:p-12 md:p-16 grid gap-8 md:grid-cols-[1.2fr_1fr] items-end">
          <h2 className="display text-5xl sm:text-7xl">
            Made in <span className="text-lime">Matjhabeng</span>
          </h2>
          <div>
            <p className="text-white/85 text-lg max-w-[46ch]">
              MSB Events is the team from Welkom in the Free State behind the Blow festivals, the MSB Fun Walk & Family Day and
              MSB Comedy Night. 2026 marks more than 5 years of MSB Events.
            </p>
            <Link to="/about" className="btn btn-lime mt-6">About MSB Events <ArrowRight className="size-4 btn-arrow" aria-hidden /></Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 md:pt-28" aria-labelledby="gallery-teaser">
        <div id="gallery-teaser"><SectionHead title="The" accent="gallery" to="/gallery" linkLabel="Open the gallery" /></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(gallery ?? []).slice(0, 4).map((g) => (
            <Link key={g.id} to="/gallery" className="group frame aspect-square block">
              <img src={posterSrc(g.src, 'sm')} alt={g.alt} loading="lazy" className="photo-zoom w-full h-full object-cover" />
            </Link>
          ))}
          {!gallery && [0, 1, 2, 3].map((n) => <div key={n} className="aspect-square rounded-3xl bg-mist animate-pulse" />)}
        </div>
        <Link to="/gallery" className="sm:hidden mt-6 btn btn-outline btn-block">Open the gallery <ArrowRight className="size-4 btn-arrow" aria-hidden /></Link>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 md:pt-28" aria-labelledby="partners">
        <h2 id="partners" className="display text-4xl sm:text-5xl mb-6">Our <span className="text-leaf">partners</span></h2>
        <ul className="flex flex-wrap gap-2">
          {PARTNERS.map((p) => (
            <li key={p} className="rounded-full border border-line px-4 py-2.5 text-sm font-semibold">{p}</li>
          ))}
        </ul>
      </section>
    </>
  );
}
