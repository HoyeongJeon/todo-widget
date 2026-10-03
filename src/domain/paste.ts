const LEADING_WHITE_SPACE = /^\p{White_Space}+/u;
const LINE_BREAK = /\r\n|\r|\n/;
const HAS_LINE_BREAK = /[\r\n]/;

/** 줄바꿈이 하나라도 있으면 여러 줄 붙여넣기다 (INPUT-07). */
export function hasLineBreak(text: string): boolean {
  return HAS_LINE_BREAK.test(text);
}

export function splitLines(text: string): string[] {
  return text.split(LINE_BREAK);
}

/** 줄 앞 공백을 지운 뒤 맨 앞의 `-` 또는 `•` 하나만 뗀다. `1.` 같은 숫자는 남긴다 (INPUT-09, INPUT-20). */
export function stripBullet(line: string): string {
  const trimmed = line.replace(LEADING_WHITE_SPACE, '');
  return trimmed.startsWith('-') || trimmed.startsWith('•') ? trimmed.slice(1) : trimmed;
}
