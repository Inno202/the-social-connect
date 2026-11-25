import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHero } from '../components/Layout';
import { EventCard, EventCardSkeleton } from '../components/EventCard';
import { useEvents } from '../lib/data';
import { CHIPS, filterEvents, type Chip } from '../lib/eventState';
import { useTitle } from '../lib/useTitle';

const EMPTY: Record<Chip, string> = {
  upcoming: 'No upcoming events right now',
  festival: 'No festivals coming up right now',
  activation: 'No activations coming up right now',
  family: 'No family events coming up right now',
  past: 'No past events yet',
};

export default function Events() {
  useTitle('Events');
  const [params, setParams] = useSearchParams();
  const chip = (CHIPS.find((c) => c.id === params.get('show'))?.id ?? 'upcoming') as Chip;
  const label = CHIPS.find((c) => c.id === chip)!.label;
  const { events, loading } = useEvents();
  const list = useMemo(() => (events ? filterEvents(events, chip) : []), [events, chip]);

  return (
    <>
      <PageHero title="Events" />
      <div className="wrap py-12 md:py-16">
        <div role="group" aria-label="Show events" className="even-row [--even-min:7rem]" data-chips>
          {CHIPS.map((c) => (
            <button
              key={c.id}
              type="button"
              className="btn btn-chip"
              aria-pressed={chip === c.id}
              onClick={() => setParams(c.id === 'upcoming' ? {} : { show: c.id }, { replace: true })}
            >
              {c.label}
            </button>
          ))}
        </div>
        <h2 className="sr-only">{label} events</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" data-card-grid>
          {loading && [0, 1, 2].map((n) => <EventCardSkeleton key={n} />)}
          {list.map((e, n) => <EventCard key={e.id} event={e} eager={n < 2} />)}
        </div>
        {!loading && list.length === 0 && (
          <div className="mt-8 panel p-8">
            <h3 className="t-card">{EMPTY[chip]}</h3>
            <p className="mt-2 text-ink-soft">New dates are added here as soon as they are announced.</p>
          </div>
        )}
      </div>
    </>
  );
}
