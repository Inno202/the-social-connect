import type { MsbEvent, TicketType } from './types';

export const CLOSE_AFTER_MS = 12 * 60 * 60 * 1000;

/** An event closes 12 hours after it starts (after the start of its last day for multi-day events). */
export function closesAt(e: Pick<MsbEvent, 'startsAt' | 'endsAt'>): number {
  return new Date(e.endsAt || e.startsAt).getTime() + CLOSE_AFTER_MS;
}

export function isPast(e: Pick<MsbEvent, 'startsAt' | 'endsAt'>, now: number = Date.now()): boolean {
  return now >= closesAt(e);
}

export type Chip = 'upcoming' | 'festival' | 'activation' | 'family' | 'past';
export const CHIPS: { id: Chip; label: string }[] = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'festival', label: 'Festivals' },
  { id: 'activation', label: 'Activations' },
  { id: 'family', label: 'Family' },
  { id: 'past', label: 'Past' },
];

export function filterEvents(events: MsbEvent[], chip: Chip, now: number = Date.now()): MsbEvent[] {
  const visible = events.filter((e) => e.status !== 'draft');
  if (chip === 'past') {
    return visible.filter((e) => isPast(e, now)).sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  }
  const upcoming = visible
    .filter((e) => !isPast(e, now))
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  if (chip === 'upcoming') return upcoming;
  if (chip === 'festival') return upcoming.filter((e) => e.category === 'festival' || e.category === 'comedy');
  return upcoming.filter((e) => e.category === chip);
}

export type ReleaseState = 'on_sale' | 'sold_out' | 'coming_soon' | 'not_online';

export function remaining(t: TicketType): number {
  return Math.max(0, t.capacity - t.sold);
}

/** Releases open in order: a release with a previous release opens only once that one sells out. */
export function releaseState(t: TicketType, all: TicketType[]): ReleaseState {
  if (t.capacity <= 0) return 'not_online';
  if (t.sold >= t.capacity) return 'sold_out';
  if (t.comingSoon) return 'coming_soon';
  if (t.prevId) {
    const prev = all.find((x) => x.id === t.prevId);
    if (prev && prev.capacity > 0 && prev.sold < prev.capacity) return 'coming_soon';
  }
  return 'on_sale';
}

/** "From R200", "Free", "Tables from R3,000", or null when no price is known. */
export function priceFrom(e: Pick<MsbEvent, 'ticketTypes'>, fmt: (n: number) => string): string | null {
  const all = e.ticketTypes ?? [];
  if (all.length === 0) return null;
  // Prefer what can be bought now; fall back to every listed price (e.g. events sold elsewhere).
  const open = all.filter((t) => t.capacity > 0 && releaseState(t, all) === 'on_sale');
  const types = open.length ? open : all;
  const allTables = types.every((t) => t.seats > 1);
  const min = Math.min(...types.map((t) => t.price));
  if (types.every((t) => t.price === 0)) return 'Free';
  if (allTables) return `Tables from ${fmt(min)}`;
  if (min === 0) return 'Free';
  return `From ${fmt(min)}`;
}

export function groupTypes(types: TicketType[]): { group: string; types: TicketType[] }[] {
  const sorted = [...types].sort((a, b) => a.order - b.order);
  const out: { group: string; types: TicketType[] }[] = [];
  for (const t of sorted) {
    let g = out.find((x) => x.group === t.group);
    if (!g) {
      g = { group: t.group, types: [] };
      out.push(g);
    }
    g.types.push(t);
  }
  return out;
}

export function canBuyOnSite(e: MsbEvent, now: number = Date.now()): boolean {
  return e.sellMode === 'site' && e.status === 'published' && !isPast(e, now) && (e.ticketTypes ?? []).some((t) => t.capacity > 0);
}
