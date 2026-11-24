import { describe, expect, it } from 'vitest';
import { closesAt, filterEvents, isPast, priceFrom, releaseState, groupTypes, canBuyOnSite } from '../../src/lib/eventState';
import { HoldGuard, parseCode, verdict, resultDuration, qrPayload } from '../../src/lib/scan';
import { rands, longDate, dateRange } from '../../src/lib/format';
import { csvCell } from '../../src/pages/dashboard/Reports';
import events from '../../src/data/events.json';
import type { MsbEvent, Ticket, TicketType } from '../../src/lib/types';

const T = (o: Partial<TicketType>): TicketType => ({ id: 'x', group: 'General', name: 'n', price: 200, seats: 1, includes: [], capacity: 10, sold: 0, order: 1, prevId: null, comingSoon: false, ...o });
const all = events as unknown as MsbEvent[];
const today = new Date('2026-11-24T12:00:00+02:00').getTime();

describe('events close 12 hours after the start', () => {
  const e = { startsAt: '2026-09-26T12:00:00+02:00' };
  it('is open 11 h 59 m after the start and past at 12 h', () => {
    expect(isPast(e, new Date('2026-09-26T23:59:00+02:00').getTime())).toBe(false);
    expect(isPast(e, new Date('2026-09-27T00:00:00+02:00').getTime())).toBe(true);
  });
  it('uses the last day for multi-day events', () => {
    expect(closesAt({ startsAt: '2024-09-27T12:00:00+02:00', endsAt: '2024-09-29T12:00:00+02:00' })).toBe(new Date('2024-09-30T00:00:00+02:00').getTime());
  });
  it('sorts the real 2026 calendar into upcoming and past on 24 November 2026', () => {
    expect(filterEvents(all, 'upcoming', today).map((e) => e.id)).toEqual(['summer-blow-2026', 'soulful-blow-december-2026']);
    const past = filterEvents(all, 'past', today).map((e) => e.id);
    expect(past).toContain('spring-blow-2026');
    expect(past).toContain('msb-fun-walk-2026');
    expect(past[past.length - 1]).toBe('msb-weekend-2024');
    expect(filterEvents(all, 'activation', today)).toHaveLength(0);
  });
});

describe('prices', () => {
  it('shows From, Free and Tables from', () => {
    expect(priceFrom(all.find((e) => e.id === 'spring-blow-2026')!, rands)).toBe('From R200');
    expect(priceFrom(all.find((e) => e.id === 'spring-blow-activation-1st-location-2026')!, rands)).toBe('Free');
    expect(priceFrom(all.find((e) => e.id === 'soulful-blow-december-2026')!, rands)).toBe('Tables from R3,000');
    expect(priceFrom(all.find((e) => e.id === 'summer-blow-2026')!, rands)).toBeNull();
  });
  it('ignores releases that are not on sale yet', () => {
    expect(priceFrom({ ticketTypes: [T({ id: 'a', price: 200 }), T({ id: 'k', price: 100, comingSoon: true })] }, rands)).toBe('From R200');
  });
  it('formats rands with a thousands comma', () => {
    expect(rands(6000)).toBe('R6,000');
    expect(rands(0)).toBe('Free');
  });
});

describe('releases open in order', () => {
  const r1 = T({ id: 'r1', capacity: 2, sold: 1 });
  const r2 = T({ id: 'r2', prevId: 'r1', order: 2 });
  it('keeps the 2nd release closed until the 1st sells out', () => {
    expect(releaseState(r2, [r1, r2])).toBe('coming_soon');
    expect(releaseState(r2, [{ ...r1, sold: 2 }, r2])).toBe('on_sale');
    expect(releaseState({ ...r1, sold: 2 }, [r1])).toBe('sold_out');
    expect(releaseState(T({ capacity: 0 }), [])).toBe('not_online');
  });
  it('groups types by heading in order', () => {
    expect(groupTypes([T({ id: 'v', group: 'VIP tables', order: 3 }), T({ id: 'a', order: 1 })]).map((g) => g.group)).toEqual(['General', 'VIP tables']);
  });
  it('never sells events marked for an outside seller', () => {
    const e = { ...all.find((x) => x.id === 'spring-blow-2026')!, startsAt: '2030-01-01T12:00:00+02:00' };
    expect(canBuyOnSite(e)).toBe(false);
  });
});

describe('door scanning', () => {
  const ev = { id: 'ev', title: 'Test', startsAt: '2026-12-12T18:00:00+02:00', endsAt: null, status: 'published' as const };
  const now = new Date('2026-12-12T19:00:00+02:00').getTime();
  const t = { id: 'abcdefghij1234567890_0', eventId: 'ev', status: 'valid', holderName: 'A', typeName: 'General', seatLabel: '', eventTitle: 'Test' } as Ticket;
  it('reads the QR payload and rejects other codes', () => {
    expect(parseCode(qrPayload(t.id))).toBe(t.id);
    expect(parseCode('https://example.com')).toBeNull();
  });
  it('admits once and refuses used, wrong-event, cancelled and passed tickets', () => {
    expect(verdict(t, ev, 'ev', now).reason).toBe('admit');
    expect(verdict({ ...t, status: 'used' }, ev, 'ev', now).reason).toBe('used');
    expect(verdict({ ...t, eventId: 'other' }, ev, 'ev', now).reason).toBe('wrong_event');
    expect(verdict({ ...t, status: 'cancelled' }, ev, 'ev', now).reason).toBe('cancelled');
    expect(verdict(t, { ...ev, status: 'cancelled' }, 'ev', now).reason).toBe('event_cancelled');
    expect(verdict(t, ev, 'ev', new Date('2026-12-13T07:00:00+02:00').getTime()).reason).toBe('passed');
    expect(verdict(null, ev, 'ev', now).reason).toBe('not_found');
  });
  it('shows admit for 3 s and refusals for 5 s', () => {
    expect(resultDuration(verdict(t, ev, 'ev', now))).toBe(3000);
    expect(resultDuration(verdict(null, ev, 'ev', now))).toBe(5000);
  });
  it('checks a code held in view only once', () => {
    const g = new HoldGuard(1500);
    expect(g.accept('A', 0)).toBe(true);
    expect(g.accept('A', 100)).toBe(false);
    expect(g.accept('A', 1000)).toBe(false);
    expect(g.accept('A', 3000)).toBe(true);
    expect(g.accept('B', 3100)).toBe(true);
  });
});

describe('formatting and exports', () => {
  it('writes dates in South African time', () => {
    expect(longDate('2026-12-26T00:30:00+02:00')).toBe('Sat 26 December 2026');
    expect(dateRange('2024-09-27T12:00:00+02:00', '2024-09-29T12:00:00+02:00')).toBe('27 to 29 September 2024');
  });
  it('neutralises spreadsheet formulas in CSV exports', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('Thabo')).toBe('Thabo');
  });
});
