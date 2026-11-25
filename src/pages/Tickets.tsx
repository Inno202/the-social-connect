import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Minus, Plus, Tag, Users } from 'lucide-react';
import { Steps } from '../components/Steps';
import { Poster } from '../components/Poster';
import { Skeleton } from '../components/ui';
import { useEvent } from '../lib/data';
import { canBuyOnSite, groupTypes, releaseState, remaining } from '../lib/eventState';
import { longDate, rands, randsPlain } from '../lib/format';
import { cart, useCart, MAX_PER_LINE } from '../lib/cart';
import { BuyButton } from './EventPage';
import { useTitle } from '../lib/useTitle';
import type { MsbEvent, TicketType } from '../lib/types';

function Qty({ event, type, max }: { event: MsbEvent; type: TicketType; max: number }) {
  useCart();
  const q = cart.qty(event.id, type.id);
  const label = type.seats > 1 ? 'table' : 'ticket';
  if (q === 0)
    return (
      <button type="button" className="icon-btn icon-btn-dark" aria-label={`Add one ${type.name} ${label}`} onClick={() => cart.set(event.id, type.id, 1)}>
        <Plus aria-hidden />
      </button>
    );
  return (
    <div className="flex items-center gap-1 rounded-full bg-mist p-0.5">
      <button type="button" className="icon-btn icon-btn-ghost" aria-label={`Remove one ${type.name} ${label}`} onClick={() => cart.set(event.id, type.id, q - 1)}>
        <Minus aria-hidden />
      </button>
      <span className="w-6 text-center font-bold num" aria-live="polite" aria-label={`${q} in cart`}>{q}</span>
      <button type="button" className="icon-btn icon-btn-dark" disabled={q >= max} aria-label={`Add one more ${type.name} ${label}`} onClick={() => cart.set(event.id, type.id, q + 1)}>
        <Plus aria-hidden />
      </button>
    </div>
  );
}

function ReleaseCard({ event, type, all }: { event: MsbEvent; type: TicketType; all: TicketType[] }) {
  const state = releaseState(type, all);
  const left = remaining(type);
  return (
    <li className={`rounded-[var(--radius-xl)] border border-line p-5 flex gap-4 items-start ${state === 'on_sale' ? 'bg-white' : 'bg-mist'}`}>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-lg leading-snug break-any">{type.name}</h3>
        <p className="t-card mt-1 num">{rands(type.price)}</p>
        <p className="text-sm text-ink-soft mt-1">{event.shortTitle} · <span className="num">{longDate(event.startsAt)}</span></p>
        {type.seats > 1 && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold"><Users className="size-4 shrink-0" aria-hidden /> Admits {type.seats}. One ticket per seat.</p>
        )}
        {type.includes.length > 0 && (
          <ul className="mt-2 text-sm text-ink-soft list-disc pl-5 space-y-0.5">{type.includes.map((i) => <li key={i}>{i}</li>)}</ul>
        )}
        {state === 'on_sale' && left <= 10 && <p className="mt-2 text-sm font-semibold text-danger num">Only {left} left</p>}
      </div>
      <div className="shrink-0 pt-1">
        {state === 'on_sale' && <Qty event={event} type={type} max={Math.min(MAX_PER_LINE, left)} />}
        {state === 'sold_out' && <span className="pill border border-ink/40 text-ink">Sold out</span>}
        {state === 'coming_soon' && <span className="pill border border-ink/40 text-ink">Coming soon</span>}
      </div>
    </li>
  );
}

