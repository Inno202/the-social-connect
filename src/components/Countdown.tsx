import { useEffect, useState } from 'react';

function parts(ms: number) {
  const m = Math.max(0, Math.floor(ms / 60_000));
  return { d: Math.floor(m / 1440), h: Math.floor((m % 1440) / 60), m: m % 60 };
}

/** "Starts in 12 days 4 hours 30 min". Shown only in the browser (not in the pre-rendered page, which would go stale),
 *  updated every 30 seconds, and hidden once the time has passed. */
export function Countdown({ to, label = 'Starts in', className = '', tone = 'dark' }: { to: string; label?: string; className?: string; tone?: 'dark' | 'light' }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  if (now === null) return null;
  const left = new Date(to).getTime() - now;
  if (left <= 0) return null;
  const { d, h, m } = parts(left);
  const cells = [
    { n: d, u: d === 1 ? 'day' : 'days' },
    { n: h, u: h === 1 ? 'hour' : 'hours' },
    { n: m, u: 'min' },
  ];
  const box = tone === 'dark' ? 'bg-ink text-white' : 'bg-white/10 text-white';
  return (
    <div className={className}>
      <p className="eyebrow text-ink-soft mb-2" id={`cd-${to}`}>{label}</p>
      <p className="flex gap-2" aria-labelledby={`cd-${to}`}>
        {cells.map((c) => (
          <span key={c.u} className={`${box} rounded-2xl px-3 py-2 min-w-[4.25rem] text-center`}>
            <span className="block display text-3xl text-lime num leading-none">{c.n}</span>
            <span className="block text-sm mt-1">{c.u}</span>
          </span>
        ))}
      </p>
    </div>
  );
}
