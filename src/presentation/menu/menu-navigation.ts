/**
 * 방향키로 메뉴 강조를 옮긴다. 고를 수 있는 항목(비활성·구분선·투명도 줄 제외) 사이에서만 움직이고,
 * 끝에서는 반대쪽 끝으로 돈다(v1.4 T:166). 고를 수 있는 항목이 없으면 null.
 */
export function moveHighlight(selectable: readonly boolean[], current: number | null, step: 1 | -1): number | null {
  const count = selectable.length;
  if (!selectable.some(Boolean))
    return null;
  let index = current ?? (step === 1 ? -1 : count);
  for (let i = 0; i < count; i++) {
    index = (index + step + count) % count;
    if (selectable[index])
      return index;
  }
  return null;
}
