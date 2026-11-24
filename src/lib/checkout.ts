import { doc, collection, runTransaction, serverTimestamp, type Firestore } from 'firebase/firestore';
import { toEvent, toType } from './data';
import { releaseState, isPast } from './eventState';
import type { CartLine } from './types';

export const MAX_TICKETS_PER_EVENT = 20;

export class CheckoutError extends Error {}

/**
 * Issues tickets for one cart line in one transaction: the order, one ticket per seat, the
 * release's sold counter and the buyer's per-event holding move together, so counts can never drift.
 * No money is taken: there is no payment provider connected yet. Firestore rules check every value.
 */
export async function issueLine(db: Firestore, uid: string, holderName: string, line: CartLine): Promise<{ orderId: string; tickets: number }> {
  const orderRef = doc(collection(db, 'orders'));
  const orderId = orderRef.id;
  const eventRef = doc(db, 'events', line.eventId);
  const typeRef = doc(db, 'events', line.eventId, 'ticketTypes', line.typeId);
  const holdingRef = doc(db, 'holdings', `${uid}_${line.eventId}`);

  return runTransaction(db, async (tx) => {
    const [evSnap, typeSnap, holdSnap] = await Promise.all([tx.get(eventRef), tx.get(typeRef), tx.get(holdingRef)]);
    if (!evSnap.exists() || !typeSnap.exists()) throw new CheckoutError('This ticket is no longer available.');
    const ev = toEvent(evSnap.id, evSnap.data());
    const type = toType(typeSnap.id, typeSnap.data());
    if (ev.sellMode !== 'site' || ev.status !== 'published' || isPast(ev)) throw new CheckoutError(`${ev.title} is not on sale here.`);

    let prev = null;
    if (type.prevId) {
      const p = await tx.get(doc(db, 'events', line.eventId, 'ticketTypes', type.prevId));
      prev = p.exists() ? toType(p.id, p.data()) : null;
    }
    const state = releaseState(type, prev ? [type, prev] : [type]);
    if (state !== 'on_sale') throw new CheckoutError(`${type.name} is ${state === 'sold_out' ? 'sold out' : 'not on sale yet'}.`);
    if (type.sold + line.qty > type.capacity) throw new CheckoutError(`Only ${type.capacity - type.sold} left for ${type.name}.`);

    const ticketCount = line.qty * type.seats;
    const held = holdSnap.exists() ? (holdSnap.data().count as number) : 0;
    if (held + ticketCount > MAX_TICKETS_PER_EVENT)
      throw new CheckoutError(`You can hold up to ${MAX_TICKETS_PER_EVENT} tickets for one event.`);

    tx.set(orderRef, {
      uid,
      eventId: ev.id,
      typeId: type.id,
      qty: line.qty,
      price: type.price,
      total: type.price * line.qty,
      ticketCount,
      payment: 'none',
      createdAt: serverTimestamp(),
    });
    tx.update(typeRef, { sold: type.sold + line.qty, lastOrderId: orderId });
    tx.set(holdingRef, { uid, eventId: ev.id, count: held + ticketCount, lastOrderId: orderId });
    let n = 0;
    for (let unit = 0; unit < line.qty; unit++) {
      for (let seat = 0; seat < type.seats; seat++) {
        tx.set(doc(db, 'tickets', `${orderId}_${n}`), {
          uid,
          orderId,
          eventId: ev.id,
          typeId: type.id,
          typeName: type.name,
          seatLabel: type.seats > 1 ? `Seat ${seat + 1} of ${type.seats}${line.qty > 1 ? `, table ${unit + 1}` : ''}` : '',
          holderName: holderName.slice(0, 80),
          eventTitle: ev.title,
          eventStartsAt: ev.startsAt,
          venue: [ev.venue, ev.town].filter(Boolean).join(', '),
          poster: ev.poster,
          price: type.price,
          status: 'valid',
          createdAt: serverTimestamp(),
        });
        n++;
      }
    }
    return { orderId, tickets: ticketCount };
  });
}
