const TZ = 'Africa/Johannesburg';

export function rands(n: number): string {
  if (n === 0) return 'Free';
  return 'R' + n.toLocaleString('en-ZA', { maximumFractionDigits: 0 }).replace(/ |\s/g, ',');
}

export function randsPlain(n: number): string {
  return 'R' + n.toLocaleString('en-ZA', { maximumFractionDigits: 0 }).replace(/ |\s/g, ',');
}

function parts(iso: string) {
  const d = new Date(iso);
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-ZA', { timeZone: TZ, ...o }).format(d);
  return {
    weekday: f({ weekday: 'short' }),
    weekdayLong: f({ weekday: 'long' }),
    day: f({ day: 'numeric' }),
    month: f({ month: 'long' }),
    monthShort: f({ month: 'short' }),
    year: f({ year: 'numeric' }),
    time: f({ hour: '2-digit', minute: '2-digit', hour12: false }),
  };
}

/** "Sat 26 September 2026" */
export function longDate(iso: string): string {
  const p = parts(iso);
  return `${p.weekday} ${p.day} ${p.month} ${p.year}`;
}
/** "26 Sep 2026" */
export function shortDate(iso: string): string {
  const p = parts(iso);
  return `${p.day} ${p.monthShort} ${p.year}`;
}
export function dayMonth(iso: string): { day: string; month: string; monthShort: string; year: string; weekday: string } {
  const p = parts(iso);
  return { day: p.day, month: p.month, monthShort: p.monthShort, year: p.year, weekday: p.weekday };
}
export function timeOf(iso: string): string {
  return parts(iso).time;
}

export function dateRange(startIso: string, endIso?: string | null): string {
  if (!endIso) return longDate(startIso);
  const a = parts(startIso);
  const b = parts(endIso);
  if (a.month === b.month && a.year === b.year) return `${a.day} to ${b.day} ${a.month} ${a.year}`;
  return `${shortDate(startIso)} to ${shortDate(endIso)}`;
}
