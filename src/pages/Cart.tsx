import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Trash2 } from 'lucide-react';
import { PageHero } from '../components/Layout';
import { Poster } from '../components/Poster';
import { Skeleton, confirmAction, toast } from '../components/ui';
import { useCart, cart } from '../lib/cart';
import { useEvents } from '../lib/data';
import { longDate, rands, randsPlain } from '../lib/format';
import { useAuth } from '../lib/auth';
import { useTitle } from '../lib/useTitle';
import type { MsbEvent, TicketType } from '../lib/types';

export interface PricedLine { event: MsbEvent; type: TicketType; qty: number }

export function usePricedCart() {
  const lines = useCart();
  const { events, loading } = useEvents();
  const priced: PricedLine[] = [];
  const missing: typeof lines = [];
  lines.forEach((l) => {
    const event = events?.find((e) => e.id === l.eventId);
    const type = event?.ticketTypes?.find((t) => t.id === l.typeId);
    if (event && type) priced.push({ event, type, qty: l.qty });
    else missing.push(l);
  });
  const byEvent: { event: MsbEvent; lines: PricedLine[] }[] = [];
  priced.forEach((p) => {
    let g = byEvent.find((x) => x.event.id === p.event.id);
    if (!g) byEvent.push((g = { event: p.event, lines: [] }));
    g.lines.push(p);
  });
  const total = priced.reduce((n, p) => n + p.type.price * p.qty, 0);
  const tickets = priced.reduce((n, p) => n + p.type.seats * p.qty, 0);
  return { priced, byEvent, total, tickets, loading: loading && lines.length > 0, missing };
}

export default function Cart() {
  useTitle('Cart');
  const { byEvent, total, tickets, loading } = usePricedCart();
  const { user } = useAuth();
  const nav = useNavigate();

  return (
    <>
      <PageHero title="Your cart" />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 md:py-14">
        {loading && <div className="space-y-3" role="status" aria-label="Loading cart"><Skeleton className="h-40" /><Skeleton className="h-24" /></div>}
        {!loading && byEvent.length === 0 && (
          <div className="panel p-8">
            <h2 className="display text-3xl">Your cart is empty</h2>
            <p className="mt-2 text-ink-soft">Choose an event and add tickets to see them here.</p>
            <Link to="/events" className="btn btn-primary mt-6">See events</Link>
          </div>
        )}
        <div className="space-y-6">
          {byEvent.map(({ event, lines }) => (
            <section key={event.id} className="panel p-5 sm:p-6" aria-labelledby={`cart-${event.id}`}>
              <div className="flex items-center gap-4">
                <div className="size-16 rounded-2xl overflow-hidden bg-mist shrink-0"><Poster event={event} size="sm" /></div>
                <div className="min-w-0">
                  <h2 id={`cart-${event.id}`} className="display text-2xl sm:text-3xl line-clamp-2">{event.title}</h2>
                  <p className="text-sm text-ink-soft num">{longDate(event.startsAt)}</p>
                </div>
              </div>
              <ul className="mt-5 divide-y divide-line">
                {lines.map(({ type, qty }) => (
                  <li key={type.id} className="py-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{type.group}: {type.name}</p>
                      <p className="text-sm text-ink-soft num">
                        {qty} × {rands(type.price)}{type.seats > 1 ? ` · ${qty * type.seats} tickets (one per seat)` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <p className="font-bold num mr-1">{type.price === 0 ? 'Free' : randsPlain(type.price * qty)}</p>
                      <button
                        type="button"
                        className="icon-btn text-danger hover:bg-danger/10"
                        aria-label={`Remove ${type.name} from cart`}
                        onClick={() => { cart.set(event.id, type.id, 0); toast(`${type.name} removed from your cart`, 'info'); }}
                      >
                        <Trash2 className="size-5" aria-hidden />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <Link to={`/events/${event.id}/tickets`} className="link text-sm inline-flex min-h-[44px] items-center">Change tickets</Link>
            </section>
          ))}
        </div>

        {byEvent.length > 0 && (
          <div className="mt-8 panel p-6">
            <div className="flex items-baseline justify-between gap-4">
              <p className="font-semibold">Total <span className="text-ink-soft font-normal num">({tickets} {tickets === 1 ? 'ticket' : 'tickets'})</span></p>
              <p className="display text-4xl num">{total === 0 ? 'Free' : randsPlain(total)}</p>
            </div>
            <p className="mt-3 text-sm text-ink-soft">No payment is taken on this site yet. Checkout issues your tickets without charging you.</p>
            <button type="button" className="btn btn-primary btn-lg btn-block mt-5" onClick={() => nav(user ? '/checkout' : '/account?next=/checkout')}>
              Checkout <ArrowRight className="size-5 btn-arrow text-lime" aria-hidden />
            </button>
            <button
              type="button"
              className="btn btn-block mt-2 text-ink-soft hover:text-danger"
              onClick={async () => {
                if (await confirmAction({ title: 'Empty your cart?', message: 'All tickets in your cart will be removed.', confirmLabel: 'Empty cart', tone: 'danger' })) cart.clear();
              }}
            >
              Empty cart
            </button>
          </div>
        )}
      </div>
    </>
  );
}
