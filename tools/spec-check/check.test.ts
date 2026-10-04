import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { formatResult, runSpecCheck } from './check.ts';

let root: string;

function write(relative: string, content: string): void {
  const path = join(root, relative);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'spec-check-'));
  write(
    'spec/behavior/tasks.md',
    [
      '### TASK-01 추가',
      '- 결과: 된다',
      '- 확인: 자동 테스트',
      '',
      '### TASK-02 줄바꿈 표시',
      '- 결과: 보인다',
      '- 확인: 직접 확인',
    ].join('\n'),
  );
  write('spec/checklists/windows.md', '- [ ] TASK-02 줄바꿈 표시');
  write('spec/checklists/macos.md', '- [ ] TASK-02 줄바꿈 표시');
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('runSpecCheck', () => {
  it('테스트가 아직 없으면 기본 모드는 통과하고 strict 모드는 실패한다', () => {
    expect(runSpecCheck(root, { strict: false }).exitCode).toBe(0);
    const strict = runSpecCheck(root, { strict: true });
    expect(strict.exitCode).toBe(1);
    expect(strict.coverage.unlinkedAuto.map((r) => r.id)).toEqual(['TASK-01']);
  });

  it('테스트가 생기면 strict 모드도 통과한다', () => {
    write('src/domain/todo-list.test.ts', "it('TASK-01 추가', () => {});");
    expect(runSpecCheck(root, { strict: true }).exitCode).toBe(0);
  });

  it('Rust 테스트의 주석도 참조로 센다', () => {
    write('src-tauri/src/fs.rs', '/// TASK-01 추가\n#[test]\nfn adds() {}');
    expect(runSpecCheck(root, { strict: true }).exitCode).toBe(0);
  });

  it('src-tauri/crates 아래 crate의 Rust 테스트 주석도 참조로 센다', () => {
    write('src-tauri/crates/core/src/files.rs', '/// TASK-01 추가\n#[cfg(windows)]\n#[test]\nfn adds() {}');
    expect(runSpecCheck(root, { strict: true }).exitCode).toBe(0);
  });

  it('src-tauri/crates에서도 테스트에 붙지 않은 ID 언급은 참조로 세지 않는다', () => {
    write('src-tauri/crates/core/src/files.rs', '// TASK-01 설명\nfn adds() {}');
    expect(runSpecCheck(root, { strict: true }).coverage.unlinkedAuto.map((r) => r.id)).toEqual(['TASK-01']);
  });

  it('직접 확인 항목이 체크리스트에 없으면 기본 모드도 실패한다', () => {
    write('spec/checklists/windows.md', '');
    const result = runSpecCheck(root, { strict: false });
    expect(result.exitCode).toBe(1);
    expect(result.coverage.unlinkedManual.map((g) => g.requirement.id)).toEqual(['TASK-02']);
  });

  it('공통 행동의 직접 확인 항목이 한쪽 체크리스트에만 있으면 기본 모드도 실패한다', () => {
    write('spec/checklists/macos.md', '');
    const result = runSpecCheck(root, { strict: false });
    expect(result.exitCode).toBe(1);
    expect(result.coverage.unlinkedManual).toEqual([
      { requirement: expect.objectContaining({ id: 'TASK-02' }), missing: ['spec/checklists/macos.md'] },
    ]);
    expect(formatResult(result, false)).toContain(
      '오류 체크리스트에 없는 직접 확인 항목 1개: TASK-02(spec/checklists/macos.md)',
    );
  });

  it('출시 항목은 Windows 체크리스트에만 있어도 된다', () => {
    write('spec/release.md', '### REL-04 승인\n- 결과: 공개한다\n- 확인: 직접 확인');
    write('spec/checklists/windows.md', '- [ ] TASK-02 줄바꿈 표시\n- [ ] REL-04 승인');
    expect(runSpecCheck(root, { strict: false }).exitCode).toBe(0);
  });

  it('src-tauri/tests의 Rust 테스트와 GitHub Actions workflow도 참조로 센다', () => {
    write('src-tauri/tests/store.rs', '#[test]\nfn task_01() { /* TASK-01 */ }');
    expect(runSpecCheck(root, { strict: true }).exitCode).toBe(0);
    rmSync(join(root, 'src-tauri'), { recursive: true });

    write('.github/workflows/ci.yml', 'steps:\n  - name: TASK-01 검사');
    expect(runSpecCheck(root, { strict: true }).exitCode).toBe(0);
  });

  it('src-tauri/src에서 테스트에 붙지 않은 ID 언급은 참조로 세지 않는다', () => {
    write('src-tauri/src/fs.rs', '// TASK-01 아직 테스트 없음\nfn adds() {}');
    expect(runSpecCheck(root, { strict: true }).coverage.unlinkedAuto.map((r) => r.id)).toEqual(['TASK-01']);
  });

  it('건너뛴 TypeScript 테스트는 참조로 세지 않는다', () => {
    write('src/domain/todo-list.test.ts', "it.skip('TASK-01 추가', () => {});");
    expect(runSpecCheck(root, { strict: true }).exitCode).toBe(1);
  });

  it('형식 오류나 없는 ID 참조가 있으면 실패한다', () => {
    write('spec/behavior/tasks.md', '### TASK-01 추가\n- 결과: 된다');
    expect(runSpecCheck(root, { strict: false }).errors[0]?.message).toBe('TASK-01에 확인이 없어요');

    write('spec/behavior/tasks.md', '### TASK-01 추가\n- 결과: 된다\n- 확인: 자동 테스트');
    write('spec/checklists/windows.md', '- [ ] TASK-77 없는 항목');
    write('spec/checklists/macos.md', '');
    const result = runSpecCheck(root, { strict: false });
    expect(result.exitCode).toBe(1);
    expect(result.coverage.unknown.map((r) => r.id)).toEqual(['TASK-77']);
  });

  it('체크리스트 파일 안의 형식 오류는 spec 형식 검사 대상이 아니다', () => {
    write('spec/checklists/macos.md', '### MAC-1 이런 제목도 체크리스트에서는 괜찮다');
    expect(runSpecCheck(root, { strict: false }).errors).toEqual([]);
  });

  it('결과를 사람이 읽을 수 있게 요약한다', () => {
    const text = formatResult(runSpecCheck(root, { strict: false }), false);
    expect(text).toContain('요구사항 2개 (자동 테스트 1, 직접 확인 1)');
    expect(text).toContain('테스트 없는 자동 테스트 항목 1개: TASK-01');
  });
});
