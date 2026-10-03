import { describe, expect, it } from 'vitest';
import { Title } from './title.ts';

describe('Title', () => {
  it('TASK-03 줄바꿈·탭·연속 공백을 공백 하나로 합치고 앞뒤 공백을 지운다', () => {
    expect(Title.parse('  보고서\n  쓰기\t ')?.text).toBe('보고서 쓰기');
  });

  it('TASK-03 전각 공백(U+3000)과 NEL(U+0085)도 공백이다', () => {
    expect(Title.parse('　보고서\u0085　쓰기　')?.text).toBe('보고서 쓰기');
  });

  it('TASK-03 U+FEFF는 공백이 아니다', () => {
    expect(Title.parse(' ﻿보고서 ')?.text).toBe('﻿보고서');
  });

  it('TASK-04 정리하고 나서 빈 제목이면 만들지 않는다', () => {
    for (const raw of ['', '   ', '\n\t', '　\u0085'])
      expect(Title.parse(raw), JSON.stringify(raw)).toBeNull();
  });
});
