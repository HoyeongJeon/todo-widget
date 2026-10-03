import { describe, expect, it } from 'vitest';
import { checkCoverage } from './coverage.ts';
import type { Reference } from './links.ts';
import type { Requirement } from './parse.ts';

function req(id: string, verify: 'auto' | 'manual'): Requirement {
  return { id, title: id, file: 'spec/behavior/tasks.md', line: 1, verify, fields: {} };
}

function ref(id: string, file = 'x'): Reference {
  return { id, file, line: 1 };
}

describe('checkCoverage', () => {
  it('자동 테스트 항목은 테스트에서, 직접 확인 항목은 체크리스트에서 참조돼야 연결된다', () => {
    const reqs = [req('TASK-01', 'auto'), req('TASK-02', 'manual')];
    const report = checkCoverage(reqs, [ref('TASK-01')], [ref('TASK-02')]);
    expect(report).toEqual({ unknown: [], unlinkedAuto: [], unlinkedManual: [] });
  });

  it('자리가 바뀐 참조는 연결로 치지 않는다', () => {
    const reqs = [req('TASK-01', 'auto'), req('TASK-02', 'manual')];
    const report = checkCoverage(reqs, [ref('TASK-02')], [ref('TASK-01')]);
    expect(report.unlinkedAuto.map((r) => r.id)).toEqual(['TASK-01']);
    expect(report.unlinkedManual.map((r) => r.id)).toEqual(['TASK-02']);
  });

  it('spec에 없는 ID를 가리키는 참조를 모은다', () => {
    const report = checkCoverage([req('TASK-01', 'auto')], [ref('TASK-01'), ref('TASK-99', 't')], [ref('TASK-98', 'c')]);
    expect(report.unknown).toEqual([ref('TASK-99', 't'), ref('TASK-98', 'c')]);
  });

  it('확인 값이 잘못된 요구사항은 연결 검사에서 뺀다 (형식 검사가 이미 알린다)', () => {
    const broken: Requirement = { ...req('TASK-03', 'auto'), verify: null };
    expect(checkCoverage([broken], [], [])).toEqual({ unknown: [], unlinkedAuto: [], unlinkedManual: [] });
  });
});
