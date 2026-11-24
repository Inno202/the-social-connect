import { isPast } from './eventState';
import type { MsbEvent, Ticket } from './types';

export const QR_PREFIX = 'MSB1:';

export function qrPayload(ticketId: string): string {
  return QR_PREFIX + ticketId;
}

/** Accepts a scanned QR text or a typed ticket code and returns the ticket id, or null. */
export function parseCode(raw: string): string | null {
  const text = raw.trim();
  const id = text.startsWith(QR_PREFIX) ? text.slice(QR_PREFIX.length) : text;
  return /^[A-Za-z0-9]{10,40}_\d{1,2}$/.test(id) ? id : null;
}

export type Verdict =
  | { ok: true; reason: 'admit'; title: string; detail: string }
  | { ok: false; reason: 'invalid' | 'not_found' | 'wrong_event' | 'used' | 'cancelled' | 'event_cancelled' | 'passed'; title: string; detail: string };

export function verdict(
  ticket: Ticket | null | undefined,
  event: Pick<MsbEvent, 'id' | 'title' | 'startsAt' | 'endsAt' | 'status'> | null | undefined,
  selectedEventId: string,
  now: number = Date.now(),
): Verdict {
  if (!ticket) return { ok: false, reason: 'not_found', title: 'Not a valid ticket', detail: 'This code does not match any ticket for this event.' };
  if (ticket.eventId !== selectedEventId)
    return { ok: false, reason: 'wrong_event', title: 'Wrong event', detail: `This ticket is for ${ticket.eventTitle}.` };
  if (ticket.status === 'cancelled') return { ok: false, reason: 'cancelled', title: 'Ticket cancelled', detail: 'This ticket was cancelled and cannot be used.' };
  if (event && event.status === 'cancelled') return { ok: false, reason: 'event_cancelled', title: 'Event cancelled', detail: 'This event was cancelled.' };
  if (event && isPast(event, now)) return { ok: false, reason: 'passed', title: 'Event has passed', detail: 'This ticket was for an event that is over.' };
  if (ticket.status === 'used') return { ok: false, reason: 'used', title: 'Already scanned', detail: 'This ticket was already used to enter.' };
  return { ok: true, reason: 'admit', title: 'Admit', detail: `${ticket.holderName} · ${ticket.typeName}${ticket.seatLabel ? ' · ' + ticket.seatLabel : ''}` };
}

/** Admit results stay 3 s, refusals 5 s. */
export function resultDuration(v: Verdict): number {
  return v.ok ? 3000 : 5000;
}

/**
 * Stops the same code being processed again while it is still held in front of the camera.
 * A code is accepted again only after it has been out of view for `gapMs`.
 */
export class HoldGuard {
  private last: string | null = null;
  private lastSeen = 0;
  constructor(private gapMs = 1500) {}
  accept(code: string, now: number = Date.now()): boolean {
    const same = code === this.last && now - this.lastSeen < this.gapMs;
    this.last = code;
    this.lastSeen = now;
    return !same;
  }
  reset() {
    this.last = null;
    this.lastSeen = 0;
  }
}
