import { describe, expect, it } from 'vitest';
import { findReferences, findTestReferences } from './links.ts';

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

describe('findTestReferences', () => {
  it('TypeScript 테스트에서 .skip(이나 .todo(가 있는 줄의 ID는 세지 않는다', () => {
    const text = [
      "it('TASK-01 추가', () => {});",
      "it.skip('TASK-02 아직 안 됨', () => {});",
      "it.todo('TASK-03 나중에');",
      "describe.skip('STORE-01 묶음', () => {});",
    ].join('\n');
    expect(findTestReferences(text, 'src/domain/a.test.ts', PREFIXES).map((r) => r.id)).toEqual(['TASK-01']);
  });

  it('src-tauri/src의 Rust 파일은 3줄 안에 #[test]가 오는 주석의 ID만 센다', () => {
    const text = [
      '/// STORE-01 바로 위 주석',     // 1: 2줄 뒤 #[test]
      '// 설명 한 줄',
      '#[test]',
      'fn a() { let _ = "STORE-02"; }', // 4: 주석이 아니다
      '// STORE-03 테스트와 먼 주석',   // 5: 4줄 뒤에야 #[test]
      '',
      '',
      '',
      '#[test]',
      'fn b() {}',
      '/// TASK-01 마지막 줄 주석',      // 11: 뒤에 #[test]가 없다
    ].join('\n');
    const refs = findTestReferences(text, 'src-tauri/src/fs.rs', PREFIXES);
    expect(refs).toEqual([{ id: 'STORE-01', file: 'src-tauri/src/fs.rs', line: 1 }]);
  });

  it('#[test]가 3줄 안에 있으면 센다', () => {
    const text = '/// STORE-01 첫 줄\n/// 둘째 줄\n/// 셋째 줄\n#[test]\nfn a() {}';
    expect(findTestReferences(text, 'src-tauri/src/fs.rs', PREFIXES).map((r) => r.id)).toEqual(['STORE-01']);
  });

  it('src-tauri/tests의 Rust 파일과 workflow 파일은 모든 ID를 센다', () => {
    const rust = 'fn store_01() { /* STORE-01 */ }';
    const yaml = '- name: TASK-01 spec 검사';
    expect(findTestReferences(rust, 'src-tauri/tests/fs.rs', PREFIXES).map((r) => r.id)).toEqual(['STORE-01']);
    expect(findTestReferences(yaml, '.github/workflows/ci.yml', PREFIXES).map((r) => r.id)).toEqual(['TASK-01']);
  });
});
