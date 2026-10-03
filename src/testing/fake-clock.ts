import type { Clock } from '../domain/clock.ts';
import { Timestamp } from '../domain/timestamp.ts';

/** 테스트용: 파싱에 실패하면 던진다. */
export function ts(iso: string): Timestamp {
  const parsed = Timestamp.parse(iso);
  if (!parsed)
    throw new Error(`시각 형식이 아니에요: ${iso}`);
  return parsed;
}

/** 테스트용 고정 시계. 기본 "지금"은 2026-10-03T09:00:00+09:00. */
export class FakeClock implements Clock {
  #now: Timestamp;

  constructor(iso = '2026-10-03T09:00:00+09:00') {
    this.#now = ts(iso);
  }

  now(): Timestamp {
    return this.#now;
  }

  set(iso: string): void {
    this.#now = ts(iso);
  }

  setEpochMs(ms: number): void {
    this.#now = Timestamp.fromEpochMs(ms, this.#now.offsetMinutes);
  }

  advance(ms: number): void {
    this.setEpochMs(this.#now.toEpochMs() + ms);
  }
}
