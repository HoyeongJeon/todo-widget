import { describe, expect, it } from 'vitest';
import { ts } from '../testing/fake-clock.ts';
import { Timestamp, isSameDay } from './timestamp.ts';

describe('Timestamp', () => {
  it('STORE-05 PC 시간대를 포함한 ISO 8601로 쓰고 초 아래는 버린다', () => {
    const t = Timestamp.fromEpochMs(Date.UTC(2026, 9, 3, 13, 0, 0, 734), 120);
    expect(t.format()).toBe('2026-10-03T15:00:00+02:00');
  });

  it('STORE-05 UTC는 +00:00으로, 음수와 30분 단위 시간대도 그대로 쓴다', () => {
    const instant = Date.UTC(2026, 9, 3, 13, 0, 0);
    expect(Timestamp.fromEpochMs(instant, 0).format()).toBe('2026-10-03T13:00:00+00:00');
    expect(Timestamp.fromEpochMs(instant, -330).format()).toBe('2026-10-03T07:30:00-05:30');
    expect(Timestamp.fromEpochMs(instant, 345).format()).toBe('2026-10-03T18:45:00+05:45');
  });

  it('STORE-05 쓴 시각을 다시 읽으면 같은 시점과 같은 시간대다', () => {
    const original = Timestamp.fromEpochMs(Date.UTC(2026, 9, 3, 13, 0, 0), -330);
    const read = Timestamp.parse(original.format());
    expect(read?.format()).toBe(original.format());
    expect(read?.offsetMinutes).toBe(-330);
    expect(read?.compare(original)).toBe(0);
  });

  it('형식이 다르거나 없는 날짜·시각은 읽지 않는다', () => {
    for (const text of [
      '',
      '2026-10-03 15:00:00',
      '2026-10-03T15:00:00',
      '2026-10-03T15:00:00Z',
      '2026-10-03T15:00:00.000+09:00',
      '2026-02-30T00:00:00+09:00',
      '2026-10-03T24:00:00+09:00',
      '2026-10-03T15:00:00+15:00',
      '2026-10-03T15:00:00+09:60',
    ])
      expect(Timestamp.parse(text), text).toBeNull();
  });

  it('STORE-12 v1.4 시각은 한국 표준시로 읽는다', () => {
    expect(Timestamp.parseV1('2026-09-30 14:05:00')?.format()).toBe('2026-09-30T14:05:00+09:00');
    expect(Timestamp.parseV1('2026-09-30T14:05:00+09:00')).toBeNull();
    expect(Timestamp.parseV1('2026-02-30 00:00:00')).toBeNull();
  });

  it('LIST-04 시간대가 달라도 실제 시각으로 비교한다', () => {
    const earlier = ts('2026-10-03T08:00:00+09:00'); // 10-02 23:00 UTC
    const later = ts('2026-10-03T00:30:00+00:00'); // 10-03 00:30 UTC
    expect(earlier.format() > later.format()).toBe(true); // 문자열로는 거꾸로다
    expect(earlier.compare(later)).toBeLessThan(0);
    expect(later.compare(earlier)).toBeGreaterThan(0);
  });

  it('STORE-06 같은 날인지는 지금 PC 시간대로 바꿔 비교한다', () => {
    const a = ts('2026-10-04T01:00:00+09:00');
    const b = ts('2026-10-03T09:00:00+02:00');
    expect(isSameDay(a, b, 120)).toBe(true);
    expect(isSameDay(a, b, 540)).toBe(false);
    expect(a.dateIn(120)).toBe('2026-10-03');
  });

  it('백업 파일 이름용 시각은 기록한 시간대의 yyyyMMdd-HHmmss다', () => {
    expect(ts('2026-10-03T09:00:00+09:00').compactStamp()).toBe('20261003-090000');
    expect(ts('2026-01-05T23:04:09-05:00').compactStamp()).toBe('20260105-230409');
  });
});
