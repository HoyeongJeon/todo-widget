export const WINDOW_LIMITS = { minWidth: 280, maxWidth: 620, defaultWidth: 320, minMaxHeight: 300, defaultMaxHeightRatio: 0.5 } as const;

/** 저장된 위치가 없을 때 작업 영역 오른쪽 위에서 띄우는 여백 (WND-07). */
export const PLACEMENT_MARGIN = 24;

/** 헤더를 잡아 끌 수 있으려면 이만큼은 모니터 안에 있어야 한다 (WND-08). */
export const HEADER_GRAB = 40;

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface WidgetSize {
  width: number;
  maxHeight: number;
}

/** 저장된 폭·최대 높이를 허용 범위로 맞춘다. 높이는 상한일 뿐이다 (WND-04~06). */
export function resolveWidgetSize(savedWidth: number | null, savedMaxHeight: number | null, workAreaHeight: number): WidgetSize {
  const width = isFiniteNumber(savedWidth)
    ? clamp(savedWidth, WINDOW_LIMITS.minWidth, WINDOW_LIMITS.maxWidth)
    : WINDOW_LIMITS.defaultWidth;
  const ceiling = Math.max(WINDOW_LIMITS.minMaxHeight, workAreaHeight);
  const maxHeight = isFiniteNumber(savedMaxHeight)
    ? clamp(savedMaxHeight, WINDOW_LIMITS.minMaxHeight, ceiling)
    : Math.max(WINDOW_LIMITS.minMaxHeight, workAreaHeight * WINDOW_LIMITS.defaultMaxHeightRatio);
  return { width, maxHeight };
}

/** 헤더를 어느 모니터에서든 잡을 수 있으면 저장된 위치, 아니면 주 모니터 작업 영역 오른쪽 위 (WND-07, WND-08). */
export function resolveWidgetPosition(
  saved: { left: number | null; top: number | null },
  windowWidth: number,
  monitors: readonly Rect[],
  primaryWorkArea: Rect,
): { left: number; top: number } {
  const { left, top } = saved;
  if (isFiniteNumber(left) && isFiniteNumber(top) && monitors.some((m) => headerReachable(left, top, windowWidth, m)))
    return { left, top };
  return {
    left: primaryWorkArea.left + primaryWorkArea.width - windowWidth - PLACEMENT_MARGIN,
    top: primaryWorkArea.top + PLACEMENT_MARGIN,
  };
}

function headerReachable(left: number, top: number, width: number, monitor: Rect): boolean {
  const overlap = Math.min(left + width, monitor.left + monitor.width) - Math.max(left, monitor.left);
  return overlap >= HEADER_GRAB && top >= monitor.top && top + HEADER_GRAB <= monitor.top + monitor.height;
}

function isFiniteNumber(value: number | null): value is number {
  return value !== null && Number.isFinite(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
