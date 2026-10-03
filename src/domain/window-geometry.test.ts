import { describe, expect, it } from 'vitest';
import { type Rect, resolveWidgetPosition, resolveWidgetSize } from './window-geometry.ts';

const screen: Rect = { left: 0, top: 0, width: 1920, height: 1080 };
const workArea: Rect = { left: 0, top: 0, width: 1920, height: 1040 };
const leftScreen: Rect = { left: -1920, top: 0, width: 1920, height: 1080 };
const position = (left: number | null, top: number | null, monitors: Rect[] = [screen]) =>
  resolveWidgetPosition({ left, top }, 320, monitors, workArea);

describe('창 크기', () => {
  it('WND-04 폭은 280~620으로 맞춘다', () => {
    expect(resolveWidgetSize(100, 700, 1040).width).toBe(280);
    expect(resolveWidgetSize(2000, 700, 1040).width).toBe(620);
    expect(resolveWidgetSize(450, 700, 1040).width).toBe(450);
  });

  it('WND-05 최대 높이는 300 이상, 작업 영역 높이 이하다', () => {
    expect(resolveWidgetSize(320, 50, 1040).maxHeight).toBe(300);
    expect(resolveWidgetSize(320, 3000, 1040).maxHeight).toBe(1040);
    expect(resolveWidgetSize(320, 700, 1040).maxHeight).toBe(700);
    expect(resolveWidgetSize(320, null, 150).maxHeight).toBe(300);
    expect(resolveWidgetSize(320, 3000, 150).maxHeight).toBe(300);
  });

  it('WND-06 저장된 크기가 없거나 비정상이면 폭 320, 최대 높이는 작업 영역의 절반이다', () => {
    expect(resolveWidgetSize(null, null, 1040)).toEqual({ width: 320, maxHeight: 520 });
    expect(resolveWidgetSize(NaN, Infinity, 1040)).toEqual({ width: 320, maxHeight: 520 });
    expect(resolveWidgetSize(450, null, 1040)).toEqual({ width: 450, maxHeight: 520 });
  });
});

describe('창 위치', () => {
  it('WND-07 저장된 위치가 없거나 좌표가 하나뿐이면 작업 영역 오른쪽 위(여백 24)다', () => {
    expect(position(null, null)).toEqual({ left: 1576, top: 24 });
    expect(position(300, null)).toEqual({ left: 1576, top: 24 });
    expect(position(NaN, 100)).toEqual({ left: 1576, top: 24 });
  });

  it('WND-08 헤더를 잡을 수 있으면 저장된 위치를 쓴다', () => {
    expect(position(300, 200)).toEqual({ left: 300, top: 200 });
    expect(position(1800, 100)).toEqual({ left: 1800, top: 100 });
    expect(position(300, 1010)).toEqual({ left: 300, top: 1010 });
    expect(position(-1500, 100, [screen, leftScreen])).toEqual({ left: -1500, top: 100 });
  });

  it('WND-08 헤더를 잡을 수 없으면 기본 위치를 쓴다', () => {
    for (const [left, top] of [[2500, 100], [-2000, 100], [300, -500], [300, 1070]] as const)
      expect(position(left, top), `${left},${top}`).toEqual({ left: 1576, top: 24 });
  });
});
