import { describe, expect, it } from 'vitest';
import type { Requirement } from './parse.ts';
import { validateRequirements } from './validate.ts';

const PREFIXES = { 'spec/behavior/tasks.md': ['TASK'], 'spec/00-principles.md': ['PRIV', 'PERF'] };

function req(overrides: Partial<Requirement>): Requirement {
  return {
    id: 'TASK-01',
    title: '추가',
    file: 'spec/behavior/tasks.md',
    line: 1,
    verify: 'auto',
    fields: { 결과: '된다', 확인: '자동 테스트' },
    ...overrides,
  };
}

describe('validateRequirements', () => {
  it('올바른 요구사항은 오류가 없다', () => {
    expect(validateRequirements([req({}), req({ id: 'TASK-02', line: 5 })], PREFIXES)).toEqual([]);
  });

  it('한 파일에 prefix가 여러 개면 어느 것이든 쓸 수 있다', () => {
    const reqs = [
      req({ id: 'PRIV-01', file: 'spec/00-principles.md' }),
      req({ id: 'PERF-01', file: 'spec/00-principles.md', line: 9 }),
    ];
    expect(validateRequirements(reqs, PREFIXES)).toEqual([]);
  });

  it('같은 ID가 두 번 나오면 두 번째 위치를 알려 준다', () => {
    const errors = validateRequirements([req({}), req({ line: 7 })], PREFIXES);
    expect(errors).toEqual([
      { file: 'spec/behavior/tasks.md', line: 7, message: 'TASK-01이 중복돼요. 처음 나온 곳: spec/behavior/tasks.md:1' },
    ]);
  });

  it('파일에 맞지 않는 prefix는 오류다', () => {
    const errors = validateRequirements([req({ id: 'LIST-01' })], PREFIXES);
    expect(errors[0]?.message).toBe('LIST-01은 이 파일에 둘 수 없어요. 쓸 수 있는 prefix: TASK');
  });

  it('prefix 표에 없는 spec 파일에는 요구사항을 둘 수 없다', () => {
    const errors = validateRequirements([req({ file: 'spec/behavior/extra.md' })], PREFIXES);
    expect(errors[0]?.message).toBe('TASK-01: 요구사항을 둘 수 없는 파일이에요 (tools/spec-check/config.ts에 등록 필요)');
  });

  it('결과가 없으면 오류다', () => {
    const errors = validateRequirements([req({ fields: { 확인: '자동 테스트' } })], PREFIXES);
    expect(errors[0]?.message).toBe('TASK-01에 결과가 없어요');
  });

  it('확인이 없거나 값이 틀리면 오류다', () => {
    const missing = validateRequirements([req({ verify: null, fields: { 결과: '된다' } })], PREFIXES);
    const wrong = validateRequirements([req({ verify: null, fields: { 결과: '된다', 확인: '눈으로' } })], PREFIXES);
    expect(missing[0]?.message).toBe('TASK-01에 확인이 없어요');
    expect(wrong[0]?.message).toBe("TASK-01의 확인 값은 '자동 테스트' 또는 '직접 확인'이어야 해요: 눈으로");
  });
});
