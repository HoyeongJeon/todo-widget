/**
 * 창 크기 범위. 폭 280~620(WND-04), 최대 높이 300 이상(WND-05).
 * minDragHeight: 끄는 동안 창 높이의 하한. 카드 위아래 여백과 헤더·입력칸이 들어가는 높이이고 `tauri.conf.json`의 창 minHeight와 같다.
 * 끄는 동안에는 300보다 작아질 수 있고, 놓으면 최대 높이를 300 이상으로 맞춘다 (WND-03, v1.4도 끄는 동안 높이 하한이 없었다).
 */
export const WINDOW_LIMITS = { minWidth: 280, maxWidth: 620, defaultWidth: 320, minMaxHeight: 300, minDragHeight: 120, defaultMaxHeightRatio: 0.5 } as const;

/** 저장된 위치가 없을 때 작업 영역 오른쪽 위에서 띄우는 여백 (WND-07). */
export const PLACEMENT_MARGIN = 24;

/** 헤더를 잡아 끌 수 있으려면 이만큼은 모니터 안에 있어야 한다 (WND-08). */
export const HEADER_GRAB = 40;

/** 카드 둘레의 투명한 그림자 여백. 창 크기는 이 여백을 포함한다 (window.md 용어 "크기와 좌표"). */
export const SHADOW_MARGIN = 10;

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

/**
 * 창이 있는 모니터에서 창 위아래로 남은 공간. 그 모니터의 작업 영역(메뉴 막대·Dock·작업 표시줄을 뺀 영역) 기준이다.
 * 창과 가장 많이 겹치는 모니터를 창이 있는 모니터로 본다. 어느 모니터와도 겹치지 않으면 주 모니터 작업 영역 기준이다 (WND-10).
 * workAreas는 monitors와 같은 순서다. 작업 영역을 모르는 모니터는 모니터 영역 전체를 쓴다.
 */
export function spaceAround(bounds: Rect, monitors: readonly Rect[], workAreas: readonly Rect[], primaryWorkArea: Rect): { above: number; below: number } {
  let home = -1;
  let best = 0;
  monitors.forEach((monitor, index) => {
    const area = overlapArea(bounds, monitor);
    if (area > best) {
      best = area;
      home = index;
    }
  });
  const area = home < 0 ? primaryWorkArea : (workAreas[home] ?? monitors[home] ?? primaryWorkArea);
  return { above: bounds.top - area.top, below: area.top + area.height - (bounds.top + bounds.height) };
}

function overlapArea(a: Rect, b: Rect): number {
  const width = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
  const height = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
  return width > 0 && height > 0 ? width * height : 0;
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
