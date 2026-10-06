import { describe, expect, it } from 'vitest';
import { type SectionMeasure, sameListHeights, sectionListHeights } from './section-heights.ts';

/**
 * v1.4 치수: 끝낸 일 섹션은 위 8 + 접힘 줄 34 + 4, 할 일 섹션은 위 12 + 제목 줄 24.
 * 항목 한 줄은 38 = 줄 36 + 위아래 margin 1씩. 줄 묶음(.rows)이 flex column이라 margin이 겹치지 않아 화면에서도 이 값으로 잰다.
 */
const done = (content: number, expanded = true): SectionMeasure => ({ chrome: expanded ? 46 : 42, content: expanded ? content : 0, firstRow: 38, expanded });
const todo = (content: number, expanded = true): SectionMeasure => ({ chrome: 36, content: expanded ? content : 0, firstRow: 38, expanded });

describe('섹션 높이', () => {
  it('LIST-13 높이가 넉넉하면 목록 높이를 제한하지 않는다', () => {
    // 필요 [100, 200], 가용 400
    expect(sectionListHeights(400, { done: done(54), todo: todo(164) })).toEqual({ done: null, todo: null });
  });

  it('LIST-14 짧은 섹션은 다 보이고 긴 섹션이 나머지를 쓴다 (필요 [100, 900] → [100, 300])', () => {
    const heights = sectionListHeights(400, { done: done(54), todo: todo(864) });
    expect(heights.done).toBeCloseTo(54, 2);
    expect(heights.todo).toBeCloseTo(264, 2);
    expect((heights.done ?? 0) + 46 + (heights.todo ?? 0) + 36).toBeCloseTo(400, 2);
  });

  it('LIST-14 긴 섹션 둘은 똑같이 나눈다 (필요 [600, 900] → [200, 200])', () => {
    const heights = sectionListHeights(400, { done: done(554), todo: todo(864) });
    expect(heights.done).toBeCloseTo(154, 2);
    expect(heights.todo).toBeCloseTo(164, 2);
  });

  it('LIST-15 최소 높이(제목 줄 + 첫 항목) 아래로 줄지 않는다', () => {
    expect(sectionListHeights(100, { done: done(54), todo: todo(864) })).toEqual({ done: 38, todo: 38 });
  });

  it('LIST-15 접힌 섹션은 제목 줄만 쓰고 목록 높이는 정하지 않는다', () => {
    const heights = sectionListHeights(400, { done: done(0, false), todo: todo(900) });
    expect(heights.done).toBeNull();
    expect(heights.todo).toBeCloseTo(322, 2);
  });

  it('LIST-01 보이지 않는 섹션은 빼고 나눈다', () => {
    expect(sectionListHeights(300, { done: null, todo: todo(900) }).todo).toBeCloseTo(264, 2);
  });

  it('LIST-14 0.5 안의 차이는 같은 높이로 본다', () => {
    expect(sameListHeights({ done: 10, todo: null }, { done: 10.4, todo: null })).toBe(true);
    expect(sameListHeights({ done: 10, todo: null }, { done: 11, todo: null })).toBe(false);
    expect(sameListHeights({ done: null, todo: 5 }, { done: 0, todo: 5 })).toBe(false);
  });
});
