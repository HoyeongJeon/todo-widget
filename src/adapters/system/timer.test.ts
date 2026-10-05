import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSystemTimer } from './timer.ts';

afterEach(() => {
  vi.useRealTimers();
});

describe('시스템 타이머', () => {
  it('UPD-01 정한 시간 뒤에 한 번 실행하고, 취소하면 실행하지 않는다', () => {
    vi.useFakeTimers();
    const timer = createSystemTimer();
    const ran: string[] = [];
    timer.schedule(1000, () => ran.push('a'));
    const cancel = timer.schedule(1000, () => ran.push('b'));
    cancel();
    vi.advanceTimersByTime(999);
    expect(ran).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(ran).toEqual(['a']);
  });
});
