import { describe, expect, it } from 'vitest';
import { opacityFromPercent, resolveOpacity, stepTransparency, transparencyPercent } from './opacity.ts';

describe('배경 투명도', () => {
  it('WND-11 저장값(불투명도)은 0.6~1.0으로 맞추고, 없거나 비정상이면 1.0이다', () => {
    expect(resolveOpacity(0.1)).toBe(0.6);
    expect(resolveOpacity(1.5)).toBe(1);
    expect(resolveOpacity(0.85)).toBe(0.85);
    for (const bad of [null, NaN, Infinity, -Infinity])
      expect(resolveOpacity(bad)).toBe(1);
  });

  it('WND-11 불투명도를 투명도 %로 보여 준다', () => {
    expect(transparencyPercent(0.85)).toBe(15);
    expect(transparencyPercent(0.6)).toBe(40);
    expect(transparencyPercent(null)).toBe(0);
  });

  it('WND-11 고른 %는 가장 가까운 1% 단위로 맞추고 .5는 올리며 0~40%로 제한한다', () => {
    expect(opacityFromPercent(14.6)).toBe(0.85);
    expect(opacityFromPercent(14.5)).toBe(0.85);
    expect(opacityFromPercent(14.4)).toBe(0.86);
    expect(opacityFromPercent(70)).toBe(0.6);
    expect(opacityFromPercent(-5)).toBe(1);
  });

  it('WND-11 고른 %가 비정상이면 0%로 보고, 무한대는 40%로 제한한다', () => {
    expect(opacityFromPercent(NaN)).toBe(1);
    expect(opacityFromPercent(Infinity)).toBe(0.6);
    expect(opacityFromPercent(-Infinity)).toBe(1);
  });

  it('WND-12 휠 한 칸은 2%씩, 0~40% 안에서 바꾼다', () => {
    expect(stepTransparency(10, true)).toBe(12);
    expect(stepTransparency(10, false)).toBe(8);
    expect(stepTransparency(39, true)).toBe(40);
    expect(stepTransparency(1, false)).toBe(0);
  });
});
