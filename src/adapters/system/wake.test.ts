import { describe, expect, it } from 'vitest';
import { type IntervalApi, WAKE_CHECK_INTERVAL_MS, WAKE_GAP_MS, watchWake } from './wake.ts';

function fakeIntervals() {
  let now = 0;
  let tick: (() => void) | null = null;
  let cleared = false;
  const api: IntervalApi = {
    now: () => now,
    setInterval: (callback, ms) => {
      expect(ms).toBe(WAKE_CHECK_INTERVAL_MS);
      tick = callback;
      return 1;
    },
    clearInterval: () => {
      cleared = true;
    },
  };
  return {
    api,
    passes: (ms: number) => {
      now += ms;
      tick?.();
    },
    isCleared: () => cleared,
  };
}

describe('잠자기에서 깨어남', () => {
  it('UPD-01 1분마다 볼 때 2분 넘게 건너뛰었으면 깨어난 것으로 알린다', () => {
    const intervals = fakeIntervals();
    let wakes = 0;
    watchWake(() => wakes++, intervals.api);
    intervals.passes(WAKE_CHECK_INTERVAL_MS);
    intervals.passes(WAKE_CHECK_INTERVAL_MS + 500);
    expect(wakes).toBe(0);
    intervals.passes(8 * 60 * 60 * 1000);
    expect(wakes).toBe(1);
    intervals.passes(WAKE_CHECK_INTERVAL_MS);
    expect(wakes).toBe(1);
    expect(WAKE_GAP_MS).toBe(2 * WAKE_CHECK_INTERVAL_MS);
  });

  it('UPD-01 멈추면 interval을 지운다', () => {
    const intervals = fakeIntervals();
    watchWake(() => undefined, intervals.api)();
    expect(intervals.isCleared()).toBe(true);
  });
});
