import { describe, expect, it } from 'vitest';
import { resizeLimits, resizeRect } from './resize.ts';

const start = { left: 1000, top: 100, width: 320, height: 520 };
const limits = resizeLimits(1040);

describe('크기 조절 계산', () => {
  it('WND-03 오른쪽·아래 가장자리는 끈 만큼 크기만 바꾼다', () => {
    expect(resizeRect(start, 'East', 50, 999, limits)).toEqual({ left: 1000, top: 100, width: 370, height: 520 });
    expect(resizeRect(start, 'South', 999, 80, limits)).toEqual({ left: 1000, top: 100, width: 320, height: 600 });
    expect(resizeRect(start, 'SouthEast', 50, 80, limits)).toEqual({ left: 1000, top: 100, width: 370, height: 600 });
  });

  it('WND-03 위·왼쪽 가장자리는 반대쪽 끝을 그대로 두고 위치와 크기를 함께 바꾼다', () => {
    expect(resizeRect(start, 'West', -50, 0, limits)).toEqual({ left: 950, top: 100, width: 370, height: 520 });
    expect(resizeRect(start, 'North', 0, -80, limits)).toEqual({ left: 1000, top: 20, width: 320, height: 600 });
    expect(resizeRect(start, 'NorthWest', 30, 20, limits)).toEqual({ left: 1030, top: 120, width: 290, height: 500 });
    expect(resizeRect(start, 'NorthEast', 30, 20, limits)).toEqual({ left: 1000, top: 120, width: 350, height: 500 });
    expect(resizeRect(start, 'SouthWest', 30, 20, limits)).toEqual({ left: 1030, top: 100, width: 290, height: 540 });
  });

  it('WND-04 폭은 280~620 안에서만 바뀌고, 왼쪽을 끌 때도 오른쪽 끝은 그대로다', () => {
    expect(resizeRect(start, 'East', -500, 0, limits).width).toBe(280);
    expect(resizeRect(start, 'East', 1000, 0, limits).width).toBe(620);
    expect(resizeRect(start, 'West', 500, 0, limits)).toEqual({ left: 1040, top: 100, width: 280, height: 520 });
  });

  it('WND-03 WND-05 끄는 동안 높이는 300보다 작아질 수 있고 창 최소 높이 120에서 멈추며, 작업 영역 높이를 넘지 않는다', () => {
    expect(resizeRect(start, 'South', 0, -500, limits).height).toBe(120);
    expect(resizeRect(start, 'South', 0, 5000, limits).height).toBe(1040);
    expect(resizeRect(start, 'North', 0, 450, limits)).toEqual({ left: 1000, top: 500, width: 320, height: 120 });
    expect(resizeLimits(150)).toEqual({ minWidth: 280, maxWidth: 620, minHeight: 120, maxHeight: 300 });
  });

  it('WND-03 내용에 맞춰 300보다 짧은 창(200)에서 끌기 시작하면 튀지 않고 마우스를 따라간다', () => {
    const short = { left: 1000, top: 100, width: 280, height: 200 };
    expect(resizeRect(short, 'South', 0, 1, limits)).toEqual({ left: 1000, top: 100, width: 280, height: 201 });
    expect(resizeRect(short, 'South', 0, -30, limits)).toEqual({ left: 1000, top: 100, width: 280, height: 170 });
    expect(resizeRect(short, 'North', 0, 30, limits)).toEqual({ left: 1000, top: 130, width: 280, height: 170 });
  });
});
