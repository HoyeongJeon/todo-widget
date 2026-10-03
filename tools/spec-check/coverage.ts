import type { Reference } from './links.ts';
import type { Requirement } from './parse.ts';

/** 직접 확인 항목이 빠진 체크리스트 */
export interface ChecklistGap {
  requirement: Requirement;
  /** 이 항목을 올려야 하는데 없는 체크리스트 파일 */
  missing: string[];
}

export interface CoverageReport {
  /** spec에 없는 ID를 가리키는 참조 */
  unknown: Reference[];
  /** 테스트에서 참조되지 않은 자동 테스트 항목 */
  unlinkedAuto: Requirement[];
  /** 올려야 할 체크리스트에 없는 직접 확인 항목 */
  unlinkedManual: ChecklistGap[];
}

/** 체크리스트 표에 없는 spec 파일의 항목은 어느 체크리스트에든 있으면 된다. 그때 빠진 곳으로 보여 줄 이름 */
const ANY_CHECKLIST = 'spec/checklists/';

export function checkCoverage(
  requirements: Requirement[],
  testRefs: Reference[],
  checklistRefs: Reference[],
  checklistsByFile: Readonly<Record<string, readonly string[]>>,
): CoverageReport {
  const known = new Set(requirements.map((r) => r.id));
  const tested = new Set(testRefs.map((r) => r.id));
  const listedIn = new Map<string, Set<string>>();
  for (const ref of checklistRefs) {
    const files = listedIn.get(ref.id) ?? new Set<string>();
    files.add(ref.file);
    listedIn.set(ref.id, files);
  }

  const unlinkedManual: ChecklistGap[] = [];
  for (const requirement of requirements.filter((r) => r.verify === 'manual')) {
    const listed = listedIn.get(requirement.id) ?? new Set<string>();
    const required = checklistsByFile[requirement.file];
    const missing = required
      ? required.filter((checklist) => !listed.has(checklist))
      : listed.size > 0 ? [] : [ANY_CHECKLIST];
    if (missing.length > 0)
      unlinkedManual.push({ requirement, missing });
  }

  return {
    unknown: [...testRefs, ...checklistRefs].filter((r) => !known.has(r.id)),
    unlinkedAuto: requirements.filter((r) => r.verify === 'auto' && !tested.has(r.id)),
    unlinkedManual,
  };
}
