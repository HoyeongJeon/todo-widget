const MIN_OPACITY = 0.6;
const MAX_OPACITY = 1;

/** ⋯ 메뉴 슬라이더의 오른쪽 끝 (WND-11). */
export const MAX_TRANSPARENCY_PERCENT = 40;

const WHEEL_STEP_PERCENT = 2;

/** 저장값(카드 배경 불투명도)을 0.6~1.0으로 맞춘다. 없거나 비정상이면 1.0 (WND-11). */
export function resolveOpacity(saved: number | null): number {
  return saved !== null && Number.isFinite(saved) ? clamp(saved, MIN_OPACITY, MAX_OPACITY) : MAX_OPACITY;
}

/** 슬라이더와 % 값은 "얼마나 비치는가"를 보여 준다. 불투명도 0.85 → 15 (WND-11). */
export function transparencyPercent(opacity: number | null): number {
  return roundHalfUp((1 - resolveOpacity(opacity)) * 100);
}

/** 고른 %를 1% 단위(.5는 올림)로 맞추고 0~40%로 제한해 불투명도로 바꾼다 (WND-11). */
export function opacityFromPercent(percent: number): number {
  const p = clamp(roundHalfUp(percent), 0, MAX_TRANSPARENCY_PERCENT);
  return (100 - p) / 100;
}

/** 슬라이더 위 휠 한 칸: 위로 굴리면 2% 더 투명하게 (WND-12). */
export function stepTransparency(percent: number, wheelUp: boolean): number {
  return clamp(percent + (wheelUp ? WHEEL_STEP_PERCENT : -WHEEL_STEP_PERCENT), 0, MAX_TRANSPARENCY_PERCENT);
}

function roundHalfUp(value: number): number {
  return Math.floor(value + 0.5);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
