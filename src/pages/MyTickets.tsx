import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { collection, doc, onSnapshot, query, updateDoc, where, type Timestamp } from 'firebase/firestore';
import { WifiOff } from 'lucide-react';
import { PageHero } from '../components/Layout';
import { Poster } from '../components/Poster';
import { Dialog, Skeleton, Spinner, toast } from '../components/ui';
import { useAuth } from '../lib/auth';
import { db } from '../lib/firebase';
import { qrDataUrl } from '../lib/qr';
import { isPast } from '../lib/eventState';
import { longDate, rands } from '../lib/format';
import type { Ticket } from '../lib/types';
import { useTitle } from '../lib/useTitle';
import { cancelTransfer, createTransfer, myTransfers } from '../lib/transfer';
import { whatsappLink } from '../lib/calendar';

const cacheKey = (uid: string) => `msb-tickets-${uid}`;

function toTicket(id: string, d: Record<string, unknown>): Ticket {
  const created = d.createdAt as Timestamp | null | undefined;
  return { ...(d as unknown as Ticket), id, createdAt: created?.toMillis ? created.toMillis() : Date.now() };
}

/** The signed-in person's tickets, newest first; a copy is kept on the device so they open without signal. */
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

function Qr({ id, className, size }: { id: string; className?: string; size: number }) {
  const [src, setSrc] = useState('');
  useEffect(() => { void qrDataUrl(id, 480).then(setSrc); }, [id]);
  return src ? <img src={src} alt="Ticket QR code" width={size} height={size} className={className} /> : <div style={{ width: size, height: size }} className={`${className} bg-mist animate-pulse`} />;
}

function statusOf(t: Ticket) {
  if (t.status === 'cancelled' && t.transferredTo) return { label: 'Sent to a friend', cls: 'bg-mist text-ink' };
  if (t.status === 'cancelled') return { label: 'Cancelled', cls: 'bg-danger text-white' };
  if (t.status === 'used') return { label: 'Used', cls: 'bg-ink-soft text-white' };
  if (isPast({ startsAt: t.eventStartsAt })) return { label: 'Past', cls: 'bg-mist text-ink' };
  return { label: 'Valid', cls: 'bg-ink text-lime' };
}

const posterOf = (t: Ticket) => ({ poster: t.poster, posterColor: '#0B0B0C', title: t.eventTitle, shortTitle: 'MSB' });

/** A ticket in the list: the whole poster (never cropped), the details, and a small QR from 400px wide. */
function TicketCard({ t, onOpen }: { t: Ticket; onOpen: () => void }) {
  const s = statusOf(t);
  return (
    <li>
      <button type="button" onClick={onOpen} className="tap-card lift panel overflow-hidden flex items-stretch min-h-[136px]" aria-label={`Open ticket: ${t.eventTitle}, ${t.typeName}${t.seatLabel ? ', ' + t.seatLabel : ''}`}>
        <div className="w-[104px] shrink-0 bg-mist p-2 grid place-items-center">
          <div className="w-full aspect-square rounded-xl overflow-hidden"><Poster event={posterOf(t)} sizes="104px" fit="contain" /></div>
        </div>
        <div className="flex-1 min-w-0 p-4 flex flex-col">
          <span className={`pill self-start ${s.cls}`}>{s.label}</span>
          <p className="font-bold mt-2 line-clamp-2 break-any">{t.eventTitle}</p>
          <p className="text-sm text-ink-soft num line-clamp-1">{longDate(t.eventStartsAt)}</p>
          <p className="text-sm line-clamp-1 mt-auto pt-1">{t.typeName}{t.seatLabel ? ` · ${t.seatLabel}` : ''}</p>
        </div>
        <div className="hidden min-[400px]:flex items-center pr-4 shrink-0"><Qr id={t.id} size={84} className="rounded-lg" /></div>
      </button>
    </li>
  );
}

/** Send a ticket to a friend: a one-time link. When the friend claims it they get a new ticket with a new QR code,
 *  and this one is cancelled, so an old screenshot cannot be used at the gate. */
