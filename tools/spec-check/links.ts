export interface Reference {
  id: string;
  file: string;
  line: number;
}

export function findReferences(text: string, file: string, prefixes: readonly string[]): Reference[] {
  const pattern = new RegExp(`(?<![A-Za-z0-9])(?:${prefixes.join('|')})-\\d{2,3}(?![0-9])`, 'g');
  const refs: Reference[] = [];
  for (const [index, lineText] of text.split(/\r?\n/).entries()) {
    for (const match of lineText.matchAll(pattern))
      refs.push({ id: match[0], file, line: index + 1 });
  }
  return refs;
}

/** 제품 코드와 테스트가 한 파일에 섞이는 Rust 소스. 테스트에 붙은 주석만 참조로 센다. */
const RUST_SOURCE = /^src-tauri\/(?:src|crates\/[^/]+\/src)\/.*\.rs$/;
const RUST_COMMENT = /^\s*\/\//;
const RUST_TEST_ATTRIBUTE = /^\s*#\[test\]/;
const SKIPPED_TS_TEST = /\.(?:skip|todo)\(/;
/** 주석 줄 뒤 몇 줄 안에 `#[test]`가 와야 그 테스트를 가리키는 것으로 보는지 */
const RUST_TEST_DISTANCE = 3;

/**
 * 테스트 파일에서 실제 테스트를 가리키는 참조만 찾는다.
 * - `src-tauri/src/`와 `src-tauri/crates/<crate>/src/`의 Rust 파일: `//`, `///` 주석 줄 중 3줄 안에 `#[test]`가 오는 줄만 센다.
 *   제품 코드 속 설명 주석이 테스트로 잘못 세지지 않게 하기 위해서다.
 * - TypeScript 파일: `.skip(`, `.todo(`가 있는 줄은 세지 않는다.
 * - 그 밖(`src-tauri/tests/`, workflow 등): 모든 참조를 센다.
 */
export function findTestReferences(text: string, file: string, prefixes: readonly string[]): Reference[] {
  const refs = findReferences(text, file, prefixes);
  const lines = text.split(/\r?\n/);
  const at = (line: number): string => lines[line - 1] ?? '';

  if (RUST_SOURCE.test(file)) {
    return refs.filter((ref) => {
      if (!RUST_COMMENT.test(at(ref.line)))
        return false;
      for (let next = ref.line + 1; next <= ref.line + RUST_TEST_DISTANCE; next++) {
        if (RUST_TEST_ATTRIBUTE.test(at(next)))
          return true;
      }
      return false;
    });
  }
  if (file.endsWith('.ts'))
    return refs.filter((ref) => !SKIPPED_TS_TEST.test(at(ref.line)));
  return refs;
}
