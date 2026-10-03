import { describe, expect, it } from 'vitest';
import { parseSpec } from './parse.ts';

const FILE = 'spec/behavior/tasks.md';

describe('parseSpec', () => {
  it('### ID 제목과 아래 목록을 요구사항 하나로 읽는다', () => {
    const md = [
      '# 할 일',
      '',
      '### TASK-09 끝낸 일을 다시 끝내도 그대로다',
      '- 조건: 상태 `done`',
      '- 동작: `done`으로 지정한다',
      '- 결과: 끝낸 시각이 그대로다',
      '- 확인: 자동 테스트',
    ].join('\n');

    const { requirements, errors } = parseSpec(md, FILE);

    expect(errors).toEqual([]);
    expect(requirements).toEqual([
      {
        id: 'TASK-09',
        title: '끝낸 일을 다시 끝내도 그대로다',
        file: FILE,
        line: 3,
        verify: 'auto',
        fields: { 조건: '상태 `done`', 동작: '`done`으로 지정한다', 결과: '끝낸 시각이 그대로다', 확인: '자동 테스트' },
      },
    ]);
  });

  it('직접 확인은 manual이다', () => {
    const md = '### LIST-11 긴 제목은 줄바꿈된다\n- 결과: 전부 보인다\n- 확인: 직접 확인';
    expect(parseSpec(md, FILE).requirements[0]?.verify).toBe('manual');
  });

  it('알 수 없는 확인 값은 verify가 null이다', () => {
    const md = '### TASK-01 추가\n- 결과: 된다\n- 확인: 눈으로';
    expect(parseSpec(md, FILE).requirements[0]?.verify).toBeNull();
  });

  it('다른 제목이 나오면 앞 요구사항의 목록이 끝난다', () => {
    const md = '### TASK-01 추가\n- 결과: 된다\n\n## 다음 절\n- 확인: 자동 테스트';
    expect(parseSpec(md, FILE).requirements[0]?.fields).toEqual({ 결과: '된다' });
  });

  it('줄바꿈이 CRLF여도 읽는다', () => {
    const md = '### TASK-01 추가\r\n- 결과: 된다\r\n- 확인: 자동 테스트';
    expect(parseSpec(md, FILE).requirements[0]?.verify).toBe('auto');
  });

  it('ID처럼 생겼지만 형식이 틀린 제목은 오류다', () => {
    const md = '### TASK-7 숫자가 한 자리\n### TASK09 하이픈 없음\n### 일반 제목';
    const { requirements, errors } = parseSpec(md, FILE);

    expect(requirements).toEqual([]);
    expect(errors).toEqual([
      { file: FILE, line: 1, message: '요구사항 제목 형식이 아니에요: ### TASK-7 숫자가 한 자리' },
      { file: FILE, line: 2, message: '요구사항 제목 형식이 아니에요: ### TASK09 하이픈 없음' },
    ]);
  });

  it('등록된 prefix로 시작하는 제목은 수준과 관계없이 형식이 틀리면 오류다', () => {
    const md = [
      '# TASK-01 맨 위 수준',
      '## STORE-03 두 번째 수준',
      '#### WND-12 네 번째 수준',
      '###### I18N-1 여섯 번째 수준',
      '## TASK01 하이픈 없음',
      '## PERFORMANCE 같은 낱말은 괜찮다',
      '## I18N 문구도 괜찮다',
    ].join('\n');
    const { requirements, errors } = parseSpec(md, FILE);

    expect(requirements).toEqual([]);
    expect(errors.map((e) => e.line)).toEqual([1, 2, 3, 4, 5]);
    expect(errors[0]?.message).toBe('요구사항 제목 형식이 아니에요: # TASK-01 맨 위 수준');
  });

  it('ID만 있고 제목이 없는 ### 제목은 오류다', () => {
    const md = '### TASK-01\n- 결과: 된다\n- 확인: 자동 테스트\n### TASK-02   \n- 결과: 된다\n- 확인: 자동 테스트';
    const { requirements, errors } = parseSpec(md, FILE);

    expect(requirements).toEqual([]);
    expect(errors).toEqual([
      { file: FILE, line: 1, message: 'TASK-01에 제목이 없어요' },
      { file: FILE, line: 4, message: 'TASK-02에 제목이 없어요' },
    ]);
  });

  it('파일 맨 앞의 BOM은 무시한다', () => {
    const md = '\uFEFF### TASK-01 추가\n- 결과: 된다\n- 확인: 자동 테스트';
    const { requirements, errors } = parseSpec(md, FILE);
    expect(errors).toEqual([]);
    expect(requirements.map((r) => r.id)).toEqual(['TASK-01']);
  });

  it('코드 블록 안의 제목과 목록은 무시한다', () => {
    const md = [
      '### TASK-01 추가',
      '- 결과: 된다',
      '- 확인: 자동 테스트',
      '',
      '```markdown',
      '### TASK-02 예시일 뿐이다',
      '- 확인: 직접 확인',
      '## TASK-3 형식이 틀려도 예시다',
      '```',
      '',
      '~~~',
      '### TASK-04 물결 울타리도 같다',
      '~~~',
    ].join('\n');
    const { requirements, errors } = parseSpec(md, FILE);

    expect(errors).toEqual([]);
    expect(requirements.map((r) => r.id)).toEqual(['TASK-01']);
    expect(requirements[0]?.fields).toEqual({ 결과: '된다', 확인: '자동 테스트' });
  });

  it('울타리는 같은 문자로 같은 길이 이상이어야 닫힌다', () => {
    const md = ['````', '```', '### TASK-02 아직 코드 블록 안이다', '````', '### TASK-01 추가', '- 결과: 된다', '- 확인: 자동 테스트'].join('\n');
    expect(parseSpec(md, FILE).requirements.map((r) => r.id)).toEqual(['TASK-01']);
  });

  it('한 요구사항에 같은 항목이 두 번 있으면 오류다', () => {
    const md = '### TASK-01 추가\n- 결과: 된다\n- 결과: 또 된다\n- 확인: 자동 테스트\n- 확인: 직접 확인';
    const { requirements, errors } = parseSpec(md, FILE);

    expect(requirements[0]?.fields).toEqual({ 결과: '된다', 확인: '자동 테스트' });
    expect(requirements[0]?.verify).toBe('auto');
    expect(errors).toEqual([
      { file: FILE, line: 3, message: 'TASK-01에 결과 항목이 두 번 있어요' },
      { file: FILE, line: 5, message: 'TASK-01에 확인 항목이 두 번 있어요' },
    ]);
  });
});
