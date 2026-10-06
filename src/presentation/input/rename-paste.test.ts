import { describe, expect, it } from 'vitest';
import { insertText, joinLines } from './rename-paste.ts';

describe('이름 바꾸기 칸에 붙여넣기', () => {
  it('INPUT-16 줄바꿈 하나를 공백 하나로 바꾼다', () => {
    expect(joinLines('보고서\r\n초안\n쓰기\r끝')).toBe('보고서 초안 쓰기 끝');
    expect(joinLines('보고서\n\n초안\n')).toBe('보고서  초안 ');
  });

  it('INPUT-16 선택 영역 자리에 넣고 커서를 넣은 글 바로 뒤에 둔다', () => {
    expect(insertText('초안', 2, 2, 'A B')).toEqual({ value: '초안A B', caret: 5 });
    expect(insertText('보고서 초안', 0, 3, '계획서')).toEqual({ value: '계획서 초안', caret: 3 });
  });
});
