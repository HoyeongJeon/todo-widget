import type { Clock } from '../../domain/clock.ts';
import { Timestamp } from '../../domain/timestamp.ts';

interface DateLike {
  getTime(): number;
  getTimezoneOffset(): number;
}

/** PC 시계와 그 순간의 PC 시간대 (STORE-05). getTimezoneOffset은 UTC − 지역 시각(분)이라 부호를 뒤집는다. */
export function createSystemClock(newDate: () => DateLike = () => new Date()): Clock {
  return {
    now(): Timestamp {
      const date = newDate();
      return Timestamp.fromEpochMs(date.getTime(), -date.getTimezoneOffset());
    },
  };
}
