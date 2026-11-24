import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { collection, doc, onSnapshot, query, updateDoc, where, type Timestamp } from 'firebase/firestore';
import { Download, WifiOff } from 'lucide-react';
import { PageHero } from '../components/Layout';
import { Poster } from '../components/Poster';
import { Skeleton, Spinner, confirmAction, toast, CloseButton } from '../components/ui';
import { useAuth, authErrorMessage } from '../lib/auth';
import { db } from '../lib/firebase';
import { qrDataUrl } from '../lib/qr';
import { downloadTicket } from '../lib/pdf';
import { isPast } from '../lib/eventState';
import { longDate, rands } from '../lib/format';
import { ROLE_LABEL, type Ticket } from '../lib/types';
import { useTitle } from '../lib/useTitle';

const cacheKey = (uid: string) => `msb-tickets-${uid}`;

function toTicket(id: string, d: Record<string, unknown>): Ticket {
  const created = d.createdAt as Timestamp | null | undefined;
  return { ...(d as unknown as Ticket), id, createdAt: created?.toMillis ? created.toMillis() : Date.now() };
}

export function useMyTickets(uid: string | undefined) {
  const [tickets, setTickets] = useState<Ticket[] | null>(() => {
    if (!uid) return null;
    try { const raw = localStorage.getItem(cacheKey(uid)); return raw ? (JSON.parse(raw) as Ticket[]) : null; } catch { return null; }
  });
  const [fromCache, setFromCache] = useState(false);
  useEffect(() => {
    if (!db || !uid) return;
    return onSnapshot(
      // No orderBy here, so the live database needs no extra index; sorted newest first below.
      query(collection(db, 'tickets'), where('uid', '==', uid)),
      { includeMetadataChanges: true },
      (snap) => {
        const list = snap.docs
          .map((d) => toTicket(d.id, d.data({ serverTimestamps: 'estimate' })))
          .sort((a, b) => (b.createdAt as number) - (a.createdAt as number) || a.id.localeCompare(b.id, undefined, { numeric: true }));
        setTickets(list);
        setFromCache(snap.metadata.fromCache);
        try { localStorage.setItem(cacheKey(uid), JSON.stringify(list)); } catch { /* storage full or blocked */ }
      },
      () => setTickets((t) => t ?? []),
    );
  }, [uid]);
  return { tickets, fromCache };
}

function Qr({ id, className }: { id: string; className?: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => { void qrDataUrl(id, 480).then(setSrc); }, [id]);
  return src ? <img src={src} alt="Ticket QR code" className={className} /> : <div className={`${className} bg-mist animate-pulse`} />;
}

function statusOf(t: Ticket) {
  if (t.status === 'cancelled') return { label: 'Cancelled', cls: 'bg-danger text-white' };
  if (t.status === 'used') return { label: 'Used', cls: 'bg-ink-soft text-white' };
  if (isPast({ startsAt: t.eventStartsAt })) return { label: 'Past', cls: 'bg-mist text-ink' };
  return { label: 'Valid', cls: 'bg-ink text-lime' };
}

function TicketCard({ t, onOpen }: { t: Ticket; onOpen: () => void }) {
  const s = statusOf(t);
  return (
    <li>
      <button type="button" onClick={onOpen} className="lift w-full h-[148px] text-left rounded-3xl bg-white border border-line overflow-hidden flex" aria-label={`Open ticket: ${t.eventTitle}, ${t.typeName}${t.seatLabel ? ', ' + t.seatLabel : ''}`}>
        <div className="w-[96px] sm:w-[112px] shrink-0 bg-mist"><Poster event={{ poster: t.poster, posterColor: '#0B0B0C', title: t.eventTitle, shortTitle: 'MSB' }} size="sm" /></div>
        <div className="flex-1 min-w-0 p-4 flex flex-col">
          <span className={`pill self-start ${s.cls}`}>{s.label}</span>
          <p className="font-bold mt-2 line-clamp-1">{t.eventTitle}</p>
          <p className="text-sm text-ink-soft num line-clamp-1">{longDate(t.eventStartsAt)}</p>
          <p className="text-sm line-clamp-1 mt-auto">{t.typeName}{t.seatLabel ? ` · ${t.seatLabel}` : ''}</p>
        </div>
        <div className="hidden min-[400px]:flex items-center pr-4"><Qr id={t.id} className="size-[92px] rounded-lg" /></div>
      </button>
    </li>
  );
}

