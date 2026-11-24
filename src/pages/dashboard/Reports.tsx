import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where, type Timestamp } from 'firebase/firestore';
import { Download } from 'lucide-react';
import { db } from '../../lib/firebase';
import { useEvents } from '../../lib/data';
import { rands, randsPlain, shortDate } from '../../lib/format';
import { Skeleton } from '../../components/ui';
import { logActivity } from '../../lib/activity';
import type { Ticket } from '../../lib/types';

/** Stops spreadsheet formulas being smuggled in through names. */
export function csvCell(v: unknown): string {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function Reports() {
  const { events } = useEvents({ includeDrafts: true });
  const sold = useMemo(() => (events ?? []).filter((e) => e.sellMode === 'site').sort((a, b) => b.startsAt.localeCompare(a.startsAt)), [events]);
  const [eventId, setEventId] = useState('');
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  useEffect(() => { if (!eventId && sold[0]) setEventId(sold[0].id); }, [sold, eventId]);
  useEffect(() => {
    if (!db || !eventId) return;
    setTickets(null);
    return onSnapshot(query(collection(db, 'tickets'), where('eventId', '==', eventId)), (s) => setTickets(s.docs.map((d) => ({ ...(d.data() as Ticket), id: d.id }))), () => setTickets([]));
  }, [eventId]);

  const ev = sold.find((e) => e.id === eventId);
  const types = ev?.ticketTypes ?? [];
  const scanned = tickets?.filter((t) => t.status === 'used').length ?? 0;
  const value = types.reduce((n, t) => n + t.price * t.sold, 0);

  function exportCsv() {
    if (!tickets || !ev) return;
    const head = ['Holder', 'Ticket type', 'Seat', 'Status', 'Scanned at', 'Ticket code', 'Order'];
    const rows = tickets.map((t) => [t.holderName, t.typeName, t.seatLabel, t.status, t.usedAt ? new Date((t.usedAt as Timestamp).toMillis()).toISOString() : '', t.id, t.orderId]);
    const csv = [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendees-${ev.id}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    void logActivity('Exported attendees', ev.title, `${tickets.length} rows`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <h2 className="display text-4xl">Reports</h2>
        <div className="sm:w-80">
          <label htmlFor="rep-ev" className="field-label">Event</label>
          <select id="rep-ev" className="field" value={eventId} onChange={(e) => setEventId(e.target.value)}>
            {sold.map((e) => <option key={e.id} value={e.id}>{e.title} · {shortDate(e.startsAt)}</option>)}
          </select>
        </div>
      </div>
      {!ev && <p className="text-ink-soft">No events are sold on this site yet.</p>}
      {ev && (
        <>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            {[
              ['Tickets issued', tickets ? String(tickets.length) : '…'],
              ['Scanned in', tickets ? String(scanned) : '…'],
              ['Still to arrive', tickets ? String(tickets.filter((t) => t.status === 'valid').length) : '…'],
              ['Ticket value (not charged)', randsPlain(value)],
            ].map(([k, v]) => (
              <div key={k} className="panel p-5"><p className="text-sm text-ink-soft">{k}</p><p className="display text-4xl mt-1 num">{v}</p></div>
            ))}
          </div>
          <div className="panel p-5 overflow-x-auto">
            <table className="w-full text-sm num min-w-[520px]">
              <thead><tr className="text-left text-ink-soft"><th className="py-2 pr-3 font-semibold">Ticket type</th><th className="py-2 pr-3 font-semibold">Price</th><th className="py-2 pr-3 font-semibold">Sold</th><th className="py-2 pr-3 font-semibold">Allocation</th><th className="py-2 font-semibold">Tickets</th></tr></thead>
              <tbody>
                {types.map((t) => (
                  <tr key={t.id} className="border-t border-line">
                    <td className="py-2.5 pr-3 font-semibold">{t.group}: {t.name}</td>
                    <td className="py-2.5 pr-3">{rands(t.price)}</td>
                    <td className="py-2.5 pr-3">{t.sold}{t.seats > 1 ? ` tables` : ''}</td>
                    <td className="py-2.5 pr-3">{t.capacity}</td>
                    <td className="py-2.5">{t.sold * t.seats}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!tickets ? <Skeleton className="h-12 w-56" /> : (
            <button type="button" className="btn btn-primary" onClick={exportCsv} disabled={tickets.length === 0}>
              <Download className="size-4 text-lime" aria-hidden /> Export attendees (CSV)
            </button>
          )}
        </>
      )}
    </div>
  );
}
