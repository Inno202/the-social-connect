import { Timestamp, collection, doc, getDocs, serverTimestamp, setDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { closesAt } from '../../lib/eventState';
import type { MsbEvent, TicketType } from '../../lib/types';
import { logActivity } from '../../lib/activity';

export function eventPayload(e: MsbEvent) {
  return {
    title: e.title.trim(),
    shortTitle: e.shortTitle.trim(),
    category: e.category,
    startsAt: e.startsAt,
    endsAt: e.endsAt || null,
    gatesOpen: e.gatesOpen || null,
    timeTbc: e.timeTbc,
    venue: e.venue.trim(),
    address: e.address.trim(),
    town: e.town.trim(),
    mapQuery: e.mapQuery.trim(),
    poster: e.poster.trim(),
    posterColor: e.posterColor,
    is18Plus: e.is18Plus,
    description: e.description.trim(),
    houseRules: e.houseRules.filter(Boolean),
    amenities: e.amenities.filter(Boolean),
    refundPolicy: e.refundPolicy.trim(),
    lineup: e.lineup.filter((l) => l.name.trim()).map((l) => ({ name: l.name.trim(), ...(l.group ? { group: l.group } : {}), ...(l.photo ? { photo: l.photo } : {}) })),
    sellMode: e.sellMode,
    externalUrl: e.sellMode === 'external' ? e.externalUrl.trim() : '',
    externalSeller: e.sellMode === 'external' ? e.externalSeller.trim() : '',
    gatePrice: e.gatePrice,
    status: e.status,
    closesAt: Timestamp.fromMillis(closesAt(e)),
    updatedAt: serverTimestamp(),
  };
}

function typePayload(t: TicketType) {
  return {
    group: t.group.trim(),
    name: t.name.trim(),
    price: Math.round(t.price),
    seats: Math.round(t.seats),
    includes: t.includes.filter(Boolean),
    capacity: Math.round(t.capacity),
    order: Math.round(t.order),
    prevId: t.prevId || null,
    comingSoon: t.comingSoon,
  };
}

/** Saves the event, then its ticket types. Sold counters are never written by staff. */
export async function saveEvent(e: MsbEvent, types: TicketType[], existingTypeIds: string[], isNew: boolean) {
  if (!db) throw new Error('Not connected');
  await setDoc(doc(db, 'events', e.id), eventPayload(e));
  for (const t of types) {
    const ref = doc(db, 'events', e.id, 'ticketTypes', t.id);
    if (existingTypeIds.includes(t.id)) await updateDoc(ref, typePayload(t));
    else await setDoc(ref, { ...typePayload(t), sold: 0 });
  }
  for (const id of existingTypeIds.filter((id) => !types.some((t) => t.id === id))) {
    await deleteDoc(doc(db, 'events', e.id, 'ticketTypes', id));
  }
  await logActivity(isNew ? 'Created event' : 'Edited event', e.title, e.id);
}

export async function duplicateEvent(e: MsbEvent): Promise<string> {
  if (!db) throw new Error('Not connected');
  const id = `${e.id.replace(/-copy-[a-z0-9]+$/, '')}-copy-${Math.random().toString(36).slice(2, 6)}`;
  const copy: MsbEvent = { ...e, id, title: `${e.title} (copy)`.slice(0, 140), status: 'draft' };
  const types = (await getDocs(collection(db, 'events', e.id, 'ticketTypes'))).docs;
  await setDoc(doc(db, 'events', id), eventPayload(copy));
  const b = writeBatch(db);
  types.forEach((d) => {
    const x = d.data();
    b.set(doc(db!, 'events', id, 'ticketTypes', d.id), {
      group: x.group, name: x.name, price: x.price, seats: x.seats, includes: x.includes ?? [], capacity: x.capacity,
      order: x.order, prevId: x.prevId ?? null, comingSoon: Boolean(x.comingSoon), sold: 0,
    });
  });
  await b.commit();
  await logActivity('Duplicated event', e.title, id);
  return id;
}

export async function setEventStatus(e: MsbEvent, status: MsbEvent['status']) {
  if (!db) return;
  await setDoc(doc(db, 'events', e.id), eventPayload({ ...e, status }));
  await logActivity(status === 'cancelled' ? 'Cancelled event' : 'Changed event status', e.title, `${e.id}: ${status}`);
}

export function slugify(s: string) {
  return s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'event';
}
