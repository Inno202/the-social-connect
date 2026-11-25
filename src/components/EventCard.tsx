import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { Poster } from './Poster';
import { isPast, priceFrom } from '../lib/eventState';
import { longDate, dateRange, rands, shortDate } from '../lib/format';
import type { MsbEvent } from '../lib/types';

/**
 * Cards side by side share one height: fixed-ratio poster, then a flex column with the price pushed down.
 * `compact` (home page): a square poster the same size as the gallery photos, with the details underneath.
 */
export function EventCard({ event, eager = false, compact = false }: { event: MsbEvent; eager?: boolean; compact?: boolean }) {
  const past = isPast(event);
  const price = priceFrom(event, rands);
  const place = [event.venue || 'Venue to be announced', event.town].filter(Boolean).join(', ');
  if (compact) {
    return (
      // The outline is a ring (it takes no space), so the poster is exactly the size of a gallery photo.
      <Link to={`/events/${event.id}`} className="group lift flex flex-col h-full bg-white rounded-[var(--radius-xl)] ring-1 ring-line overflow-hidden" data-card>
        <div className="relative aspect-square overflow-hidden bg-mist shrink-0">
          <div className="photo-zoom w-full h-full">
            <Poster event={event} eager={eager} sizes="(min-width: 768px) 25vw, 50vw" />
          </div>
          {event.status === 'cancelled' && <span className="pill absolute top-2 left-2 bg-danger text-white">Cancelled</span>}
        </div>
        <div className="p-3 sm:p-4 flex flex-col flex-1 min-w-0">
          <p className="text-sm font-semibold text-leaf-deep num">{shortDate(event.startsAt)}</p>
          <h3 className="mt-1 font-bold leading-snug line-clamp-2 break-any">{event.title}</h3>
          <p className="mt-1 text-sm text-ink-soft line-clamp-1 break-any">{place}</p>
          <p className="mt-auto pt-2 text-sm font-bold num min-h-[1.75rem]">{price && !past ? price : ''}</p>
        </div>
      </Link>
    );
  }
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

export function EventCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className="panel overflow-hidden" aria-hidden>
      <div className={`${compact ? 'aspect-square' : 'aspect-[4/5]'} bg-mist animate-pulse`} />
      <div className="p-5 space-y-3">
        <div className="h-4 w-32 bg-mist rounded animate-pulse" />
        <div className="h-7 w-3/4 bg-mist rounded animate-pulse" />
        <div className="h-4 w-1/2 bg-mist rounded animate-pulse" />
      </div>
    </div>
  );
}
