import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { PlainTitle } from '../components/Layout';
import { Poster } from '../components/Poster';
import { Skeleton, Spinner, toast } from '../components/ui';
import { useAuth } from '../lib/auth';
import { db } from '../lib/firebase';
import { longDate } from '../lib/format';
import { claimTransfer, TransferError, type Transfer } from '../lib/transfer';
import { useTitle } from '../lib/useTitle';

/** A friend opens a transfer link here, signs in and adds the ticket to their own tickets. */
export default function Claim() {
  useTitle('Claim a ticket');
  const { code = '' } = useParams();
  const { user, profile, ready } = useAuth();
  const nav = useNavigate();
  const [t, setT] = useState<Transfer | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const valid = /^[A-Za-z0-9]{20,40}$/.test(code);

  useEffect(() => {
    if (!ready || !user || !db || !valid) return;
    getDoc(doc(db, 'transfers', code))
      .then((s) => setT(s.exists() ? ({ code, ...(s.data() as Omit<Transfer, 'code'>) }) : null))
      .catch(() => setT(null));
  }, [ready, user, code, valid]);

  const shell = (body: React.ReactNode) => <div className="wrap max-w-xl py-14 md:py-20 space-y-6">{body}</div>;
  if (!valid) return shell(<><PlainTitle title="Link not valid" /><p className="t-lead">This transfer link is not complete. Ask your friend to send it again.</p></>);
  if (!ready) return shell(<Skeleton className="h-60" />);
  if (!user)
    return shell(
      <>
        <PlainTitle eyebrow="A friend sent you a ticket" title="Claim your ticket" />
        <p className="t-lead">Sign in or create an account, and the ticket goes into your tickets with your name on it.</p>
        <Link to={`/account?next=${encodeURIComponent(`/claim/${code}`)}`} className="btn btn-primary btn-lg btn-block">Sign in to claim</Link>
      </>,
    );
  if (t === undefined) return shell(<Skeleton className="h-60" />);
  if (t === null || t.expiresAt.toMillis() <= Date.now())
    return shell(<><PlainTitle title="Link already used" /><p className="t-lead">This ticket was already claimed, or the link was cancelled or has expired. Ask your friend for a new link.</p><Link to="/tickets" className="btn btn-outline">Go to my tickets</Link></>);
  const own = t.fromUid === user.uid;

  return shell(
    <>
      <PlainTitle eyebrow={`From ${t.fromName}`} title="Claim your ticket" />
      <div className="panel p-4 flex gap-4 items-center">
        <div className="size-20 shrink-0 rounded-xl overflow-hidden bg-mist"><Poster event={{ poster: t.poster, posterColor: '#0B0B0C', title: t.eventTitle, shortTitle: 'MSB' }} sizes="80px" fit="contain" /></div>
        <div className="min-w-0">
          <p className="font-bold break-any">{t.eventTitle}</p>
          <p className="text-sm text-ink-soft num">{longDate(t.eventStartsAt)}</p>
          <p className="text-sm">{t.typeName}{t.seatLabel ? ` · ${t.seatLabel}` : ''}</p>
        </div>
      </div>
      {own ? (
        <p className="status-bar" role="status">This is your own ticket. Send the link to the friend who should get it.</p>
      ) : (
        <>
          <p className="text-ink-soft">The ticket will be in your name ({profile?.name ?? user.email}) with a new QR code. Your friend’s copy stops working.</p>
          <button
            type="button"
            className="btn btn-primary btn-lg btn-block"
            disabled={busy}
            onClick={async () => {
              if (!db) return;
              setBusy(true);
              try {
                await claimTransfer(db, code, user.uid, profile?.name ?? user.displayName ?? user.email ?? 'Guest');
                toast('The ticket is yours. Find it in My tickets.');
                nav('/tickets', { replace: true });
              } catch (e) {
                toast(e instanceof TransferError ? e.message : 'The ticket could not be claimed. It may have been used or cancelled.', 'error');
                setBusy(false);
              }
            }}
          >
            {busy && <Spinner label="Claiming" />} Add to my tickets
          </button>
        </>
      )}
    </>,
  );
}
