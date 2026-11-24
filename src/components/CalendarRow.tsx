import { Link } from 'react-router-dom';
import { dayMonth } from '../lib/format';
import { isPast } from '../lib/eventState';
import type { MsbEvent } from '../lib/types';

/** "Save the dates": the year's events as a clean row of date cards (month, name, date). */
export function CalendarRow({ events }: { events: MsbEvent[] }) {
  return (
    <ol className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {events.map((e) => {
        const d = dayMonth(e.startsAt);
        const past = isPast(e);
        return (
          <li key={e.id}>
            <Link
              to={`/events/${e.id}`}
              className={`group lift flex flex-col h-full rounded-3xl border-2 overflow-hidden ${past ? 'border-line bg-white' : 'border-ink bg-white'}`}
            >
              <span className={`eyebrow px-4 py-2.5 ${past ? 'bg-mist text-ink-soft' : 'bg-ink text-lime'}`}>{d.month}</span>
              <span className="flex-1 flex flex-col justify-between gap-3 px-4 pt-4 pb-4">
                <span className="display text-[1.55rem] leading-[0.92]">{e.shortTitle}</span>
                <span className="flex items-center justify-between gap-2">
                  <span className="display text-xl num">{d.day} {d.monthShort}</span>
                  {past && <span className="text-xs font-semibold text-ink-soft">Past</span>}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
