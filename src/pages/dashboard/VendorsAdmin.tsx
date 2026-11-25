import { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, serverTimestamp, updateDoc, type Timestamp } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { useEvents } from '../../lib/data';
import { Skeleton, Spinner, toast } from '../../components/ui';
import { logActivity } from '../../lib/activity';
import { csvCell } from './Reports';
import { VENDOR_CATEGORIES } from '../Vendors';

interface Application {
  id: string; businessName: string; contactName: string; email: string; phone: string; category: string; description: string;
  events: string[]; anyEvent: boolean; needsPower: boolean; link: string; status: 'new' | 'approved' | 'declined'; createdAt: Timestamp | null;
}
type Filter = 'all' | 'new' | 'approved' | 'declined';
const LABEL: Record<Application['status'], string> = { new: 'New', approved: 'Approved', declined: 'Declined' };
const PILL: Record<Application['status'], string> = { new: 'bg-ink text-lime', approved: 'bg-ok text-white', declined: 'bg-mist text-ink' };
const cat = (k: string) => VENDOR_CATEGORIES.find(([c]) => c === k)?.[1] ?? k;

export default function VendorsAdmin() {
  const [apps, setApps] = useState<Application[] | null>(null);
  const [filter, setFilter] = useState<Filter>('new');
  const [busy, setBusy] = useState<string | null>(null);
  const { events } = useEvents({ includeDrafts: true });
  useEffect(() => {
    if (!db) return;
    return onSnapshot(collection(db, 'vendorApplications'), (s) =>
      setApps(s.docs.map((d) => ({ id: d.id, ...(d.data({ serverTimestamps: 'estimate' }) as Omit<Application, 'id'>) })).sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0))),
    () => setApps([]));
  }, []);
  const title = (id: string) => events?.find((e) => e.id === id)?.title ?? id;
  const counts = useMemo(() => ({ all: apps?.length ?? 0, new: apps?.filter((a) => a.status === 'new').length ?? 0, approved: apps?.filter((a) => a.status === 'approved').length ?? 0, declined: apps?.filter((a) => a.status === 'declined').length ?? 0 }), [apps]);
  const list = (apps ?? []).filter((a) => filter === 'all' || a.status === filter);

  async function decide(a: Application, status: Application['status']) {
    if (!db || !auth?.currentUser) return;
    setBusy(a.id + status);
    try {
      await updateDoc(doc(db, 'vendorApplications', a.id), { status, reviewedBy: auth.currentUser.uid, reviewedAt: serverTimestamp() });
      await logActivity(`Marked vendor ${status}`, a.businessName, a.id);
      toast(`${a.businessName}: ${LABEL[status].toLowerCase()}.`);
    } catch { toast('The application could not be updated.', 'error'); } finally { setBusy(null); }
  }

  function exportCsv() {
    const head = ['Received', 'Status', 'Business', 'Contact', 'Phone', 'Email', 'Sells', 'Electricity', 'Events', 'About', 'Link'];
    const rows = (apps ?? []).map((a) => [a.createdAt ? a.createdAt.toDate().toISOString() : '', a.status, a.businessName, a.contactName, a.phone, a.email, cat(a.category), a.needsPower ? 'Yes' : 'No', a.anyEvent ? 'Any upcoming event' : a.events.map(title).join('; '), a.description, a.link]);
    const csv = [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const el = document.createElement('a');
    el.href = url; el.download = 'vendor-applications.csv'; el.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    void logActivity('Exported vendor applications', 'Vendors', `${rows.length} rows`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="t-section">Vendors</h2>
        <button type="button" className="btn btn-outline shrink-0" onClick={exportCsv} disabled={!apps?.length}>Export CSV</button>
      </div>
      <div role="group" aria-label="Show applications" className="even-row [--even-min:7rem]" data-chips>
        {(['new', 'approved', 'declined', 'all'] as Filter[]).map((k) => (
          <button key={k} type="button" className="btn btn-chip" aria-pressed={filter === k} onClick={() => setFilter(k)}>
            {k === 'all' ? 'All' : LABEL[k]} <span className="num">({counts[k]})</span>
          </button>
        ))}
      </div>
      {!apps && <Skeleton className="h-40" />}
      {apps && list.length === 0 && <p className="text-ink-soft">No {filter === 'all' ? '' : LABEL[filter as Application['status']].toLowerCase() + ' '}applications.</p>}
      <ul className="grid gap-4 lg:grid-cols-2 items-start">
        {list.map((a) => (
          <li key={a.id} className="panel p-5 space-y-3 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="t-card break-any">{a.businessName}</h3>
                <p className="text-sm text-ink-soft">{cat(a.category)} · {a.createdAt ? a.createdAt.toDate().toLocaleDateString('en-ZA', { timeZone: 'Africa/Johannesburg', day: 'numeric', month: 'short', year: 'numeric' }) : ''}</p>
              </div>
              <span className={`pill shrink-0 ${PILL[a.status]}`}>{LABEL[a.status]}</span>
            </div>
            <p className="text-ink-soft whitespace-pre-line break-any">{a.description}</p>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div className="min-w-0"><dt className="text-ink-soft">Contact</dt><dd className="font-semibold break-any">{a.contactName}</dd></div>
              <div className="min-w-0"><dt className="text-ink-soft">Phone</dt><dd><a className="link break-any" href={`tel:${a.phone.replace(/[^0-9+]/g, '')}`}>{a.phone}</a></dd></div>
              <div className="min-w-0 sm:col-span-2"><dt className="text-ink-soft">Email</dt><dd><a className="link break-any" href={`mailto:${a.email}`}>{a.email}</a></dd></div>
              <div className="min-w-0"><dt className="text-ink-soft">Electricity</dt><dd className="font-semibold">{a.needsPower ? 'Needed' : 'Not needed'}</dd></div>
              <div className="min-w-0"><dt className="text-ink-soft">Events</dt><dd className="font-semibold break-any">{a.anyEvent ? 'Any upcoming event' : a.events.map(title).join(', ')}</dd></div>
              {a.link && <div className="min-w-0 sm:col-span-2"><dt className="text-ink-soft">Link</dt><dd><a className="link break-any" href={a.link} target="_blank" rel="noopener noreferrer">{a.link}</a></dd></div>}
            </dl>
            <div className="even-cols pt-1">
              {a.status !== 'approved' && <button type="button" className="btn btn-primary" disabled={!!busy} onClick={() => decide(a, 'approved')}>{busy === a.id + 'approved' && <Spinner label="Saving" />} Approve</button>}
              {a.status !== 'declined' && <button type="button" className="btn btn-outline" disabled={!!busy} onClick={() => decide(a, 'declined')}>{busy === a.id + 'declined' && <Spinner label="Saving" />} Decline</button>}
              {a.status !== 'new' && <button type="button" className="btn btn-ghost" disabled={!!busy} onClick={() => decide(a, 'new')}>Mark as new</button>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
