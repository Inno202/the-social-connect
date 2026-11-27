/** A friendly waiting room for busy moments (a sale opening with many buyers at once).
 *  When the database is too busy (many checkouts touching the same counter at the same second), the purchase is
 *  tried again automatically after a short, growing, random wait, so buyers spread out instead of all retrying
 *  together. The buyer sees a playful waiting screen instead of an error. Real problems (sold out, limit reached)
 *  are shown at once and never retried. This runs in the browser: it is not a server-enforced line. */

const BUSY_CODES = ['aborted', 'unavailable', 'resource-exhausted', 'deadline-exceeded', 'failed-precondition', 'cancelled'];

export function isBusyError(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null;
  const code = (e?.code ?? '').replace(/^firestore\//, '');
  return BUSY_CODES.includes(code) || /contention|too much|try again/i.test(e?.message ?? '');
}

export interface WaitInfo { attempt: number; since: number; nextInMs: number }

export interface QueueOptions {
  /** Give up after this long (default 4 minutes). */
  maxWaitMs?: number;
  onWait?: (w: WaitInfo | null) => void;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  random?: () => number;
  /** Leaving the line stops further tries. */
  signal?: AbortSignal;
}

export class QueueTimeout extends Error {}
export class QueueLeft extends Error {}

export async function withQueue<T>(fn: () => Promise<T>, opts: QueueOptions = {}): Promise<T> {
  const { signal, maxWaitMs = 240_000, onWait, sleep = (ms) => new Promise<void>((r) => { const t = setTimeout(r, ms); signal?.addEventListener('abort', () => { clearTimeout(t); r(); }, { once: true }); }), now = Date.now, random = Math.random } = opts;
  const since = now();
  for (let attempt = 1; ; attempt++) {
    try {
      const r = await fn();
      onWait?.(null);
      return r;
    } catch (err) {
      if (!isBusyError(err)) {
        onWait?.(null);
        throw err;
      }
      // 1.5 s, 3 s, 6 s, 12 s, then about 20 s, each spread by ±50% so buyers do not retry in step.
      const base = Math.min(20_000, 1500 * 2 ** (attempt - 1));
      const wait = Math.round(base * (0.5 + random()));
      if (now() - since + wait > maxWaitMs) {
        onWait?.(null);
        throw new QueueTimeout('It is still very busy. Your cart is saved: try again in a few minutes.');
      }
      onWait?.({ attempt, since, nextInMs: wait });
      await sleep(wait);
      if (signal?.aborted) {
        onWait?.(null);
        throw new QueueLeft('You left the line. Your cart is saved.');
      }
    }
  }
}
