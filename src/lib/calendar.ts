import type { MsbEvent } from './types';
import { addressLine } from './place';

/** Calendar times in UTC, e.g. 20261205T130000Z. */
const utc = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
/** All-day date in South African time, e.g. 20261205. */
const day = (iso: string, addDays = 0) => {
  const d = new Date(new Date(iso).getTime() + addDays * 86_400_000);
  return d.toLocaleDateString('en-CA', { timeZone: 'Africa/Johannesburg' }).replace(/-/g, '');
};

/** Start and end for a calendar entry. Without a known end time the entry ends when it starts (no made-up end);
 *  when times are not announced it is an all-day entry. */
function span(e: MsbEvent): { start: string; end: string; allDay: boolean } {
  if (e.timeTbc) return { start: day(e.startsAt), end: day(e.endsAt ?? e.startsAt, 1), allDay: true };
  return { start: utc(e.startsAt), end: utc(e.endsAt ?? e.startsAt), allDay: false };
}

const where = (e: MsbEvent) => [e.venue, addressLine(e)].filter(Boolean).join(', ');
const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

export function icsFor(e: MsbEvent, url: string): string {
  const { start, end, allDay } = span(e);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MSB Events//Tickets//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${e.id}@msb-events`,
    `DTSTAMP:${utc(new Date().toISOString())}`,
    allDay ? `DTSTART;VALUE=DATE:${start}` : `DTSTART:${start}`,
    allDay ? `DTEND;VALUE=DATE:${end}` : `DTEND:${end}`,
    `SUMMARY:${icsText(e.title)}`,
    `LOCATION:${icsText(where(e))}`,
    `DESCRIPTION:${icsText(`${e.description}\n\n${url}`)}`,
    `URL:${url}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.join('\r\n') + '\r\n';
}

export function downloadIcs(e: MsbEvent, url: string) {
  const blob = new Blob([icsFor(e, url)], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${e.id}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function googleCalendarLink(e: MsbEvent, url: string): string {
  const { start, end } = span(e);
  const q = new URLSearchParams({ action: 'TEMPLATE', text: e.title, dates: `${start}/${end}`, location: where(e), details: `${e.description}\n\n${url}` });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

export function whatsappLink(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
