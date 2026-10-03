import { describe, expect, it } from 'vitest';
import { createSystemClock } from './clock.ts';

describe('시스템 시계', () => {
  it('STORE-05 PC 시간대 오프셋을 함께 기록한다 (getTimezoneOffset은 부호가 반대다)', () => {
    const clock = createSystemClock(() => ({ getTime: () => Date.UTC(2026, 9, 3, 13, 0, 0, 734), getTimezoneOffset: () => -120 }));
    expect(clock.now().format()).toBe('2026-10-03T15:00:00+02:00');
  });

  it('STORE-05 UTC PC는 +00:00이다', () => {
    const clock = createSystemClock(() => ({ getTime: () => Date.UTC(2026, 9, 3, 13, 0, 0), getTimezoneOffset: () => 0 }));
    expect(clock.now().format()).toBe('2026-10-03T13:00:00+00:00');
  });
});
