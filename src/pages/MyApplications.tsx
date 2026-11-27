import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { collection, onSnapshot, query, where, type Timestamp } from 'firebase/firestore';
import { PageHero } from '../components/Layout';
import { Skeleton } from '../components/ui';
import { useAuth } from '../lib/auth';
import { db } from '../lib/firebase';
import { useEvents } from '../lib/data';
import { useTitle } from '../lib/useTitle';
import { VENDOR_CATEGORIES } from './Vendors';

interface Application {
  id: string; businessName: string; category: string; events: string[]; anyEvent: boolean;
  status: 'new' | 'approved' | 'declined'; response?: string; createdAt: Timestamp | null; reviewedAt?: Timestamp | null;
}

const STATUS: Record<Application['status'], { label: string; cls: string; help: string }> = {
  new: { label: 'Received', cls: 'bg-ink text-lime', help: 'MSB Events has your application and will be in touch.' },
  approved: { label: 'Approved', cls: 'bg-ok text-white', help: 'Good news. MSB Events will contact you about space, fees and set-up.' },
  declined: { label: 'Not this time', cls: 'bg-mist text-ink', help: 'Your application was not taken up for these events. You are welcome to apply again for other events.' },
};
const day = (t?: Timestamp | null) => (t ? t.toDate().toLocaleDateString('en-ZA', { timeZone: 'Africa/Johannesburg', day: 'numeric', month: 'short', year: 'numeric' }) : '');
const cat = (k: string) => VENDOR_CATEGORIES.find(([c]) => c === k)?.[1] ?? k;

/** A vendor's own applications (made while signed in), with the status and any note from MSB Events. */
export default function MyApplications() {
  useTitle('My vendor applications');
  const { user, ready } = useAuth();
  const { events } = useEvents();
  const [apps, setApps] = useState<Application[] | null>(null);
  useEffect(() => {
    if (!db || !user) return;
    return onSnapshot(
      query(collection(db, 'vendorApplications'), where('uid', '==', user.uid)),
      (s) => setApps(s.docs.map((d) => ({ id: d.id, ...(d.data({ serverTimestamps: 'estimate' }) as Omit<Application, 'id'>) })).sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0))),
      () => setApps([]),
    );
  }, [user]);
  const title = (id: string) => events?.find((e) => e.id === id)?.title ?? 'An MSB event';

  if (!ready) return <div className="wrap max-w-2xl py-10"><Skeleton className="h-60" /></div>;
  if (!user) return <Navigate to="/account?next=/vendors/applications" replace />;

  return (
    <>
      <PageHero title="My applications" photo="/photos/festival-crowd-chairs" position="center 40%" />
      <div className="wrap max-w-2xl py-12 md:py-16 space-y-6">
        <p className="text-ink-soft">Vendor applications you sent while signed in, and what MSB Events said. <Link to="/vendors" className="link">Apply for another event</Link>.</p>
        {!apps && <Skeleton className="h-40" />}
        {apps && apps.length === 0 && (
          <div className="panel p-6 space-y-3">
            <p className="font-bold">No applications on this account yet.</p>
            <p className="text-ink-soft">Applications sent without signing in are not linked to an account, so they do not show here. MSB Events will still contact you about them.</p>
            <Link to="/vendors" className="btn btn-primary">Become a vendor</Link>
          </div>
        )}
        <ul className="space-y-4">
          {(apps ?? []).map((a) => {
            const s = STATUS[a.status] ?? STATUS.new;
            return (
              <li key={a.id} className="panel p-5 space-y-3 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="t-card break-any">{a.businessName}</h2>
                    <p className="text-sm text-ink-soft">{cat(a.category)} · sent {day(a.createdAt)}</p>
                  </div>
                  <span className={`pill shrink-0 ${s.cls}`}>{s.label}</span>
                </div>
                <p className="text-sm"><span className="text-ink-soft">Events: </span><span className="font-semibold break-any">{a.anyEvent ? 'Any upcoming event' : a.events.map(title).join(', ')}</span></p>
                <p className="text-sm text-ink-soft">{s.help}</p>
                {a.response && (
                  <div className="rounded-2xl bg-mist p-4">
                    <p className="eyebrow text-ink-soft">Message from MSB Events{a.reviewedAt ? ` · ${day(a.reviewedAt)}` : ''}</p>
                    <p className="mt-2 whitespace-pre-line break-any">{a.response}</p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
