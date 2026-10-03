/**
 * 끝낸 일·할 일 섹션에 높이를 나눈다. 다 들어가면 각자 필요한 만큼,
 * 넘치면 짧은 섹션은 다 보여 주고 남은 높이를 긴 섹션들이 똑같이 나눈다(각자 스크롤). v1.4 SectionLayout.Allocate와 같다.
 * @param available 섹션들이 쓸 수 있는 전체 높이. Infinity면 제한 없음.
 * @param desired 각 섹션이 다 보이려면 필요한 높이.
 * @param minimum 각 섹션이 줄어들 수 있는 최소 높이(제목 줄 + 첫 항목, 접히면 제목 줄). Infinity면 줄지 않는다.
 */
export function allocateSectionHeights(available: number, desired: readonly number[], minimum: readonly number[]): number[] {
  if (available === Infinity || sum(desired) <= available)
    return [...desired];

  const floors = desired.map((d, i) => Math.min(d, minimum[i] ?? Infinity));
  if (sum(floors) >= available)
    return floors;

  // 모든 섹션이 같은 "수위"까지 차오른다고 보고, 합이 available이 되는 수위를 이분 탐색으로 찾는다.
  let low = 0;
  let high = Math.max(...desired);
  for (let i = 0; i < 100; i++) {
    const level = (low + high) / 2;
    if (fill(level, floors, desired) > available)
      high = level;
    else
      low = level;
  }
  return desired.map((d, i) => clamp(low, floors[i] ?? 0, d));
}

function fill(level: number, floors: readonly number[], desired: readonly number[]): number {
  return sum(desired.map((d, i) => clamp(level, floors[i] ?? 0, d)));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function sum(values: readonly number[]): number {
  return values.reduce((a, b) => a + b, 0);
}
