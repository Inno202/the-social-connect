import { collection, deleteDoc, doc, getDocs, query, runTransaction, serverTimestamp, setDoc, Timestamp, where, type Firestore } from 'firebase/firestore';
import type { Ticket } from './types';

/** A one-time claim code for passing a ticket to a friend. The friend's copy gets a new id (so a new QR code)
 *  and the old ticket is cancelled in the same step, so a screenshot of the old QR code stops working. */
export interface Transfer {
  code: string;
  ticketId: string;
  fromUid: string;
  fromName: string;
  orderId: string;
  eventId: string;
  typeId: string;
  typeName: string;
  seatLabel: string;
  eventTitle: string;
  eventStartsAt: string;
  venue: string;
  poster: string;
  price: number;
  expiresAt: Timestamp;
}

export class TransferError extends Error {}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
/** 28 random characters (about 160 bits): impossible to guess. */
export function newCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(28));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

/** Codes last up to 7 days (a little less, so the server clock always agrees). */
const LIFETIME_MS = 7 * 864e5 - 10 * 60e3;

export async function createTransfer(db: Firestore, t: Ticket, fromName: string): Promise<string> {
  const code = newCode();
  await setDoc(doc(db, 'transfers', code), {
    ticketId: t.id,
    fromUid: t.uid,
    fromName: fromName.slice(0, 80) || 'A friend',
    orderId: t.orderId,
    eventId: t.eventId,
    typeId: t.typeId,
    typeName: t.typeName,
    seatLabel: t.seatLabel,
    eventTitle: t.eventTitle,
    eventStartsAt: t.eventStartsAt,
    venue: t.venue,
    poster: t.poster,
    price: t.price,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromMillis(Date.now() + LIFETIME_MS),
  });
  return code;
}

export async function myTransfers(db: Firestore, uid: string): Promise<Transfer[]> {
  const s = await getDocs(query(collection(db, 'transfers'), where('fromUid', '==', uid)));
  return s.docs.map((d) => ({ code: d.id, ...(d.data() as Omit<Transfer, 'code'>) }));
}

export const cancelTransfer = (db: Firestore, code: string) => deleteDoc(doc(db, 'transfers', code));

/** Claims the ticket for `uid`: creates the new ticket, cancels the old one and uses up the code, all at once. */
export async function claimTransfer(db: Firestore, code: string, uid: string, holderName: string): Promise<string> {
  const ref = doc(db, 'transfers', code);
  const newId = `${code}_0`;
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new TransferError('This transfer link was already used or cancelled.');
    const t = snap.data() as Omit<Transfer, 'code'>;
    if (t.fromUid === uid) throw new TransferError('This is your own ticket. Send the link to the friend who should get it.');
    if (t.expiresAt.toMillis() <= Date.now()) throw new TransferError('This transfer link has expired. Ask your friend for a new one.');
    tx.set(doc(db, 'tickets', newId), {
      uid,
      orderId: t.orderId,
      eventId: t.eventId,
      typeId: t.typeId,
      typeName: t.typeName,
      seatLabel: t.seatLabel,
      holderName: holderName.slice(0, 80),
      eventTitle: t.eventTitle,
      eventStartsAt: t.eventStartsAt,
      venue: t.venue,
      poster: t.poster,
      price: t.price,
      status: 'valid',
      createdAt: serverTimestamp(),
      transferredFrom: t.ticketId,
    });
    tx.update(doc(db, 'tickets', t.ticketId), { status: 'cancelled', transferredTo: code });
    tx.delete(ref);
    return newId;
  });
}
