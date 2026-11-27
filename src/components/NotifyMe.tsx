import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BellRing, Check } from 'lucide-react';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useAuth } from '../lib/auth';
import { db } from '../lib/firebase';
import type { MsbEvent } from '../lib/types';
import { Spinner, toast } from './ui';

/** "Tell me when tickets go on sale" for an event whose tickets are not on sale yet.
 *  Saves the signed-in person's name and account email on a list that MSB Events staff can see and export. */
export function NotifyMe({ event }: { event: MsbEvent }) {
  const { user, profile, ready } = useAuth();
  const [on, setOn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const id = user ? `${event.id}_${user.uid}` : '';

  useEffect(() => {
    if (!db || !id) return;
    getDoc(doc(db, 'notify', id)).then((s) => setOn(s.exists())).catch(() => setOn(false));
  }, [id]);

  if (!ready) return null;
  if (!user)
    return (
      <Link to={`/account?next=${encodeURIComponent(`/events/${event.id}`)}`} className="btn btn-outline btn-block">
        <BellRing className="size-5" aria-hidden /> Sign in to get notified when tickets go on sale
      </Link>
    );

  async function toggle() {
    if (!db || !user) return;
    setBusy(true);
    try {
      if (on) {
        await deleteDoc(doc(db, 'notify', id));
        setOn(false);
        toast('You are off the list for this event.');
      } else {
        await setDoc(doc(db, 'notify', id), { uid: user.uid, eventId: event.id, email: user.email, name: profile?.name ?? user.displayName ?? 'Guest', createdAt: serverTimestamp() });
        setOn(true);
        toast('Done. MSB Events will let you know when tickets go on sale.');
      }
    } catch {
      toast('That did not work. Try again.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button type="button" className={`btn btn-block ${on ? 'btn-outline' : 'btn-accent'}`} disabled={busy || on === null} onClick={toggle} aria-pressed={!!on}>
        {busy ? <Spinner label="Saving" /> : on ? <Check className="size-5" aria-hidden /> : <BellRing className="size-5" aria-hidden />}
        {on ? 'You will be notified (tap to undo)' : 'Notify me when tickets go on sale'}
      </button>
      <p className="text-sm text-ink-soft text-center">We use your account email ({user.email}) only for this. See the <Link to="/privacy" className="link">Privacy</Link> page.</p>
    </div>
  );
}
