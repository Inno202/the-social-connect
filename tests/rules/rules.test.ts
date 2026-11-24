import 'firebase/compat/firestore';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { Timestamp, doc, getDoc, setDoc, updateDoc, writeBatch, serverTimestamp, collection, getDocs, query, where, addDoc, deleteDoc, type Firestore } from 'firebase/firestore';
import { issueLine } from '../../src/lib/checkout';

let env: RulesTestEnvironment;
const now = Date.now();
const future = (days: number) => new Date(now + days * 864e5);
function isoSast(d: Date) {
  const s = new Date(d.getTime() + 2 * 3600e3).toISOString().slice(0, 16);
  return `${s}:00+02:00`;
}

function eventDoc(over: Record<string, unknown> = {}) {
  const starts = future(10);
  return {
    title: 'Test Blow', shortTitle: 'Test', category: 'festival', startsAt: isoSast(starts), endsAt: null, gatesOpen: '12:00',
    timeTbc: false, venue: 'Robs Cricket Club', address: 'Riebeeckstad', town: 'Welkom', mapQuery: '', poster: '/posters/spring-blow-2026',
    posterColor: '#F28C1B', is18Plus: true, description: '', houseRules: [], amenities: [], refundPolicy: '', lineup: [],
    sellMode: 'site', externalUrl: '', externalSeller: '', gatePrice: 300, status: 'published',
    closesAt: Timestamp.fromDate(new Date(starts.getTime() + 12 * 3600e3)), updatedAt: Timestamp.now(),
    ...over,
  };
}
const type = (over: Record<string, unknown> = {}) => ({
  group: 'General', name: '2nd release', price: 200, seats: 1, includes: [], capacity: 100, sold: 0, order: 2, prevId: null, comingSoon: false, ...over,
});

async function seed() {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore() as unknown as Firestore;
    const users: [string, string, boolean?][] = [
      ['alice', 'USER'], ['bob', 'USER'], ['super', 'SUPER_ADMIN'], ['admin', 'ADMIN'], ['manager', 'EVENT_MANAGER'],
      ['finance', 'FINANCE'], ['scanner', 'TICKET_SCANNER'], ['oldadmin', 'ADMIN', false],
    ];
    for (const [uid, role, active] of users) await setDoc(doc(db, 'users', uid), { name: uid, email: `${uid}@test.msb`, role, active: active ?? true });
    await setDoc(doc(db, 'events', 'ev'), eventDoc());
    await setDoc(doc(db, 'events', 'ev', 'ticketTypes', 'r1'), type({ name: '1st release', price: 150, capacity: 2, sold: 2, order: 1 }));
    await setDoc(doc(db, 'events', 'ev', 'ticketTypes', 'r2'), type({ prevId: 'r1' }));
    await setDoc(doc(db, 'events', 'ev', 'ticketTypes', 'r3'), type({ name: '3rd release', price: 250, order: 3, prevId: 'r2' }));
    await setDoc(doc(db, 'events', 'ev', 'ticketTypes', 'soon'), type({ name: 'Soon', comingSoon: true }));
    await setDoc(doc(db, 'events', 'ev', 'ticketTypes', 'vip8'), type({ group: 'VIP tables', name: 'VIP table for 8', price: 6000, seats: 8, capacity: 5 }));
    await setDoc(doc(db, 'events', 'ev', 'ticketTypes', 'free'), type({ group: 'Free tickets', name: 'Free ticket', price: 0, capacity: 50 }));
    await setDoc(doc(db, 'events', 'ext'), eventDoc({ sellMode: 'external', externalUrl: 'https://www.computicket.com/' }));
    await setDoc(doc(db, 'events', 'ext', 'ticketTypes', 'g'), type());
    const pastStart = new Date(now - 2 * 864e5);
    await setDoc(doc(db, 'events', 'past'), eventDoc({ startsAt: isoSast(pastStart), closesAt: Timestamp.fromDate(new Date(pastStart.getTime() + 12 * 3600e3)) }));
    await setDoc(doc(db, 'events', 'past', 'ticketTypes', 'g'), type());
    await setDoc(doc(db, 'events', 'draft'), eventDoc({ status: 'draft' }));
  });
}

const as = (uid: string, token: Record<string, unknown> = {}) =>
  env.authenticatedContext(uid, { email: `${uid}@test.msb`, auth_time: Math.floor(Date.now() / 1000), ...token }).firestore() as unknown as Firestore;
const anon = () => env.unauthenticatedContext().firestore() as unknown as Firestore;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-msb-rules',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
afterAll(async () => env?.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await seed();
});

