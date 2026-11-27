import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, type Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useEvents } from '../lib/data';
import { randsPlain } from '../lib/format';

export interface VendorApp {
  id: string; businessName: string; category: string; events: string[]; anyEvent: boolean;
  status: 'new' | 'approved' | 'declined'; response?: string; fee?: number | null; feePaid?: boolean;
  createdAt: Timestamp | null; reviewedAt?: Timestamp | null;
}

/** Short reference a vendor quotes when paying a stall fee, e.g. "V-3F9K2A". */
export const vendorRef = (id: string) => `V-${id.slice(0, 6).toUpperCase()}`;

const STATUS: Record<VendorApp['status'], { label: string; cls: string; help: string }> = {
  new: { label: 'Received', cls: 'bg-ink text-lime', help: 'MSB Events has your application and will reply here.' },
  approved: { label: 'Approved', cls: 'bg-ok text-white', help: 'Good news: you have a spot.' },
  declined: { label: 'Not this time', cls: 'bg-mist text-ink', help: 'Not taken up for these events. You are welcome to apply for others.' },
};
const day = (t?: Timestamp | null) => (t ? t.toDate().toLocaleDateString('en-ZA', { timeZone: 'Africa/Johannesburg', day: 'numeric', month: 'short', year: 'numeric' }) : '');

/** The signed-in person's own vendor applications, newest first. */
export function useMyVendorApps(uid: string | undefined) {
  const [apps, setApps] = useState<VendorApp[] | null>(null);
  useEffect(() => {
    if (!db || !uid) { setApps(null); return; }
    return onSnapshot(
      query(collection(db, 'vendorApplications'), where('uid', '==', uid)),
      (s) => setApps(s.docs.map((d) => ({ id: d.id, ...(d.data({ serverTimestamps: 'estimate' }) as Omit<VendorApp, 'id'>) })).sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0))),
      () => setApps([]),
    );
  }, [uid]);
  return apps;
}

/** "Your applications" section on the Become a vendor page: status, message from MSB Events and any stall fee. */
export function VendorApplications({ apps, catLabel }: { apps: VendorApp[]; catLabel: (k: string) => string }) {
  const { events } = useEvents();
  const title = (id: string) => events?.find((e) => e.id === id)?.title ?? 'An MSB event';
  return (
    <section id="my-applications" aria-labelledby="my-apps-title" className="scroll-mt-24 space-y-4">
      <h2 id="my-apps-title" className="t-section">Your <span className="text-leaf">applications</span></h2>
      <ul className="space-y-4">
        {apps.map((a) => {
          const s = STATUS[a.status] ?? STATUS.new;
          const hasFee = typeof a.fee === 'number' && a.fee > 0 && a.status === 'approved';
          return (
            <li key={a.id} className="panel p-5 space-y-3 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="t-card break-any">{a.businessName}</h3>
                  <p className="text-sm text-ink-soft">{catLabel(a.category)} · sent {day(a.createdAt)}</p>
                </div>
                <span className={`pill shrink-0 ${s.cls}`}>{s.label}</span>
              </div>
              <p className="text-sm"><span className="text-ink-soft">Events: </span><span className="font-semibold break-any">{a.anyEvent ? 'Any upcoming event' : a.events.map(title).join(', ')}</span></p>
              <p className="text-sm text-ink-soft">{s.help}</p>
              {hasFee && (
                <div className={`rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${a.feePaid ? 'bg-mist' : 'bg-ink text-white'}`}>
                  <div className="min-w-0">
                    <p className={`eyebrow ${a.feePaid ? 'text-ink-soft' : 'text-lime'}`}>Stall fee</p>
                    <p className="t-card num mt-1">{randsPlain(a.fee as number)}</p>
                  </div>
                  <div className="text-sm sm:text-right">
                    {a.feePaid ? (
                      <span className="pill bg-ok text-white">Paid</span>
                    ) : (
                      <>
                        <p className="font-semibold">Not paid yet</p>
                        <p className={a.feePaid ? '' : 'text-white/80'}>Pay as explained in the message. Reference <span className="font-mono font-bold">{vendorRef(a.id)}</span></p>
                      </>
                    )}
                  </div>
                </div>
              )}
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
    </section>
  );
}