function TransferBox({ t, open, setOpen }: { t: Ticket; open: boolean; setOpen: (v: boolean) => void }) {
  const { profile } = useAuth();
  const [link, setLink] = useState<{ code: string; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    setLink(null);
    setOpen(false);
    if (!db) return;
    void myTransfers(db, t.uid).then((list) => {
      const mine = list.find((x) => x.ticketId === t.id && x.expiresAt.toMillis() > Date.now());
      if (live && mine) { setLink({ code: mine.code, url: claimUrl(mine.code) }); setOpen(true); }
    }).catch(() => undefined);
    return () => { live = false; };
  }, [t.id, t.uid, setOpen]);

  async function make() {
    if (!db) return;
    setBusy(true);
    try {
      const code = await createTransfer(db, t, profile?.name ?? t.holderName);
      setLink({ code, url: claimUrl(code) });
    } catch { toast('The link could not be made. Try again.', 'error'); } finally { setBusy(false); }
  }
  async function cancel() {
    if (!db || !link) return;
    setBusy(true);
    try { await cancelTransfer(db, link.code); setLink(null); toast('Link cancelled. The ticket stays yours.'); } catch { toast('The link could not be cancelled.', 'error'); } finally { setBusy(false); }
  }
  async function copy() {
    if (!link) return;
    try { await navigator.clipboard.writeText(link.url); toast('Link copied.'); } catch { toast('Select the link and copy it.', 'error'); }
  }

  if (!open) return null;

  return (
    <section className="rounded-2xl bg-mist p-4 space-y-3" aria-labelledby="transfer-title">
      <h3 id="transfer-title" className="font-bold">Send to a friend</h3>
      {!link ? (
        <>
          <p className="text-sm text-ink-soft">Your friend opens the link, signs in and gets a new ticket with a new QR code. This ticket then stops working.</p>
          <button type="button" className="btn btn-outline btn-block" disabled={busy} onClick={make}>{busy && <Spinner label="Making the link" />} Make a transfer link</button>
        </>
      ) : (
        <>
          <p className="text-sm text-ink-soft">Send this link to one friend only. It works once and expires after 7 days. Until it is used, the ticket is still yours.</p>
          <p className="field font-mono text-sm break-all select-all" aria-label="Transfer link">{link.url}</p>
          <div className="even-row [--even-min:7rem]">
            <button type="button" className="btn btn-outline" onClick={copy}>Copy link</button>
            <a className="btn btn-outline" href={whatsappLink(`Here is your ticket for ${t.eventTitle}: ${link.url}`)} target="_blank" rel="noopener noreferrer">WhatsApp</a>
            <button type="button" className="btn btn-danger" disabled={busy} onClick={cancel}>Cancel link</button>
          </div>
        </>
      )}
    </section>
  );
}

const claimUrl = (code: string) => `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}/claim/${code}`;

