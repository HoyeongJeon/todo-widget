import { describe, expect, it } from 'vitest';
import { PIXELS_PER_STEP, WHEEL_NOTCH, WheelSteps } from './wheel-steps.ts';

describe('투명도 휠 칸 세기', () => {
  it('WND-12 줄 단위 휠(마우스 휠 한 칸)은 이벤트 하나가 한 칸이다. 위로 굴리면 양수다', () => {
    const wheel = new WheelSteps();
    expect([wheel.steps({ deltaY: -3, deltaMode: 1 }), wheel.steps({ deltaY: 3, deltaMode: 1 })]).toEqual([1, -1]);
  });

  it('WND-12 마우스 휠 칸(wheelDeltaY가 120의 배수)은 deltaY 크기와 관계없이 한 칸에 한 번이다', () => {
    const wheel = new WheelSteps();
    expect(WHEEL_NOTCH).toBe(120);
    expect(wheel.steps({ deltaY: -100, deltaMode: 0, wheelDeltaY: 120 })).toBe(1);
    expect(wheel.steps({ deltaY: 125, deltaMode: 0, wheelDeltaY: -120 })).toBe(-1);
    expect(wheel.steps({ deltaY: -200, deltaMode: 0, wheelDeltaY: 240 })).toBe(2);
    expect(wheel.steps({ deltaY: 3, deltaMode: 0, wheelDeltaY: -120, invertedFromDevice: true })).toBe(1);
  });

  it('WND-12 세로 움직임이 없는 휠(가로 쓸기, Shift+휠)은 칸이 아니다', () => {
    const wheel = new WheelSteps();
    expect([wheel.steps({ deltaY: 0, deltaMode: 0 }), wheel.steps({ deltaY: 0, deltaMode: 1 })]).toEqual([0, 0]);
  });

  it('WND-12 픽셀 단위 휠(트랙패드)은 50px 쌓일 때마다 한 칸이다', () => {
    const wheel = new WheelSteps();
    expect(PIXELS_PER_STEP).toBe(50);
    const steps = [-20, -20, -20, -40, -100].map((deltaY) => wheel.steps({ deltaY, deltaMode: 0 }));
    expect(steps).toEqual([0, 0, 1, 1, 2]);
  });

  it('WND-12 macOS 자연스러운 스크롤로 뒤집힌 값이면 실제 방향으로 되돌린다', () => {
    const wheel = new WheelSteps();
    expect(wheel.steps({ deltaY: 3, deltaMode: 1, invertedFromDevice: true })).toBe(1);
    expect(wheel.steps({ deltaY: -3, deltaMode: 1, invertedFromDevice: true })).toBe(-1);
    expect(wheel.steps({ deltaY: 100, deltaMode: 0, invertedFromDevice: true })).toBe(2);
  });

  it('WND-12 방향이 바뀌면 쌓아 둔 것을 버리고 반대쪽으로 새로 쌓는다', () => {
    const wheel = new WheelSteps();
    const steps = [-40, 30, 30].map((deltaY) => wheel.steps({ deltaY, deltaMode: 0 }));
    expect(steps).toEqual([0, 0, -1]);
  });
});
