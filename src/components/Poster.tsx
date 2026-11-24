import { posterSrc } from '../lib/data';
import type { MsbEvent } from '../lib/types';

function lum(hex: string) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
/** White or black text, whichever reads better on the event colour. */
export function textOn(hex: string): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return '#FFFFFF';
  const l = lum(hex);
  return 1.05 / (l + 0.05) >= (l + 0.05) / 0.05 ? '#FFFFFF' : '#0B0B0C';
}

/** The event's own poster. Without one, a plain block in the event's poster colour carries the name. */
export function Poster({ event, size = 'lg', className = '', eager = false }: { event: Pick<MsbEvent, 'poster' | 'posterColor' | 'title' | 'shortTitle'>; size?: 'sm' | 'lg'; className?: string; eager?: boolean }) {
  const src = posterSrc(event.poster, size);
  if (!src) {
    return (
      <div className={`@container w-full h-full grid place-items-center p-[8%] text-center overflow-hidden ${className}`} style={{ background: event.posterColor, color: textOn(event.posterColor) }} role="img" aria-label={`${event.title} (poster coming soon)`}>
        <span className="display text-[15cqw] leading-[0.9] break-words" aria-hidden>
          {event.shortTitle || event.title}
        </span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={`${event.title} poster`}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className={`w-full h-full object-cover object-top ${className}`}
    />
  );
}
