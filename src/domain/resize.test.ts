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

  it('WND-03 WND-05 끄는 동안 높이 하한은 놓은 뒤 창이 될 수 있는 가장 작은 높이 min(내용에 맞춘 높이, 300)이다(120 아래로는 가지 않는다)', () => {
    expect(resizeLimits(1040, 200).minHeight).toBe(200);
    expect(resizeLimits(1040, 700).minHeight).toBe(300);
    expect(resizeLimits(1040, 80).minHeight).toBe(120);
    expect(resizeLimits(1040)).toEqual({ minWidth: 280, maxWidth: 620, minHeight: 300, maxHeight: 1040 });
    expect(resizeLimits(150, 200)).toEqual({ minWidth: 280, maxWidth: 620, minHeight: 200, maxHeight: 300 });
  });

  it('WND-03 WND-05 내용이 긴 창은 300까지 줄이고, 작업 영역 높이를 넘지 않는다', () => {
    const long = resizeLimits(1040, 700);
    expect(resizeRect(start, 'South', 0, -500, long).height).toBe(300);
    expect(resizeRect(start, 'South', 0, 5000, long).height).toBe(1040);
    expect(resizeRect(start, 'North', 0, 450, long)).toEqual({ left: 1000, top: 320, width: 320, height: 300 });
  });

  it('WND-03 내용이 짧은 창(200)은 튀지 않고, 내용보다 짧게 끌 수 없으며, 길게는 마우스를 따라간다', () => {
    const short = { left: 1000, top: 100, width: 280, height: 200 };
    const fit = resizeLimits(1040, 200);
    expect(resizeRect(short, 'South', 0, 1, fit)).toEqual({ left: 1000, top: 100, width: 280, height: 201 });
    expect(resizeRect(short, 'South', 0, -30, fit)).toEqual({ left: 1000, top: 100, width: 280, height: 200 });
    expect(resizeRect(short, 'North', 0, 30, fit)).toEqual({ left: 1000, top: 100, width: 280, height: 200 });
  });
});
