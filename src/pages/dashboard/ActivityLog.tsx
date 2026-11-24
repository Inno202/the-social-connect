import { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query, type Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Skeleton } from '../../components/ui';

interface Entry { id: string; actorName: string; action: string; target: string; detail: string; at: Timestamp | null }

export default function ActivityLog() {
  const [rows, setRows] = useState<Entry[] | null>(null);
  useEffect(() => {
    if (!db) return;
    return onSnapshot(query(collection(db, 'activity'), orderBy('at', 'desc'), limit(150)), (s) => setRows(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Entry, 'id'>) }))), () => setRows([]));
  }, []);
  return (
    <div className="space-y-6">
      <h2 className="display text-4xl">Activity</h2>
      {!rows && <Skeleton className="h-60" />}
      {rows && rows.length === 0 && <p className="text-ink-soft">No staff activity yet.</p>}
      <ol className="panel divide-y divide-line">
        {rows?.map((r) => (
          <li key={r.id} className="p-4 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
            <span className="text-sm text-ink-soft num sm:w-44 shrink-0">{r.at ? r.at.toDate().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg', dateStyle: 'medium', timeStyle: 'short' }) : 'Just now'}</span>
            <span className="min-w-0"><strong>{r.actorName}</strong> {r.action.toLowerCase()}: {r.target} <span className="text-ink-soft break-all">{r.detail}</span></span>
          </li>
        ))}
      </ol>
    </div>
  );
}