/** A hand-built order batch, so single fields can be forged. */
function forgedOrder(db: Firestore, uid: string, over: { order?: Record<string, unknown>; sold?: number; tickets?: number; typeName?: string; held?: number; typeId?: string; eventId?: string } = {}) {
  const b = writeBatch(db);
  const orderId = 'order' + Math.random().toString(36).slice(2, 12);
  const eventId = over.eventId ?? 'ev';
  const typeId = over.typeId ?? 'r2';
  const qty = (over.order?.qty as number) ?? 1;
  b.set(doc(db, 'orders', orderId), { uid, eventId, typeId, qty, price: 200, total: 200 * qty, ticketCount: qty, payment: 'none', createdAt: serverTimestamp(), ...over.order });
  b.update(doc(db, 'events', eventId, 'ticketTypes', typeId), { sold: over.sold ?? qty, lastOrderId: orderId });
  b.set(doc(db, 'holdings', `${uid}_${eventId}`), { uid, eventId, count: over.held ?? qty, lastOrderId: orderId });
  for (let n = 0; n < (over.tickets ?? qty); n++) {
    b.set(doc(db, 'tickets', `${orderId}_${n}`), {
      uid, orderId, eventId, typeId, typeName: over.typeName ?? '2nd release', seatLabel: '', holderName: 'Alice', eventTitle: 'Test Blow',
      eventStartsAt: eventDoc().startsAt, venue: 'Robs Cricket Club, Welkom', poster: '/posters/spring-blow-2026', price: (over.order?.price as number) ?? 200,
      status: 'valid', createdAt: serverTimestamp(),
    });
  }
  return { batch: b, orderId };
}

describe('public reading', () => {
  it('anyone reads published events and ticket types', async () => {
    await assertSucceeds(getDoc(doc(anon(), 'events', 'ev')));
    await assertSucceeds(getDoc(doc(anon(), 'events', 'ev', 'ticketTypes', 'r2')));
  });
  it('drafts are hidden from the public but visible to staff', async () => {
    await assertFails(getDoc(doc(anon(), 'events', 'draft')));
    await assertSucceeds(getDoc(doc(as('manager'), 'events', 'draft')));
  });
  it('unknown collections are closed', async () => {
    await assertFails(getDoc(doc(anon(), 'secrets', 'x')));
    await assertFails(setDoc(doc(as('super'), 'secrets', 'x'), { a: 1 }));
  });
});

describe('accounts and roles', () => {
  it('a person creates their own profile as a customer only', async () => {
    const db = as('carol');
    await assertFails(setDoc(doc(db, 'users', 'carol'), { name: 'Carol', email: 'carol@test.msb', role: 'ADMIN', active: true, createdAt: serverTimestamp() }));
    await assertSucceeds(setDoc(doc(db, 'users', 'carol'), { name: 'Carol', email: 'carol@test.msb', role: 'USER', active: true, createdAt: serverTimestamp() }));
  });
  it('a person cannot raise their own role', async () => {
    await assertFails(updateDoc(doc(as('alice'), 'users', 'alice'), { role: 'ADMIN' }));
    await assertSucceeds(updateDoc(doc(as('alice'), 'users', 'alice'), { name: 'Alice M' }));
  });
  it('people cannot read each other', async () => {
    await assertFails(getDoc(doc(as('alice'), 'users', 'bob')));
  });
  it('only the super admin changes roles, and only with a recent sign-in', async () => {
    await assertFails(updateDoc(doc(as('admin'), 'users', 'alice'), { role: 'TICKET_SCANNER' }));
    await assertFails(updateDoc(doc(as('super', { auth_time: Math.floor(Date.now() / 1000) - 9 * 3600 }), 'users', 'alice'), { role: 'TICKET_SCANNER' }));
    await assertSucceeds(updateDoc(doc(as('super'), 'users', 'alice'), { role: 'TICKET_SCANNER' }));
    await assertFails(updateDoc(doc(as('super'), 'users', 'super'), { role: 'USER' }));
  });
  it('a deactivated admin loses access at once', async () => {
    await assertFails(getDoc(doc(as('oldadmin'), 'events', 'draft')));
  });
});

