import type { Reference } from './links.ts';
import type { Requirement } from './parse.ts';

export interface CoverageReport {
  /** spec에 없는 ID를 가리키는 참조 */
  unknown: Reference[];
  /** 테스트에서 참조되지 않은 자동 테스트 항목 */
  unlinkedAuto: Requirement[];
  /** 체크리스트에 없는 직접 확인 항목 */
  unlinkedManual: Requirement[];
}

export function checkCoverage(
  requirements: Requirement[],
  testRefs: Reference[],
  checklistRefs: Reference[],
): CoverageReport {
  const known = new Set(requirements.map((r) => r.id));
  const tested = new Set(testRefs.map((r) => r.id));
  const listed = new Set(checklistRefs.map((r) => r.id));

  return {
    unknown: [...testRefs, ...checklistRefs].filter((r) => !known.has(r.id)),
    unlinkedAuto: requirements.filter((r) => r.verify === 'auto' && !tested.has(r.id)),
    unlinkedManual: requirements.filter((r) => r.verify === 'manual' && !listed.has(r.id)),
  };
}
