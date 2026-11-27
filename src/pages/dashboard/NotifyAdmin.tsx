import { useEffect, useMemo, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, type Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useEvents } from '../../lib/data';
import { shortDate } from '../../lib/format';
import { Skeleton, Spinner, confirmAction, toast } from '../../components/ui';
import { logActivity } from '../../lib/activity';
import { csvCell } from './Reports';

interface Entry { id: string; uid: string; eventId: string; email: string; name: string; createdAt: Timestamp | null }

/** People who asked to be told when tickets go on sale, per event, with a CSV export for messaging them. */
export default function NotifyAdmin() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const { events } = useEvents({ includeDrafts: true });
  const [eventId, setEventId] = useState('');
  const [clearing, setClearing] = useState(false);
  useEffect(() => {
    if (!db) return;
    return onSnapshot(collection(db, 'notify'), (s) =>
      setEntries(s.docs.map((d) => ({ id: d.id, ...(d.data({ serverTimestamps: 'estimate' }) as Omit<Entry, 'id'>) })).sort((a, b) => (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0))),
    () => setEntries([]));
  }, []);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    (entries ?? []).forEach((e) => m.set(e.eventId, (m.get(e.eventId) ?? 0) + 1));
    return m;
  }, [entries]);
  const withEntries = (events ?? []).filter((e) => counts.has(e.id));
  const current = eventId || withEntries[0]?.id || '';
  const list = (entries ?? []).filter((e) => e.eventId === current);
  const ev = events?.find((e) => e.id === current);

  function exportCsv() {
    if (!ev) return;
    const rows = [['Name', 'Email', 'Added'], ...list.map((e) => [e.name, e.email, e.createdAt ? new Date(e.createdAt.toMillis()).toISOString() : ''])];
    const url = URL.createObjectURL(new Blob(['﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `notify-${ev.id}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    void logActivity('Exported notify list', ev.title, `${list.length} people`);
  }

  async function clearList() {
    if (!db || !ev) return;
    const ok = await confirmAction({ title: 'Clear this list?', message: `Remove all ${list.length} people from the ${ev.title} notify list. Do this after you have told them tickets are on sale. Export it first if you still need it.`, confirmLabel: 'Clear list', tone: 'danger' });
    if (!ok) return;
    setClearing(true);
    try {
      for (const e of list) await deleteDoc(doc(db, 'notify', e.id));
      await logActivity('Cleared notify list', ev.title, `${list.length} people`);
      toast('List cleared.');
    } catch { toast('The list could not be cleared completely. Try again.', 'error'); } finally { setClearing(false); }
  }

  if (!entries) return <Skeleton className="h-40" />;
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="t-section">Notify lists</h2>
          <p className="text-ink-soft mt-1">People who asked to hear when tickets go on sale. Message them yourself when you open sales.</p>
        </div>
        {withEntries.length > 0 && (
          <div className="w-full sm:w-80">
            <label htmlFor="nt-ev" className="field-label">Event</label>
            <select id="nt-ev" className="field" value={current} onChange={(e) => setEventId(e.target.value)}>
              {withEntries.map((e) => <option key={e.id} value={e.id}>{e.title} · {shortDate(e.startsAt)} ({counts.get(e.id)})</option>)}
            </select>
          </div>
        )}
      </div>
      {withEntries.length === 0 ? (
        <p className="text-ink-soft">Nobody has asked yet. The button shows on events whose tickets are coming soon.</p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-4">
            <p className="font-bold num">{list.length} {list.length === 1 ? 'person' : 'people'}</p>
            <div className="flex gap-2">
              <button type="button" className="btn btn-outline" onClick={exportCsv}>Export CSV</button>
              <button type="button" className="btn btn-danger" disabled={clearing} onClick={clearList}>{clearing && <Spinner label="Clearing" />} Clear list</button>
            </div>
          </div>
          <ul className="panel divide-y divide-line">
            {list.map((e) => (
              <li key={e.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1 min-w-0">
                <span className="font-semibold break-any">{e.name}</span>
                <span className="text-sm text-ink-soft break-any">{e.email}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