describe('buying tickets', () => {
  it('a real checkout issues the order, tickets, counter and holding together', async () => {
    const db = as('alice');
    const res = await issueLine(db, 'alice', 'Alice', { eventId: 'ev', typeId: 'r2', qty: 2 });
    expect(res.tickets).toBe(2);
    const t = await getDoc(doc(db, 'events', 'ev', 'ticketTypes', 'r2'));
    expect(t.data()?.sold).toBe(2);
  });
  it('the largest order (an 8-seat table) fits in one write', async () => {
    const res = await issueLine(as('alice'), 'alice', 'Alice', { eventId: 'ev', typeId: 'vip8', qty: 1 });
    expect(res.tickets).toBe(8);
  });
  it('free tickets use the same flow', async () => {
    const res = await issueLine(as('alice'), 'alice', 'Alice', { eventId: 'ev', typeId: 'free', qty: 1 });
    expect(res.tickets).toBe(1);
  });
  it('a valid hand-built order passes (control for the forged cases)', async () => {
    await assertSucceeds(forgedOrder(as('alice'), 'alice').batch.commit());
  });
  it('rejects a forged price', async () => {
    await assertFails(forgedOrder(as('alice'), 'alice', { order: { price: 1, total: 1 } }).batch.commit());
  });
  it('rejects extra tickets beyond what the order covers', async () => {
    await assertFails(forgedOrder(as('alice'), 'alice', { tickets: 2 }).batch.commit());
  });
  it('rejects a sold counter that does not move by the quantity', async () => {
    await assertFails(forgedOrder(as('alice'), 'alice', { sold: 0 }).batch.commit());
  });
  it('rejects moving the sold counter without an order', async () => {
    await assertFails(updateDoc(doc(as('alice'), 'events', 'ev', 'ticketTypes', 'r2'), { sold: 100, lastOrderId: 'nothing' }));
  });
  it('rejects a forged ticket type name', async () => {
    await assertFails(forgedOrder(as('alice'), 'alice', { typeName: 'VIP table for 8' }).batch.commit());
  });
  it('rejects an order placed for someone else', async () => {
    await assertFails(forgedOrder(as('alice'), 'bob').batch.commit());
  });
  it('rejects a sold-out release and a release whose turn has not come', async () => {
    await assertFails(forgedOrder(as('alice'), 'alice', { typeId: 'r1', order: { price: 150, total: 150 } }).batch.commit());
    await assertFails(forgedOrder(as('alice'), 'alice', { typeId: 'r3', order: { price: 250, total: 250 } }).batch.commit());
    await assertFails(forgedOrder(as('alice'), 'alice', { typeId: 'soon' }).batch.commit());
  });
  it('rejects events sold elsewhere and events that are over', async () => {
    await assertFails(forgedOrder(as('alice'), 'alice', { eventId: 'ext', typeId: 'g' }).batch.commit());
    await assertFails(forgedOrder(as('alice'), 'alice', { eventId: 'past', typeId: 'g' }).batch.commit());
  });
  it('limits one account to 20 tickets per event', async () => {
    const db = as('alice');
    await issueLine(db, 'alice', 'Alice', { eventId: 'ev', typeId: 'vip8', qty: 2 });
    await issueLine(db, 'alice', 'Alice', { eventId: 'ev', typeId: 'r2', qty: 4 });
    await expect(issueLine(db, 'alice', 'Alice', { eventId: 'ev', typeId: 'r2', qty: 1 })).rejects.toThrow();
    // and the holding cannot simply be under-reported
    await assertFails(forgedOrder(db, 'alice', { held: 0 }).batch.commit());
  });
});

describe('tickets and the door', () => {
  async function buy() {
    const { orderId } = await issueLine(as('alice'), 'alice', 'Alice', { eventId: 'ev', typeId: 'r2', qty: 1 });
    return `${orderId}_0`;
  }
  it('people read only their own tickets; door staff read all', async () => {
    const id = await buy();
    await assertSucceeds(getDoc(doc(as('alice'), 'tickets', id)));
    await assertFails(getDoc(doc(as('bob'), 'tickets', id)));
    await assertSucceeds(getDoc(doc(as('scanner'), 'tickets', id)));
    await assertSucceeds(getDocs(query(collection(as('scanner'), 'tickets'), where('eventId', '==', 'ev'))));
    await assertFails(getDocs(query(collection(as('bob'), 'tickets'), where('eventId', '==', 'ev'))));
  });
  it('a scanner admits a ticket once', async () => {
    const id = await buy();
    const s = as('scanner');
    await assertSucceeds(updateDoc(doc(s, 'tickets', id), { status: 'used', usedAt: serverTimestamp(), usedBy: 'scanner' }));
    await assertFails(updateDoc(doc(s, 'tickets', id), { status: 'used', usedAt: serverTimestamp(), usedBy: 'scanner' }));
  });
  it('customers cannot scan their own tickets, and scans cannot be signed as someone else', async () => {
    const id = await buy();
    await assertFails(updateDoc(doc(as('alice'), 'tickets', id), { status: 'used', usedAt: serverTimestamp(), usedBy: 'alice' }));
    await assertFails(updateDoc(doc(as('scanner'), 'tickets', id), { status: 'used', usedAt: serverTimestamp(), usedBy: 'admin' }));
    await assertFails(updateDoc(doc(as('finance'), 'tickets', id), { status: 'used', usedAt: serverTimestamp(), usedBy: 'finance' }));
  });
  it('tickets for a cancelled event cannot be scanned in', async () => {
    const id = await buy();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore() as unknown as Firestore, 'events', 'ev'), { status: 'cancelled' });
    });
    await assertFails(updateDoc(doc(as('scanner'), 'tickets', id), { status: 'used', usedAt: serverTimestamp(), usedBy: 'scanner' }));
  });
  it('the owner can change the guest name on an unused ticket, and nothing else', async () => {
    const id = await buy();
    await assertSucceeds(updateDoc(doc(as('alice'), 'tickets', id), { holderName: 'Thabo M' }));
    await assertFails(updateDoc(doc(as('bob'), 'tickets', id), { holderName: 'Bob' }));
    await assertFails(updateDoc(doc(as('alice'), 'tickets', id), { holderName: 'Thabo', typeName: 'VIP table for 8' }));
    await assertFails(updateDoc(doc(as('alice'), 'tickets', id), { holderName: '' }));
    await assertSucceeds(updateDoc(doc(as('scanner'), 'tickets', id), { status: 'used', usedAt: serverTimestamp(), usedBy: 'scanner' }));
    await assertFails(updateDoc(doc(as('alice'), 'tickets', id), { holderName: 'Someone else' }));
  });
  it('guest names chosen at checkout go on each seat of a table', async () => {
    const { orderId } = await issueLine(as('alice'), 'alice', 'Alice', { eventId: 'ev', typeId: 'vip8', qty: 1 }, ['Alice', 'Thabo', '', 'Lerato']);
    const seat2 = await getDoc(doc(as('alice'), 'tickets', `${orderId}_1`));
    const seat3 = await getDoc(doc(as('alice'), 'tickets', `${orderId}_2`));
    expect(seat2.data()?.holderName).toBe('Thabo');
    expect(seat3.data()?.holderName).toBe('Alice');
  });
  it('only admins cancel tickets', async () => {
    const id = await buy();
    await assertFails(updateDoc(doc(as('scanner'), 'tickets', id), { status: 'cancelled' }));
    await assertSucceeds(updateDoc(doc(as('admin'), 'tickets', id), { status: 'cancelled' }));
  });
});

