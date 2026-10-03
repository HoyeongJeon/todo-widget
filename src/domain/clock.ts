import type { Timestamp } from './timestamp.ts';

/** 지금 시각. 실제는 PC 시계(`src/adapters/system/clock.ts`), 테스트는 고정 시계를 넣는다. */
export interface Clock {
  now(): Timestamp;
}
