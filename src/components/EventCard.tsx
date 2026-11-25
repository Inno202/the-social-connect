import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { Poster } from './Poster';
import { isPast, priceFrom } from '../lib/eventState';
import { longDate, dateRange, rands } from '../lib/format';
import type { MsbEvent } from '../lib/types';

/** Cards side by side share one height: fixed-ratio poster, then a flex column with the price pushed down. */
export function EventCard({ event, eager = false }: { event: MsbEvent; eager?: boolean }) {
  const past = isPast(event);
  const price = priceFrom(event, rands);
  const place = [event.venue || 'Venue to be announced', event.town].filter(Boolean).join(', ');
  return (
    <Link to={`/events/${event.id}`} className="group lift flex flex-col h-full panel overflow-hidden" data-card>
      <div className="relative aspect-[4/5] overflow-hidden bg-mist shrink-0">
        <div className="photo-zoom w-full h-full">
          <Poster event={event} eager={eager} />
        </div>
        {event.status === 'cancelled' && <span className="pill absolute top-3 left-3 bg-danger text-white">Cancelled</span>}
        {past && event.status !== 'cancelled' && <span className="pill absolute top-3 left-3 bg-ink text-white">Past</span>}
      </div>
      <div className="p-5 flex flex-col flex-1 min-w-0">
        <p className="text-sm font-semibold text-leaf-deep num">{event.endsAt ? dateRange(event.startsAt, event.endsAt) : longDate(event.startsAt)}</p>
        <h3 className="t-card mt-1.5 line-clamp-2">{event.title}</h3>
        <p className="mt-2 flex items-start gap-1.5 text-sm text-ink-soft min-w-0">
          <MapPin className="size-4 mt-0.5 shrink-0" aria-hidden />
          <span className="line-clamp-1 break-any">{place}</span>
        </p>
        <p className="mt-auto pt-3 font-bold num min-h-[2.25rem]">{price && !past ? price : ''}</p>
      </div>
    </Link>
  );
}

export function EventCardSkeleton() {
  return (
    <div className="panel overflow-hidden" aria-hidden>
      <div className="aspect-[4/5] bg-mist animate-pulse" />
      <div className="p-5 space-y-3">
        <div className="h-4 w-32 bg-mist rounded animate-pulse" />
        <div className="h-7 w-3/4 bg-mist rounded animate-pulse" />
        <div className="h-4 w-1/2 bg-mist rounded animate-pulse" />
      </div>
    </div>
  );
}
