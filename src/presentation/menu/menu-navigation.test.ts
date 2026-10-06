import { describe, expect, it } from 'vitest';
import { moveHighlight } from './menu-navigation.ts';

/** ⋯ 메뉴: 자동 실행, 투명도 줄, 구분선, 초기화(비활성), 종료. */
const selectable = [true, false, false, false, true];

describe('메뉴 방향키', () => {
  it('WND-10 INPUT-12 아래 방향키는 고를 수 있는 다음 항목으로 가고, 끝에서는 처음으로 돈다', () => {
    expect(moveHighlight(selectable, null, 1)).toBe(0);
    expect(moveHighlight(selectable, 0, 1)).toBe(4);
    expect(moveHighlight(selectable, 4, 1)).toBe(0);
  });

  it('WND-10 INPUT-12 위 방향키는 거꾸로 돈다', () => {
    expect(moveHighlight(selectable, null, -1)).toBe(4);
    expect(moveHighlight(selectable, 0, -1)).toBe(4);
    expect(moveHighlight(selectable, 4, -1)).toBe(0);
  });

  it('INPUT-19 고를 수 있는 항목이 없으면 강조하지 않는다', () => {
    expect(moveHighlight([false, false], null, 1)).toBeNull();
  });
});
