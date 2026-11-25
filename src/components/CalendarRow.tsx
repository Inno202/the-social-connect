import { Link } from 'react-router-dom';
import { dayMonth } from '../lib/format';
import { isPast } from '../lib/eventState';
import type { MsbEvent } from '../lib/types';

/** "Save the dates": the year's events as a clean row of equal date cards (month, name, date). */
export function CalendarRow({ events }: { events: MsbEvent[] }) {
  return (
    <ol className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {events.map((e) => {
        const d = dayMonth(e.startsAt);
        const past = isPast(e);
        return (
          <li key={e.id} className="min-w-0">
            <Link to={`/events/${e.id}`} className={`group lift flex flex-col h-full rounded-[var(--radius-xl)] border-2 overflow-hidden bg-white ${past ? 'border-line' : 'border-ink'}`} data-card>
              <span className={`eyebrow px-4 py-2.5 ${past ? 'bg-mist text-ink-soft' : 'bg-ink text-lime'}`}>{d.month}</span>
              <span className="flex-1 flex flex-col justify-between gap-3 p-4 min-w-0">
                <span className="t-card break-any">{e.shortTitle}</span>
                <span className="flex items-baseline justify-between gap-2">
                  <span className="display text-xl num">{d.day} {d.monthShort}</span>
                  {past && <span className="text-sm font-semibold text-ink-soft">Past</span>}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