describe('staff content', () => {
  it('event staff edit events; finance and customers cannot', async () => {
    await assertSucceeds(setDoc(doc(as('manager'), 'events', 'new'), eventDoc({ updatedAt: serverTimestamp() })));
    await assertFails(setDoc(doc(as('finance'), 'events', 'new2'), eventDoc({ updatedAt: serverTimestamp() })));
    await assertFails(setDoc(doc(as('alice'), 'events', 'new3'), eventDoc({ updatedAt: serverTimestamp() })));
  });
  it('rejects unsafe links and unknown fields on events', async () => {
    await assertFails(setDoc(doc(as('manager'), 'events', 'x'), eventDoc({ updatedAt: serverTimestamp(), externalUrl: 'javascript:alert(1)' })));
    await assertFails(setDoc(doc(as('manager'), 'events', 'x'), eventDoc({ updatedAt: serverTimestamp(), poster: 'https://evil.example/x.svg' })));
    await assertFails(setDoc(doc(as('manager'), 'events', 'x'), eventDoc({ updatedAt: serverTimestamp(), isFree: true })));
  });
  it('staff cannot rewrite the sold counter of a release', async () => {
    await assertFails(updateDoc(doc(as('manager'), 'events', 'ev', 'ticketTypes', 'r2'), { sold: 50 }));
    await assertSucceeds(updateDoc(doc(as('manager'), 'events', 'ev', 'ticketTypes', 'r2'), { price: 220 }));
  });
  it('gallery accepts only Cloudinary or built-in images', async () => {
    const ok = { src: 'https://res.cloudinary.com/msb/image/upload/v1/msb/gallery/a.jpg', alt: 'Crowd', group: 'Spring Blow', year: 2026, order: 1 };
    await assertSucceeds(setDoc(doc(as('manager'), 'gallery', 'a'), ok));
    await assertFails(setDoc(doc(as('manager'), 'gallery', 'b'), { ...ok, src: 'javascript:alert(1)' }));
    await assertFails(setDoc(doc(as('alice'), 'gallery', 'c'), ok));
  });
  it('the activity log is append-only, signed by the actor, and read by the super admin only', async () => {
    const entry = { actor: 'manager', actorName: 'manager', action: 'Edited event', target: 'ev', detail: '', at: serverTimestamp() };
    const ref = await assertSucceeds(addDoc(collection(as('manager'), 'activity'), entry));
    await assertFails(addDoc(collection(as('manager'), 'activity'), { ...entry, actor: 'super' }));
    await assertFails(addDoc(collection(as('alice'), 'activity'), { ...entry, actor: 'alice' }));
    await assertFails(getDoc(doc(as('admin'), 'activity', ref.id)));
    await assertSucceeds(getDoc(doc(as('super'), 'activity', ref.id)));
    await assertFails(deleteDoc(doc(as('super'), 'activity', ref.id)));
  });
});