/** The opened ticket: a compact card that fits on a phone screen, QR big enough to scan, poster shown whole. */
function TicketDialog({ t, onClose }: { t: Ticket | null; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [holder, setHolder] = useState('');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  useEffect(() => { setEditing(false); setHolder(t?.holderName ?? ''); }, [t?.id, t?.holderName]);
  useEffect(() => { setSending(false); }, [t?.id]);
  const s = t ? statusOf(t) : null;
  const canRename = !!t && t.status === 'valid' && !isPast({ startsAt: t.eventStartsAt });

  return (
    <Dialog
      open={!!t}
      onClose={onClose}
      labelledBy="ticket-title"
      footer={
        t && (
          <div className={canRename && !sending ? 'even-cols' : ''}>
          {canRename && !sending && (
            <button type="button" className="btn btn-outline" onClick={() => setSending(true)} aria-expanded="false">Send to a friend</button>
          )}
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const { downloadTicket } = await import('../lib/pdf');
                await downloadTicket(t);
                toast('Ticket downloaded.');
              } catch { toast('The PDF could not be made. Try again.', 'error'); } finally { setBusy(false); }
            }}
          >
            {busy && <Spinner label="Making the PDF" />} {canRename && !sending ? 'Download PDF' : 'Download PDF ticket'}
          </button>
          </div>
        )
      }
    >
      {t && s && (
        <div className="space-y-4">
          <div className="flex gap-3 items-start">
            <div className="size-16 shrink-0 rounded-xl overflow-hidden bg-mist"><Poster event={posterOf(t)} sizes="64px" fit="contain" /></div>
            <div className="min-w-0">
              <span className={`pill ${s.cls}`}>{s.label}</span>
              <h2 id="ticket-title" className="font-bold text-lg leading-snug mt-1 break-any">{t.eventTitle}</h2>
              <p className="text-sm text-ink-soft num">{longDate(t.eventStartsAt)}</p>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="rounded-2xl bg-ink p-3"><Qr id={t.id} size={192} className="rounded-lg block" /></div>
          </div>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            <div className="min-w-0"><dt className="text-ink-soft">Ticket</dt><dd className="font-semibold break-any">{t.typeName}</dd></div>
            <div className="min-w-0"><dt className="text-ink-soft">{t.seatLabel ? 'Seat' : 'Price'}</dt><dd className="font-semibold num">{t.seatLabel || rands(t.price)}</dd></div>
            <div className="col-span-2 min-w-0">
              <dt className="text-ink-soft">{t.seatLabel ? 'Guest' : 'Holder'}</dt>
              {editing ? (
                <dd>
                  <form
                    className="mt-1 space-y-3"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const v = holder.trim();
                      if (v.length < 2 || !db) return;
                      setSaving(true);
                      try { await updateDoc(doc(db, 'tickets', t.id), { holderName: v }); toast('Name changed.'); setEditing(false); } catch { toast('The name could not be changed.', 'error'); } finally { setSaving(false); }
                    }}
                  >
                    <label htmlFor="holder" className="sr-only">Name on this ticket</label>
                    <input id="holder" className="field" value={holder} maxLength={80} autoComplete="off" onChange={(e) => setHolder(e.target.value)} autoFocus />
                    <div className="even-cols">
                      <button type="button" className="btn btn-outline" onClick={() => { setEditing(false); setHolder(t.holderName); }}>Cancel</button>
                      <button className="btn btn-primary" disabled={saving}>{saving && <Spinner label="Saving" />} Save</button>
                    </div>
                  </form>
                </dd>
              ) : (
                <dd className="font-semibold flex items-center justify-between gap-2">
                  <span className="min-w-0 break-any">{t.holderName}</span>
                  {canRename && <button type="button" className="btn btn-outline shrink-0" onClick={() => setEditing(true)}>Change name</button>}
                </dd>
              )}
            </div>
            <div className="col-span-2 min-w-0"><dt className="text-ink-soft">Code</dt><dd className="font-mono text-sm break-all">{t.id}</dd></div>
          </dl>
          {canRename && <TransferBox t={t} open={sending} setOpen={setSending} />}
        </div>
      )}
    </Dialog>
  );
}

export default function MyTickets() {
  useTitle('My tickets');
  const { user, ready } = useAuth();
  const { tickets, fromCache } = useMyTickets(user?.uid);
  const [openId, setOpenId] = useState<string | null>(null);
  // Follow the live ticket, so a name change or a scan shows straight away.
  const open = tickets?.find((t) => t.id === openId) ?? null;

  if (!ready) return <div className="wrap max-w-2xl py-10"><Skeleton className="h-60" /></div>;
  if (!user) return <Navigate to="/account?next=/tickets" replace />;

  return (
    <>
      <PageHero title="My tickets" photo="/photos/festival-performer-waving-night" position="center 45%" />
      <div className="wrap max-w-2xl py-12 md:py-16">
        {fromCache && tickets && tickets.length > 0 && (
          <p className="mb-4 inline-flex items-center gap-2 text-sm text-ink-soft"><WifiOff className="size-4" aria-hidden /> Showing tickets saved on this device.</p>
        )}
        {!tickets && <div className="space-y-3" role="status" aria-label="Loading tickets"><Skeleton className="h-[136px]" /><Skeleton className="h-[136px]" /></div>}
        {tickets && tickets.length === 0 && (
          <div className="panel p-8">
            <h2 className="t-card">No tickets yet</h2>
            <p className="mt-2 text-ink-soft">Tickets you get on this site appear here, with a QR code for the gate.</p>
            <Link to="/events" className="btn btn-primary mt-6">See events</Link>
          </div>
        )}
        <ul className="space-y-3">{tickets?.map((t) => <TicketCard key={t.id} t={t} onOpen={() => setOpenId(t.id)} />)}</ul>
      </div>
      <TicketDialog t={open} onClose={() => setOpenId(null)} />
    </>
  );
}
