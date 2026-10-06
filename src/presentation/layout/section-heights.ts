import { allocateSectionHeights } from '../../domain/section-layout.ts';

/** 섹션 하나를 화면에서 잰 값. 모두 CSS px다. */
export interface SectionMeasure {
  /** 목록 말고 섹션이 쓰는 높이: 위 여백 + 제목 줄 + 제목 줄과 목록 사이. */
  readonly chrome: number;
  /** 목록을 다 보이려면 필요한 높이. 접혀 있으면 0이다. */
  readonly content: number;
  /** 첫 항목 한 줄의 높이(위아래 여백 포함). 최소 높이에 쓴다 (LIST-15). */
  readonly firstRow: number;
  readonly expanded: boolean;
}

/** 섹션 목록의 최대 높이. null이면 제한하지 않는다. */
export interface ListHeights {
  readonly done: number | null;
  readonly todo: number | null;
}

const NAMES = ['done', 'todo'] as const;

/**
 * 섹션들이 쓸 수 있는 높이(available)를 v1.4와 같이 나눠 목록마다 최대 높이를 정한다.
 * 다 들어가면 제한하지 않는다(LIST-13). 넘치면 짧은 섹션은 다 보이고 긴 섹션들이 나머지를 똑같이 나눈다(LIST-14).
 * 최소 높이(제목 줄 + 첫 항목, 접히면 제목 줄) 아래로는 줄지 않는다(LIST-15). 보이지 않는 섹션(null)은 빼고 나눈다(LIST-01).
 */
export function sectionListHeights(available: number, sections: { done: SectionMeasure | null; todo: SectionMeasure | null }): ListHeights {
  const shown = NAMES.flatMap((name) => {
    const measure = sections[name];
    return measure === null ? [] : [{ name, measure }];
  });
  const desired = shown.map(({ measure }) => measure.chrome + (measure.expanded ? measure.content : 0));
  const minimum = shown.map(({ measure }) => measure.chrome + (measure.expanded ? Math.min(measure.firstRow, measure.content) : 0));
  const result: { done: number | null; todo: number | null } = { done: null, todo: null };
  if (desired.reduce((a, b) => a + b, 0) <= available)
    return result;
  const allocated = allocateSectionHeights(Math.max(0, available), desired, minimum);
  shown.forEach(({ name, measure }, index) => {
    if (measure.expanded)
      result[name] = Math.max(0, (allocated[index] ?? 0) - measure.chrome);
  });
  return result;
}

/** 0.5 안의 차이는 같은 높이로 본다. 잴 때마다 다시 그리는 것을 막는다. */
export function sameListHeights(a: ListHeights, b: ListHeights): boolean {
  return NAMES.every((name) => {
    const x = a[name];
    const y = b[name];
    return x === null || y === null ? x === y : Math.abs(x - y) < 0.5;
  });
}
