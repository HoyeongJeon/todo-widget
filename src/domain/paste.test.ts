import { describe, expect, it } from 'vitest';
import { hasLineBreak, splitLines, stripBullet } from './paste.ts';

describe('붙여넣기 줄', () => {
  it('줄바꿈은 \\r\\n, \\r, \\n 모두 나눈다', () => {
    expect(splitLines('a\r\nb\rc\nd')).toEqual(['a', 'b', 'c', 'd']);
  });

  it('줄바꿈이 하나라도 있으면 여러 줄이다 (끝에 줄바꿈 하나만 있어도)', () => {
    expect(hasLineBreak('abc\n')).toBe(true);
    expect(hasLineBreak('a\rb')).toBe(true);
    expect(hasLineBreak('abc')).toBe(false);
  });

  it('줄 앞 공백을 지운 뒤 맨 앞의 - 또는 • 하나만 뗀다', () => {
    expect(stripBullet('  - 은행 방문')).toBe(' 은행 방문');
    expect(stripBullet('• 택배 반품')).toBe(' 택배 반품');
    expect(stripBullet('--두 개')).toBe('-두 개');
    expect(stripBullet('　-전각 공백 뒤')).toBe('전각 공백 뒤');
  });

  it('숫자로 된 목록 기호는 남긴다', () => {
    expect(stripBullet('1. 분기 보고서')).toBe('1. 분기 보고서');
  });
});