function TicketModal({ t, onClose }: { t: Ticket; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [holder, setHolder] = useState(t.holderName);
  const canRename = t.status === 'valid' && !isPast({ startsAt: t.eventStartsAt });
  const s = statusOf(t);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[100] bg-ink/70 grid place-items-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true" aria-label="Ticket">
      <div className="ticket-in w-full max-w-sm bg-white rounded-[2rem] overflow-hidden max-h-[92dvh] overflow-y-auto">
        <div className="flex items-start justify-between p-5 pb-0">
          <span className={`pill ${s.cls}`}>{s.label}</span>
          <CloseButton onClick={onClose} label="Close ticket" />
        </div>
        <div className="px-6 pb-6">
          <h2 className="display text-3xl text-leaf mt-1">{t.eventTitle}</h2>
          <p className="text-sm text-ink-soft num">{longDate(t.eventStartsAt)}{t.venue ? ` · ${t.venue}` : ''}</p>
          <div className="mt-5 rounded-3xl bg-ink p-4"><Qr id={t.id} className="w-full aspect-square rounded-2xl" /></div>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-ink-soft">Ticket</dt><dd className="font-semibold">{t.typeName}</dd></div>
            <div><dt className="text-ink-soft">Price</dt><dd className="font-semibold num">{rands(t.price)}</dd></div>
            {t.seatLabel && <div className="col-span-2"><dt className="text-ink-soft">Seat</dt><dd className="font-semibold">{t.seatLabel}</dd></div>}
            <div className="col-span-2">
              <dt className="text-ink-soft">{t.seatLabel ? 'Guest' : 'Holder'}</dt>
              {editing ? (
                <dd>
                  <form
                    className="mt-1 flex gap-2"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const v = holder.trim();
                      if (v.length < 2 || !db) return;
                      try { await updateDoc(doc(db, 'tickets', t.id), { holderName: v }); toast('Name changed.'); setEditing(false); } catch { toast('The name could not be changed.', 'error'); }
                    }}
                  >
                    <label htmlFor="holder" className="sr-only">Name on this ticket</label>
                    <input id="holder" className="field" value={holder} maxLength={80} onChange={(e) => setHolder(e.target.value)} autoFocus />
                    <button className="btn btn-primary shrink-0">Save</button>
                  </form>
                </dd>
              ) : (
                <dd className="font-semibold flex items-center justify-between gap-2">
                  <span className="min-w-0 break-words">{t.holderName}</span>
                  {canRename && <button type="button" className="btn btn-outline shrink-0 !min-h-[44px] !px-4 text-sm" onClick={() => setEditing(true)}>Change name</button>}
                </dd>
              )}
            </div>
            <div className="col-span-2"><dt className="text-ink-soft">Code</dt><dd className="font-mono text-xs break-all">{t.id}</dd></div>
          </dl>
          <button
            type="button"
            className="btn btn-primary btn-block mt-6"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try { await downloadTicket(t); toast('Ticket downloaded.'); } catch { toast('The PDF could not be made. Try again.', 'error'); } finally { setBusy(false); }
            }}
          >
            {busy ? <Spinner /> : <Download className="size-4 text-lime" aria-hidden />} Download PDF ticket
          </button>
        </div>
      </div>
    </div>
  );
}

