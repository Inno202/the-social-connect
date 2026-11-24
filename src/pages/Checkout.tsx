import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Info } from 'lucide-react';
import { Steps } from '../components/Steps';
import { Spinner, Skeleton, toast } from '../components/ui';
import { AgeNotice } from '../components/Layout';
import { usePricedCart } from './Cart';
import { useAuth } from '../lib/auth';
import { db } from '../lib/firebase';
import { cart, useCart } from '../lib/cart';
import { issueLine, CheckoutError } from '../lib/checkout';
import { rands, randsPlain } from '../lib/format';
import { useTitle } from '../lib/useTitle';

type Stage = 'Details' | 'Pay' | 'Success';

export default function Checkout() {
  useTitle('Checkout');
  const { user, profile, ready } = useAuth();
  const { priced, byEvent, total, tickets, loading, missing } = usePricedCart();
  const rawLines = useCart();
  const [stage, setStage] = useState<Stage>('Details');
  const [name, setName] = useState('');
  const [agree, setAgree] = useState(false);
  const [adult, setAdult] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState(0);
  const [failed, setFailed] = useState<string[]>([]);

  useEffect(() => {
    if (profile?.name && !name) setName(profile.name);
  }, [profile, name]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [stage]);

  if (!ready) return <div className="mx-auto max-w-3xl px-4 py-10"><Skeleton className="h-60" /></div>;
  if (!user) return <Navigate to="/account?next=/checkout" replace />;
  if (stage !== 'Success' && !busy && rawLines.length === 0) return <Navigate to="/cart" replace />;
  if (stage !== 'Success' && !busy && (loading || priced.length === 0))
    return <div className="mx-auto max-w-3xl px-4 py-10 space-y-3" role="status" aria-label="Loading your cart"><Skeleton className="h-12" /><Skeleton className="h-60" /></div>;

  const needs18 = byEvent.some((g) => g.event.is18Plus);

  function next() {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = 'Enter the name to print on the tickets.';
    if (!agree) e.agree = 'Please accept the Terms to continue.';
    if (needs18 && !adult) e.adult = 'These events are 18+. Confirm that everyone on these tickets is 18 or older.';
    setErrors(e);
    if (Object.keys(e).length) {
      document.getElementById(Object.keys(e)[0])?.focus();
      return;
    }
    setStage('Pay');
  }

  async function confirm() {
    if (!db || !user) return;
    setBusy(true);
    const fails: string[] = [];
    let count = 0;
    for (const p of priced) {
      try {
        const r = await issueLine(db, user.uid, name.trim(), { eventId: p.event.id, typeId: p.type.id, qty: p.qty });
        count += r.tickets;
        cart.set(p.event.id, p.type.id, 0);
      } catch (err) {
        fails.push(err instanceof CheckoutError ? err.message : `${p.type.name}: could not be issued. Please try again.`);
      }
    }
    setBusy(false);
    setIssued(count);
    setFailed(fails);
    if (count > 0) setStage('Success');
    else toast(fails[0] ?? 'Your tickets could not be issued.', 'error');
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 md:py-12">
      <Steps current={stage} />

      {stage === 'Details' && (
        <form className="mt-10 space-y-6" noValidate onSubmit={(e) => { e.preventDefault(); next(); }}>
          <h1 className="display text-5xl">Your <span className="text-leaf">details</span></h1>
          <div className="panel p-6 space-y-5">
            <div>
              <label htmlFor="name" className="field-label">Name on the tickets</label>
              <input id="name" className="field" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" aria-invalid={!!errors.name} aria-describedby={errors.name ? 'name-err' : undefined} />
              {errors.name && <p id="name-err" className="field-error">{errors.name}</p>}
            </div>
            <div>
              <p className="field-label">Email</p>
              <p className="text-ink-soft break-all">{user.email}</p>
              <p className="field-help">Your tickets are saved to this account.</p>
            </div>
          </div>
          <div className="panel p-6 space-y-4">
            {needs18 && (
              <div>
                <label className="flex items-start gap-3 min-h-[44px]">
                  <input id="adult" type="checkbox" className="mt-1 size-5 accent-[#0B0B0C]" checked={adult} onChange={(e) => setAdult(e.target.checked)} aria-invalid={!!errors.adult} />
                  <span>Everyone on these tickets is 18 or older.</span>
                </label>
                {errors.adult && <p className="field-error">{errors.adult}</p>}
                <AgeNotice className="mt-2 text-ink-soft" />
              </div>
            )}
            <div>
              <label className="flex items-start gap-3 min-h-[44px]">
                <input id="agree" type="checkbox" className="mt-1 size-5 accent-[#0B0B0C]" checked={agree} onChange={(e) => setAgree(e.target.checked)} aria-invalid={!!errors.agree} />
                <span>I accept the <Link to="/terms" className="link" target="_blank">Terms</Link> and the <Link to="/privacy" className="link" target="_blank">Privacy policy</Link>.</span>
              </label>
              {errors.agree && <p className="field-error">{errors.agree}</p>}
            </div>
          </div>
          {missing.length > 0 && <p className="text-sm text-danger font-semibold" role="alert">Some tickets in your cart are no longer available and will not be issued.</p>}
          <button type="submit" className="btn btn-primary btn-lg btn-block">Continue <ArrowRight className="size-5 btn-arrow text-lime" aria-hidden /></button>
        </form>
      )}

      {stage === 'Pay' && (
        <div className="mt-10 space-y-6">
          <h1 className="display text-5xl">{total === 0 ? 'Confirm' : 'Pay'}</h1>
          <div className="rounded-3xl bg-ink text-white p-5 flex gap-3">
            <Info className="size-5 text-lime shrink-0 mt-0.5" aria-hidden />
            <p>
              <strong>No payment is taken.</strong> Online payments are not switched on yet, so confirming issues your tickets without
              charging you.
            </p>
          </div>
          <div className="panel p-6">
            <ul className="divide-y divide-line">
              {priced.map((p) => (
                <li key={p.event.id + p.type.id} className="py-3 flex justify-between gap-4">
                  <span className="min-w-0">
                    <span className="block font-semibold">{p.event.shortTitle}: {p.type.name}</span>
                    <span className="text-sm text-ink-soft num">{p.qty} × {rands(p.type.price)}{p.type.seats > 1 ? `, ${p.qty * p.type.seats} tickets` : ''}</span>
                  </span>
                  <span className="font-bold num shrink-0">{p.type.price === 0 ? 'Free' : randsPlain(p.type.price * p.qty)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 pt-4 border-t border-ink flex items-baseline justify-between">
              <span className="font-semibold">Total <span className="font-normal text-ink-soft num">({tickets} tickets)</span></span>
              <span className="display text-4xl num">{total === 0 ? 'Free' : randsPlain(total)}</span>
            </div>
            {total > 0 && <p className="mt-1 text-sm text-ink-soft text-right">Charged today: R0</p>}
          </div>
          <button type="button" className="btn btn-primary btn-lg btn-block" onClick={confirm} disabled={busy}>
            {busy ? <><Spinner /> Issuing your tickets</> : total === 0 ? 'Get my free tickets' : 'Confirm and get tickets'}
          </button>
          <button type="button" className="btn btn-block text-ink-soft" onClick={() => setStage('Details')} disabled={busy}>Back to details</button>
        </div>
      )}

      {stage === 'Success' && (
        <div className="mt-10 space-y-6 ticket-in">
          <div className="rounded-[2rem] bg-ink text-white p-8 sm:p-10">
            <CheckCircle2 className="size-10 text-lime" aria-hidden />
            <h1 className="display text-5xl sm:text-6xl mt-4">Your tickets are <span className="text-lime">ready</span></h1>
            <p className="mt-3 text-white/85 num">{issued} {issued === 1 ? 'ticket was' : 'tickets were'} added to your account. Nothing was charged.</p>
            <Link to="/profile" className="btn btn-lime btn-lg mt-6">View my tickets <ArrowRight className="size-5 btn-arrow" aria-hidden /></Link>
          </div>
          {failed.length > 0 && (
            <div className="panel p-6 border-danger/40" role="alert">
              <h2 className="font-bold text-danger">Some tickets could not be issued</h2>
              <ul className="mt-2 list-disc pl-5 text-ink-soft">{failed.map((f) => <li key={f}>{f}</li>)}</ul>
              <p className="mt-2 text-sm text-ink-soft">They are still in your cart.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
