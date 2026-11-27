import { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, query, where, type DocumentData } from 'firebase/firestore';
import { db, firebaseReady } from './firebase';
import staticEvents from '../data/events.json';
import staticGallery from '../data/gallery.json';
import imageSizes from '../data/imageSizes.json';
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
  const [types, setTypes] = useState<Record<string, TicketType[]>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!db) return;
    const q = opts.includeDrafts ? collection(db, 'events') : query(collection(db, 'events'), where('status', 'in', ['published', 'cancelled']));
    return onSnapshot(
      q,
      (snap) => setEvents(snap.docs.map((d) => toEvent(d.id, d.data()))),
      (e) => {
        setError(e.message);
        setEvents((cur) => cur ?? STATIC_EVENTS);
      },
    );
  }, [opts.includeDrafts]);

  // One small listener per event (no collection-group query, so the live database needs no extra index).
  const ids = (events ?? []).map((e) => e.id).sort().join('|');
  useEffect(() => {
    if (!db || !ids) return;
    const subs = ids.split('|').map((id) =>
      onSnapshot(
        collection(db!, 'events', id, 'ticketTypes'),
        (snap) => setTypes((cur) => ({ ...cur, [id]: snap.docs.map((d) => toType(d.id, d.data())).sort((a, b) => a.order - b.order) })),
        () => setTypes((cur) => ({ ...cur, [id]: [] })),
      ),
    );
    return () => subs.forEach((u) => u());
  }, [ids]);

  const merged = useMemo(() => {
    if (!events) return null;
    if (!db) return events;
    // Wait until every event has its ticket types, so prices and carts never flash empty.
    if (events.some((e) => !types[e.id])) return null;
    return events.map((e) => ({ ...e, ticketTypes: types[e.id] }));
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
  // While the live copy loads, show the built-in copy (same as the pre-rendered page) so nothing jumps.
  if (event === undefined) return staticMatch ? { event: staticMatch, loading: true } : { event: undefined, loading: true };
  return { event: event ? { ...event, ticketTypes: types ?? staticMatch?.ticketTypes ?? [] } : null, loading: types === null && !!event };
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

/** Prefixes a file in public/ with the site's base path (e.g. /the-social-connect/ on GitHub Pages). */
export function asset(path: string): string {
  return import.meta.env.BASE_URL.replace(/\/$/, '') + path;
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
  if (poster.startsWith('/posters/')) return asset(size === 'sm' ? `${poster}-sm.webp` : size === 'jpg' ? `${poster}.jpg` : `${poster}.webp`);
  if (poster.startsWith('/photos/')) return asset(size === 'sm' ? `${poster}-sm.webp` : `${poster}.webp`);
  return '';
}

export interface Img { src: string; srcSet?: string; width?: number; height?: number }
const SIZES = imageSizes as unknown as Record<string, [number, number]>;

/** A poster or photo with sized versions (400 / 640 / 1000 px) for srcset, plus its real width and height. */
export function posterImg(poster: string): Img | null {
  if (!poster) return null;
  if (/^https:\/\/res\.cloudinary\.com\/.+\/upload\//.test(poster)) {
    const t = (w: number) => poster.replace('/upload/', `/upload/c_limit,w_${w},f_auto,q_auto/`);
    return { src: t(1000), srcSet: `${t(400)} 400w, ${t(640)} 640w, ${t(1024)} 1024w, ${t(1600)} 1600w` };
  }
  if (/^https:\/\//.test(poster)) return { src: poster };
  if (!poster.startsWith('/posters/') && !poster.startsWith('/photos/')) return null;
  const size = SIZES[poster];
  const full = size?.[0] ?? 1000;
  return {
    src: asset(`${poster}.webp`),
    srcSet: `${asset(`${poster}-sm.webp`)} 400w, ${asset(`${poster}-md.webp`)} 640w, ${asset(`${poster}.webp`)} ${full}w`,
    width: size?.[0],
    height: size?.[1],
  };
}

/** Hero photos in 640 / 1024 / 1600 px versions. */
export function heroImg(path: string): Img {
  const base = path.replace(/\.webp$/, '');
  const size = SIZES[path];
  return {
    src: asset(path),
    srcSet: `${asset(`${base}-640.webp`)} 640w, ${asset(`${base}-1024.webp`)} 1024w, ${asset(path)} 1600w`,
    width: size?.[0],
    height: size?.[1],
  };
}
