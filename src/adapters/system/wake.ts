export const WAKE_CHECK_INTERVAL_MS = 60_000;
/** 1분마다 보는데 이보다 오래 건너뛰었으면 그동안 잠들어 있던 것이다. */
export const WAKE_GAP_MS = 2 * WAKE_CHECK_INTERVAL_MS;

export interface IntervalApi {
  now(): number;
  setInterval(callback: () => void, ms: number): unknown;
  clearInterval(handle: unknown): void;
}

const systemIntervals: IntervalApi = {
  now: () => Date.now(),
  setInterval: (callback, ms) => globalThis.setInterval(callback, ms),
  clearInterval: (handle) => globalThis.clearInterval(handle as Parameters<typeof globalThis.clearInterval>[0]),
};

/** 잠자기에서 깨어나면 알린다 (UPD-01). 1분에 한 번 시계만 보므로 가만히 있을 때 CPU를 거의 쓰지 않는다 (PERF-03). */
export function watchWake(onWake: () => void, api: IntervalApi = systemIntervals): () => void {
  let last = api.now();
  const handle = api.setInterval(() => {
    const now = api.now();
    if (now - last > WAKE_GAP_MS)
      onWake();
    last = now;
  }, WAKE_CHECK_INTERVAL_MS);
  return () => api.clearInterval(handle);
}
