import { type Rect, WINDOW_LIMITS } from './window-geometry.ts';

/** 크기를 바꾸는 가장자리와 모서리 (WND-03). */
export type ResizeEdge = 'North' | 'South' | 'East' | 'West' | 'NorthEast' | 'NorthWest' | 'SouthEast' | 'SouthWest';

export interface SizeLimits {
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
}

/** 끄는 동안과 놓은 뒤 저장할 때 같은 범위를 쓴다. 폭 280~620(WND-04), 높이 300~작업 영역 높이(WND-05). */
export function resizeLimits(workAreaHeight: number): SizeLimits {
  return {
    minWidth: WINDOW_LIMITS.minWidth,
    maxWidth: WINDOW_LIMITS.maxWidth,
    minHeight: WINDOW_LIMITS.minMaxHeight,
    maxHeight: Math.max(WINDOW_LIMITS.minMaxHeight, workAreaHeight),
  };
}

/**
 * 끈 거리(dx, dy)만큼 잡은 가장자리를 옮긴다. 반대쪽 가장자리는 그대로이고 크기는 limits 안으로 맞춘다 (WND-03).
 * 단위는 호출하는 쪽이 정한다. start, 거리, limits가 같은 단위면 된다.
 */
export function resizeRect(start: Rect, edge: ResizeEdge, dx: number, dy: number, limits: SizeLimits): Rect {
  let { left, top, width, height } = start;
  if (edge.endsWith('East'))
    width = clamp(start.width + dx, limits.minWidth, limits.maxWidth);
  if (edge.endsWith('West')) {
    width = clamp(start.width - dx, limits.minWidth, limits.maxWidth);
    left = start.left + start.width - width;
  }
  if (edge.startsWith('South'))
    height = clamp(start.height + dy, limits.minHeight, limits.maxHeight);
  if (edge.startsWith('North')) {
    height = clamp(start.height - dy, limits.minHeight, limits.maxHeight);
    top = start.top + start.height - height;
  }
  return { left, top, width, height };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
