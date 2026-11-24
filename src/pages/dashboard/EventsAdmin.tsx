import { Link, useNavigate } from 'react-router-dom';
import { Copy, Pencil, Plus, XCircle } from 'lucide-react';
import { useEvents } from '../../lib/data';
import { isPast } from '../../lib/eventState';
import { shortDate } from '../../lib/format';
import { Poster } from '../../components/Poster';
import { Skeleton, confirmAction, toast } from '../../components/ui';
import { duplicateEvent, setEventStatus } from './adminData';

const SELL: Record<string, string> = { site: 'Sold here', external: 'Outside link', none: 'Not on sale' };

export default function EventsAdmin() {
  const { events, loading } = useEvents({ includeDrafts: true });
  const nav = useNavigate();
  const list = [...(events ?? [])].sort((a, b) => b.startsAt.localeCompare(a.startsAt));

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <h2 className="display text-4xl">Events</h2>
        <Link to="new" className="btn btn-primary"><Plus className="size-4 text-lime" aria-hidden /> New event</Link>
      </div>
      {loading && <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>}
      <ul className="space-y-3">
        {list.map((e) => {
          const past = isPast(e);
          return (
            <li key={e.id} className="panel p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
              <div className="size-16 rounded-2xl overflow-hidden bg-mist shrink-0"><Poster event={e} size="sm" /></div>
              <div className="flex-1 min-w-0">
                <p className="font-bold line-clamp-1">{e.title}</p>
                <p className="text-sm text-ink-soft num">{shortDate(e.startsAt)} · {SELL[e.sellMode]}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {e.status !== 'published' && <span className={`pill ${e.status === 'cancelled' ? 'bg-danger text-white' : 'bg-mist text-ink'}`}>{e.status === 'draft' ? 'Draft' : 'Cancelled'}</span>}
                  {past && <span className="pill bg-mist text-ink">Past</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Link to={e.id} className="icon-btn hover:bg-mist" aria-label={`Edit ${e.title}`}><Pencil className="size-4" aria-hidden /></Link>
                <button
                  type="button"
                  className="icon-btn hover:bg-mist"
                  aria-label={`Duplicate ${e.title}`}
                  onClick={async () => {
                    try { const id = await duplicateEvent(e); toast('Event duplicated as a draft.'); nav(id); } catch { toast('The event could not be duplicated.', 'error'); }
                  }}
                >
                  <Copy className="size-4" aria-hidden />
                </button>
                {e.status !== 'cancelled' && !past && (
                  <button
                    type="button"
                    className="icon-btn text-danger hover:bg-danger/10"
                    aria-label={`Cancel ${e.title}`}
                    onClick={async () => {
                      const ok = await confirmAction({ title: `Cancel ${e.shortTitle}?`, message: 'The event page will show it as cancelled and its tickets can no longer be scanned in.', confirmLabel: 'Cancel event', tone: 'danger' });
                      if (!ok) return;
                      try { await setEventStatus(e, 'cancelled'); toast('Event cancelled.'); } catch { toast('The event could not be cancelled.', 'error'); }
                    }}
                  >
                    <XCircle className="size-4" aria-hidden />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
