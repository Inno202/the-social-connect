// Seeds the LOCAL Firebase emulators only. Never point this at a real project.
//   node scripts/seed.mjs          real MSB content + staff test accounts
//   node scripts/seed.mjs --demo   also adds two clearly labelled demo events sold on this site, for testing checkout
import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
const PROJECT = 'demo-msb-events';
if (!PROJECT.startsWith('demo-')) throw new Error('Seed only runs against demo emulator projects.');

initializeApp({ projectId: PROJECT });
const db = getFirestore();
const auth = getAuth();
const demo = process.argv.includes('--demo');

const events = JSON.parse(readFileSync(new URL('../src/data/events.json', import.meta.url), 'utf8'));
const gallery = JSON.parse(readFileSync(new URL('../src/data/gallery.json', import.meta.url), 'utf8'));
const closes = (e) => Timestamp.fromMillis(new Date(e.endsAt || e.startsAt).getTime() + 12 * 3600e3);

async function wipe() {
  await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
  await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
}

async function putEvent(e) {
  const { ticketTypes = [], id, ...rest } = e;
  await db.doc(`events/${id}`).set({ endsAt: null, ...rest, closesAt: closes(e), updatedAt: Timestamp.now() });
  for (const t of ticketTypes) {
    const { id: tid, ...tr } = t;
    await db.doc(`events/${id}/ticketTypes/${tid}`).set(tr);
  }
}

const base = {
  gatesOpen: null, timeTbc: false, town: 'Welkom', mapQuery: '', is18Plus: true, houseRules: [], amenities: [], refundPolicy: '',
  lineup: [], externalUrl: '', externalSeller: '', gatePrice: null, status: 'published',
};
const DEMO = [
  {
    ...base,
    id: 'demo-test-night-2026',
    title: 'MSB Test Night (demo event)',
    shortTitle: 'Test Night',
    category: 'festival',
    startsAt: '2026-12-12T18:00:00+02:00',
    gatesOpen: '17:00',
    venue: 'Demo venue',
    address: 'For testing only',
    poster: '',
    posterColor: '#0B0B0C',
    description: 'A demo event that exists only in the local test database, to try the full ticket flow: releases, VIP tables and children’s tickets. It is not a real MSB event.',
    houseRules: ['No cooler boxes'],
    amenities: ['Food available'],
    lineup: [{ name: 'Demo DJ' }, { name: 'Demo MC' }],
    sellMode: 'site',
    gatePrice: 300,
    ticketTypes: [
      { id: 'r1', group: 'General', name: '1st release', price: 150, seats: 1, includes: ['General entry'], capacity: 2, sold: 2, order: 1, prevId: null, comingSoon: false },
      { id: 'r2', group: 'General', name: '2nd release', price: 200, seats: 1, includes: ['General entry'], capacity: 300, sold: 0, order: 2, prevId: 'r1', comingSoon: false },
      { id: 'r3', group: 'General', name: '3rd release', price: 250, seats: 1, includes: ['General entry'], capacity: 300, sold: 0, order: 3, prevId: 'r2', comingSoon: false },
      { id: 'vip4', group: 'VIP tables', name: 'VIP table for 4', price: 3000, seats: 4, includes: ['Soft seating', 'A dedicated waitress', 'Parking', 'Cash bar'], capacity: 10, sold: 0, order: 4, prevId: null, comingSoon: false },
      { id: 'vip8', group: 'VIP tables', name: 'VIP table for 8', price: 6000, seats: 8, includes: ['Soft seating', 'A dedicated waitress', 'Parking', 'Cash bar'], capacity: 5, sold: 0, order: 5, prevId: null, comingSoon: false },
      { id: 'kids', group: 'Children', name: 'Child aged 5 to 13', price: 100, seats: 1, includes: ['Entry with an adult'], capacity: 50, sold: 0, order: 6, prevId: null, comingSoon: true },
    ],
  },
  {
    ...base,
    id: 'demo-test-activation-2026',
    title: 'Test Activation (demo event)',
    shortTitle: 'Test Activation',
    category: 'activation',
    startsAt: '2026-12-05T14:00:00+02:00',
    venue: 'Demo venue',
    address: 'For testing only',
    poster: '',
    posterColor: '#4A8A0E',
    description: 'A demo activation with free ticket giveaways, only in the local test database. Not a real MSB event.',
    sellMode: 'site',
    ticketTypes: [
      { id: 'free', group: 'Free tickets', name: 'Free ticket', price: 0, seats: 1, includes: ['Entry to the activation'], capacity: 100, sold: 0, order: 1, prevId: null, comingSoon: false },
    ],
  },
];

const STAFF = [
  ['super@msb.test', 'Sipho Super', 'SUPER_ADMIN'],
  ['admin@msb.test', 'Ayanda Admin', 'ADMIN'],
  ['manager@msb.test', 'Mpho Manager', 'EVENT_MANAGER'],
  ['finance@msb.test', 'Fikile Finance', 'FINANCE'],
  ['scanner@msb.test', 'Sizwe Scanner', 'TICKET_SCANNER'],
];
export const TEST_PASSWORD = 'msb-test-pass';

await wipe();
for (const e of events) await putEvent(e);
if (demo) for (const e of DEMO) await putEvent(e);
for (const g of gallery) {
  const { id, ...rest } = g;
  await db.doc(`gallery/${id}`).set(rest);
}
for (const [email, name, role] of STAFF) {
  const u = await auth.createUser({ email, password: TEST_PASSWORD, displayName: name });
  await db.doc(`users/${u.uid}`).set({ name, email, role, active: true, createdAt: Timestamp.now() });
}
console.log(`Seeded ${events.length + (demo ? DEMO.length : 0)} events, ${gallery.length} gallery items, ${STAFF.length} staff accounts (password ${TEST_PASSWORD}).`);
process.exit(0);
