const LINE_BREAK = /\r\n|\r|\n/g;

/** 이름 바꾸기 칸에 붙여 넣는 글. 줄바꿈 하나를 공백 하나로 바꾼다 (INPUT-16). */
export function joinLines(text: string): string {
  return text.replace(LINE_BREAK, ' ');
}

/** value의 [start, end)를 text로 바꾸고, 커서를 넣은 글 바로 뒤에 둔다 (INPUT-16). */
export function insertText(value: string, start: number, end: number, text: string): { value: string; caret: number } {
  return { value: value.slice(0, start) + text + value.slice(end), caret: start + text.length };
}
