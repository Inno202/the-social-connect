import { describe, expect, it } from 'vitest';
import { withQueue, isBusyError, QueueTimeout, QueueLeft } from '../../src/lib/queue';
import { CheckoutError } from '../../src/lib/checkout';

function fakeClock() {
  let t = 0;
  return { now: () => t, sleep: async (ms: number) => { t += ms; }, random: () => 0.5 };
}

describe('waiting room retries', () => {
  it('retries busy errors and succeeds, then hides the waiting screen', async () => {
    const c = fakeClock();
    let calls = 0;
    const waits: unknown[] = [];
    const r = await withQueue(async () => { calls++; if (calls < 3) throw { code: 'aborted' }; return 'ok'; }, { ...c, onWait: (w) => waits.push(w) });
    expect(r).toBe('ok');
    expect(calls).toBe(3);
    expect(waits.at(-1)).toBeNull();
    expect(waits.filter(Boolean)).toHaveLength(2);
  });
  it('never retries real problems such as sold out', async () => {
    const c = fakeClock();
    let calls = 0;
    await expect(withQueue(async () => { calls++; throw new CheckoutError('Sold out'); }, c)).rejects.toThrow('Sold out');
    expect(calls).toBe(1);
  });
  it('gives up kindly after the maximum wait', async () => {
    const c = fakeClock();
    await expect(withQueue(async () => { throw { code: 'resource-exhausted' }; }, { ...c, maxWaitMs: 60_000 })).rejects.toBeInstanceOf(QueueTimeout);
    expect(c.now()).toBeLessThanOrEqual(60_000);
  });
  it('stops when the buyer leaves the line', async () => {
    const c = fakeClock();
    const ctl = new AbortController();
    let calls = 0;
    await expect(withQueue(async () => { calls++; ctl.abort(); throw { code: 'unavailable' }; }, { ...c, signal: ctl.signal })).rejects.toBeInstanceOf(QueueLeft);
    expect(calls).toBe(1);
  });
  it('waits grow and are spread out', async () => {
    const c = fakeClock();
    const gaps: number[] = [];
    let calls = 0;
    await withQueue(async () => { calls++; if (calls < 5) throw { code: 'aborted' }; }, { ...c, onWait: (w) => { if (w) gaps.push(w.nextInMs); } });
    expect(gaps).toEqual([1500, 3000, 6000, 12000]);
    expect(isBusyError({ code: 'permission-denied' })).toBe(false);
    expect(isBusyError({ code: 'firestore/aborted' })).toBe(true);
  });
});
