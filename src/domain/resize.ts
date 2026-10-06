import { type Rect, WINDOW_LIMITS } from './window-geometry.ts';

/** 크기를 바꾸는 가장자리와 모서리 (WND-03). */
export type ResizeEdge = 'North' | 'South' | 'East' | 'West' | 'NorthEast' | 'NorthWest' | 'SouthEast' | 'SouthWest';

export interface SizeLimits {
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
}

/**
 * 끄는 동안의 범위. 폭은 280~620(WND-04)으로 바로 맞추고, 높이 상한은 작업 영역 높이다.
 * 높이 하한은 놓은 뒤 창이 될 수 있는 가장 작은 높이, 곧 min(내용에 맞춘 높이 fitHeight, 300)이다(창 최소 높이 120 아래로는 가지 않는다).
 * 내용이 짧은 창은 내용보다 짧게 끌 수 없어 놓을 때 되돌아오지 않고, 끌기를 시작할 때 300으로 튀지도 않는다.
 * 내용이 긴 창은 300까지 줄인다. 놓은 뒤 저장하는 최대 높이는 WindowPlacement가 WND-05대로 300 이상으로 맞춘다
 * (WND-03, PM 결정 2026-10-06). fitHeight를 모르면 300이다.
 */
export function resizeLimits(workAreaHeight: number, fitHeight: number = WINDOW_LIMITS.minMaxHeight): SizeLimits {
  return {
    minWidth: WINDOW_LIMITS.minWidth,
    maxWidth: WINDOW_LIMITS.maxWidth,
    minHeight: Math.max(WINDOW_LIMITS.minDragHeight, Math.min(fitHeight, WINDOW_LIMITS.minMaxHeight)),
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
