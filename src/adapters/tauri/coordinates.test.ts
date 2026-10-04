import { describe, expect, it } from 'vitest';
import { Coordinates } from './coordinates.ts';

describe('좌표 변환 (window.md 용어 "크기와 좌표")', () => {
  it('WND-08 Windows는 위치를 주 모니터 배율로, 크기를 창이 있는 모니터 배율로 나눈다', () => {
    const coords = new Coordinates('windows', 1.5);
    // 배율 1인 오른쪽 보조 모니터 위의 창
    const native = coords.physicalToNative({ x: 2880, y: 150, width: 320, height: 520 }, 1);
    expect(native).toEqual({ left: 2880, top: 150, width: 320, height: 520 });
    const spec = coords.nativeToSpec(native, 1);
    expect(spec).toEqual({ left: 1920, top: 100, width: 320, height: 520 });
    expect(coords.specToNative(spec, 1)).toEqual(native);
    expect(coords.nativePerCss(1.5)).toBe(1.5);
  });

  it('WND-08 Windows 모니터 영역은 모두 주 모니터 배율로 나눈다 (v1.4 DIP와 같다)', () => {
    const coords = new Coordinates('windows', 1.25);
    expect(coords.monitorToSpec({ x: 0, y: 0, width: 2400, height: 1350 }, 1.25)).toEqual({ left: 0, top: 0, width: 1920, height: 1080 });
    expect(coords.monitorToSpec({ x: -1920, y: 0, width: 1920, height: 1080 }, 1)).toEqual({ left: -1536, top: 0, width: 1536, height: 864 });
  });

  it('WND-08 macOS는 OS 포인트 좌표를 그대로 쓴다', () => {
    const coords = new Coordinates('macos', 2);
    // Tauri는 macOS에서도 포인트에 창(모니터) 배율을 곱한 값을 준다
    const native = coords.physicalToNative({ x: 3152, y: 48, width: 640, height: 1040 }, 2);
    expect(native).toEqual({ left: 1576, top: 24, width: 320, height: 520 });
    expect(coords.nativeToSpec(native, 2)).toEqual(native);
    expect(coords.specToNative(native, 2)).toEqual(native);
    expect(coords.nativePerCss(2)).toBe(1);
    expect(coords.monitorToSpec({ x: 0, y: 0, width: 2880, height: 1800 }, 2)).toEqual({ left: 0, top: 0, width: 1440, height: 900 });
    expect(coords.monitorToSpec({ x: 1440, y: 0, width: 1920, height: 1080 }, 1)).toEqual({ left: 1440, top: 0, width: 1920, height: 1080 });
  });

  it('WND-04 크기 조절 범위는 Windows에서 창 모니터 배율만큼 키우고 macOS는 그대로 둔다', () => {
    const limits = { minWidth: 280, maxWidth: 620, minHeight: 300, maxHeight: 1040 };
    expect(new Coordinates('windows', 1).limitsToNative(limits, 1.5)).toEqual({ minWidth: 420, maxWidth: 930, minHeight: 450, maxHeight: 1560 });
    expect(new Coordinates('macos', 2).limitsToNative(limits, 2)).toEqual(limits);
  });
});
