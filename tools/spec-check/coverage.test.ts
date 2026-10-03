import { describe, expect, it } from 'vitest';
import { checkCoverage } from './coverage.ts';
import type { Reference } from './links.ts';
import type { Requirement } from './parse.ts';

const WIN = 'spec/checklists/windows.md';
const MAC = 'spec/checklists/macos.md';
const CHECKLISTS = {
  'spec/behavior/tasks.md': [WIN, MAC],
  'spec/platform/windows.md': [WIN],
  'spec/platform/macos.md': [MAC],
  'spec/release.md': [WIN],
};

function req(id: string, verify: 'auto' | 'manual', file = 'spec/behavior/tasks.md'): Requirement {
  return { id, title: id, file, line: 1, verify, fields: {} };
}

function ref(id: string, file = 'x'): Reference {
  return { id, file, line: 1 };
}

describe('checkCoverage', () => {
  it('자동 테스트 항목은 테스트에서, 직접 확인 항목은 체크리스트에서 참조돼야 연결된다', () => {
    const reqs = [req('TASK-01', 'auto'), req('TASK-02', 'manual')];
    const report = checkCoverage(reqs, [ref('TASK-01')], [ref('TASK-02', WIN), ref('TASK-02', MAC)], CHECKLISTS);
    expect(report).toEqual({ unknown: [], unlinkedAuto: [], unlinkedManual: [] });
  });

  it('자리가 바뀐 참조는 연결로 치지 않는다', () => {
    const reqs = [req('TASK-01', 'auto'), req('TASK-02', 'manual')];
    const report = checkCoverage(reqs, [ref('TASK-02')], [ref('TASK-01', WIN), ref('TASK-01', MAC)], CHECKLISTS);
    expect(report.unlinkedAuto.map((r) => r.id)).toEqual(['TASK-01']);
    expect(report.unlinkedManual).toEqual([{ requirement: reqs[1], missing: [WIN, MAC] }]);
  });

  it('공통 행동의 직접 확인 항목은 두 체크리스트 모두에 있어야 한다', () => {
    const reqs = [req('TASK-02', 'manual')];
    const report = checkCoverage(reqs, [], [ref('TASK-02', WIN)], CHECKLISTS);
    expect(report.unlinkedManual).toEqual([{ requirement: reqs[0], missing: [MAC] }]);
  });

  it('WIN과 REL은 Windows 체크리스트, MAC은 macOS 체크리스트 하나면 된다', () => {
    const reqs = [
      req('WIN-02', 'manual', 'spec/platform/windows.md'),
      req('MAC-02', 'manual', 'spec/platform/macos.md'),
      req('REL-04', 'manual', 'spec/release.md'),
    ];
    const listed = checkCoverage(reqs, [], [ref('WIN-02', WIN), ref('MAC-02', MAC), ref('REL-04', WIN)], CHECKLISTS);
    expect(listed.unlinkedManual).toEqual([]);

    const swapped = checkCoverage(reqs, [], [ref('WIN-02', MAC), ref('MAC-02', WIN), ref('REL-04', MAC)], CHECKLISTS);
    expect(swapped.unlinkedManual).toEqual([
      { requirement: reqs[0], missing: [WIN] },
      { requirement: reqs[1], missing: [MAC] },
      { requirement: reqs[2], missing: [WIN] },
    ]);
  });

  it('체크리스트 표에 없는 spec 파일의 항목은 어느 체크리스트에든 있으면 된다', () => {
    const reqs = [req('TASK-02', 'manual', 'spec/behavior/extra.md')];
    expect(checkCoverage(reqs, [], [ref('TASK-02', WIN)], CHECKLISTS).unlinkedManual).toEqual([]);
    expect(checkCoverage(reqs, [], [], CHECKLISTS).unlinkedManual).toEqual([
      { requirement: reqs[0], missing: ['spec/checklists/'] },
    ]);
  });

  it('spec에 없는 ID를 가리키는 참조를 모은다', () => {
    const report = checkCoverage(
      [req('TASK-01', 'auto')],
      [ref('TASK-01'), ref('TASK-99', 't')],
      [ref('TASK-98', 'c')],
      CHECKLISTS,
    );
    expect(report.unknown).toEqual([ref('TASK-99', 't'), ref('TASK-98', 'c')]);
  });

  it('확인 값이 잘못된 요구사항은 연결 검사에서 뺀다 (형식 검사가 이미 알린다)', () => {
    const broken: Requirement = { ...req('TASK-03', 'auto'), verify: null };
    expect(checkCoverage([broken], [], [], CHECKLISTS)).toEqual({ unknown: [], unlinkedAuto: [], unlinkedManual: [] });
  });
});
