import type { SizeLimits } from '../../domain/resize.ts';
import type { Rect } from '../../domain/window-geometry.ts';

export type DesktopOs = 'windows' | 'macos';

/** Tauri JS API가 주는 영역. 실제 픽셀이다(macOS는 포인트 × 그 창·모니터의 배율). */
export interface PhysicalRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * OS 좌표와 spec 좌표(window.md 용어 "크기와 좌표") 사이를 바꾼다. 이 파일은 OS 분기를 둘 수 있는 곳이다(설계 문서 5.4).
 * - native: Rust `set_frame`이 받는 단위. Windows는 실제 픽셀, macOS는 포인트.
 * - spec: Windows 위치는 실제 픽셀 ÷ 주 모니터 배율, 크기는 ÷ 창이 있는 모니터 배율. macOS는 포인트 그대로.
 * - 한계: Windows에서 모니터 배율이 서로 다르면 크기와 위치의 단위가 달라, WND-05의 최대 높이와 작업 영역 높이 비교는 근사다. 창이 생기기 전 "창이 있는 모니터"는 저장된 위치가 속한 모니터이지만, adapter는 부를 때의 현재 창 scaleFactor를 쓴다.
 */
export class Coordinates {
  readonly #os: DesktopOs;
  readonly #primaryScale: number;

  constructor(os: DesktopOs, primaryScale: number) {
    this.#os = os;
    this.#primaryScale = primaryScale;
  }

  physicalToNative(rect: PhysicalRect, windowScale: number): Rect {
    const divisor = this.#os === 'macos' ? windowScale : 1;
    return { left: rect.x / divisor, top: rect.y / divisor, width: rect.width / divisor, height: rect.height / divisor };
  }

  nativeToSpec(rect: Rect, windowScale: number): Rect {
    if (this.#os === 'macos')
      return { ...rect };
    return {
      left: rect.left / this.#primaryScale,
      top: rect.top / this.#primaryScale,
      width: rect.width / windowScale,
      height: rect.height / windowScale,
    };
  }

  specToNative(rect: Rect, windowScale: number): Rect {
    if (this.#os === 'macos')
      return { ...rect };
    return {
      left: rect.left * this.#primaryScale,
      top: rect.top * this.#primaryScale,
      width: rect.width * windowScale,
      height: rect.height * windowScale,
    };
  }

  /** pointer가 CSS px 1만큼 움직일 때 native 단위로 얼마인지. */
  nativePerCss(windowScale: number): number {
    return this.#os === 'macos' ? 1 : windowScale;
  }

  monitorToSpec(rect: PhysicalRect, monitorScale: number): Rect {
    const divisor = this.#os === 'macos' ? monitorScale : this.#primaryScale;
    return { left: rect.x / divisor, top: rect.y / divisor, width: rect.width / divisor, height: rect.height / divisor };
  }

  limitsToNative(limits: SizeLimits, windowScale: number): SizeLimits {
    const factor = this.#os === 'macos' ? 1 : windowScale;
    return {
      minWidth: limits.minWidth * factor,
      maxWidth: limits.maxWidth * factor,
      minHeight: limits.minHeight * factor,
      maxHeight: limits.maxHeight * factor,
    };
  }
}
