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
  const { events, loading } = useEvents();
  const list = useMemo(() => (events ? filterEvents(events, chip) : []), [events, chip]);

  return (
    <>
      <PageHero title="Events" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <div role="group" aria-label="Show events" className="no-scrollbar flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-1">
          {CHIPS.map((c) => (
            <button
              key={c.id}
              type="button"
              className="chip"
              aria-pressed={chip === c.id}
              onClick={() => setParams(c.id === 'upcoming' ? {} : { show: c.id }, { replace: true })}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {loading && [0, 1, 2].map((n) => <EventCardSkeleton key={n} />)}
          {list.map((e, n) => <EventCard key={e.id} event={e} eager={n < 2} />)}
        </div>
        {!loading && list.length === 0 && (
          <div className="mt-8 panel p-8">
            <h2 className="display text-3xl">{EMPTY[chip]}</h2>
            <p className="mt-2 text-ink-soft">New dates are added here as soon as they are announced.</p>
          </div>
        )}
      </div>
    </>
  );
}