function AccountPanel() {
  const { profile, user, rename, changePassword, deleteAccount, signOut, hasPassword } = useAuth();
  const [name, setName] = useState(profile?.name ?? '');
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [delPw, setDelPw] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => { if (profile?.name) setName(profile.name); }, [profile?.name]);

  const run = async (key: string, fn: () => Promise<void>, ok: string) => {
    setBusy(key);
    try { await fn(); toast(ok); } catch (e) { toast(authErrorMessage(e), 'error'); } finally { setBusy(null); }
  };

  return (
    <div className="space-y-6">
      <form className="panel p-6 space-y-4" onSubmit={(e) => { e.preventDefault(); if (name.trim().length >= 2) void run('name', () => rename(name), 'Name saved.'); }}>
        <h2 className="display text-3xl">Your details</h2>
        <p className="text-sm text-ink-soft break-all">{user?.email}{profile && profile.role !== 'USER' ? ` · ${ROLE_LABEL[profile.role]}` : ''}</p>
        <div>
          <label htmlFor="pname" className="field-label">Name</label>
          <input id="pname" className="field" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
        </div>
        <button className="btn btn-primary" disabled={busy === 'name' || name.trim().length < 2}>{busy === 'name' && <Spinner />} Save name</button>
      </form>
      {!hasPassword && (
        <div className="panel p-6">
          <h2 className="display text-3xl">Password</h2>
          <p className="mt-2 text-ink-soft">You sign in with Google, so there is no password to change here.</p>
        </div>
      )}
      {hasPassword && <form className="panel p-6 space-y-4" onSubmit={(e) => { e.preventDefault(); if (next.length >= 8) void run('pw', async () => { await changePassword(cur, next); setCur(''); setNext(''); }, 'Password changed.'); }}>
        <h2 className="display text-3xl">Password</h2>
        <div><label htmlFor="cur" className="field-label">Current password</label><input id="cur" type="password" className="field" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} /></div>
        <div><label htmlFor="new" className="field-label">New password</label><input id="new" type="password" className="field" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} /><p className="field-help">At least 8 characters.</p></div>
        <button className="btn btn-primary" disabled={busy === 'pw' || !cur || next.length < 8}>{busy === 'pw' && <Spinner />} Change password</button>
      </form>}
      <div className="panel p-6 space-y-4">
        <h2 className="display text-3xl">Sign out</h2>
        <button type="button" className="btn btn-outline" onClick={() => void signOut()}>Sign out</button>
      </div>
      <form
        className="panel p-6 space-y-4 border-danger/30"
        onSubmit={async (e) => {
          e.preventDefault();
          if (hasPassword && !delPw) return;
          const ok = await confirmAction({ title: 'Delete your account?', message: 'Your profile and sign-in are removed for good. Your tickets will no longer show here.', confirmLabel: 'Delete account', tone: 'danger' });
          if (ok) await run('del', () => deleteAccount(hasPassword ? delPw : undefined), 'Your account was deleted.');
        }}
      >
        <h2 className="display text-3xl">Delete account</h2>
        {hasPassword ? (
          <>
            <p className="text-ink-soft text-sm">Enter your password to confirm it is you.</p>
            <div><label htmlFor="delpw" className="field-label">Password</label><input id="delpw" type="password" className="field" autoComplete="current-password" value={delPw} onChange={(e) => setDelPw(e.target.value)} /></div>
          </>
        ) : (
          <p className="text-ink-soft text-sm">Google will ask you to confirm it is you.</p>
        )}
        <button className="btn btn-danger" disabled={(hasPassword && !delPw) || busy === 'del'}>{busy === 'del' && <Spinner />} Delete my account</button>
      </form>
    </div>
  );
}

export default function Profile() {
  useTitle('My tickets');
  const { user, ready } = useAuth();
  const [tab, setTab] = useState<'tickets' | 'account'>('tickets');
  const { tickets, fromCache } = useMyTickets(user?.uid);
  const [openId, setOpenId] = useState<string | null>(null);
  // Follow the live ticket, so a name change or a scan shows straight away.
  const open = tickets?.find((t) => t.id === openId) ?? null;

  if (!ready) return <div className="mx-auto max-w-3xl px-4 py-10"><Skeleton className="h-60" /></div>;
  if (!user) return <Navigate to="/account?next=/profile" replace />;

  return (
    <>
      <PageHero title="My tickets" />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
        <div role="tablist" aria-label="Profile" className="flex gap-2">
          <button role="tab" aria-selected={tab === 'tickets'} className="chip" onClick={() => setTab('tickets')}>Tickets</button>
          <button role="tab" aria-selected={tab === 'account'} className="chip" onClick={() => setTab('account')}>Account</button>
        </div>
        <div className="mt-8">
          {tab === 'tickets' && (
            <>
              {fromCache && tickets && tickets.length > 0 && (
                <p className="mb-4 inline-flex items-center gap-2 text-sm text-ink-soft"><WifiOff className="size-4" aria-hidden /> Showing tickets saved on this device.</p>
              )}
              {!tickets && <div className="space-y-3" role="status" aria-label="Loading tickets"><Skeleton className="h-[148px]" /><Skeleton className="h-[148px]" /></div>}
              {tickets && tickets.length === 0 && (
                <div className="panel p-8">
                  <h2 className="display text-3xl">No tickets yet</h2>
                  <p className="mt-2 text-ink-soft">Tickets you get on this site appear here, with a QR code for the gate.</p>
                  <Link to="/events" className="btn btn-primary mt-6">See events</Link>
                </div>
              )}
              <ul className="space-y-3">{tickets?.map((t) => <TicketCard key={t.id} t={t} onOpen={() => setOpenId(t.id)} />)}</ul>
            </>
          )}
          {tab === 'account' && <AccountPanel />}
        </div>
      </div>
      {open && <TicketModal t={open} onClose={() => setOpenId(null)} />}
    </>
  );
}
