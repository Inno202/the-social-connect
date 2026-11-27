import { useEffect, useState } from 'react';
import type { WaitInfo } from '../lib/queue';

const LINES = [
  'It is packed in here! Hold tight, you are in the line.',
  'The DJ is warming up the decks. We are trying again for you.',
  'Everyone wants in. That is a good sign.',
  'Do not close this page: we are keeping your place.',
  'Stretch, hydrate, nearly there.',
  'Your tickets are on their way through the crowd.',
];

/** Full-screen, playful waiting screen shown while a busy checkout is retried. */
export function WaitingRoom({ wait, onLeave }: { wait: WaitInfo | null; onLeave: () => void }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!wait) return;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [wait]);
  if (!wait) return null;
  const secs = Math.max(0, Math.floor((Date.now() - wait.since) / 1000));
  const line = LINES[Math.floor(secs / 5) % LINES.length];
  const offline = typeof navigator !== 'undefined' && !navigator.onLine;
  void tick;

  return (
    <div className="fixed inset-0 z-[90] bg-ink text-white grid place-items-center p-6" role="alertdialog" aria-modal="true" aria-labelledby="wr-title" aria-describedby="wr-line">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="eq mx-auto" aria-hidden>
          {Array.from({ length: 7 }, (_, i) => <span key={i} style={{ animationDelay: `${(i * 0.13).toFixed(2)}s` }} />)}
        </div>
        <h2 id="wr-title" className="t-hero">You are in the <span className="text-lime">line</span></h2>
        <p id="wr-line" className="text-lg text-white/85 min-h-[3.5rem]" aria-live="polite">
          {offline ? 'You seem to be offline. We will keep trying as soon as your signal is back.' : line}
        </p>
        <p className="text-sm text-white/70 num">Waiting {secs < 60 ? `${secs} s` : `${Math.floor(secs / 60)} min ${secs % 60} s`} · try {wait.attempt + 1}</p>
        <p className="text-sm text-white/70">Keep this page open. Your cart is saved while you wait.</p>
        <button type="button" className="btn btn-outline-light btn-block" onClick={onLeave}>Leave the line</button>
      </div>
    </div>
  );
}
