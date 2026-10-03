import { describe, expect, it } from 'vitest';
import { findReferences } from './links.ts';

const PREFIXES = ['TASK', 'STORE', 'I18N'];

describe('findReferences', () => {
  it('등록된 prefix의 ID를 줄 번호와 함께 찾는다', () => {
    const text = "it('TASK-09 끝낸 일을 다시 끝내도 그대로다', () => {});\n\n/// STORE-03 안전한 쓰기";
    expect(findReferences(text, 'a.test.ts', PREFIXES)).toEqual([
      { id: 'TASK-09', file: 'a.test.ts', line: 1 },
      { id: 'STORE-03', file: 'a.test.ts', line: 3 },
    ]);
  });

  it('한 줄에 여러 ID가 있으면 모두 찾는다', () => {
    const refs = findReferences('- [ ] TASK-01, TASK-02 추가', 'c.md', PREFIXES);
    expect(refs.map((r) => r.id)).toEqual(['TASK-01', 'TASK-02']);
  });

  it('숫자가 들어간 prefix도 찾는다', () => {
    expect(findReferences('I18N-04', 'b.md', PREFIXES).map((r) => r.id)).toEqual(['I18N-04']);
  });

  it('등록되지 않은 prefix나 자릿수가 맞지 않는 것은 무시한다', () => {
    const text = 'UTF-8, ISO-8601, LIST-01, TASK-1, TASK-1234, XTASK-01';
    expect(findReferences(text, 'b.md', PREFIXES)).toEqual([]);
  });
});