export default function Tickets() {
  const { id } = useParams();
  const { event, loading } = useEvent(id);
  const lines = useCart();
  const [filter, setFilter] = useState('All');
  useTitle(event ? `Tickets: ${event.title}` : 'Tickets');

  const types = useMemo(() => (event?.ticketTypes ?? []).filter((t) => t.capacity > 0), [event]);
  const groups = groupTypes(types);
  const shown = filter === 'All' ? groups : groups.filter((g) => g.group === filter);
  const mine = lines.filter((l) => l.eventId === id);
  const count = mine.reduce((n, l) => n + l.qty, 0);
  const total = mine.reduce((n, l) => n + (types.find((t) => t.id === l.typeId)?.price ?? 0) * l.qty, 0);

  if (event === undefined || loading)
    return (
      <div className="wrap max-w-3xl py-10 space-y-4" role="status" aria-label="Loading tickets">
        <Skeleton className="h-10" /><Skeleton className="h-24" /><Skeleton className="h-40" /><Skeleton className="h-40" />
      </div>
    );
  if (!event) return <div className="wrap max-w-3xl py-20"><h1 className="t-title">Event not found</h1></div>;

  const onSale = canBuyOnSite(event);

  return (
    <div className="wrap max-w-3xl py-6 md:py-10 pb-36">
      <Link to={`/events/${event.id}`} className="inline-flex items-center gap-2 min-h-[44px] text-sm font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Back to the event
      </Link>
      <div className="mt-3"><Steps current="Tickets" /></div>

      <div className="mt-8 flex items-center gap-4">
        <div className="size-20 rounded-2xl overflow-hidden shrink-0 bg-mist"><Poster event={event} sizes="80px" /></div>
        <div className="min-w-0">
          <h1 className="display text-4xl sm:text-5xl text-leaf line-clamp-3">{event.title}</h1>
          <p className="text-sm text-ink-soft num">{longDate(event.startsAt)}{event.venue ? ` · ${event.venue}` : ''}</p>
        </div>
      </div>

      {!onSale ? (
        <div className="mt-8 space-y-4"><BuyButton event={event} /></div>
      ) : (
        <>
          {groups.length > 1 && (
            <div role="group" aria-label="Ticket types" className="even-row [--even-min:6.5rem] mt-8" data-chips>
              {['All', ...groups.map((g) => g.group)].map((g) => (
                <button key={g} type="button" className="btn btn-chip" aria-pressed={filter === g} onClick={() => setFilter(g)}>{g}</button>
              ))}
            </div>
          )}
          <div className="mt-8 space-y-10">
            {shown.map((g) => (
              <section key={g.group} aria-labelledby={`grp-${g.group}`}>
                <h2 id={`grp-${g.group}`} className="t-section mb-4">{g.group}</h2>
                <ul className="space-y-3">{g.types.map((t) => <ReleaseCard key={t.id} event={event} type={t} all={types} />)}</ul>
              </section>
            ))}
            {event.gatePrice != null && (filter === 'All' || filter === 'General') && (
              <div className="rounded-[var(--radius-xl)] border border-dashed border-ink/30 p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold">At the gate</p>
                  <p className="text-sm text-ink-soft">For information only. Not sold online.</p>
                </div>
                <p className="t-card num shrink-0">{randsPlain(event.gatePrice)}</p>
              </div>
            )}
          </div>

          <div className="mt-8 rounded-[var(--radius-xl)] bg-mist p-5 flex items-center gap-3 text-ink-soft" aria-disabled="true">
            <Tag className="size-5 shrink-0" aria-hidden />
            <span className="flex-1">Redeem a promo code</span>
            <span className="text-sm font-semibold">Coming soon</span>
          </div>
        </>
      )}

      {count > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-line">
          <div className="wrap max-w-3xl py-3 flex items-center justify-between gap-4">
            <p className="text-sm min-w-0">
              <span className="font-bold num">{count} {count === 1 ? 'item' : 'items'}</span>
              <span className="block t-card num">{total === 0 ? 'Free' : randsPlain(total)}</span>
            </p>
            <Link to="/cart" className="btn btn-primary btn-lg shrink-0">View cart <ArrowRight className="btn-arrow text-lime" aria-hidden /></Link>
          </div>
        </div>
      )}
    </div>
  );
}
