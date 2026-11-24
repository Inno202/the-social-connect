import { useEffect, useMemo, useState } from 'react';
import { collection, collectionGroup, doc, onSnapshot, query, where, type DocumentData } from 'firebase/firestore';
import { db, firebaseReady } from './firebase';
import staticEvents from '../data/events.json';
import staticGallery from '../data/gallery.json';
import type { GalleryItem, MsbEvent, TicketType } from './types';

export const STATIC_EVENTS = staticEvents as unknown as MsbEvent[];
export const STATIC_GALLERY = staticGallery as GalleryItem[];

export function toEvent(id: string, d: DocumentData): MsbEvent {
  return {
    id,
    title: d.title ?? '',
    shortTitle: d.shortTitle ?? d.title ?? '',
    category: d.category ?? 'festival',
    startsAt: d.startsAt ?? '',
    endsAt: d.endsAt ?? null,
    gatesOpen: d.gatesOpen ?? null,
    timeTbc: Boolean(d.timeTbc),
    venue: d.venue ?? '',
    address: d.address ?? '',
    town: d.town ?? '',
    mapQuery: d.mapQuery ?? '',
    poster: d.poster ?? '',
    posterColor: d.posterColor ?? '#0B0B0C',
    is18Plus: Boolean(d.is18Plus),
    description: d.description ?? '',
    houseRules: d.houseRules ?? [],
    amenities: d.amenities ?? [],
    refundPolicy: d.refundPolicy ?? '',
    lineup: d.lineup ?? [],
    sellMode: d.sellMode ?? 'none',
    externalUrl: d.externalUrl ?? '',
    externalSeller: d.externalSeller ?? '',
    gatePrice: typeof d.gatePrice === 'number' ? d.gatePrice : null,
    status: d.status ?? 'draft',
  };
}

export function toType(id: string, d: DocumentData): TicketType {
  return {
    id,
    group: d.group ?? 'General',
    name: d.name ?? '',
    price: d.price ?? 0,
    seats: d.seats ?? 1,
    includes: d.includes ?? [],
    capacity: d.capacity ?? 0,
    sold: d.sold ?? 0,
    order: d.order ?? 0,
    prevId: d.prevId ?? null,
    comingSoon: Boolean(d.comingSoon),
    lastOrderId: d.lastOrderId,
  };
}

/** Public events with their ticket types. Starts from the built-in content, then follows the live database. */
export function useEvents(opts: { includeDrafts?: boolean } = {}) {
  const [events, setEvents] = useState<MsbEvent[] | null>(firebaseReady ? null : STATIC_EVENTS);
  const [types, setTypes] = useState<Record<string, TicketType[]> | null>(firebaseReady ? null : {});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!db) return;
    const q = opts.includeDrafts ? collection(db, 'events') : query(collection(db, 'events'), where('status', 'in', ['published', 'cancelled']));
    const un1 = onSnapshot(
      q,
      (snap) => setEvents(snap.docs.map((d) => toEvent(d.id, d.data()))),
      (e) => {
        setError(e.message);
        setEvents((cur) => cur ?? STATIC_EVENTS);
      },
    );
    const un2 = onSnapshot(
      collectionGroup(db, 'ticketTypes'),
      (snap) => {
        const map: Record<string, TicketType[]> = {};
        snap.docs.forEach((d) => {
          const eventId = d.ref.parent.parent?.id;
          if (!eventId) return;
          (map[eventId] ??= []).push(toType(d.id, d.data()));
        });
        setTypes(map);
      },
      () => setTypes((t) => t ?? {}),
    );
    return () => {
      un1();
      un2();
    };
  }, [opts.includeDrafts]);

  const merged = useMemo(() => {
    if (!events) return null;
    if (!db) return events;
    // Wait for both the events and their ticket types, so prices and carts never flash empty.
    if (!types) return null;
    return events.map((e) => ({ ...e, ticketTypes: (types[e.id] ?? []).sort((a, b) => a.order - b.order) }));
  }, [events, types]);

  return { events: merged, loading: merged === null, error };
}

export function useEvent(id: string | undefined) {
  const staticMatch = STATIC_EVENTS.find((e) => e.id === id) ?? null;
  const [event, setEvent] = useState<MsbEvent | null | undefined>(firebaseReady ? undefined : staticMatch);
  const [types, setTypes] = useState<TicketType[] | null>(null);

  useEffect(() => {
    if (!db || !id) return;
    const un1 = onSnapshot(
      doc(db, 'events', id),
      (d) => setEvent(d.exists() ? toEvent(d.id, d.data()) : null),
      () => setEvent(null),
    );
    const un2 = onSnapshot(
      collection(db, 'events', id, 'ticketTypes'),
      (snap) => setTypes(snap.docs.map((d) => toType(d.id, d.data())).sort((a, b) => a.order - b.order)),
      () => setTypes([]),
    );
    return () => {
      un1();
      un2();
    };
  }, [id]);

  if (!db) return { event, loading: false };
  if (event === undefined) return { event: undefined, loading: true };
  return { event: event ? { ...event, ticketTypes: types ?? [] } : null, loading: types === null && !!event };
}

export function useGallery() {
  const [items, setItems] = useState<GalleryItem[] | null>(firebaseReady ? null : STATIC_GALLERY);
  useEffect(() => {
    if (!db) return;
    return onSnapshot(
      collection(db, 'gallery'),
      (snap) =>
        setItems(
          snap.docs.map((d) => {
            const x = d.data();
            return { id: d.id, src: x.src, alt: x.alt ?? '', group: x.group ?? '', year: x.year ?? 0, order: x.order ?? 0 };
          }),
        ),
      () => setItems(STATIC_GALLERY),
    );
  }, []);
  return items;
}

/** Local posters are stored without extension; this picks the right file. */
export function posterSrc(poster: string, size: 'sm' | 'lg' | 'jpg' = 'lg'): string {
  if (!poster) return '';
  if (/^https:\/\//.test(poster)) {
    if (poster.includes('res.cloudinary.com') && poster.includes('/upload/')) {
      const t = size === 'sm' ? 'c_limit,w_400,f_auto,q_auto' : size === 'jpg' ? 'c_limit,w_600,f_jpg,q_auto' : 'c_limit,w_1000,f_auto,q_auto';
      return poster.replace('/upload/', `/upload/${t}/`);
    }
    return poster;
  }
  if (poster.startsWith('/posters/')) return size === 'sm' ? `${poster}-sm.webp` : size === 'jpg' ? `${poster}.jpg` : `${poster}.webp`;
  return '';
}
