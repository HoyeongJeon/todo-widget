import { describe, expect, it } from 'vitest';
import { allocateSectionHeights } from './section-layout.ts';

function expectClose(actual: number[], expected: number[]): void {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((value, i) => expect(Math.abs(value - (expected[i] ?? NaN))).toBeLessThanOrEqual(0.01));
}

const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);

describe('섹션 높이 배분', () => {
  it('LIST-13 높이가 넉넉하면 섹션마다 필요한 만큼 쓴다', () => {
    expect(allocateSectionHeights(400, [100, 200], [70, 74])).toEqual([100, 200]);
    expect(allocateSectionHeights(Infinity, [100, 900], [70, 74])).toEqual([100, 900]);
  });

  it('LIST-14 짧은 섹션은 다 보이고 긴 섹션이 나머지를 쓴다', () => {
    const heights = allocateSectionHeights(400, [100, 900], [70, 74]);
    expectClose(heights, [100, 300]);
    expect(Math.abs(sum(heights) - 400)).toBeLessThanOrEqual(0.01);
  });

  it('LIST-14 긴 섹션 둘은 나머지를 똑같이 나눈다', () => {
    const heights = allocateSectionHeights(400, [600, 900], [70, 74]);
    expectClose(heights, [200, 200]);
    expect(Math.abs(sum(heights) - 400)).toBeLessThanOrEqual(0.01);
  });

  it('LIST-15 최소 높이의 합이 가용 높이 이상이면 최소 높이를 준다', () => {
    expect(allocateSectionHeights(100, [300, 300], [70, 74])).toEqual([70, 74]);
    expect(allocateSectionHeights(144, [300, 300], [70, 74])).toEqual([70, 74]);
  });

  it('LIST-15 접힌 섹션은 제목 줄 높이만 쓰고 나머지를 펼친 섹션이 쓴다', () => {
    expectClose(allocateSectionHeights(200, [30, 900], [30, 74]), [30, 170]);
  });

  it('최소 높이가 없는(무한대) 섹션은 줄지 않는다', () => {
    expect(allocateSectionHeights(400, [100, 900], [Infinity, Infinity])).toEqual([100, 900]);
  });
});
